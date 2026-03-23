import { useRef, useEffect, useMemo, useCallback } from 'react'
import type {
	EntityDef,
	EntityUniqueWhere,
	SchemaRegistry,
	SelectionInput,
	SelectionMeta,
	FieldError,
	EntitySnapshot,
	LoadStatus,
	SelectedEntityFields,
	CommonEntity,
	EntityForRoles,
	RoleNames,
	EntityAccessor,
} from '@contember/bindx'
import {
	EntityHandle,
	resolveSelectionMeta,
	buildQueryFromSelection,
	setEntityData,
	setLoadState,
	createLoadError,
} from '@contember/bindx'
import { useBindxContext, useSchemaRegistry } from './BackendAdapterContext.js'
import { useStoreSubscription } from './useStoreSubscription.js'

// ============================================================================
// Options
// ============================================================================

/**
 * Options for useEntity hook
 */
export interface UseEntityOptions {
	/** Unique field(s) to identify the entity (e.g., { id: '...' } or { slug: '...' }) */
	by: EntityUniqueWhere
	/** If true, use cached data from store if available (default: false) */
	cache?: boolean
	/**
	 * Pre-resolved selection metadata.
	 * When provided, definer (3rd argument) is not needed.
	 * Used internally by Entity component.
	 */
	selection?: SelectionMeta
	/** Optional query key for cache invalidation */
	queryKey?: string
}

// ============================================================================
// Result types
// ============================================================================

/**
 * Common properties on every UseEntityResult state.
 * All prefixed with $ to avoid collision with entity field names.
 */
interface UseEntityResultBase {
	readonly $isLoading: boolean
	readonly $isError: boolean
	readonly $isNotFound: boolean
	readonly $error: FieldError | null
	$persist(): Promise<void>
	$reset(): void
}

/**
 * Loading/error/not_found state — field access throws.
 */
export type PendingEntityResult = UseEntityResultBase & {
	readonly $status: 'loading' | 'error' | 'not_found'
	readonly id: string
}

/**
 * Ready state — full EntityAccessor with status metadata.
 */
export type ReadyEntityResult<TEntity extends object, TSelected extends object = TEntity> =
	UseEntityResultBase & EntityAccessor<TEntity, TSelected> & {
		readonly $status: 'ready'
	}

/**
 * Union of all useEntity return states.
 * Discriminated on $status.
 */
export type UseEntityResult<TEntity extends object, TSelected extends object = TEntity> =
	| PendingEntityResult
	| ReadyEntityResult<TEntity, TSelected>

// ============================================================================
// Hook overloads
// ============================================================================

/**
 * Hook to fetch and manage a single entity with role-expanded type inference.
 */
export function useEntity<
	TRoleMap extends Record<string, object>,
	TRoles extends RoleNames<TRoleMap>,
	TResult extends object,
>(
	entity: EntityDef<TRoleMap>,
	options: UseEntityOptions & { roles: readonly TRoles[] },
	definer: SelectionInput<EntityForRoles<TRoleMap, TRoles>, TResult>,
): UseEntityResult<EntityForRoles<TRoleMap, TRoles>, TResult>

/**
 * Hook to fetch and manage a single entity with full type inference.
 *
 * @example
 * ```tsx
 * const article = useEntity(schema.Article, { by: { id } }, e => e.title().content())
 * if (article.$status !== 'ready') return <Loading />
 * return <input value={article.title.value} onChange={...} />
 * ```
 */
export function useEntity<TRoleMap extends Record<string, object>, TResult extends object>(
	entity: EntityDef<TRoleMap>,
	options: UseEntityOptions,
	definer: SelectionInput<CommonEntity<TRoleMap>, TResult>,
): UseEntityResult<CommonEntity<TRoleMap>, TResult>

/**
 * Hook to fetch and manage a single entity with pre-resolved selection.
 * Used internally by Entity component that collects selection from JSX.
 */
