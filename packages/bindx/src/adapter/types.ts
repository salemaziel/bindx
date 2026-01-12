import type { QuerySpec } from '../selection/buildQuery.js'
import type { EntityWhere, EntityOrderBy } from '../selection/queryTypes.js'
import type { ContemberMutationResult } from '../errors/pathMapper.js'

/**
 * Options for query operations
 */
export interface QueryOptions {
	/**
	 * AbortSignal for cancelling the request
	 */
	readonly signal?: AbortSignal
}

/**
 * Unique field lookup for single entity queries.
 * Supports id and any other unique field.
 */
export type EntityUniqueWhere = Record<string, unknown>

/**
 * Query for a single entity by unique field(s)
 */
export interface GetQuery {
	readonly type: 'get'
	readonly entityType: string
	readonly by: EntityUniqueWhere
	readonly spec: QuerySpec
}

/**
 * Query for a list of entities
 */
export interface ListQuery<TEntity = unknown> {
	readonly type: 'list'
	readonly entityType: string
	readonly filter?: EntityWhere<TEntity>
	readonly orderBy?: readonly EntityOrderBy<TEntity>[]
	readonly limit?: number
	readonly offset?: number
	readonly spec: QuerySpec
}

/**
 * Union of all query types
 */
export type Query<TEntity = unknown> = GetQuery | ListQuery<TEntity>

/**
 * Result for a single get query
 */
export interface GetQueryResult {
	readonly type: 'get'
	readonly data: Record<string, unknown> | null
}

/**
 * Result for a list query
 */
export interface ListQueryResult {
	readonly type: 'list'
	readonly data: readonly Record<string, unknown>[]
}

/**
 * Union of query results
 */
export type QueryResult = GetQueryResult | ListQueryResult

/**
 * Result of a persist operation.
 * Contains detailed error information for error mapping.
 */
export interface PersistResult {
	readonly ok: boolean
	readonly errorMessage?: string
	/** Detailed mutation result for error mapping (Contember-specific) */
	readonly mutationResult?: ContemberMutationResult
}

/**
 * Result of a create operation.
 * Contains the created entity data or error information.
 */
export interface CreateResult {
	readonly ok: boolean
	readonly errorMessage?: string
	/** The created entity data (when ok is true) */
	readonly data?: Record<string, unknown>
	/** Detailed mutation result for error mapping (Contember-specific) */
	readonly mutationResult?: ContemberMutationResult
}

/**
 * Result of a delete operation.
 */
export interface DeleteResult {
	readonly ok: boolean
	readonly errorMessage?: string
	/** Detailed mutation result for error mapping (Contember-specific) */
	readonly mutationResult?: ContemberMutationResult
}

/**
 * Interface for backend adapters.
 * Implement this to connect bindx to your data source.
 */
export interface BackendAdapter {
	/**
	 * Execute one or more queries in a single request.
	 * When multiple queries are provided, the adapter should batch them
	 * into a single network request where possible.
	 *
	 * @param queries - Array of queries to execute
	 * @param options - Optional query options including AbortSignal
	 * @returns Array of results in the same order as queries
	 */
	query(queries: readonly Query[], options?: QueryOptions): Promise<QueryResult[]>

	/**
	 * Persists changes to an entity.
	 * Returns a result object with success/failure status and error details.
	 *
	 * @param entityType - The type/name of the entity
	 * @param id - The entity's unique identifier
	 * @param changes - The changed fields to persist
	 * @returns Result with ok status and optional error details
	 */
	persist(entityType: string, id: string, changes: Record<string, unknown>): Promise<PersistResult>

	/**
	 * Creates a new entity.
	 * Returns a result object with the created entity or error details.
	 *
	 * @param entityType - The type/name of the entity
	 * @param data - The initial data for the entity
	 * @returns Result with ok status, created entity data, and optional error details
	 */
	create?(entityType: string, data: Record<string, unknown>): Promise<CreateResult>

	/**
	 * Deletes an entity.
	 * Returns a result object with success/failure status.
	 *
	 * @param entityType - The type/name of the entity
	 * @param id - The entity's unique identifier
	 * @returns Result with ok status and optional error details
	 */
	delete?(entityType: string, id: string): Promise<DeleteResult>
}
