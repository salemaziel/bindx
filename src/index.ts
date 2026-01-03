/**
 * Bindx - Type-safe React data binding framework
 *
 * @packageDocumentation
 */

// ============================================================================
// Public API - Types
// ============================================================================

// Selection types
export type {
	SelectionBuilder,
	SelectionMeta,
	SelectionFieldMeta,
	FluentFragment,
	FluentDefiner,
	HasManyOptions,
	InferSelection,
	QuerySpec,
	QueryFieldSpec,
} from './selection/index.js'

// Accessor types (interfaces only)
export type {
	FieldAccessor,
	EntityAccessor,
	EntityAccessorBase,
	RootEntityAccessor,
	HasOneAccessor,
	HasOneRelationState,
	PlaceholderEntityAccessor,
	EntityListAccessor,
	EntityListItem,
	AccessorFromShape,
	AccessorFromShapeInternal,
	RelationChange,
} from './accessors/index.js'

// Hook types
export type {
	BindxProviderProps,
	UseEntityOptions,
	UseEntityListOptions,
	LoadingEntityAccessor,
	LoadingEntityListAccessor,
	ErrorEntityAccessor,
	ErrorEntityListAccessor,
	EntitySchema,
} from './hooks/index.js'

// Adapter types
export type {
	BackendAdapter,
	FetchOptions,
	MockDataStore,
	MockAdapterOptions,
} from './adapter/index.js'

// Core types
export type {
	EntityLoadResult,
	EntityListLoadResult,
	LoadEntityOptions,
	LoadEntityListOptions,
	SelectionInput,
	FluentDefiner as CoreFluentDefiner,
} from './core/index.js'

// JSX types
export type {
	FieldRefMeta,
	FieldRef,
	HasManyRef,
	HasOneRef,
	EntityRef,
	EntityFields,
	FieldProps,
	HasManyProps,
	HasOneProps,
	IfProps,
	EntityComponentProps,
	HasManyComponentOptions,
	ShowProps,
} from './jsx/index.js'

// ============================================================================
// Public API - Functions & Components
// ============================================================================

// Selection utilities
export { createFragment, buildQueryFromSelection } from './selection/index.js'

// Hooks
export {
	BindxProvider,
	useBackendAdapter,
	useIdentityMap,
	useBindxContext,
	createBindx,
} from './hooks/index.js'

// Adapter
export { MockAdapter } from './adapter/index.js'

// Core
export { createEntityLoader, resolveSelectionMeta, buildQuery } from './core/index.js'

// JSX Components
export {
	Field,
	HasMany,
	HasOne,
	If,
	Show,
	Entity,
	type EntityProps,
	BINDX_COMPONENT,
	FIELD_REF_META,
} from './jsx/index.js'

// ============================================================================
// Internal API (for advanced use cases)
// ============================================================================

/**
 * Internal exports for advanced use cases.
 *
 * @internal
 * @remarks
 * These exports are implementation details and may change without notice.
 * Use the public API whenever possible.
 */
export * as __internal from './internal.js'
