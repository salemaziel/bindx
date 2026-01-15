import type { ReactNode } from 'react'
import type {
	SelectionMeta,
	SelectionFieldMeta,
	EntityFields,
	FieldRefMeta,
	ScalarKeys,
	HasManyKeys,
	HasOneKeys,
	SelectedEntityFields,
	FieldRef,
	HasManyRef,
	HasOneRef,
	EntityRef,
	EntityAccessor,
	AnyBrand,
} from '@contember/bindx'

// Re-export unified types for backwards compatibility
export type { SelectionMeta, SelectionFieldMeta }

// Re-export from @contember/bindx
export { FIELD_REF_META } from '@contember/bindx'
export type {
	EntityFields,
	FieldRefMeta,
	ScalarKeys,
	HasManyKeys,
	HasOneKeys,
	SelectedEntityFields,
	FieldRef,
	HasManyRef,
	HasOneRef,
	EntityRef,
	EntityAccessor,
	AnyBrand,
}

/**
 * Marker symbol for identifying bindx components
 */
export const BINDX_COMPONENT = Symbol('BINDX_COMPONENT')

/**
 * Symbol for direct scope access on collector proxies.
 * Replaces NESTED_SELECTION_REF - carries the SelectionScope directly.
 * Used when passing relation entities to nested createComponent components.
 */
export const SCOPE_REF = Symbol('SCOPE_REF')


/**
 * Props for Field component
 */
export interface FieldProps<T> {
	field: FieldRef<T>
	children?: (accessor: FieldRef<T>) => ReactNode
	format?: (value: T | null) => ReactNode
}

/**
 * Options for HasMany relation
 */
export interface HasManyComponentOptions {
	filter?: unknown
	orderBy?: unknown
	limit?: number
	offset?: number
}

/**
 * Props for HasMany component.
 * Selection-aware: children callback receives EntityAccessor with direct field access.
 *
 * @typeParam TEntity - The full entity type
 * @typeParam TSelected - The selected subset of fields (defaults to TEntity for backwards compatibility)
 * @typeParam TBrand - Component brand type for validation (defaults to AnyBrand)
 * @typeParam TAvailableRoles - Available roles for role-based type checking (defaults to readonly string[])
 */
export interface HasManyProps<
	TEntity,
	TSelected = TEntity,
	TBrand extends AnyBrand = AnyBrand,
	TAvailableRoles extends readonly string[] = readonly string[],
> {
	field: HasManyRef<TEntity, TSelected, TBrand, TAvailableRoles>
	children: (item: EntityAccessor<TEntity, TSelected, TBrand, string, TAvailableRoles>, index: number) => ReactNode
	filter?: unknown
	orderBy?: unknown
	limit?: number
	offset?: number
}

/**
 * Props for HasOne component.
 * Selection-aware: children callback receives EntityAccessor with direct field access.
 *
 * @typeParam TEntity - The full entity type
 * @typeParam TSelected - The selected subset of fields (defaults to TEntity for backwards compatibility)
 * @typeParam TBrand - Component brand type for validation (defaults to AnyBrand)
 * @typeParam TAvailableRoles - Available roles for role-based type checking (defaults to readonly string[])
 */
export interface HasOneProps<
	TEntity,
	TSelected = TEntity,
	TBrand extends AnyBrand = AnyBrand,
	TAvailableRoles extends readonly string[] = readonly string[],
> {
	field: HasOneRef<TEntity, TSelected, TBrand, TAvailableRoles>
	children: (entity: EntityAccessor<TEntity, TSelected, TBrand, string, TAvailableRoles>) => ReactNode
}

/**
 * Props for Entity component.
 * Entity name is preserved for proper HasRole type narrowing.
 * Children receive EntityAccessor with direct field access.
 */
export interface EntityComponentProps<TSchema, K extends keyof TSchema & string> {
	name: K
	id: string
	children: (entity: EntityAccessor<TSchema[K], TSchema[K], import('@contember/bindx').AnyBrand, K>) => ReactNode
}

/**
 * Props for If conditional component
 */
export interface IfProps {
	condition: boolean | FieldRef<boolean>
	then: ReactNode
	else?: ReactNode
}

/**
 * Interface for components that can provide selection info
 */
export interface SelectionProvider {
	getSelection(
		props: unknown,
		collectNested: (children: ReactNode) => SelectionMeta,
	): SelectionFieldMeta | SelectionFieldMeta[] | null
}

// Re-export component types
export type {
	EntityPropKeys,
	EntityFromProp,
	SelectionFromProp,
	ImplicitFragmentProperties,
} from './legacyTypes.js'
export { COMPONENT_MARKER, COMPONENT_SELECTIONS } from './componentBuilder.js'
