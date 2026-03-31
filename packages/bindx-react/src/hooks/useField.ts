import { useSyncExternalStore } from 'react'
import { type FieldRef, type FieldAccessor, FIELD_REF_META } from '@contember/bindx'
import { useSnapshotStore } from './BackendAdapterContext.js'

const noopSubscribe = () => () => {}
const noopSnapshot = () => 0

/**
 * Subscribes to a field ref and returns a FieldAccessor with live value access.
 *
 * At runtime, FieldRef proxies already have .value/.serverValue/.isDirty —
 * this hook adds a store subscription so the component re-renders on changes,
 * and widens the type to FieldAccessor.
 *
 * Accepts null — returns null without subscribing (useful for conditional fields).
 */
export function useField<T>(ref: FieldRef<T>): FieldAccessor<T>
export function useField<T>(ref: FieldRef<T> | null): FieldAccessor<T> | null
export function useField<T>(ref: FieldRef<T> | null): FieldAccessor<T> | null {
	const store = useSnapshotStore()
	const meta = ref?.[FIELD_REF_META]

	useSyncExternalStore(
		meta ? (callback) => store.subscribeToEntity(meta.entityType, meta.entityId, callback) : noopSubscribe,
		meta ? () => store.getVersion() : noopSnapshot,
		meta ? () => store.getVersion() : noopSnapshot,
	)

	return ref as unknown as FieldAccessor<T> | null
}
