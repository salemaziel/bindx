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
 * Accessor for an entity (structured object with fields).
 * May represent a root entity or a nested/related entity.
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
 * Maps a data shape to accessor types.
 * - Scalars become FieldAccessor
 * - Objects become EntityAccessor
 * - Arrays become EntityListAccessor
 */
export type AccessorFromShape<T> = {
	[K in keyof T]: T[K] extends Array<infer U>
		? U extends object
			? EntityListAccessor<U>
			: FieldAccessor<T[K]>
		: T[K] extends object | null | undefined
			? EntityAccessor<NonNullable<T[K]>>
			: FieldAccessor<T[K]>
}

/**
 * Internal interface for accessors that can notify parents of changes
 */
export interface ChangeNotifier {
	/** Called when any value changes */
	notifyChange(): void
}

/**
 * Internal interface for accessors that can collect their changes
 */
export interface ChangeCollector {
	/** Collect all changes as a partial data object */
	collectChanges(): Record<string, unknown>

	/** Commit current values as server values (after successful persist) */
	commitChanges(): void
}
