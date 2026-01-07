import type { QuerySpec, QueryFieldSpec } from '../selection/buildQuery.js'
import type { BackendAdapter, FetchOptions } from './types.js'

/**
 * In-memory data store structure
 */
export type MockDataStore = {
	[entityType: string]: {
		[id: string]: Record<string, unknown>
	}
}

/**
 * Options for MockAdapter
 */
export interface MockAdapterOptions {
	/** Simulated network delay in milliseconds (default: 100) */
	delay?: number
	/** Whether to log operations to console (default: false) */
	debug?: boolean
}

/**
 * Mock backend adapter for testing and development.
 * Stores data in memory and simulates async operations.
 */
export class MockAdapter implements BackendAdapter {
	private readonly delay: number
	private readonly debug: boolean

	constructor(
		private store: MockDataStore,
		options: MockAdapterOptions = {},
	) {
		this.delay = options.delay ?? 100
		this.debug = options.debug ?? false
	}

	/**
	 * Simulates network delay with abort support
	 */
	private async simulateDelay(signal?: AbortSignal): Promise<void> {
		if (this.delay > 0) {
			await new Promise<void>((resolve, reject) => {
				const timeoutId = setTimeout(resolve, this.delay)

				if (signal) {
					if (signal.aborted) {
						clearTimeout(timeoutId)
						reject(new DOMException('Aborted', 'AbortError'))
						return
					}

					signal.addEventListener('abort', () => {
						clearTimeout(timeoutId)
						reject(new DOMException('Aborted', 'AbortError'))
					})
				}
			})
		}

		// Check if aborted after delay
		if (signal?.aborted) {
			throw new DOMException('Aborted', 'AbortError')
		}
	}

	/**
	 * Logs operations if debug is enabled
	 */
	private log(operation: string, ...args: unknown[]): void {
		if (this.debug) {
			console.log(`[MockAdapter] ${operation}:`, ...args)
		}
	}

	async fetchOne(
		entityType: string,
		id: string,
		query: QuerySpec,
		options?: FetchOptions,
	): Promise<Record<string, unknown>> {
		this.log('fetchOne', { entityType, id, query })
		await this.simulateDelay(options?.signal)

		const entityStore = this.store[entityType]
		if (!entityStore) {
			throw new Error(`Entity type '${entityType}' not found in store`)
		}

		const entity = entityStore[id]
		if (!entity) {
			throw new Error(`Entity '${entityType}:${id}' not found`)
		}

		// Project only requested fields
		const result = this.projectFields(entity, query.fields)
		this.log('fetchOne result', result)

		return result
	}

	async fetchMany(
		entityType: string,
		query: QuerySpec,
		filter?: Record<string, unknown>,
		options?: FetchOptions,
	): Promise<Record<string, unknown>[]> {
		this.log('fetchMany', { entityType, query, filter })
		await this.simulateDelay(options?.signal)

		const entityStore = this.store[entityType]
		if (!entityStore) {
			return []
		}

		let entities = Object.values(entityStore)

		// Simple filter implementation
		if (filter) {
			entities = entities.filter(entity => {
				for (const [key, value] of Object.entries(filter)) {
					if (entity[key] !== value) return false
				}
				return true
			})
		}

		return entities.map(entity => this.projectFields(entity, query.fields))
	}

	async persist(
		entityType: string,
		id: string,
		changes: Record<string, unknown>,
	): Promise<void> {
		this.log('persist', { entityType, id, changes })
		await this.simulateDelay()

		const entityStore = this.store[entityType]
		if (!entityStore) {
			throw new Error(`Entity type '${entityType}' not found in store`)
		}

		const entity = entityStore[id]
		if (!entity) {
			throw new Error(`Entity '${entityType}:${id}' not found`)
		}

		// Process changes with Contember-style operation support
		this.applyChanges(entity, changes)
		this.log('persist result', entity)
	}

