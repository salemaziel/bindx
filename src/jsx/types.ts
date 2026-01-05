import type { ReactNode } from 'react'
import type { SelectionMeta, SelectionFieldMeta } from '../selection/types.js'
import type { EntityFields, FieldRefMeta, SelectedEntityFields } from '../handles/types.js'

// Re-export unified types for backwards compatibility
export type { SelectionMeta, SelectionFieldMeta }

// Re-export from handles/types for backwards compatibility
export type { EntityFields, FieldRefMeta, ScalarKeys, HasManyKeys, HasOneKeys, SelectedEntityFields } from '../handles/types.js'

/**
 * @deprecated Use SelectionMeta from selection/types.ts instead
 */
export type JsxSelectionMeta = SelectionMeta

/**
 * @deprecated Use SelectionFieldMeta from selection/types.ts instead
 */
export type JsxSelectionFieldMeta = SelectionFieldMeta

/**
 * Marker symbol for identifying bindx components
 */
export const BINDX_COMPONENT = Symbol('BINDX_COMPONENT')

/**
 * Marker symbol for field reference metadata
 */
export const FIELD_REF_META = Symbol('FIELD_REF_META')

/**
 * Reference to a scalar field - works in both collection and runtime phases
 */
export interface FieldRef<T> {
	/** Internal metadata for collection phase */
	readonly [FIELD_REF_META]: FieldRefMeta

	/** Current value (null in collection phase, real value in runtime) */
	readonly value: T | null

	/** Server value for dirty tracking */
	readonly serverValue: T | null

	/** Whether value differs from server */
	readonly isDirty: boolean

	/** Update the value */
	setValue(value: T | null): void

	/** Input binding props */
	readonly inputProps: {
		value: T | null
		setValue: (value: T | null) => void
	}
}

/**
 * Reference to a has-many relation - selection-aware version
 *
 * @typeParam TEntity - The full entity type
 * @typeParam TSelected - The selected subset of fields (defaults to TEntity for backwards compatibility)
 */
export interface HasManyRef<TEntity, TSelected = TEntity> {
	/** Internal metadata for collection phase */
	readonly [FIELD_REF_META]: FieldRefMeta

	/** Number of items */
	readonly length: number

	/** Whether any item has been modified */
	readonly isDirty: boolean

	/** Iterate over items - returns selection-aware entity refs */
	map<R>(fn: (item: EntityRef<TEntity, TSelected>, index: number) => R): R[]

	/** Add a new item */
	add(data?: Partial<TEntity>): void

	/** Remove item by key */
	remove(key: string): void

	/** Type brand - ensures HasManyRef<Author> is not assignable to HasManyRef<Tag> */
	readonly __entityType: TEntity
}

/**
 * Reference to a has-one relation - selection-aware version
 *
 * @typeParam TEntity - The full entity type
 * @typeParam TSelected - The selected subset of fields (defaults to TEntity for backwards compatibility)
 */
export interface HasOneRef<TEntity, TSelected = TEntity> {
	/** Internal metadata for collection phase */
	readonly [FIELD_REF_META]: FieldRefMeta

	/** Entity ID (null if disconnected) */
	readonly id: string | null

	/** Whether relation is dirty */
	readonly isDirty: boolean

	/** Nested entity fields - only selected fields are accessible */
	readonly fields: SelectedEntityFields<TEntity, TSelected>

	/** Connect to existing entity */
	connect(id: string): void

	/** Disconnect relation */
	disconnect(): void

	/** Type brand - ensures HasOneRef<Author> is not assignable to HasOneRef<Tag> */
	readonly __entityType: TEntity
}

/**
 * Reference to an entity - provides typed field access.
 * Selection-aware: only selected fields are accessible.
 *
 * @typeParam TEntity - The full entity type
 * @typeParam TSelected - The selected subset of fields (defaults to TEntity for backwards compatibility)
 *
 * @example
 * ```ts
 * // Full access (backwards compatible)
 * EntityRef<Author>  // All fields accessible
 *
 * // Selection-aware
 * EntityRef<Author, { name: string; email: string }>  // Only name and email accessible
 * ```
 */
export interface EntityRef<TEntity, TSelected = TEntity> {
	/** Entity ID */
	readonly id: string

	/** Typed field accessors - only selected fields are accessible */
	readonly fields: SelectedEntityFields<TEntity, TSelected>

	/** Raw data snapshot */
	readonly data: TSelected | null

	/** Whether entity is dirty */
	readonly isDirty: boolean

	/** Type brand - ensures EntityRef<Author> is not assignable to EntityRef<Tag> */
	readonly __entityType: TEntity
}


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
 * Selection-aware: children callback receives EntityRef with only selected fields.
 *
 * @typeParam TEntity - The full entity type
 * @typeParam TSelected - The selected subset of fields (defaults to TEntity for backwards compatibility)
 */
export interface HasManyProps<TEntity, TSelected = TEntity> {
	field: HasManyRef<TEntity, TSelected>
	children: (item: EntityRef<TEntity, TSelected>, index: number) => ReactNode
	filter?: unknown
	orderBy?: unknown
	limit?: number
	offset?: number
}

/**
 * Props for HasOne component.
 * Selection-aware: children callback receives EntityRef with only selected fields.
 *
 * @typeParam TEntity - The full entity type
 * @typeParam TSelected - The selected subset of fields (defaults to TEntity for backwards compatibility)
 */
export interface HasOneProps<TEntity, TSelected = TEntity> {
	field: HasOneRef<TEntity, TSelected>
	children: (entity: EntityRef<TEntity, TSelected>) => ReactNode
}

/**
 * Props for Entity component
 */
export interface EntityComponentProps<TSchema, K extends keyof TSchema> {
	name: K
	id: string
	children: (entity: EntityRef<TSchema[K]>) => ReactNode
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

// Re-export entity fragment types
export type {
	EntityFragmentComponent,
	EntityFragmentComponentWithProps,
	EntityPropKeys,
	EntityFromProp,
	EntityFragmentProperties,
} from './createEntityFragment.js'
export { ENTITY_FRAGMENT_COMPONENT, ENTITY_FRAGMENT_PROPS } from './createEntityFragment.js'
