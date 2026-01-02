/**
 * Accessor for a single scalar field value.
 * Provides read/write access with dirty tracking.
 */
export interface FieldAccessor<T> {
	/** Current (local) value - may differ from server if modified */
	readonly value: T | null

	/** Value as received from the server */
	readonly serverValue: T | null

	/** Whether value differs from serverValue */
	readonly isDirty: boolean

	/** Update the local value */
	setValue(value: T | null): void

	/** Helper props for binding to form inputs */
	readonly inputProps: {
		value: T | null
		setValue: (value: T | null) => void
	}
}

/**
 * Base interface for all entity accessors (root and relation).
 * Provides read-only access to entity data and state.
 */
export interface EntityAccessorBase<TData> {
	/** Entity identifier (may be null for disconnected relations or placeholders) */
	readonly id: string | null

	/** Typed map of field accessors */
	readonly fields: AccessorFromShapeInternal<TData>

	/** Read-only snapshot of current data (null if disconnected) */
	readonly data: TData | null

	/** Whether any field has been modified */
	readonly isDirty: boolean

	/** Whether data is being loaded */
	readonly isLoading: boolean
}

/**
 * Accessor for a root-level entity (fetched directly via useEntity).
 * Provides full lifecycle management.
 */
export interface RootEntityAccessor<TData> extends EntityAccessorBase<TData> {
	/** Entity identifier (always present for root entities) */
	readonly id: string

	/** Data is always present for loaded root entities */
	readonly data: TData

	/** Typed map of field accessors */
	readonly fields: AccessorFromShape<TData>

	/** Whether changes are being persisted */
	readonly isPersisting: boolean

	/** Persist all changes to the backend */
	persist(): Promise<void>

	/** Reset all fields to server values */
	reset(): void
}

/**
 * State of a has-one relation
 */
export type HasOneRelationState =
	| 'connected' // Points to an existing entity
	| 'disconnected' // Explicitly set to null
	| 'deleted' // Related entity marked for deletion
	| 'creating' // Placeholder entity being filled for implicit create

/**
 * Accessor for a has-one relation field.
 * Wraps an entity and provides relation-specific operations.
 */
export interface HasOneAccessor<TData> {
	/** Current relation state */
	readonly state: HasOneRelationState

	/** Entity ID (null if disconnected or creating) */
	readonly id: string | null

	/** The current entity accessor (may be placeholder for 'creating' state) */
	readonly entity: EntityAccessorBase<TData>

	/** The original server entity accessor (for dirty tracking, null if server had no relation) */
	readonly serverEntity: EntityAccessorBase<TData> | null

	/** Typed map of field accessors (shortcut to entity.fields) */
	readonly fields: AccessorFromShapeInternal<TData>

	/** Read-only snapshot of current data (null if disconnected) */
	readonly data: TData | null

	/** Whether the relation reference itself changed (not just entity fields) */
	readonly isRelationDirty: boolean

	/** Whether the relation or any nested field has been modified */
	readonly isDirty: boolean

	/** Whether data is being loaded */
	readonly isLoading: boolean

	/**
	 * Connect to an existing entity by ID.
	 * Fetches the entity if not already in IdentityMap.
	 */
	connect(id: string): void

	/**
	 * Disconnect the relation (set to null).
	 * Creates a placeholder entity for potential implicit create.
	 */
	disconnect(): void

	/**
	 * Mark the related entity for deletion.
	 * The entity will be deleted on persist.
	 */
	delete(): void

	/**
	 * Reset relation to server state.
	 * Reverts to original server entity.
	 */
	reset(): void
}

/**
 * A placeholder entity created when a relation is disconnected.
 * Used to track if values are being set for an implicit create.
 */
export interface PlaceholderEntityAccessor<TData> extends EntityAccessorBase<TData> {
	/** Always null for placeholder */
	readonly id: null

	/** Whether any field has been set (triggers implicit create on persist) */
	readonly hasValues: boolean

	/** Internal marker */
	readonly __isPlaceholder: true
}

/**
 * @deprecated Use RootEntityAccessor for root entities or HasOneAccessor for relations
 * Kept for backwards compatibility during migration
 */
export interface EntityAccessor<TData> {
	/** Entity identifier */
	readonly id: string

	/** Typed map of field accessors */
	readonly fields: AccessorFromShape<TData>

	/** Read-only snapshot of current data */
	readonly data: TData

	/** Whether any field has been modified */
	readonly isDirty: boolean

	/** Whether data is being loaded */
	readonly isLoading: boolean

	/** Whether changes are being persisted */
	readonly isPersisting: boolean

	/** Persist all changes to the backend */
	persist(): Promise<void>

	/** Reset all fields to server values */
	reset(): void
}

/**
 * A single item in an EntityListAccessor
 */
export interface EntityListItem<TData> {
	/** Stable key for React rendering */
	readonly key: string

	/** The entity accessor for this item */
	readonly entity: EntityAccessor<TData>

	/** Shortcut to entity.fields */
	readonly fields: AccessorFromShape<TData>

	/** Remove this item from the list */
	remove(): void
}

/**
 * Accessor for a collection of entities (has-many relation).
 */
export interface EntityListAccessor<TData> {
	/** Array of items in the collection */
	readonly items: EntityListItem<TData>[]

	/** Number of items */
	readonly length: number

	/** Whether any item has been modified, added, or removed */
	readonly isDirty: boolean

	/** Whether data is being loaded */
	readonly isLoading: boolean

	/** Add a new item to the collection */
	add(data: Partial<TData>): void

	/** Remove an item by key */
	remove(key: string): void

	/** Move an item from one position to another */
	move(fromIndex: number, toIndex: number): void
}

/**
 * Internal type for mapping fields that may include has-one relations.
 * Used within EntityAccessorBase and HasOneAccessor.
 */
export type AccessorFromShapeInternal<T> = {
	[K in keyof T]: T[K] extends Array<infer U>
		? U extends object
			? EntityListAccessor<U>
			: FieldAccessor<T[K]>
		: T[K] extends object | null | undefined
			? HasOneAccessor<NonNullable<T[K]>>
			: FieldAccessor<T[K]>
}

/**
 * Maps a data shape to accessor types for root entities.
 * - Scalars become FieldAccessor
 * - Objects become HasOneAccessor (for has-one relations)
 * - Arrays become EntityListAccessor
 */
export type AccessorFromShape<T> = AccessorFromShapeInternal<T>

/**
 * Internal interface for accessors that can notify parents of changes
 */
export interface ChangeNotifier {
	/** Called when any value changes */
	notifyChange(): void
}

/**
 * Relation change types for backend serialization
 */
export type RelationChange =
	| { __operation: 'connect'; id: string }
	| { __operation: 'disconnect' }
	| { __operation: 'delete' }
	| { __operation: 'create'; data: Record<string, unknown> }
	| { __operation: 'update'; id: string; data: Record<string, unknown> }

/**
 * Internal interface for accessors that can collect their changes
 */
export interface ChangeCollector {
	/** Collect all changes as a partial data object */
	collectChanges(): Record<string, unknown> | RelationChange | null

	/** Commit current values as server values (after successful persist) */
	commitChanges(): void
}