	/**
	 * Applies changes to an entity, handling Contember-style relation operations.
	 * Supports:
	 * - Scalar fields: direct assignment
	 * - HasOne: { connect: { id } }, { disconnect: true }, { delete: true }, { create: {...} }, { update: {...} }
	 * - HasMany: [{ connect: { id } }, { disconnect: { id } }, { delete: { id } }, { create: {...} }, { update: { by: { id }, data: {...} } }]
	 */
	private applyChanges(entity: Record<string, unknown>, changes: Record<string, unknown>): void {
		for (const [key, value] of Object.entries(changes)) {
			if (value === null || value === undefined) {
				entity[key] = value
				continue
			}

			// Check if it's a Contember-style relation operation
			if (typeof value === 'object' && !Array.isArray(value)) {
				const operation = value as Record<string, unknown>

				if ('connect' in operation) {
					// HasOne connect: { connect: { id: '...' } }
					const connectData = operation['connect'] as Record<string, unknown>
					const targetId = connectData['id'] as string
					entity[key] = this.resolveRelatedEntity(targetId)
				} else if ('disconnect' in operation && operation['disconnect'] === true) {
					// HasOne disconnect: { disconnect: true }
					entity[key] = null
				} else if ('delete' in operation && operation['delete'] === true) {
					// HasOne delete: { delete: true }
					// Delete the related entity and set to null
					const existingRelation = entity[key] as Record<string, unknown> | null
					if (existingRelation?.['id']) {
						this.deleteRelatedEntity(existingRelation['id'] as string)
					}
					entity[key] = null
				} else if ('create' in operation) {
					// HasOne create: { create: { name: '...', ... } }
					const createData = operation['create'] as Record<string, unknown>
					entity[key] = this.createRelatedEntity(createData)
				} else if ('update' in operation) {
					// HasOne update: { update: { name: '...', ... } }
					const updateData = operation['update'] as Record<string, unknown>
					const existingRelation = entity[key] as Record<string, unknown> | null
					if (existingRelation) {
						this.applyChanges(existingRelation, updateData)
					}
				} else {
					// Regular object value (not a Contember operation)
					entity[key] = value
				}
			} else if (Array.isArray(value)) {
				// HasMany operations: [{ connect: { id } }, { disconnect: { id } }, ...]
				entity[key] = this.applyHasManyOperations(
					entity[key] as Array<Record<string, unknown>> | undefined,
					value as Array<Record<string, unknown>>,
				)
			} else {
				// Scalar field
				entity[key] = value
			}
		}
	}

	/**
	 * Applies hasMany relation operations.
	 */
	private applyHasManyOperations(
		currentItems: Array<Record<string, unknown>> | undefined,
		operations: Array<Record<string, unknown>>,
	): Array<Record<string, unknown>> {
		const items = [...(currentItems ?? [])]

		for (const operation of operations) {
			if ('connect' in operation) {
				// Connect: { connect: { id: '...' } }
				const connectData = operation['connect'] as Record<string, unknown>
				const targetId = connectData['id'] as string
				// Only add if not already present
				if (!items.some(item => item['id'] === targetId)) {
					const relatedEntity = this.resolveRelatedEntity(targetId)
					if (relatedEntity) {
						items.push(relatedEntity)
					}
				}
			} else if ('disconnect' in operation) {
				// Disconnect: { disconnect: { id: '...' } }
				const disconnectData = operation['disconnect'] as Record<string, unknown>
				const targetId = disconnectData['id'] as string
				const index = items.findIndex(item => item['id'] === targetId)
				if (index >= 0) {
					items.splice(index, 1)
				}
			} else if ('delete' in operation) {
				// Delete: { delete: { id: '...' } }
				const deleteData = operation['delete'] as Record<string, unknown>
				const targetId = deleteData['id'] as string
				const index = items.findIndex(item => item['id'] === targetId)
				if (index >= 0) {
					items.splice(index, 1)
					this.deleteRelatedEntity(targetId)
				}
			} else if ('create' in operation) {
				// Create: { create: { name: '...', ... } }
				const createData = operation['create'] as Record<string, unknown>
				const newEntity = this.createRelatedEntity(createData)
				if (newEntity) {
					items.push(newEntity)
				}
			} else if ('update' in operation) {
				// Update: { update: { by: { id: '...' }, data: { ... } } }
				const updateOp = operation['update'] as Record<string, unknown>
				const by = updateOp['by'] as Record<string, unknown>
				const data = updateOp['data'] as Record<string, unknown>
				const targetId = by['id'] as string
				const item = items.find(item => item['id'] === targetId)
				if (item) {
					this.applyChanges(item, data)
				}
			}
		}

		return items
	}

