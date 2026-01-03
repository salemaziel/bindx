import { useRef, useEffect } from 'react'
import type { SelectionMeta, FluentFragment, SelectionBuilder } from '../selection/types.js'
import { EntityAccessorImpl } from '../accessors/EntityAccessor.js'
import type { EntityAccessor, EntityListAccessor } from '../accessors/types.js'
import { EntityListAccessorImpl } from '../accessors/EntityListAccessor.js'
import { useEntityData, useEntityListData } from './useEntityData.js'
import { resolveSelectionMeta, type SelectionInput } from '../core/SelectionResolver.js'

/**
 * Options for useEntity hook
 */
export interface UseEntityOptions {
	/** Entity ID to fetch */
	id: string
	/** If true, use cached data from IdentityMap if available (default: false) */
	cache?: boolean
}

/**
 * Options for useEntityList hook
 */
export interface UseEntityListOptions {
	/** Optional filter criteria */
	filter?: Record<string, unknown>
}

/**
 * Result type for useEntity when loading
 */
export interface LoadingEntityAccessor<TData> {
	readonly isLoading: true
	readonly isError: false
	readonly isPersisting: false
	readonly isDirty: false
	readonly id: string
	readonly fields: never
	readonly data: never
	persist(): Promise<void>
	reset(): void
}

/**
 * Result type for useEntity when error occurred
 */
export interface ErrorEntityAccessor<TData> {
	readonly isLoading: false
	readonly isError: true
	readonly error: Error
	readonly isPersisting: false
	readonly isDirty: false
	readonly id: string
	readonly fields: never
	readonly data: never
	persist(): Promise<void>
	reset(): void
}

/**
 * Creates a placeholder accessor for loading state
 */
function createLoadingAccessor<TData>(id: string): LoadingEntityAccessor<TData> {
	return {
		isLoading: true,
		isError: false,
		isPersisting: false,
		isDirty: false,
		id,
		get fields(): never {
			throw new Error('Cannot access fields while loading')
		},
		get data(): never {
			throw new Error('Cannot access data while loading')
		},
		async persist() {
			// No-op while loading
		},
		reset() {
			// No-op while loading
		},
	}
}

/**
 * Creates a placeholder accessor for error state
 */
function createErrorAccessor<TData>(id: string, error: Error): ErrorEntityAccessor<TData> {
	return {
		isLoading: false,
		isError: true,
		error,
		isPersisting: false,
		isDirty: false,
		id,
		get fields(): never {
			throw new Error('Cannot access fields after error')
		},
		get data(): never {
			throw new Error('Cannot access data after error')
		},
		async persist() {
			// No-op after error
		},
		reset() {
			// No-op after error
		},
	}
}

/**
 * Result type for useEntityList when loading
 */
export interface LoadingEntityListAccessor<TData> {
	readonly isLoading: true
	readonly isError: false
	readonly isDirty: false
	readonly items: never
	readonly length: 0
	add(data: Partial<TData>): void
	remove(key: string): void
	move(fromIndex: number, toIndex: number): void
}

/**
 * Result type for useEntityList when error occurred
 */
export interface ErrorEntityListAccessor<TData> {
	readonly isLoading: false
	readonly isError: true
	readonly error: Error
	readonly isDirty: false
	readonly items: never
	readonly length: 0
	add(data: Partial<TData>): void
	remove(key: string): void
	move(fromIndex: number, toIndex: number): void
}

/**
 * Creates a placeholder accessor for entity list loading state
 */
function createLoadingListAccessor<TData>(): LoadingEntityListAccessor<TData> {
	return {
		isLoading: true,
		isError: false,
		isDirty: false,
		get items(): never {
			throw new Error('Cannot access items while loading')
		},
		length: 0,
		add() {
			// No-op while loading
		},
		remove() {
			// No-op while loading
		},
		move() {
			// No-op while loading
		},
	}
}

/**
 * Creates a placeholder accessor for entity list error state
 */
function createErrorListAccessor<TData>(error: Error): ErrorEntityListAccessor<TData> {
	return {
		isLoading: false,
		isError: true,
		error,
		isDirty: false,
		get items(): never {
			throw new Error('Cannot access items after error')
		},
		length: 0,
		add() {
			// No-op after error
		},
		remove() {
			// No-op after error
		},
		move() {
			// No-op after error
		},
	}
}

