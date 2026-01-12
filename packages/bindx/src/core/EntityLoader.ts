import type { BackendAdapter } from '../adapter/types.js'
import type { IdentityMap } from '../store/IdentityMap.js'
import type { QuerySpec } from '../selection/buildQuery.js'
import type { EntityWhere, EntityOrderBy } from '../selection/queryTypes.js'

/**
 * Checks if an error is an AbortError that should be rethrown.
 */
function isAbortError(error: unknown): boolean {
	return error instanceof DOMException && error.name === 'AbortError'
}

/**
 * Normalizes unknown error to Error instance.
 */
function normalizeError(error: unknown): Error {
	return error instanceof Error ? error : new Error(String(error))
}

/**
 * Result of entity loading operation
 */
export type EntityLoadResult<T> =
	| { status: 'success'; data: T }
	| { status: 'error'; error: Error }
	| { status: 'not_found' }

/**
 * Result of entity list loading operation
 */
export type EntityListLoadResult<T> =
	| { status: 'success'; data: T[] }
	| { status: 'error'; error: Error }

/**
 * Options for loading a single entity
 */
export interface LoadEntityOptions {
	entityType: string
	id: string
	query: QuerySpec
	useCache?: boolean
	signal?: AbortSignal
}

/**
 * Options for loading entity list
 */
export interface LoadEntityListOptions<TEntity = unknown> {
	entityType: string
	query: QuerySpec
	filter?: EntityWhere<TEntity>
	orderBy?: readonly EntityOrderBy<TEntity>[]
	limit?: number
	offset?: number
	signal?: AbortSignal
}

/**
 * Non-React service for loading entities.
 * Can be used in any JavaScript environment.
 */
export class EntityLoader {
	constructor(
		private readonly adapter: BackendAdapter,
		private readonly identityMap: IdentityMap,
	) {}

	/**
	 * Loads a single entity by ID.
	 */
	async loadOne<T>(options: LoadEntityOptions): Promise<EntityLoadResult<T>> {
		const { entityType, id, query, useCache = false, signal } = options

		// Check cache first
		if (useCache && this.identityMap.has(entityType, id)) {
			const cached = this.identityMap.get(entityType, id)
			if (cached) {
				return { status: 'success', data: cached.data as T }
			}
		}

		try {
			const results = await this.adapter.query(
				[{ type: 'get', entityType, by: { id }, spec: query }],
				{ signal },
			)

			const result = results[0]
			if (!result || result.type !== 'get' || result.data === null) {
				return { status: 'not_found' }
			}

			// Store in identity map
			this.identityMap.getOrCreate(entityType, id, result.data)

			return { status: 'success', data: result.data as T }
		} catch (error) {
			if (isAbortError(error)) {
				throw error
			}
			return { status: 'error', error: normalizeError(error) }
		}
	}

	/**
	 * Loads multiple entities matching filter.
	 */
	async loadMany<T, TEntity = unknown>(options: LoadEntityListOptions<TEntity>): Promise<EntityListLoadResult<T>> {
		const { entityType, query, filter, orderBy, limit, offset, signal } = options

		try {
			const results = await this.adapter.query(
				[{ type: 'list', entityType, filter, orderBy, limit, offset, spec: query }],
				{ signal },
			)

			const result = results[0]
			if (!result || result.type !== 'list') {
				return {
					status: 'error',
					error: new Error('Unexpected query result type'),
				}
			}

			// Store each entity in identity map
			for (const item of result.data) {
				const record = item as Record<string, unknown>
				if (typeof record['id'] === 'string') {
					this.identityMap.getOrCreate(entityType, record['id'], record)
				}
			}

			return { status: 'success', data: result.data as T[] }
		} catch (error) {
			if (isAbortError(error)) {
				throw error
			}
			return { status: 'error', error: normalizeError(error) }
		}
	}

	/**
	 * Checks if entity exists in cache.
	 */
	hasInCache(entityType: string, id: string): boolean {
		return this.identityMap.has(entityType, id)
	}

	/**
	 * Gets entity from cache if available.
	 */
	getFromCache<T>(entityType: string, id: string): T | null {
		const record = this.identityMap.get(entityType, id)
		return record ? (record.data as T) : null
	}
}

/**
 * Creates an EntityLoader instance.
 * Factory function for easier testing and dependency injection.
 */
export function createEntityLoader(
	adapter: BackendAdapter,
	identityMap: IdentityMap,
): EntityLoader {
	return new EntityLoader(adapter, identityMap)
}
