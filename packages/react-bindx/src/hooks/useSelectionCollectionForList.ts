import { useMemo, useRef, type ReactNode } from 'react'
import { createCollectorProxy } from '../jsx/proxy.js'
import { collectSelection } from '../jsx/analyzer.js'
import { SelectionMetaCollector, mergeSelections, toSelectionMeta } from '../jsx/SelectionMeta.js'
import { buildQueryFromSelection } from '@contember/bindx'
import type { SelectionMeta } from '@contember/bindx'
import type { EntityRef } from '../jsx/types.js'

/**
 * Options for useSelectionCollectionForList hook.
 */
export interface UseSelectionCollectionForListOptions<T> {
	/** Entity type name (for debugging) */
	entityType: string
	/** Optional filter (for dependency tracking) */
	filter?: Record<string, unknown>
	/** Children render function - receives entity and index */
	children: (entity: EntityRef<T>, index: number) => ReactNode
}

/**
 * Result from useSelectionCollectionForList hook.
 */
export interface SelectionCollectionForListResult {
	/** JSX selection metadata collector */
	jsxSelection: SelectionMetaCollector
	/** Standard selection metadata for query building */
	standardSelection: SelectionMeta
	/** Stable query key for dependency tracking */
	queryKey: string
}

/**
 * Cached selection data
 */
interface SelectionCache {
	jsxSelection: SelectionMetaCollector
	standardSelection: SelectionMeta
	queryKey: string
}

/**
 * Hook for collecting field selection from JSX children for entity lists.
 * Similar to useSelectionCollection but for list rendering.
 *
 * Calls children once with a collector proxy and index 0 to gather
 * the template selection that will be applied to all items.
 *
 * @internal This hook is for internal use only.
 */
export function useSelectionCollectionForList<T>(
	options: UseSelectionCollectionForListOptions<T>,
): SelectionCollectionForListResult {
	const { entityType, filter, children } = options

	// Stable children ref - we use a ref to avoid re-running useMemo on every render
	const childrenRef = useRef(children)
	childrenRef.current = children

	// Cache for selection to avoid unnecessary refetches
	const selectionCacheRef = useRef<SelectionCache | null>(null)

	// Stable filter key for dependency tracking
	const filterKey = JSON.stringify(filter ?? {})

	// Collection phase - runs on every render but caches based on content
	const result = useMemo((): SelectionCollectionForListResult => {
		// Create collector proxy
		const selection = new SelectionMetaCollector()
		const collector = createCollectorProxy<T>(selection)

		// Call children with collector and index 0 to gather field access template
		const jsx = childrenRef.current(collector, 0)

		// Analyze the returned JSX for component-level selections
		const jsxSel = collectSelection(jsx)
		mergeSelections(selection, jsxSel)

		// Debug output can be enabled via global flag
		if (typeof globalThis !== 'undefined' && (globalThis as Record<string, unknown>)['__BINDX_DEBUG__']) {
			console.log('[EntityList] Collected selection for', entityType, ':')
		}

		// Convert to standard SelectionMeta for the data loading hook
		const standardSel = toSelectionMeta(selection)

		// Create a stable key from the selection to detect actual changes
		const query = buildQueryFromSelection(standardSel)
		const newQueryKey = JSON.stringify({ query, filter })

		// If the selection hasn't actually changed, return cached values
		const cache = selectionCacheRef.current
		if (cache && cache.queryKey === newQueryKey) {
			return cache
		}

		// Update cache with new values
		const newCache: SelectionCache = {
			jsxSelection: selection,
			standardSelection: standardSel,
			queryKey: newQueryKey,
		}
		selectionCacheRef.current = newCache

		return newCache
	}, [entityType, filterKey]) // Only depend on entity identity and filter, not children

	return result
}
