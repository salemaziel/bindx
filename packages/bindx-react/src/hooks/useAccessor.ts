import { useSyncExternalStore } from 'react'
import {
	type FieldRef,
	type FieldAccessor,
	type HasManyRef,
	type HasManyAccessor,
	type HasOneRef,
	type HasOneAccessor,
	type EntityRef,
	type EntityAccessor,
	type AnyBrand,
	FIELD_REF_META,
	type FieldRefMeta,
} from '@contember/bindx'
import { useSnapshotStore } from './BackendAdapterContext.js'

const noopSubscribe = (): (() => void) => () => {}
const noopSnapshot = (): number => 0

/**
 * Subscribes to a ref and returns the corresponding accessor with live data access.
 *
 * At runtime, ref proxies already have all accessor properties —
 * this hook adds a store subscription so the component re-renders on changes,
 * and widens the type to the accessor variant.
 *
 * Works with all ref types: FieldRef, HasOneRef, HasManyRef, EntityRef.
 */
export function useAccessor<T>(ref: FieldRef<T>): FieldAccessor<T>
export function useAccessor<T>(ref: FieldRef<T> | null): FieldAccessor<T> | null
export function useAccessor<
	TEntity,
	TSelected = TEntity,
	TBrand extends AnyBrand = AnyBrand,
	TEntityName extends string = string,
	TSchema extends Record<string, object> = Record<string, object>,
>(ref: HasManyRef<TEntity, TSelected, TBrand, TEntityName, TSchema>): HasManyAccessor<TEntity, TSelected, TBrand, TEntityName, TSchema>
export function useAccessor<
	TEntity,
	TSelected = TEntity,
	TBrand extends AnyBrand = AnyBrand,
	TEntityName extends string = string,
	TSchema extends Record<string, object> = Record<string, object>,
>(ref: HasOneRef<TEntity, TSelected, TBrand, TEntityName, TSchema>): HasOneAccessor<TEntity, TSelected, TBrand, TEntityName, TSchema>
export function useAccessor<
	TEntity,
	TSelected = TEntity,
	TBrand extends AnyBrand = AnyBrand,
	TEntityName extends string = string,
	TSchema extends Record<string, object> = Record<string, object>,
	TRoleMap extends Record<string, object> = Record<string, object>,
>(ref: EntityRef<TEntity, TSelected, TBrand, TEntityName, TSchema, TRoleMap>): EntityAccessor<TEntity, TSelected, TBrand, TEntityName, TSchema, TRoleMap>
export function useAccessor(ref: { [FIELD_REF_META]: FieldRefMeta } | null): unknown {
	const store = useSnapshotStore()
	const meta = ref?.[FIELD_REF_META]

	useSyncExternalStore(
		meta ? (callback) => store.subscribeToEntity(meta.entityType, meta.entityId, callback) : noopSubscribe,
		meta ? () => store.getVersion() : noopSnapshot,
		meta ? () => store.getVersion() : noopSnapshot,
	)

	return ref
}
