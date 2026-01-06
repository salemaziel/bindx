/**
 * Typed query parameter types for filter, orderBy, etc.
 *
 * These types provide type-safe filters and ordering based on entity interfaces.
 * They mirror Contember's Content API input types but work with plain TypeScript interfaces.
 */

// ============================================================================
// Condition Types (for filter expressions)
// ============================================================================

/**
 * Condition operators for scalar values
 */
export interface ScalarCondition<T> {
	readonly and?: readonly ScalarCondition<T>[]
	readonly or?: readonly ScalarCondition<T>[]
	readonly not?: ScalarCondition<T>
	readonly eq?: T
	readonly notEq?: T
	readonly isNull?: boolean
	readonly in?: readonly T[]
	readonly notIn?: readonly T[]
	readonly lt?: T
	readonly lte?: T
	readonly gt?: T
	readonly gte?: T
}

/**
 * String-specific condition operators
 */
export interface StringCondition extends ScalarCondition<string> {
	readonly contains?: string
	readonly startsWith?: string
	readonly endsWith?: string
	readonly containsCI?: string
	readonly startsWithCI?: string
	readonly endsWithCI?: string
}

/**
 * Maps a scalar type to its condition type
 */
export type ConditionFor<T> =
	T extends string ? StringCondition :
	T extends number ? ScalarCondition<number> :
	T extends boolean ? ScalarCondition<boolean> :
	T extends Date ? ScalarCondition<Date> :
	ScalarCondition<T>

// ============================================================================
// Where Types (for filtering)
// ============================================================================

/**
 * Base composed where with AND/OR/NOT logic
 */
export interface ComposedWhere<TEntity> {
	readonly and?: readonly EntityWhere<TEntity>[]
	readonly or?: readonly EntityWhere<TEntity>[]
	readonly not?: EntityWhere<TEntity>
}

/**
 * Checks if a type is a "plain object" (entity) vs a scalar like Date
 * Date and other built-in objects are not treated as relations
 */
type IsPlainObject<T> =
	T extends Date ? false :
	T extends Array<any> ? false :
	T extends Function ? false :
	T extends object ? true :
	false

/**
 * Field-level where clause for an entity
 * Maps each field to its appropriate condition type
 */
export type FieldsWhere<TEntity> = {
	readonly [K in keyof TEntity]?:
		NonNullable<TEntity[K]> extends Array<infer U>
			? EntityWhere<U> | null  // has-many: filter on related items
			: IsPlainObject<NonNullable<TEntity[K]>> extends true
				? EntityWhere<NonNullable<TEntity[K]>> | null  // has-one: filter on related entity
				: ConditionFor<NonNullable<TEntity[K]>> | null  // scalar: condition (use NonNullable for proper type)
}

/**
 * Full where type for an entity - combines composed and field conditions
 */
export type EntityWhere<TEntity> = ComposedWhere<TEntity> & FieldsWhere<TEntity>

// ============================================================================
// OrderBy Types (for sorting)
// ============================================================================

/**
 * Order direction enum values
 */
export type OrderDirection = 'asc' | 'ascNullsFirst' | 'desc' | 'descNullsLast'

/**
 * Order by clause for an entity
 * Each scalar field can have a direction, relations can have nested ordering
 */
export type EntityOrderBy<TEntity> = {
	readonly [K in keyof TEntity]?:
		NonNullable<TEntity[K]> extends Array<any>
			? never  // has-many cannot be ordered by directly
			: IsPlainObject<NonNullable<TEntity[K]>> extends true
				? EntityOrderBy<NonNullable<TEntity[K]>> | null  // has-one: nested ordering
				: OrderDirection | null  // scalar: direction (including Date)
} & {
	readonly _random?: boolean
	readonly _randomSeeded?: number
}

// ============================================================================
// HasMany Options with Typed Parameters
// ============================================================================

/**
 * Options for has-many relation selection with typed filter/orderBy
 *
 * @typeParam TItem - The related entity type (array item type)
 * @typeParam TAlias - Optional alias for the field
 */
export interface TypedHasManyOptions<
	TItem,
	TAlias extends string = string,
> {
	readonly as?: TAlias
	readonly filter?: EntityWhere<TItem>
	readonly orderBy?: readonly EntityOrderBy<TItem>[]
	readonly limit?: number
	readonly offset?: number
}

/**
 * Alias-only options (for scalar or has-one with alias)
 */
export interface AliasOptions<TAlias extends string = string> {
	readonly as?: TAlias
}

// ============================================================================
// Type Utilities
// ============================================================================

/**
 * Extracts the item type from an array type
 */
export type ArrayItemType<T> = T extends Array<infer U> ? U : never

/**
 * Checks if a type is an array
 */
export type IsArray<T> = T extends Array<any> ? true : false

/**
 * Extracts non-nullable type
 */
export type NonNullableType<T> = Exclude<T, null | undefined>
