import { useRef, useEffect, useMemo, useCallback } from 'react'
import type { SchemaRegistry } from '@contember/bindx'
import { EntityHandle } from '@contember/bindx'
import { useBindxContext } from './BackendAdapterContext.js'
import { useStoreSubscription } from './useStoreSubscription.js'
import { setEntityData, setLoadState } from '@contember/bindx'
import { buildQueryFromSelection } from '@contember/bindx'
import type { SelectionMeta } from '@contember/bindx'
import type { EntityFields } from '@contember/bindx'

/**
 * Options for useEntityList hook
 */
export interface UseEntityListOptions {
	/** Optional filter criteria */
	filter?: Record<string, unknown>
}

/**
 * Loading state for entity list accessor
 */
export interface LoadingEntityListAccessor {
	readonly status: 'loading'
	readonly isLoading: true
	readonly isError: false
	readonly isDirty: false
	readonly items: never
	readonly length: 0
	add(data: unknown): void
	remove(key: string): void
	move(fromIndex: number, toIndex: number): void
}

/**
 * Error state for entity list accessor
 */
export interface ErrorEntityListAccessor {
	readonly status: 'error'
	readonly isLoading: false
	readonly isError: true
	readonly error: Error
	readonly isDirty: false
	readonly items: never
	readonly length: 0
	add(data: unknown): void
	remove(key: string): void
	move(fromIndex: number, toIndex: number): void
}

/**
 * Ready state for entity list accessor
 */
export interface ReadyEntityListAccessor<T extends object> {
	readonly status: 'ready'
	readonly isLoading: false
	readonly isError: false
	readonly isDirty: boolean
	readonly items: Array<{
		id: string
		key: string
		handle: EntityHandle<T>
		/** @deprecated Use handle instead */
		entity: EntityHandle<T>
		fields: EntityFields<T>
		data: T
	}>
	readonly length: number
	add(data: Partial<T>): void
	remove(key: string): void
	move(fromIndex: number, toIndex: number): void
}

/**
 * Union of all entity list accessor states
 */
export type EntityListAccessorResult<T extends object> =
	| LoadingEntityListAccessor
	| ErrorEntityListAccessor
	| ReadyEntityListAccessor<T>

function createLoadingListAccessor(): LoadingEntityListAccessor {
	return {
		status: 'loading',
		isLoading: true,
		isError: false,
		isDirty: false,
		get items(): never {
			throw new Error('Cannot access items while loading')
		},
		length: 0,
		add() {},
		remove() {},
		move() {},
	}
}

function createErrorListAccessor(error: Error): ErrorEntityListAccessor {
	return {
		status: 'error',
		isLoading: false,
		isError: true,
		error,
		isDirty: false,
		get items(): never {
			throw new Error('Cannot access items after error')
		},
		length: 0,
		add() {},
		remove() {},
		move() {},
	}
}

/**
 * Generic implementation of useEntityList hook.
 * Used by createBindx to create typed versions.
 *
 * @internal
 */
export function useEntityListImpl<TResult extends object>(
	entityType: string,
	options: UseEntityListOptions,
	selectionMeta: SelectionMeta,
	schema: SchemaRegistry<Record<string, object>>,
): EntityListAccessorResult<TResult> {
	const { store, dispatcher, adapter } = useBindxContext()

	// Generate stable filter key for dependency tracking
	const filterKey = useMemo(
		() => JSON.stringify(options.filter ?? {}),
		[options.filter],
	)

	// Track list state in a ref
	const listStateRef = useRef<{
		status: 'loading' | 'error' | 'ready'
		items: Array<{ id: string; data: TResult }>
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
		result: EntityListAccessorResult<TResult>
	} | null>(null)

	// Subscribe to store changes
	const subscribe = useCallback(
		(onStoreChange: () => void) => {
			return store.subscribe(onStoreChange)
		},
		[store],
	)

	// Get current snapshot - must return stable references
	const getSnapshot = useCallback((): EntityListAccessorResult<TResult> => {
		const state = listStateRef.current
		const version = versionRef.current

		// Check if we can reuse cached result
		const cache = listCacheRef.current
		if (cache && cache.version === version && cache.status === state.status) {
			return cache.result
		}

		let result: EntityListAccessorResult<TResult>

		if (state.status === 'loading') {
			result = createLoadingListAccessor()
		} else if (state.status === 'error') {
			result = createErrorListAccessor(state.error!)
		} else {
			// Build item handles
			const items = state.items.map((item) => {
				const handle = new EntityHandle<TResult>(
					item.id,
					entityType,
					store,
					dispatcher,
					schema,
				)
				return {
					id: item.id,
					key: item.id,
					handle,
					entity: handle, // Legacy alias
					fields: handle.fields as EntityFields<TResult>,
					data: item.data,
				}
			})

			result = {
				status: 'ready',
				isLoading: false,
				isError: false,
				isDirty: false,
				items,
				length: items.length,
				add() {
					// TODO: Implement
				},
				remove() {
					// TODO: Implement
				},
				move() {
					// TODO: Implement
				},
			}
		}

		// Cache the result
		listCacheRef.current = {
			version,
			status: state.status,
			result,
		}

		return result
	}, [entityType, store, dispatcher, schema])

	// Custom equality - always false since getSnapshot returns cached values
	const isEqual = useCallback(
		(a: EntityListAccessorResult<TResult>, b: EntityListAccessorResult<TResult>): boolean => {
			return a === b
		},
		[],
	)

	// Use store subscription
	const accessor = useStoreSubscription({
		subscribe,
		getSnapshot,
		isEqual,
	})

	// Load data
	useEffect(() => {
		const abortController = new AbortController()

		listStateRef.current = { status: 'loading', items: [] }
		versionRef.current++

		const fetchData = async () => {
			try {
				if (!adapter.fetchMany) {
					throw new Error('Adapter does not support fetchMany')
				}

				const query = buildQueryFromSelection(selectionMeta)
				const results = await adapter.fetchMany(
					entityType,
					query,
					options.filter,
					{ signal: abortController.signal },
				)

				if (abortController.signal.aborted) return

				// Store each entity in the SnapshotStore
				const items = results.map((result) => {
					const id = result['id'] as string
					dispatcher.dispatch(
						setEntityData(entityType, id, result, true),
					)
					return { id, data: result as TResult }
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
	}, [entityType, filterKey, adapter, dispatcher, selectionMeta, options.filter])

	return accessor
}
