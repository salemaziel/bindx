import type { QuerySpec } from '../fragment/buildQuery.js'

/**
 * Interface for backend adapters.
 * Implement this to connect bindx to your data source.
 */
export interface BackendAdapter {
	/**
	 * Fetches a single entity by ID
	 *
	 * @param entityType - The type/name of the entity (e.g., 'Article', 'User')
	 * @param id - The entity's unique identifier
	 * @param query - Specification of which fields to fetch
	 * @returns The fetched data projected according to query
	 */
	fetchOne(entityType: string, id: string, query: QuerySpec): Promise<Record<string, unknown>>

	/**
	 * Fetches multiple entities
	 *
	 * @param entityType - The type/name of the entities
	 * @param query - Specification of which fields to fetch
	 * @param filter - Optional filter criteria (adapter-specific)
	 * @returns Array of fetched entities
	 */
	fetchMany?(
		entityType: string,
		query: QuerySpec,
		filter?: Record<string, unknown>,
	): Promise<Record<string, unknown>[]>

	/**
	 * Persists changes to an entity
	 *
	 * @param entityType - The type/name of the entity
	 * @param id - The entity's unique identifier
	 * @param changes - The changed fields to persist
	 */
	persist(entityType: string, id: string, changes: Record<string, unknown>): Promise<void>

	/**
	 * Creates a new entity
	 *
	 * @param entityType - The type/name of the entity
	 * @param data - The initial data for the entity
	 * @returns The created entity with server-assigned fields (e.g., ID)
	 */
	create?(entityType: string, data: Record<string, unknown>): Promise<Record<string, unknown>>

	/**
	 * Deletes an entity
	 *
	 * @param entityType - The type/name of the entity
	 * @param id - The entity's unique identifier
	 */
	delete?(entityType: string, id: string): Promise<void>
}
