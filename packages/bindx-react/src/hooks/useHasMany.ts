import { useSyncExternalStore } from 'react'
import { type HasManyRef, type HasManyAccessor, FIELD_REF_META } from '@contember/bindx'
import { useSnapshotStore } from './BackendAdapterContext.js'
import type { AnyBrand } from '@contember/bindx'

/**
 * Subscribes to a has-many ref and returns a HasManyAccessor with live collection access.
 *
 * At runtime, HasManyRef proxies already have .items/.length/.map —
 * this hook adds a store subscription so the component re-renders on changes,
 * and widens the type to HasManyAccessor.
 */
export function useHasMany<
	TEntity,
	TSelected = TEntity,
	TBrand extends AnyBrand = AnyBrand,
	TEntityName extends string = string,
	TSchema extends Record<string, object> = Record<string, object>,
>(ref: HasManyRef<TEntity, TSelected, TBrand, TEntityName, TSchema>): HasManyAccessor<TEntity, TSelected, TBrand, TEntityName, TSchema> {
	const store = useSnapshotStore()
	const meta = ref[FIELD_REF_META]

	useSyncExternalStore(
		(callback) => store.subscribeToEntity(meta.entityType, meta.entityId, callback),
		() => store.getVersion(),
		() => store.getVersion(),
	)

	return ref as unknown as HasManyAccessor<TEntity, TSelected, TBrand, TEntityName, TSchema>
}
