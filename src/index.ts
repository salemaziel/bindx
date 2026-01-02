// Selection - fluent type-safe query building
export {
	createSelectionBuilder,
	getSelectionMeta,
	createFragment,
	buildQueryFromSelection,
	collectPaths,
	SELECTION_META,
	type SelectionBuilder,
	type SelectionMeta,
	type SelectionFieldMeta,
	type FluentFragment,
	type FluentDefiner,
	type HasManyOptions,
	type InferSelection,
	type QuerySpec,
	type QueryFieldSpec,
} from './selection/index.js'

// Accessors - data read/write
export {
	type FieldAccessor,
	type EntityAccessor,
	type EntityAccessorBase,
	type RootEntityAccessor,
	type HasOneAccessor,
	type HasOneRelationState,
	type PlaceholderEntityAccessor,
	type EntityListAccessor,
	type EntityListItem,
	type AccessorFromShape,
	type AccessorFromShapeInternal,
	type RelationChange,
	FieldAccessorImpl,
	EntityAccessorImpl,
	EntityListAccessorImpl,
	HasOneAccessorImpl,
	PlaceholderEntityAccessorImpl,
	isPlaceholder,
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
