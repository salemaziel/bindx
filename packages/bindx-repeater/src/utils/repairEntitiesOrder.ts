import type { EntityAccessor, FieldAccessor, AnyBrand } from '@contember/bindx'

/**
 * Repairs the order field values of entities to be sequential (0, 1, 2, ...).
 * Only updates values that differ from their expected index.
 */
export function repairEntitiesOrder<
	T extends object,
	S = T,
	TBrand extends AnyBrand = AnyBrand,
	TEntityName extends string = string,
	TSchema extends Record<string, object> = Record<string, object>,
>(
	items: EntityAccessor<T, S, TBrand, TEntityName, TSchema>[],
	orderField: string,
): void {
	for (let i = 0; i < items.length; i++) {
		const entity = items[i]!
		const field = (entity as unknown as Record<string, unknown>)[orderField] as FieldAccessor<number> | undefined

		if (field && field.value !== i) {
			field.setValue(i)
		}
	}
}
