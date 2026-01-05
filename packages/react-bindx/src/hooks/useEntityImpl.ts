import { useRef, useEffect, useMemo } from 'react'
import type { SchemaRegistry } from '@contember/bindx'
import { EntityHandle } from '@contember/bindx'
import { useBindxContext } from './BackendAdapterContext.js'
import { useEntityCore } from './useEntityCore.js'
import { resolveSelectionMeta, type SelectionInput } from '@contember/bindx'
import type { SelectionMeta } from '@contember/bindx'
import type { EntityFields } from '@contember/bindx'
import { deepEqual } from '@contember/bindx'

/**
 * Options for useEntity hook
 */
export interface UseEntityOptions {
	/** Entity ID to fetch */
	id: string
	/** If true, use cached data from store if available (default: false) */
	cache?: boolean
}

/**
 * Loading state for entity accessor
 */
export interface LoadingEntityAccessor {
	readonly status: 'loading'
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
 * Error state for entity accessor
 */
export interface ErrorEntityAccessor {
	readonly status: 'error'
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
 * Ready state for entity accessor
 */
export interface ReadyEntityAccessor<T extends object> {
	readonly status: 'ready'
	readonly isLoading: false
	readonly isError: false
	readonly isPersisting: boolean
	readonly isDirty: boolean
	readonly id: string
	readonly fields: EntityFields<T>
	readonly data: T
	persist(): Promise<void>
	reset(): void
}

/**
 * Union of all entity accessor states
 */
export type EntityAccessorResult<T extends object> =
	| LoadingEntityAccessor
	| ErrorEntityAccessor
	| ReadyEntityAccessor<T>

/**
 * Creates a loading accessor placeholder
 */
function createLoadingAccessor(id: string): LoadingEntityAccessor {
	return {
		status: 'loading',
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
 * Creates an error accessor placeholder
 */
function createErrorAccessor(id: string, error: Error): ErrorEntityAccessor {
	return {
		status: 'error',
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
 * Generic implementation of useEntity hook.
 * Used by createBindx to create typed versions.
 *
 * @internal
 */
export function useEntityImpl<TResult extends object>(
	entityType: string,
	options: UseEntityOptions,
	selectionMeta: SelectionMeta,
	schema: SchemaRegistry<Record<string, object>>,
): EntityAccessorResult<TResult> {
	const { store, dispatcher, persistence } = useBindxContext()

	// Use core hook for data loading
	const coreResult = useEntityCore({
		entityType,
		id: options.id,
		selectionMeta,
		cache: options.cache,
	})

	// Create stable handle (memoized on id/type)
	const handle = useMemo(
		() => new EntityHandle<TResult>(options.id, entityType, store, dispatcher, schema),
		[options.id, entityType, store, dispatcher, schema],
	)

	// Cleanup handle on unmount
	useEffect(() => {
		return () => {
			handle.dispose()
		}
	}, [handle])

	// Build accessor from core result
	const accessor = useMemo((): EntityAccessorResult<TResult> => {
		if (coreResult.status === 'loading') {
			return createLoadingAccessor(options.id)
		}

		if (coreResult.status === 'error') {
			return createErrorAccessor(options.id, coreResult.error!)
		}

		if (coreResult.status === 'not_found') {
			return createLoadingAccessor(options.id) // Treat not_found as loading for now
		}

		// Ready state
		const snapshot = coreResult.snapshot!
		const isDirty = !deepEqual(snapshot.data, snapshot.serverData)

		return {
			status: 'ready',
			isLoading: false,
			isError: false,
			isPersisting: coreResult.isPersisting,
			isDirty,
			id: options.id,
			fields: handle.fields as EntityFields<TResult>,
			data: snapshot.data as TResult,
			async persist() {
				await persistence.persist(entityType, options.id)
			},
			reset() {
				handle.reset()
			},
		}
	}, [coreResult, options.id, handle, persistence, entityType])

	return accessor
}