export function useEntity(
	entity: EntityDef,
	options: UseEntityOptions & { selection: SelectionMeta },
): UseEntityResult<object, object>

// ============================================================================
// Implementation
// ============================================================================

export function useEntity(
	entity: EntityDef<any>,
	options: UseEntityOptions,
	definer?: SelectionInput<any, any>,
): UseEntityResult<any, any> {
	const schemaRegistry = useSchemaRegistry()
	const entityType = entity.$name
	const { store, dispatcher, batcher, batchPersister } = useBindxContext()

	// --- Selection resolution ---
	const resolvedMeta = definer ? resolveSelectionMeta(definer) : null
	const definerQueryKey = resolvedMeta ? JSON.stringify(buildQueryFromSelection(resolvedMeta)) : null
	const selectionRef = useRef<{ meta: SelectionMeta; queryKey: string } | null>(null)

	if (definerQueryKey && resolvedMeta) {
		if (!selectionRef.current || selectionRef.current.queryKey !== definerQueryKey) {
			selectionRef.current = { meta: resolvedMeta, queryKey: definerQueryKey }
		}
	}

	const selectionMeta = definer ? selectionRef.current!.meta : options.selection!

	// --- Derive ID from 'by' ---
	const by = options.by
	const id = useMemo(() => {
		if ('id' in by && typeof by['id'] === 'string') {
			return by['id']
		}
		const firstValue = Object.values(by)[0]
		return typeof firstValue === 'string' ? firstValue : String(firstValue)
	}, [by])

	const byKey = useMemo(() => JSON.stringify(by), [by])
	const byRef = useRef(by)
	byRef.current = by

	// --- Effective query key ---
	const effectiveQueryKey = useMemo(() => {
		if (options.queryKey) return options.queryKey
		const query = buildQueryFromSelection(selectionMeta)
		return JSON.stringify(query)
	}, [options.queryKey, selectionMeta])

	// --- Store subscription ---
	const subscribe = useCallback(
		(callback: () => void) => {
			return store.subscribeToEntity(entityType, id, callback)
		},
		[store, entityType, id],
	)

	interface SubscriptionSnapshot {
		snapshot: EntitySnapshot | undefined
		loadState: { status: LoadStatus; error?: FieldError } | undefined
		isPersisting: boolean
	}

	const getSnapshot = useCallback((): SubscriptionSnapshot => {
		return {
			snapshot: store.getEntitySnapshot(entityType, id),
			loadState: store.getLoadState(entityType, id),
			isPersisting: store.isPersisting(entityType, id),
		}
	}, [store, entityType, id])

	const isEqual = useCallback((a: SubscriptionSnapshot, b: SubscriptionSnapshot): boolean => {
		return (
			a.snapshot === b.snapshot &&
			a.loadState?.status === b.loadState?.status &&
			a.isPersisting === b.isPersisting
		)
	}, [])

	const { snapshot, loadState, isPersisting } = useStoreSubscription({
		subscribe,
		getSnapshot,
		isEqual,
	})

	// --- Data loading ---
	const fetchingRef = useRef<string | null>(null)

	useEffect(() => {
		// Check cache first
		if (options.cache && store.hasEntity(entityType, id)) {
			dispatcher.dispatch(setLoadState(entityType, id, 'success'))
			return
		}

		// Skip if already fetching same data
		const fetchKey = `${entityType}:${byKey}:${effectiveQueryKey}`
		if (fetchingRef.current === fetchKey) {
			return
		}
		fetchingRef.current = fetchKey

		const abortController = new AbortController()

		dispatcher.dispatch(setLoadState(entityType, id, 'loading'))

		const fetchData = async (): Promise<void> => {
			try {
				const spec = buildQueryFromSelection(selectionMeta)
				const currentBy = byRef.current
				const result = await batcher.enqueue(
					{ type: 'get', entityType, by: currentBy, spec },
					{ signal: abortController.signal },
				)

				if (abortController.signal.aborted) return

				if (result.type === 'get' && result.data === null) {
					dispatcher.dispatch(setLoadState(entityType, id, 'not_found'))
				} else if (result.type === 'get' && result.data) {
					dispatcher.dispatch(
						setEntityData(entityType, id, result.data, true),
					)
					dispatcher.dispatch(setLoadState(entityType, id, 'success'))
				}
			} catch (error) {
				if (abortController.signal.aborted) return
				if (error instanceof Error && error.name === 'AbortError') return

				const normalizedError = error instanceof Error ? error : new Error(String(error))
				dispatcher.dispatch(
					setLoadState(entityType, id, 'error', createLoadError(normalizedError)),
				)
			}
		}

		fetchData()

		return () => {
			abortController.abort()
			if (fetchingRef.current === fetchKey) {
				fetchingRef.current = null
			}
		}
	}, [entityType, id, byKey, effectiveQueryKey, options.cache, batcher, store, dispatcher, selectionMeta])

	// --- EntityHandle ---
	const handle = useMemo(
		() => EntityHandle.create(id, entityType, store, dispatcher, schemaRegistry as SchemaRegistry<Record<string, object>>),
		[id, entityType, store, dispatcher, schemaRegistry, snapshot],
	)

	useEffect(() => {
		return () => {
			handle.dispose()
		}
	}, [handle])

	// --- Persist & reset callbacks ---
	const persist = useCallback(async () => {
		await batchPersister.persist(entityType, id)
	}, [batchPersister, entityType, id])

	const reset = useCallback(() => {
		handle.$reset()
	}, [handle])

	// --- Build result ---
	const result = useMemo((): UseEntityResult<any, any> => {
		const status = !loadState || loadState.status === 'loading'
			? 'loading' as const
			: loadState.status === 'error'
				? 'error' as const
				: loadState.status === 'not_found'
					? 'not_found' as const
					: !snapshot
						? 'loading' as const
						: 'ready' as const

		const error = loadState?.status === 'error' ? loadState.error! : null

		if (status !== 'ready') {
			return createPendingResult(status, id, error, persist, reset)
		}

		// Ready — return the EntityHandle (which is already a proxy with field access)
		// plus $status and result metadata
		return createReadyResult(handle, error, isPersisting, persist, reset)
	}, [snapshot, loadState, isPersisting, id, handle, persist, reset])

	return result
}

