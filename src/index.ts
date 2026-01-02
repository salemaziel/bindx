// Proxy - type-safe query building
export {
	createModelProxy,
	getProxyPath,
	isModelProxy,
	isArrayMapResult,
	getArrayMapResult,
	type ModelProxy,
	type ModelProxyArray,
	type ModelProxyArrayResult,
	type ModelProxyScalar,
	type ProxyMeta,
	type UnwrapProxy,
	PROXY_META,
} from './proxy/index.js'

// Fragment - declarative data dependencies
export {
	defineFragment,
	extractFragmentMeta,
	isFragmentComposition,
	mergeFragmentMeta,
	buildQuery,
	collectPaths,
	type Fragment,
	type FragmentComposition,
	type FragmentDefiner,
	type FragmentMeta,
	type FragmentModel,
	type FragmentResult,
	type FieldMeta,
	type QuerySpec,
	type QueryFieldSpec,
} from './fragment/index.js'

// Accessors - data read/write
export {
	type FieldAccessor,
	type EntityAccessor,
	type EntityListAccessor,
	type EntityListItem,
	type AccessorFromShape,
	FieldAccessorImpl,
	EntityAccessorImpl,
	EntityListAccessorImpl,
} from './accessors/index.js'

// Store - identity map
export { IdentityMap, getNestedValue, type EntityRecord } from './store/index.js'

// Hooks - React integration
export {
	BindxProvider,
	useBackendAdapter,
	useIdentityMap,
	useBindxContext,
	createBindx,
	type BindxProviderProps,
	type UseEntityOptions,
	type UseEntityListOptions,
	type LoadingEntityAccessor,
	type LoadingEntityListAccessor,
	type EntitySchema,
} from './hooks/index.js'

// Adapter - backend interface
export { type BackendAdapter, MockAdapter, type MockDataStore, type MockAdapterOptions } from './adapter/index.js'
