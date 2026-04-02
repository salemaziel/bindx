import { type HasManyRef, type HasManyAccessor, type AnyBrand } from '@contember/bindx'
import { useAccessor } from './useAccessor.js'

/**
 * Subscribes to a has-many ref and returns a HasManyAccessor with live collection access.
 *
 * Thin wrapper over useAccessor for ergonomics.
 */
export function useHasMany<
	TEntity,
	TSelected = TEntity,
	TBrand extends AnyBrand = AnyBrand,
	TEntityName extends string = string,
	TSchema extends Record<string, object> = Record<string, object>,
>(ref: HasManyRef<TEntity, TSelected, TBrand, TEntityName, TSchema>): HasManyAccessor<TEntity, TSelected, TBrand, TEntityName, TSchema> {
	return useAccessor(ref)
}