	/**
	 * Resolves a related entity by ID from any entity store.
	 * Returns a copy of the entity data or { id } if not found.
	 */
	private resolveRelatedEntity(id: string): Record<string, unknown> | null {
		for (const entityStore of Object.values(this.store)) {
			if (entityStore[id]) {
				return { ...entityStore[id] }
			}
		}
		// Entity not found - return just the ID
		return { id }
	}

	/**
	 * Creates a related entity with a generated ID.
	 */
	private createRelatedEntity(data: Record<string, unknown>): Record<string, unknown> {
		const id = this.generateId()
		return { id, ...data }
	}

	/**
	 * Deletes a related entity from any entity store.
	 */
	private deleteRelatedEntity(id: string): void {
		for (const entityStore of Object.values(this.store)) {
			if (entityStore[id]) {
				delete entityStore[id]
				return
			}
		}
	}

	async create(
		entityType: string,
		data: Record<string, unknown>,
	): Promise<Record<string, unknown>> {
		this.log('create', { entityType, data })
		await this.simulateDelay()

		// Ensure entity store exists
		if (!this.store[entityType]) {
			this.store[entityType] = {}
		}

		// Generate ID if not provided
		const id = (data['id'] as string) ?? this.generateId()
		const entity = { ...data, id }

		this.store[entityType]![id] = entity
		this.log('create result', entity)

		return entity
	}

	async delete(entityType: string, id: string): Promise<void> {
		this.log('delete', { entityType, id })
		await this.simulateDelay()

		const entityStore = this.store[entityType]
		if (entityStore) {
			delete entityStore[id]
		}
	}

	/**
	 * Projects only the requested fields from source data
	 * @param source The source object to project from
	 * @param fields The field specs to project
	 * @param basePath The current base path (for nested objects, paths are relative to this)
	 */
	private projectFields(
		source: Record<string, unknown>,
		fields: QueryFieldSpec[],
		basePath: string[] = [],
	): Record<string, unknown> {
		const result: Record<string, unknown> = {}

		for (const field of fields) {
			// Get relative path by removing the base path prefix
			const relativePath = field.sourcePath.slice(basePath.length)
			const value = this.getNestedValue(source, relativePath)

			if (field.nested && Array.isArray(value)) {
				// Project each item in array (has-many relation)
				// Detect array from actual data even if field.isArray is not set
				result[field.name] = value.map(item =>
					this.projectFields(item as Record<string, unknown>, field.nested!.fields, []),
				)
			} else if (field.nested && value && typeof value === 'object') {
				// Project nested object (has-one relation)
				result[field.name] = this.projectFields(
					value as Record<string, unknown>,
					field.nested.fields,
					[], // Empty basePath since we're projecting from the nested object directly
				)
			} else {
				// Scalar or leaf value
				result[field.name] = value
			}
		}

		return result
	}

	/**
	 * Gets a nested value from an object using a path
	 */
	private getNestedValue(obj: Record<string, unknown>, path: string[]): unknown {
		let current: unknown = obj

		for (const key of path) {
			if (current === null || current === undefined || typeof current !== 'object') {
				return undefined
			}
			current = (current as Record<string, unknown>)[key]
		}

		return current
	}

	/**
	 * Deep merges changes into target object
	 */
	private mergeDeep(target: Record<string, unknown>, source: Record<string, unknown>): void {
		for (const [key, value] of Object.entries(source)) {
			if (
				value &&
				typeof value === 'object' &&
				!Array.isArray(value) &&
				target[key] &&
				typeof target[key] === 'object' &&
				!Array.isArray(target[key])
			) {
				// Recursively merge nested objects
				this.mergeDeep(target[key] as Record<string, unknown>, value as Record<string, unknown>)
			} else {
				target[key] = value
			}
		}
	}

	/**
	 * Generates a simple unique ID
	 */
	private generateId(): string {
		return `mock_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
	}

	/**
	 * Gets the current store state (for testing/debugging)
	 */
	getStore(): MockDataStore {
		return this.store
	}

	/**
	 * Resets the store to initial state
	 */
	resetStore(newStore: MockDataStore): void {
		this.store = newStore
	}
}
