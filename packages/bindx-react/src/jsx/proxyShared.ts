import {
	type EntityAccessor,
	type EntityFields,
} from './types.js'

/**
 * Known properties on entity accessor that should NOT be treated as field access.
 * Properties are accessed with $ prefix for consistency with EntityHandle.
 * Used by collector proxy.
 */
export const ENTITY_ACCESSOR_PROPERTIES = new Set([
	'id',
	'$fields', '$data', '$isDirty', '$isPersisting', '$persistedId', '$isNew',
	'$errors', '$hasError', '$addError', '$clearErrors', '$clearAllErrors',
	'$on', '$intercept', '$onPersisted', '$interceptPersisting',
	'__entityType', '__entityName', '__schema',
])

/**
 * Wraps an object with $fields in a Proxy that supports direct field access.
 * - `entity.fieldName` is equivalent to `entity.$fields.fieldName`
 * - Known accessor properties pass through to the target
 */
export function wrapEntityRefWithFieldAccessProxy<T>(ref: { $fields: EntityFields<T> } & Record<string | symbol, unknown>): EntityAccessor<T> {
	return new Proxy(ref, {
		get(target, prop) {
			// Symbols - pass through
			if (typeof prop !== 'string') {
				return Reflect.get(target, prop)
			}

			// Known accessor properties - pass through
			if (ENTITY_ACCESSOR_PROPERTIES.has(prop)) {
				return Reflect.get(target, prop)
			}

			// Otherwise, treat as field access
			return (target as { $fields: EntityFields<T> }).$fields[prop as keyof EntityFields<T>]
		},
	}) as EntityAccessor<T>
}
