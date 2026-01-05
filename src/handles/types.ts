/**
 * Unified type definitions for the Handle system.
 *
 * This module provides type-safe field accessor mapping that correctly
 * distinguishes between scalar fields, hasOne relations, and hasMany relations.
 */

import type { FieldHandle } from './FieldHandle.js'
import type { HasOneHandle, HasManyListHandle } from './EntityHandle.js'

// ============================================================================
// Field Type Detection Utilities
// ============================================================================

/**
 * Extracts scalar field keys from a type.
 * A field is scalar if it's not an array and not an object (except 'id' which is always scalar).
 */
export type ScalarKeys<T> = {
	[K in keyof T]: T[K] extends (infer _U)[]
		? never
		: NonNullable<T[K]> extends object
			? K extends 'id'
				? K
				: never
			: K
}[keyof T]

/**
 * Extracts has-many relation keys from a type.
 * A field is has-many if it's an array of objects.
 */
export type HasManyKeys<T> = {
	[K in keyof T]: T[K] extends (infer U)[]
		? U extends object
			? K
			: never
		: never
}[keyof T]

/**
 * Extracts has-one relation keys from a type.
 * A field is has-one if it's an object (but not 'id' and not an array).
 */
export type HasOneKeys<T> = {
	[K in keyof T]: T[K] extends (infer _U)[]
		? never
		: NonNullable<T[K]> extends object
			? K extends 'id'
				? never
				: K
			: never
}[keyof T]

// ============================================================================
// Unified EntityFields Type
// ============================================================================

/**
 * Maps entity fields to their correct Handle types based on structural typing.
 *
 * - Scalar fields (primitives, 'id') -> FieldHandle<T>
 * - HasOne relations (objects) -> HasOneHandle<T>
 * - HasMany relations (arrays of objects) -> HasManyListHandle<T>
 *
 * @example
 * ```typescript
 * interface Article {
 *   id: string           // -> FieldHandle<string>
 *   title: string        // -> FieldHandle<string>
 *   author: Author       // -> HasOneHandle<Author>
 *   tags: Tag[]          // -> HasManyListHandle<Tag>
 * }
 *
 * type Fields = EntityFields<Article>
 * // Fields.id: FieldHandle<string>
 * // Fields.title: FieldHandle<string>
 * // Fields.author: HasOneHandle<Author>
 * // Fields.tags: HasManyListHandle<Tag>
 * ```
 */
export type EntityFields<T> = {
	[K in ScalarKeys<T>]: FieldHandle<T[K]>
} & {
	[K in HasManyKeys<T>]: T[K] extends (infer U)[]
		? U extends object
			? HasManyListHandle<U>
			: never
		: never
} & {
	[K in HasOneKeys<T>]: HasOneHandle<NonNullable<T[K]>>
}

// ============================================================================
// Selection-Aware EntityFields Type
// ============================================================================

/**
 * Extracts the nested selection type for a relation field.
 * If the selected type has a field K, extract its type, otherwise never.
 */
type ExtractNestedSelection<TSelected, K extends PropertyKey> =
	K extends keyof TSelected ? TSelected[K] : never

/**
 * Maps entity fields to Handle types, but only for fields present in TSelected.
 * This enables compile-time checking that only fetched fields are accessed.
 *
 * @typeParam TEntity - The full entity type
 * @typeParam TSelected - The selected subset (determines which fields are accessible)
 *
 * @example
 * ```typescript
 * interface Author {
 *   id: string
 *   name: string
 *   email: string
 *   bio: string
 * }
 *
 * // Only name and email were selected
 * type Selected = { name: string; email: string }
 *
 * type Fields = SelectedEntityFields<Author, Selected>
 * // Fields.name: FieldHandle<string>  ✓
 * // Fields.email: FieldHandle<string> ✓
 * // Fields.id: never (not selected)
 * // Fields.bio: never (not selected)
 * ```
 */
export type SelectedEntityFields<TEntity, TSelected> = {
	// Scalar fields: only include if key exists in TSelected
	[K in ScalarKeys<TEntity> & keyof TSelected]: FieldHandle<TEntity[K]>
} & {
	// HasMany fields: only include if key exists in TSelected, with nested selection
	[K in HasManyKeys<TEntity> & keyof TSelected]: TEntity[K] extends (infer U)[]
		? U extends object
			? HasManyListHandle<U, ExtractNestedSelection<TSelected, K> extends (infer S)[] ? S : U>
			: never
		: never
} & {
	// HasOne fields: only include if key exists in TSelected, with nested selection
	[K in HasOneKeys<TEntity> & keyof TSelected]: HasOneHandle<
		NonNullable<TEntity[K]>,
		ExtractNestedSelection<TSelected, K> extends object ? ExtractNestedSelection<TSelected, K> : NonNullable<TEntity[K]>
	>
}

// ============================================================================
// Helper Types for Ref Interface Compatibility
// ============================================================================

/**
 * Base metadata interface for all field references.
 * Used by JSX components for selection collection.
 */
export interface FieldRefMeta {
	readonly path: string[]
	readonly fieldName: string
	readonly isArray: boolean
	readonly isRelation: boolean
}

/**
 * Input props interface for form binding.
 */
export interface InputProps<T> {
	readonly value: T | null
	readonly setValue: (value: T | null) => void
	readonly onChange: (value: T | null) => void
}
