import type { HasOneRelationState } from '../accessors/types.js'

/**
 * Record for a single entity in the identity map
 */
export interface EntityRecord {
	/** Current (local) data */
	data: Record<string, unknown>
	/** Data as received from server (for dirty tracking) */
	serverData: Record<string, unknown>
	/** Entity type */
	entityType: string
	/** Callbacks to notify on changes */
	subscribers: Set<() => void>
}

/**
 * State for a has-one relation within an entity
 */
export interface RelationState {
	/** Current referenced entity ID (null if disconnected) */
	currentId: string | null
	/** Server-side entity ID (for dirty tracking) */
	serverId: string | null
	/** Current relation state */
	state: HasOneRelationState
	/** Server state (for reset) */
	serverState: HasOneRelationState
	/** Placeholder entity data (if state is 'creating') */
	placeholderData: Record<string, unknown>
}

/**
 * Key for relation state storage
 */
function getRelationKey(parentEntityType: string, parentEntityId: string, fieldKey: string): string {
	return `${parentEntityType}:${parentEntityId}:${fieldKey}`
}

/**
 * Identity Map for managing entity state.
 *
 * Ensures that entities with the same ID share the same state,
 * preventing state divergence when the same entity appears in multiple
 * places in the component tree.
 */
export class IdentityMap {
	private entities = new Map<string, EntityRecord>()
	private relations = new Map<string, RelationState>()
	private relationSubscribers = new Map<string, Set<() => void>>()

	/**
	 * Creates a unique key for an entity
	 */
	private getKey(entityType: string, id: string): string {
		return `${entityType}:${id}`
	}

	/**
	 * Gets an existing entity record or creates a new one
	 */
	getOrCreate(entityType: string, id: string, initialData: Record<string, unknown>): EntityRecord {
		const key = this.getKey(entityType, id)

		if (!this.entities.has(key)) {
			this.entities.set(key, {
				data: { ...initialData },
				serverData: { ...initialData },
				entityType,
				subscribers: new Set(),
			})
		}

		return this.entities.get(key)!
	}

	/**
	 * Gets an entity record if it exists
	 */
	get(entityType: string, id: string): EntityRecord | undefined {
		const key = this.getKey(entityType, id)
		return this.entities.get(key)
	}

	/**
	 * Gets a field value from an entity
	 */
	getValue(entityType: string, id: string, fieldPath: string[]): unknown {
		const record = this.get(entityType, id)
		if (!record) return undefined
		return getNestedValue(record.data, fieldPath)
	}

	/**
	 * Gets a field's server value from an entity
	 */
	getServerValue(entityType: string, id: string, fieldPath: string[]): unknown {
		const record = this.get(entityType, id)
		if (!record) return undefined
		return getNestedValue(record.serverData, fieldPath)
	}

	/**
	 * Sets a field value and notifies subscribers
	 */
	setFieldValue(entityType: string, id: string, fieldPath: string[], value: unknown): void {
		const key = this.getKey(entityType, id)
		const record = this.entities.get(key)
		if (!record) return

		setNestedValue(record.data, fieldPath, value)
		this.notifySubscribers(key)
	}

	/**
	 * Commits a field (sets serverData to match data)
	 */
	commitField(entityType: string, id: string, fieldPath: string[]): void {
		const record = this.get(entityType, id)
		if (!record) return

		const value = getNestedValue(record.data, fieldPath)
		setNestedValue(record.serverData, fieldPath, value)
	}

	/**
	 * Checks if an entity exists in the map
	 */
	has(entityType: string, id: string): boolean {
		const key = this.getKey(entityType, id)
		return this.entities.has(key)
	}

	/**
	 * Updates a single field on an entity
	 */
	updateField(entityType: string, id: string, path: string[], value: unknown): void {
		const key = this.getKey(entityType, id)
		const record = this.entities.get(key)
		if (!record) return

		setNestedValue(record.data, path, value)
		this.notifySubscribers(key)
	}

	/**
	 * Updates multiple fields on an entity
	 */
	updateFields(entityType: string, id: string, updates: Record<string, unknown>): void {
		const key = this.getKey(entityType, id)
		const record = this.entities.get(key)
		if (!record) return

		Object.assign(record.data, updates)
		this.notifySubscribers(key)
	}

	/**
	 * Updates server data after successful fetch/persist
	 */
	setServerData(entityType: string, id: string, data: Record<string, unknown>): void {
		const key = this.getKey(entityType, id)
		const record = this.entities.get(key)
		if (!record) return

		record.serverData = { ...data }
		record.data = { ...data }
		this.notifySubscribers(key)
	}

	/**
	 * Resets entity to server data
	 */
	reset(entityType: string, id: string): void {
		const key = this.getKey(entityType, id)
		const record = this.entities.get(key)
		if (!record) return

		record.data = { ...record.serverData }
		this.notifySubscribers(key)
	}

	/**
	 * Subscribes to changes on an entity
	 */
	subscribe(entityType: string, id: string, callback: () => void): () => void {
		const key = this.getKey(entityType, id)
		const record = this.entities.get(key)

		if (!record) {
			// Entity doesn't exist yet, return no-op unsubscribe
			return () => {}
		}

		record.subscribers.add(callback)
		return () => {
			record.subscribers.delete(callback)
		}
	}

