import type { EntityAccessor, FieldAccessor, AnyBrand } from '@contember/bindx'

/**
 * Sorts entities by a numeric order field.
 * Returns a new sorted array.
 */
export function sortEntities<
	T extends object,
	S = T,
	TBrand extends AnyBrand = AnyBrand,
	TEntityName extends string = string,
	TSchema extends Record<string, object> = Record<string, object>,
>(
	items: EntityAccessor<T, S, TBrand, TEntityName, TSchema>[],
	orderField: string | undefined,
): EntityAccessor<T, S, TBrand, TEntityName, TSchema>[] {
	if (!orderField) {
		return items
	}

	if (!Array.isArray(items)) {
		return []
	}
	return [...items].sort((a, b) => {
		const aField = (a as unknown as Record<string, unknown>)[orderField] as FieldAccessor<number> | undefined
		const bField = (b as unknown as Record<string, unknown>)[orderField] as FieldAccessor<number> | undefined

		const aValue = aField?.value ?? Number.MAX_SAFE_INTEGER
		const bValue = bField?.value ?? Number.MAX_SAFE_INTEGER

		return aValue - bValue
	})
}