/**
 * Schema type constraint - maps entity names to their model types.
 */
export interface EntitySchema {
	[entityName: string]: object
}

/**
 * Type for fluent definer function
 */
type FluentDefiner<TModel, TResult extends object> = (
	builder: SelectionBuilder<TModel>,
) => SelectionBuilder<TModel, TResult, object>

/**
 * Creates type-safe bindx hooks for a specific schema.
 *
 * @example
 * ```ts
 * // Define your schema
 * interface Schema {
 *   Article: Article
 *   Author: Author
 *   Tag: Tag
 * }
 *
 * // Create typed hooks
 * export const { useEntity, useEntityList } = createBindx<Schema>()
 *
 * // Usage with fluent builder
 * const article = useEntity('Article', { id }, e =>
 *   e.id().title().content()
 *    .author(a => a.name().email())
 *    .tags(t => t.id().name())
 * )
 * ```
 */
export function createBindx<TSchema extends { [K in keyof TSchema]: object }>() {
	/**
	 * Hook to fetch and manage a single entity with full type inference.
	 *
	 * @param entityType - Name of the entity (autocompleted from schema)
	 * @param options - Options including the entity ID and cache behavior
	 * @param definer - Fluent builder function or fragment defining which fields to fetch
	 */
	function useEntity<TEntityName extends keyof TSchema & string, TResult extends object>(
		entityType: TEntityName,
		options: UseEntityOptions,
		definer: SelectionInput<TSchema[TEntityName], TResult>,
	): EntityAccessor<TResult> | LoadingEntityAccessor<TResult> | ErrorEntityAccessor<TResult> {
		// Track accessor for cleanup
		const accessorRef = useRef<EntityAccessorImpl<TResult> | null>(null)

		// Use shared data loading hook
		const { state, notifyChange, selectionMeta, identityMap, adapter } = useEntityData(
			{ entityType, id: options.id, useCache: options.cache },
			definer,
		)

		// Cleanup accessor on unmount
		useEffect(() => {
			return () => {
				accessorRef.current?._dispose()
				accessorRef.current = null
			}
		}, [])

		// Return loading state
		if (state.status === 'loading' || state.status === 'not_found') {
			return createLoadingAccessor<TResult>(options.id)
		}

		// Return error state
		if (state.status === 'error') {
			return createErrorAccessor<TResult>(options.id, state.error)
		}

		// Create or update accessor
		if (!accessorRef.current) {
			accessorRef.current = new EntityAccessorImpl<TResult>(
				options.id,
				entityType,
				selectionMeta,
				adapter,
				identityMap,
				state.data,
				notifyChange,
			)
		}

		return accessorRef.current as EntityAccessor<TResult>
	}

	/**
	 * Hook to fetch and manage a list of entities with full type inference.
	 *
	 * @param entityType - Name of the entity (autocompleted from schema)
	 * @param options - Options including filter criteria
	 * @param definer - Fluent builder function or fragment defining which fields to fetch
	 */
	function useEntityList<TEntityName extends keyof TSchema & string, TResult extends object>(
		entityType: TEntityName,
		options: UseEntityListOptions,
		definer: SelectionInput<TSchema[TEntityName], TResult>,
	): EntityListAccessor<TResult> | LoadingEntityListAccessor<TResult> | ErrorEntityListAccessor<TResult> {
		// Track accessor for cleanup
		const accessorRef = useRef<EntityListAccessorImpl<TResult> | null>(null)

		// Use shared data loading hook
		const { state, notifyChange, selectionMeta, identityMap, adapter } = useEntityListData(
			{ entityType, filter: options.filter },
			definer,
		)

		// Cleanup accessor on unmount
		useEffect(() => {
			return () => {
				accessorRef.current?._dispose()
				accessorRef.current = null
			}
		}, [])

		// Return loading state
		if (state.status === 'loading') {
			return createLoadingListAccessor<TResult>()
		}

		// Return error state
		if (state.status === 'error') {
			return createErrorListAccessor<TResult>(state.error)
		}

		// Create or update accessor
		if (!accessorRef.current) {
			accessorRef.current = new EntityListAccessorImpl<TResult>(
				entityType,
				selectionMeta,
				adapter,
				identityMap,
				state.data,
				notifyChange,
			)
		}

		return accessorRef.current as EntityListAccessor<TResult>
	}

	return {
		useEntity,
		useEntityList,
	}
}