	/**
	 * Notifies all subscribers of an entity
	 */
	private notifySubscribers(key: string): void {
		const record = this.entities.get(key)
		if (!record) return

		for (const callback of record.subscribers) {
			callback()
		}
	}

	/**
	 * Removes an entity from the map
	 */
	remove(entityType: string, id: string): void {
		const key = this.getKey(entityType, id)
		this.entities.delete(key)
	}

	/**
	 * Clears all entities from the map
	 */
	clear(): void {
		this.entities.clear()
		this.relations.clear()
		this.relationSubscribers.clear()
	}

	/**
	 * Gets all entity keys (for debugging)
	 */
	keys(): string[] {
		return Array.from(this.entities.keys())
	}

	// ==================== Relation State Management ====================

	/**
	 * Gets or creates relation state for a has-one field
	 */
	getOrCreateRelation(
		parentEntityType: string,
		parentEntityId: string,
		fieldKey: string,
		initialState: RelationState,
	): RelationState {
		const key = getRelationKey(parentEntityType, parentEntityId, fieldKey)

		if (!this.relations.has(key)) {
			this.relations.set(key, { ...initialState })
			this.relationSubscribers.set(key, new Set())
		}

		return this.relations.get(key)!
	}

	/**
	 * Gets relation state if it exists
	 */
	getRelation(
		parentEntityType: string,
		parentEntityId: string,
		fieldKey: string,
	): RelationState | undefined {
		const key = getRelationKey(parentEntityType, parentEntityId, fieldKey)
		return this.relations.get(key)
	}

	/**
	 * Updates a relation state
	 */
	setRelation(
		parentEntityType: string,
		parentEntityId: string,
		fieldKey: string,
		updates: Partial<RelationState>,
	): void {
		const key = getRelationKey(parentEntityType, parentEntityId, fieldKey)
		const state = this.relations.get(key)
		if (!state) return

		Object.assign(state, updates)
		this.notifyRelationSubscribers(key)
	}

	/**
	 * Commits relation state (server = current)
	 */
	commitRelation(
		parentEntityType: string,
		parentEntityId: string,
		fieldKey: string,
	): void {
		const key = getRelationKey(parentEntityType, parentEntityId, fieldKey)
		const state = this.relations.get(key)
		if (!state) return

		state.serverId = state.currentId
		state.serverState = state.state === 'creating' ? 'connected' : state.state
		state.placeholderData = {}
	}

	/**
	 * Resets relation to server state
	 */
	resetRelation(
		parentEntityType: string,
		parentEntityId: string,
		fieldKey: string,
	): void {
		const key = getRelationKey(parentEntityType, parentEntityId, fieldKey)
		const state = this.relations.get(key)
		if (!state) return

		state.currentId = state.serverId
		state.state = state.serverState
		state.placeholderData = {}
		this.notifyRelationSubscribers(key)
	}

	/**
	 * Subscribes to changes on a relation
	 */
	subscribeRelation(
		parentEntityType: string,
		parentEntityId: string,
		fieldKey: string,
		callback: () => void,
	): () => void {
		const key = getRelationKey(parentEntityType, parentEntityId, fieldKey)
		let subscribers = this.relationSubscribers.get(key)

		if (!subscribers) {
			subscribers = new Set()
			this.relationSubscribers.set(key, subscribers)
		}

		subscribers.add(callback)
		return () => {
			subscribers!.delete(callback)
		}
	}

	/**
	 * Notifies all subscribers of a relation
	 */
	private notifyRelationSubscribers(key: string): void {
		const subscribers = this.relationSubscribers.get(key)
		if (!subscribers) return

		for (const callback of subscribers) {
			callback()
		}
	}

	/**
	 * Removes a relation from the map
	 */
	removeRelation(
		parentEntityType: string,
		parentEntityId: string,
		fieldKey: string,
	): void {
		const key = getRelationKey(parentEntityType, parentEntityId, fieldKey)
		this.relations.delete(key)
		this.relationSubscribers.delete(key)
	}
}

/**
 * Sets a nested value in an object using a path array
 */
function setNestedValue(obj: Record<string, unknown>, path: string[], value: unknown): void {
	if (path.length === 0) return

	let current: Record<string, unknown> = obj

	for (let i = 0; i < path.length - 1; i++) {
		const key = path[i]!
		if (!(key in current) || typeof current[key] !== 'object' || current[key] === null) {
			current[key] = {}
		}
		current = current[key] as Record<string, unknown>
	}

	const lastKey = path[path.length - 1]!
	current[lastKey] = value
}

/**
 * Gets a nested value from an object using a path array
 */
export function getNestedValue(obj: Record<string, unknown>, path: string[]): unknown {
	let current: unknown = obj

	for (const key of path) {
		if (current === null || current === undefined || typeof current !== 'object') {
			return undefined
		}
		current = (current as Record<string, unknown>)[key]
	}

	return current
}
