import type { QuerySpec, QueryFieldSpec } from '../selection/buildQuery.js'
import type { BackendAdapter, Query, QueryResult, QueryOptions, GetQuery, ListQuery } from './types.js'

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

	async query(queries: readonly Query[], options?: QueryOptions): Promise<QueryResult[]> {
		this.log('query', { queries })
		await this.simulateDelay(options?.signal)

		return queries.map(q => {
			if (q.type === 'get') {
				return this.executeGet(q)
			} else {
				return this.executeList(q)
			}
		})
	}

	private executeGet(query: GetQuery): QueryResult {
		const entityStore = this.store[query.entityType]
		if (!entityStore) {
			return { type: 'get', data: null }
		}

		// Find entity by unique field(s) in 'by'
		const by = query.by
		const [field, value] = Object.entries(by)[0] ?? []

		if (!field || value === undefined) {
			return { type: 'get', data: null }
		}

		let entity: Record<string, unknown> | undefined
		if (field === 'id') {
			// Direct lookup by ID
			entity = entityStore[value as string]
		} else {
			// Search by other unique field
			entity = Object.values(entityStore).find(e => e[field] === value)
		}

		if (!entity) {
			return { type: 'get', data: null }
		}

		const result = this.projectFields(entity, query.spec.fields)
		this.log('executeGet result', result)

		return { type: 'get', data: result }
	}

	private executeList(query: ListQuery): QueryResult {
		const entityStore = this.store[query.entityType]
		if (!entityStore) {
			return { type: 'list', data: [] }
		}

		let entities = Object.values(entityStore)

		// Apply filter (simplified - matches exact values for basic filters)
		if (query.filter) {
			entities = this.applyFilter(entities, query.filter as Record<string, unknown>)
		}

		// Apply ordering
		if (query.orderBy && query.orderBy.length > 0) {
			entities = this.applyOrderBy(entities, query.orderBy)
		}

		// Apply pagination
		if (query.offset !== undefined) {
			entities = entities.slice(query.offset)
		}
		if (query.limit !== undefined) {
			entities = entities.slice(0, query.limit)
		}

		const results = entities.map(entity => this.projectFields(entity, query.spec.fields))
		this.log('executeList result', results)

		return { type: 'list', data: results }
	}

	private applyFilter(entities: Record<string, unknown>[], filter: Record<string, unknown>): Record<string, unknown>[] {
		return entities.filter(entity => this.matchesFilter(entity, filter))
	}

	private matchesFilter(entity: Record<string, unknown>, filter: Record<string, unknown>): boolean {
		for (const [key, condition] of Object.entries(filter)) {
			if (key === 'and' && Array.isArray(condition)) {
				if (!condition.every(c => this.matchesFilter(entity, c as Record<string, unknown>))) {
					return false
				}
				continue
			}
			if (key === 'or' && Array.isArray(condition)) {
				if (!condition.some(c => this.matchesFilter(entity, c as Record<string, unknown>))) {
					return false
				}
				continue
			}
			if (key === 'not' && condition && typeof condition === 'object') {
				if (this.matchesFilter(entity, condition as Record<string, unknown>)) {
					return false
				}
				continue
			}

			const fieldValue = entity[key]
			if (condition && typeof condition === 'object' && !Array.isArray(condition)) {
				// It's a condition object like { eq: 'value' }
				if (!this.matchesCondition(fieldValue, condition as Record<string, unknown>)) {
					return false
				}
			} else {
				// Direct value comparison (for backward compatibility)
				if (fieldValue !== condition) {
					return false
				}
			}
		}
		return true
	}

	private matchesCondition(value: unknown, condition: Record<string, unknown>): boolean {
		for (const [op, expected] of Object.entries(condition)) {
			switch (op) {
				case 'eq':
					if (value !== expected) return false
					break
				case 'notEq':
					if (value === expected) return false
					break
				case 'in':
					if (!Array.isArray(expected) || !expected.includes(value)) return false
					break
				case 'notIn':
					if (Array.isArray(expected) && expected.includes(value)) return false
					break
				case 'lt':
					if (typeof value !== 'number' || typeof expected !== 'number' || value >= expected) return false
					break
				case 'lte':
					if (typeof value !== 'number' || typeof expected !== 'number' || value > expected) return false
					break
				case 'gt':
					if (typeof value !== 'number' || typeof expected !== 'number' || value <= expected) return false
					break
				case 'gte':
					if (typeof value !== 'number' || typeof expected !== 'number' || value < expected) return false
					break
				case 'isNull':
					if (expected === true && value !== null && value !== undefined) return false
					if (expected === false && (value === null || value === undefined)) return false
					break
				case 'contains':
					if (typeof value !== 'string' || typeof expected !== 'string' || !value.includes(expected)) return false
					break
				case 'startsWith':
					if (typeof value !== 'string' || typeof expected !== 'string' || !value.startsWith(expected)) return false
					break
				case 'endsWith':
					if (typeof value !== 'string' || typeof expected !== 'string' || !value.endsWith(expected)) return false
					break
				case 'containsCI':
					if (typeof value !== 'string' || typeof expected !== 'string' || !value.toLowerCase().includes(expected.toLowerCase())) return false
					break
			}
		}
		return true
	}

	private applyOrderBy(entities: Record<string, unknown>[], orderBy: readonly Record<string, unknown>[]): Record<string, unknown>[] {
		return [...entities].sort((a, b) => {
			for (const order of orderBy) {
				for (const [field, direction] of Object.entries(order)) {
					if (field.startsWith('_')) continue // Skip _random, _randomSeeded
					const aVal = a[field]
					const bVal = b[field]

					let comparison = 0
					if (aVal === bVal) comparison = 0
					else if (aVal === null || aVal === undefined) comparison = 1
					else if (bVal === null || bVal === undefined) comparison = -1
					else if (aVal < bVal) comparison = -1
					else comparison = 1

					if (direction === 'desc' || direction === 'descNullsLast') {
						comparison = -comparison
					}

					if (comparison !== 0) return comparison
				}
			}
			return 0
		})
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
