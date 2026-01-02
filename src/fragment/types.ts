import type { ModelProxy, UnwrapProxy, CompositionMarker } from '../proxy/index.js'

/**
 * Metadata about a single field in a fragment
 */
export interface FieldMeta {
	/** Path to the field from the entity root */
	path: string[]
	/** For nested objects/entities, contains their field metadata */
	nested?: FragmentMeta
	/** Whether this is an array/has-many relation */
	isArray?: boolean
	/** For arrays, metadata about the item shape */
	arrayItemMeta?: FragmentMeta
}

/**
 * Metadata extracted from a fragment definition.
 * Used to build queries and construct accessors.
 */
export interface FragmentMeta {
	/** Map of output field name to its metadata */
	fields: Map<string, FieldMeta>
}

/**
 * Function that defines a fragment's shape using a ModelProxy
 */
export type FragmentDefiner<TModel, TResult> = (proxy: ModelProxy<TModel>) => TResult

/**
 * A fragment definition with metadata and type information.
 * Can be composed into other fragments.
 *
 * TResult is the "raw" return type from the definer (with proxy types).
 * Use UnwrapProxy<TResult> to get the actual data shape.
 */
export interface Fragment<TModel, TResult> {
	/** Runtime metadata for query building */
	readonly __meta: FragmentMeta

	/** Type brand for compile-time inference - unwrapped to actual data types */
	readonly __resultType: UnwrapProxy<TResult>

	/** Type brand for the model type (not used at runtime) */
	readonly __modelType: TModel

	/**
	 * Compose this fragment into another query.
	 * Use when you want to include this fragment's fields in a parent entity.
	 *
	 * @example
	 * ```ts
	 * const AuthorFragment = defineFragment((a: ModelProxy<Author>) => ({
	 *   name: a.name,
	 * }))
	 *
	 * useEntity('Article', { id }, e => ({
	 *   author: AuthorFragment.compose(e.author)
	 * }))
	 * ```
	 */
	compose(proxy: ModelProxy<TModel>): FragmentComposition<UnwrapProxy<TResult>>
}

/**
 * Result of composing a fragment into another.
 * Carries both the proxy metadata and the fragment metadata for merging.
 * Extends CompositionMarker so UnwrapProxy can extract TResult.
 */
export interface FragmentComposition<TResult> extends CompositionMarker<TResult> {
	/** The composed fragment's metadata */
	readonly __fragmentMeta: FragmentMeta
}

/**
 * Helper type to extract the result type from a Fragment
 */
export type FragmentResult<F> = F extends Fragment<any, infer R> ? R : never

/**
 * Helper type to extract the model type from a Fragment
 */
export type FragmentModel<F> = F extends Fragment<infer M, any> ? M : never
