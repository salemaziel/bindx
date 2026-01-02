import { useEffect, useMemo, useReducer, useRef, useState } from 'react'
import { createSelectionBuilder, SELECTION_META, buildQueryFromSelection } from '../selection/index.js'
import type { SelectionBuilder, FluentFragment, SelectionMeta } from '../selection/types.js'
import { EntityAccessorImpl } from '../accessors/EntityAccessor.js'
import type { EntityAccessor, EntityListAccessor } from '../accessors/types.js'
import { EntityListAccessorImpl } from '../accessors/EntityListAccessor.js'
import { useBackendAdapter, useIdentityMap } from './BackendAdapterContext.js'

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
 * Result type for useEntityList when loading
 */
export interface LoadingEntityListAccessor<TData> {
	readonly isLoading: true
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
 * Schema type constraint - maps entity names to their model types.
 * Define your schema as an interface where keys are entity names
 * and values are the corresponding model types.
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
 * export const { useEntity } = createBindx<Schema>()
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
	 * @param definer - Fluent builder function defining which fields to fetch
	 */
	function useEntity<TEntityName extends keyof TSchema & string, TResult extends object>(
		entityType: TEntityName,
		options: UseEntityOptions,
		definer: FluentDefiner<TSchema[TEntityName], TResult> | FluentFragment<TSchema[TEntityName], TResult>,
	): EntityAccessor<TResult> | LoadingEntityAccessor<TResult> {
		type TModel = TSchema[TEntityName]

		const adapter = useBackendAdapter()
		const identityMap = useIdentityMap()

		// Force re-render when accessor notifies changes
		const [, forceUpdate] = useReducer((x: number) => x + 1, 0)

		// Track accessor for cleanup
		const accessorRef = useRef<EntityAccessorImpl<TResult> | null>(null)

		// Extract selection metadata - memoize to prevent re-creation
		const selectionMeta = useMemo((): SelectionMeta => {
			if (typeof definer === 'function') {
				// It's a fluent definer function
				const builder = createSelectionBuilder<TModel>()
				const resultBuilder = definer(builder)
				return resultBuilder[SELECTION_META]
			}
			// It's a FluentFragment
			return definer.__meta
		}, []) // Empty deps - selection definition shouldn't change

		// Accessor state
		const [accessor, setAccessor] = useState<EntityAccessorImpl<TResult> | null>(null)
		const [isLoading, setIsLoading] = useState(true)

		// Fetch entity on mount and when ID changes
		useEffect(() => {
			let cancelled = false

			// Cleanup previous accessor
			if (accessorRef.current) {
				accessorRef.current._dispose()
				accessorRef.current = null
			}

			// Check if we should use cached data
			if (options.cache && identityMap.has(entityType, options.id)) {
				const cachedRecord = identityMap.get(entityType, options.id)
				if (cachedRecord) {
					const newAccessor = new EntityAccessorImpl<TResult>(
						options.id,
						entityType,
						selectionMeta,
						adapter,
						identityMap,
						cachedRecord.data as TResult,
						forceUpdate,
					)

					accessorRef.current = newAccessor
					setAccessor(newAccessor)
					setIsLoading(false)
					return
				}
			}

			setIsLoading(true)

			async function load() {
				try {
					const query = buildQueryFromSelection(selectionMeta)
					const data = await adapter.fetchOne(entityType, options.id, query)

					if (cancelled) return

					// Create accessor with the fetched data
					const newAccessor = new EntityAccessorImpl<TResult>(
						options.id,
						entityType,
						selectionMeta,
						adapter,
						identityMap,
						data as TResult,
						forceUpdate,
					)

					accessorRef.current = newAccessor
					setAccessor(newAccessor)
					setIsLoading(false)
				} catch (error) {
					if (cancelled) return
					console.error(`Failed to fetch ${entityType}:${options.id}:`, error)
					setIsLoading(false)
				}
			}

			load()

			return () => {
				cancelled = true
				// Cleanup accessor on unmount
				if (accessorRef.current) {
					accessorRef.current._dispose()
					accessorRef.current = null
				}
			}
		}, [entityType, options.id, options.cache, adapter, identityMap, selectionMeta])

		// Return loading state or accessor
		if (isLoading || !accessor) {
			return createLoadingAccessor<TResult>(options.id)
		}

		return accessor as EntityAccessor<TResult>
	}

	/**
	 * Hook to fetch and manage a list of entities with full type inference.
	 *
	 * @param entityType - Name of the entity (autocompleted from schema)
	 * @param options - Options including filter criteria
	 * @param definer - Fluent builder function defining which fields to fetch for each entity
	 */
	function useEntityList<TEntityName extends keyof TSchema & string, TResult extends object>(
		entityType: TEntityName,
		options: UseEntityListOptions,
		definer: FluentDefiner<TSchema[TEntityName], TResult> | FluentFragment<TSchema[TEntityName], TResult>,
	): EntityListAccessor<TResult> | LoadingEntityListAccessor<TResult> {
		type TModel = TSchema[TEntityName]

		const adapter = useBackendAdapter()
		const identityMap = useIdentityMap()

		// Force re-render when accessor notifies changes
		const [, forceUpdate] = useReducer((x: number) => x + 1, 0)

		// Track accessor for cleanup
		const accessorRef = useRef<EntityListAccessorImpl<TResult> | null>(null)

		// Extract selection metadata - memoize to prevent re-creation
		const selectionMeta = useMemo((): SelectionMeta => {
			if (typeof definer === 'function') {
				const builder = createSelectionBuilder<TModel>()
				const resultBuilder = definer(builder)
				return resultBuilder[SELECTION_META]
			}
			return definer.__meta
		}, [])

		// Stringify filter for dependency tracking
		const filterKey = useMemo(() => JSON.stringify(options.filter ?? {}), [options.filter])

		// Accessor state
		const [accessor, setAccessor] = useState<EntityListAccessorImpl<TResult> | null>(null)
		const [isLoading, setIsLoading] = useState(true)

		// Fetch entities on mount and when filter changes
		useEffect(() => {
			let cancelled = false

			// Cleanup previous accessor
			if (accessorRef.current) {
				accessorRef.current = null
			}

			setIsLoading(true)

			async function load() {
				try {
					if (!adapter.fetchMany) {
						throw new Error('Backend adapter does not support fetchMany')
					}

					const query = buildQueryFromSelection(selectionMeta)
					const data = await adapter.fetchMany(entityType, query, options.filter)

					if (cancelled) return

					// Create accessor with the fetched data
					const newAccessor = new EntityListAccessorImpl<TResult>(
						entityType,
						selectionMeta,
						adapter,
						identityMap,
						data as TResult[],
						forceUpdate,
					)

					accessorRef.current = newAccessor
					setAccessor(newAccessor)
					setIsLoading(false)
				} catch (error) {
					if (cancelled) return
					console.error(`Failed to fetch ${entityType} list:`, error)
					setIsLoading(false)
				}
			}

			load()

			return () => {
				cancelled = true
				accessorRef.current = null
			}
		}, [entityType, filterKey, adapter, identityMap, selectionMeta, options.filter])

		// Return loading state or accessor
		if (isLoading || !accessor) {
			return createLoadingListAccessor<TResult>()
		}

		return accessor as EntityListAccessor<TResult>
	}
	return {
		useEntity,
		useEntityList,
	}
}
