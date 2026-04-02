import { type HasOneRef, type HasOneAccessor, type AnyBrand } from '@contember/bindx'
import { useAccessor } from './useAccessor.js'

/**
 * Subscribes to a has-one ref and returns a HasOneAccessor with live state access.
 *
 * Thin wrapper over useAccessor for ergonomics.
 */
export function useHasOne<
	TEntity,
	TSelected = TEntity,
	TBrand extends AnyBrand = AnyBrand,
	TEntityName extends string = string,
	TSchema extends Record<string, object> = Record<string, object>,
>(ref: HasOneRef<TEntity, TSelected, TBrand, TEntityName, TSchema>): HasOneAccessor<TEntity, TSelected, TBrand, TEntityName, TSchema> {
	return useAccessor(ref)
}