// ============================================================================
// Result factories
// ============================================================================

function createPendingResult(
	status: 'loading' | 'error' | 'not_found',
	id: string,
	error: FieldError | null,
	persist: () => Promise<void>,
	reset: () => void,
): PendingEntityResult {
	return {
		$status: status,
		$isLoading: status === 'loading',
		$isError: status === 'error',
		$isNotFound: status === 'not_found',
		$error: error,
		id,
		$persist: persist,
		$reset: reset,
	}
}

function createReadyResult(
	handle: EntityHandle<any, any>,
	error: FieldError | null,
	isPersisting: boolean,
	persist: () => Promise<void>,
	reset: () => void,
): ReadyEntityResult<any, any> {
	// The handle IS already a proxied EntityAccessor.
	// We need to layer $status/$isLoading/etc. on top without breaking field access.
	// Use a Proxy that checks our metadata properties first, then delegates to handle.
	const meta = {
		$status: 'ready' as const,
		$isLoading: false,
		$isError: false,
		$isNotFound: false,
		$error: error,
		$persist: persist,
		$reset: reset,
	}

	return new Proxy(handle as any, {
		get(target, prop, receiver) {
			// Check metadata properties first
			if (typeof prop === 'string' && prop in meta) {
				return (meta as any)[prop]
			}
			// isPersisting override — handle may have stale value
			if (prop === '$isPersisting') {
				return isPersisting
			}
			// Everything else delegates to handle (which already has field access proxy)
			return Reflect.get(target, prop, receiver)
		},
		has(target, prop) {
			if (typeof prop === 'string' && prop in meta) {
				return true
			}
			return Reflect.has(target, prop)
		},
	}) as any
}
