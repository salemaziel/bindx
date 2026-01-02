import { useEffect, useMemo, useReducer, useState } from 'react'
import { createModelProxy } from '../proxy/index.js'
import type { ModelProxy, UnwrapProxy } from '../proxy/types.js'
import { extractFragmentMeta, buildQuery } from '../fragment/index.js'
import type { Fragment, FragmentDefiner } from '../fragment/types.js'
import { EntityAccessorImpl } from '../accessors/EntityAccessor.js'
import type { EntityAccessor } from '../accessors/types.js'
import { useBackendAdapter, useIdentityMap } from './BackendAdapterContext.js'

/**
 * Options for useEntity hook
 */
export interface UseEntityOptions {
	/** Entity ID to fetch */
	id: string
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
 * Hook to fetch and manage a single entity.
 *
 * @example
 * ```tsx
 * function ArticleEditor({ id }: { id: string }) {
 *   const article = useEntity<Article>('Article', { id }, e => ({
 *     title: e.title,
 *     content: e.content,
 *     author: {
 *       name: e.author.name,
 *     },
 *   }))
 *
 *   if (article.isLoading) return <div>Loading...</div>
 *
 *   return (
 *     <input
 *       value={article.fields.title.value ?? ''}
 *       onChange={e => article.fields.title.setValue(e.target.value)}
 *     />
 *   )
 * }
 * ```
 */
export function useEntity<TModel, TResult extends object>(
	entityType: string,
	options: UseEntityOptions,
	fragmentOrDefiner: FragmentDefiner<TModel, TResult> | Fragment<TModel, TResult>,
): EntityAccessor<UnwrapProxy<TResult> & object> | LoadingEntityAccessor<UnwrapProxy<TResult> & object> {
	type UnwrappedResult = UnwrapProxy<TResult> & object
	const adapter = useBackendAdapter()
	const identityMap = useIdentityMap()

	// Force re-render when accessor notifies changes
	const [, forceUpdate] = useReducer((x: number) => x + 1, 0)

	// Normalize fragment - memoize to prevent re-creation
	const fragment = useMemo(() => {
		if (typeof fragmentOrDefiner === 'function') {
			// It's a definer function, wrap it
			const proxy = createModelProxy<TModel>()
			const result = fragmentOrDefiner(proxy)
			const meta = extractFragmentMeta(result)
			return { __meta: meta, __resultType: result }
		}
		// It's already a Fragment
		return fragmentOrDefiner
	}, []) // Empty deps - fragment definition shouldn't change

	// Accessor state
	const [accessor, setAccessor] = useState<EntityAccessorImpl<UnwrappedResult> | null>(null)
	const [isLoading, setIsLoading] = useState(true)

	// Fetch entity on mount and when ID changes
	useEffect(() => {
		let cancelled = false
		setIsLoading(true)

		async function load() {
			try {
				const query = buildQuery(fragment.__meta)
				const data = await adapter.fetchOne(entityType, options.id, query)

				if (cancelled) return

				// Create accessor with the fetched data
				const newAccessor = new EntityAccessorImpl<UnwrappedResult>(
					options.id,
					entityType,
					fragment.__meta,
					adapter,
					identityMap,
					data as UnwrappedResult,
					forceUpdate,
				)

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
		}
	}, [entityType, options.id, adapter, identityMap, fragment.__meta])

	// Return loading state or accessor
	if (isLoading || !accessor) {
		return createLoadingAccessor<UnwrappedResult>(options.id)
	}

	return accessor as EntityAccessor<UnwrappedResult>
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
 * Type guard to check if accessor is loading
 */
export function isLoading<TData>(
	accessor: EntityAccessor<TData> | LoadingEntityAccessor<TData>,
): accessor is LoadingEntityAccessor<TData> {
	return accessor.isLoading === true
}
