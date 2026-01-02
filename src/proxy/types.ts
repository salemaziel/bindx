/**
 * Symbol used to store metadata on proxy objects
 */
export const PROXY_META = Symbol('PROXY_META')

/**
 * Metadata stored on each proxy node
 */
export interface ProxyMeta {
	/** Path from root entity to this field */
	path: string[]
}

/**
 * Type-safe proxy for building queries.
 * Each property access returns a new proxy with extended path.
 *
 * For scalars: returns ModelProxy that tracks the path
 * For objects: returns ModelProxy that can be further traversed
 * For arrays: returns ModelProxyArray with map() method
 */
export type ModelProxy<T> = {
	[K in keyof T]-?: T[K] extends Array<infer U>
		? ModelProxyArray<U>
		: T[K] extends object | null | undefined
			? ModelProxy<NonNullable<T[K]>>
			: ModelProxyScalar<T[K]>
} & {
	[PROXY_META]: ProxyMeta
}

/**
 * Proxy for scalar fields - terminal nodes in the query tree
 */
export interface ModelProxyScalar<T> {
	[PROXY_META]: ProxyMeta & { __scalarType: T }
}

/**
 * Proxy for array/has-many relations with map() support
 */
export interface ModelProxyArray<T> {
	[PROXY_META]: ProxyMeta & { __arrayItemType: T }
	/**
	 * Map over items in the collection to define what fields to fetch
	 */
	map<TResult>(fn: (item: ModelProxy<T>) => TResult): ModelProxyArrayResult<TResult>
}

/**
 * Result of calling .map() on a ModelProxyArray
 */
export interface ModelProxyArrayResult<TResult> {
	[PROXY_META]: ProxyMeta & { __arrayResult: TResult; __isArrayMap: true }
}

/**
 * Marker interface for fragment compositions.
 * Used by UnwrapProxy to extract the result type.
 */
export interface CompositionMarker<TResult> {
	readonly __compositionResult: TResult
	readonly __isComposition: true
}

/**
 * Unwraps proxy types to their underlying value types.
 * Used to convert fragment result from proxy types to actual data types.
 *
 * ModelProxyScalar<T> -> T
 * ModelProxyArrayResult<R> -> UnwrapProxy<R>[]
 * CompositionMarker<R> -> R (already unwrapped)
 * { a: ModelProxyScalar<T> } -> { a: T }
 */
export type UnwrapProxy<T> =
	T extends ModelProxyScalar<infer U>
		? U
		: T extends ModelProxyArrayResult<infer R>
			? UnwrapProxy<R>[]
			: T extends CompositionMarker<infer R>
				? R
				: T extends ModelProxy<infer M>
					? M
					: T extends object
						? { [K in keyof T]: UnwrapProxy<T[K]> }
						: T
