import { useSyncExternalStore } from 'react'
import { type HasOneRef, type HasOneAccessor, FIELD_REF_META } from '@contember/bindx'
import { useSnapshotStore } from './BackendAdapterContext.js'
import type { AnyBrand } from '@contember/bindx'

/**
 * Subscribes to a has-one ref and returns a HasOneAccessor with live state access.
 *
 * At runtime, HasOneRef proxies already have .$state/.$data/.$entity/.$fields —
 * this hook adds a store subscription so the component re-renders on changes,
 * and widens the type to HasOneAccessor.
 */
export function useHasOne<
	TEntity,
	TSelected = TEntity,
	TBrand extends AnyBrand = AnyBrand,
	TEntityName extends string = string,
	TSchema extends Record<string, object> = Record<string, object>,
>(ref: HasOneRef<TEntity, TSelected, TBrand, TEntityName, TSchema>): HasOneAccessor<TEntity, TSelected, TBrand, TEntityName, TSchema> {
	const store = useSnapshotStore()
	const meta = ref[FIELD_REF_META]

	useSyncExternalStore(
		(callback) => store.subscribeToEntity(meta.entityType, meta.entityId, callback),
		() => store.getVersion(),
		() => store.getVersion(),
	)

	return ref as unknown as HasOneAccessor<TEntity, TSelected, TBrand, TEntityName, TSchema>
}
