import { useRef, useEffect, useMemo, useCallback } from 'react'
import { useBindxContext } from './BackendAdapterContext.js'
import { useStoreSubscription } from './useStoreSubscription.js'
import { setEntityData } from '@contember/bindx'
import { buildQueryFromSelection } from '@contember/bindx'
import type { SelectionMeta } from '@contember/bindx'

/**
 * Options for useEntityListCore hook.
 */
export interface UseEntityListCoreOptions {
	/** Entity type name */
	entityType: string
	/** Optional filter criteria */
	filter?: Record<string, unknown>
	/** Pre-resolved selection metadata */
	selectionMeta: SelectionMeta
	/** Optional query key for cache invalidation */
	queryKey?: string
}

/**
 * Item in the entity list result
 */
export interface EntityListCoreItem {
	id: string
	data: Record<string, unknown>
}

/**
 * Result from useEntityListCore hook.
 */
export interface EntityListCoreResult {
	/** Current load status */
	status: 'loading' | 'error' | 'ready'
	/** Error if status is 'error' */
	error?: Error
	/** List items when ready */
	items: EntityListCoreItem[]
}

/**
 * Snapshot data for store subscription
 */
interface ListSubscriptionSnapshot {
	status: 'loading' | 'error' | 'ready'
	items: EntityListCoreItem[]
	error?: Error
}

/**
 * Core hook for entity list data loading.
 * Handles store subscription, data fetching, and state management.
 *
 * This hook accepts pre-resolved SelectionMeta, allowing it to be used by:
 * - EntityList component (which collects JSX selection to SelectionMeta)
 *
 * @internal This hook is for internal use only.
 */
export function useEntityListCore(options: UseEntityListCoreOptions): EntityListCoreResult {
	const { entityType, filter, selectionMeta, queryKey } = options
	const { store, dispatcher, adapter } = useBindxContext()

	// Generate stable filter key for dependency tracking
	const filterKey = useMemo(
		() => JSON.stringify(filter ?? {}),
		[filter],
	)

	// Create stable query key from selection if not provided
	const effectiveQueryKey = useMemo(() => {
		if (queryKey) return queryKey
		const query = buildQueryFromSelection(selectionMeta)
		return JSON.stringify({ query, filter })
	}, [queryKey, selectionMeta, filter])

	// Track list state in a ref
	const listStateRef = useRef<{
		status: 'loading' | 'error' | 'ready'
		items: EntityListCoreItem[]
		error?: Error
	}>({
		status: 'loading',
		items: [],
	})

	// Version for change detection
	const versionRef = useRef(0)

	// Cache for snapshot to ensure referential stability
	const listCacheRef = useRef<{
		version: number
		status: string
		result: EntityListCoreResult
	} | null>(null)

	// Subscribe to store changes
	const subscribe = useCallback(
		(onStoreChange: () => void) => {
			return store.subscribe(onStoreChange)
		},
		[store],
	)

	// Get current snapshot
	const getSnapshot = useCallback((): ListSubscriptionSnapshot => {
		const state = listStateRef.current
		const version = versionRef.current

		// Check if we can reuse cached result
		const cache = listCacheRef.current
		if (cache && cache.version === version && cache.status === state.status) {
			return cache.result
		}

		const result: ListSubscriptionSnapshot = {
			status: state.status,
			items: state.items,
			error: state.error,
		}

		// Cache the result
		listCacheRef.current = {
			version,
			status: state.status,
			result,
		}

		return result
	}, [])

	// Custom equality - reference equality since we cache
	const isEqual = useCallback(
		(a: ListSubscriptionSnapshot, b: ListSubscriptionSnapshot): boolean => {
			return a === b
		},
		[],
	)

	// Use store subscription
	const snapshot = useStoreSubscription({
		subscribe,
		getSnapshot,
		isEqual,
	})

	// Load data
	useEffect(() => {
		const abortController = new AbortController()

		listStateRef.current = { status: 'loading', items: [] }
		versionRef.current++

		const fetchData = async (): Promise<void> => {
			try {
				if (!adapter.fetchMany) {
					throw new Error('Adapter does not support fetchMany')
				}

				const query = buildQueryFromSelection(selectionMeta)
				const results = await adapter.fetchMany(
					entityType,
					query,
					filter,
					{ signal: abortController.signal },
				)

				if (abortController.signal.aborted) return

				// Store each entity in the SnapshotStore
				const items = results.map((result) => {
					const id = result['id'] as string
					dispatcher.dispatch(
						setEntityData(entityType, id, result, true),
					)
					return { id, data: result as Record<string, unknown> }
				})

				listStateRef.current = { status: 'ready', items }
				versionRef.current++
				store.notify()
			} catch (error) {
				if (abortController.signal.aborted) return

				listStateRef.current = {
					status: 'error',
					items: [],
					error: error instanceof Error ? error : new Error(String(error)),
				}
				versionRef.current++
				store.notify()
			}
		}

		fetchData()

		return () => {
			abortController.abort()
		}
	}, [entityType, filterKey, effectiveQueryKey, adapter, dispatcher, store, selectionMeta, filter])

	return snapshot
}
