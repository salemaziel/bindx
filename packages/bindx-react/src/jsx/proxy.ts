import type { SnapshotStore, FieldError, SchemaRegistry, SelectionMeta } from '@contember/bindx'
import { SelectionScope, generatePlaceholderId, UnfetchedFieldError } from '@contember/bindx'
import {
	type EntityRef,
	type EntityAccessor,
	type EntityFields,
	type FieldRef,
	type HasManyRef,
	type HasOneRef,
	FIELD_REF_META,
	SCOPE_REF,
} from './types.js'
import { deepEqual } from '@contember/bindx'

// Re-export SCOPE_REF for use in other modules
export { SCOPE_REF }

/**
 * Notify change callback type
 */
type NotifyChange = () => void

/**
 * Known properties on entity accessor that should NOT be treated as field access.
 * Properties are accessed with $ prefix for consistency with EntityHandle.
 * Used by both collector and runtime proxies.
 */
const ENTITY_ACCESSOR_PROPERTIES = new Set([
	'id',
	'$fields', '$data', '$isDirty', '$persistedId', '$isNew',
	'$errors', '$hasError', '$addError', '$clearErrors', '$clearAllErrors',
	'$on', '$intercept', '$onPersisted', '$interceptPersisting',
	'__entityType', '__entityName', '__availableRoles',
])

/**
 * Wraps an EntityRef in a Proxy that supports direct field access.
 * - `entity.fieldName` is equivalent to `entity.$fields.fieldName`
 * - Known accessor properties pass through to the target
 */
function wrapEntityRefWithFieldAccessProxy<T>(ref: EntityRef<T>): EntityAccessor<T> {
	return new Proxy(ref, {
		get(target, prop) {
			// Symbols - pass through
			if (typeof prop !== 'string') {
				return Reflect.get(target, prop)
			}

			// Known accessor properties - pass through
			if (ENTITY_ACCESSOR_PROPERTIES.has(prop)) {
				return Reflect.get(target, prop)
			}

			// Otherwise, treat as field access
			return target.$fields[prop as keyof EntityFields<T>]
		},
	}) as EntityAccessor<T>
}

/**
 * Creates a collector proxy for the collection phase.
 * This proxy captures field access and builds selection metadata using SelectionScope.
 * Supports direct field access: `entity.fieldName` is equivalent to `entity.$fields.fieldName`.
 *
 * @param scope - The SelectionScope to collect fields into
 * @param entityName - The entity type name (e.g., 'Task'), used for schema lookups
 * @param schemaRegistry - The schema registry for field type information
 */
export function createCollectorProxy<T>(
	scope: SelectionScope,
	entityName: string | null = null,
	schemaRegistry: SchemaRegistry<Record<string, object>> | null = null,
): EntityAccessor<T> {
	const fieldsProxy = new Proxy({} as EntityFields<T>, {
		get(_, fieldName: string): FieldRef<unknown> | HasManyRef<unknown> | HasOneRef<unknown> {
			// Return a collector ref that works for all field types
			// The actual type (scalar/hasMany/hasOne) will be determined
			// by how it's used in components or by schema lookup
			return createCollectorFieldRef(scope, fieldName, entityName, schemaRegistry)
		},
	})

	const noop = () => () => {}

	const ref: EntityRef<T> = {
		id: '__collector__',
		$fields: fieldsProxy,
		$data: null,
		$isDirty: false,
		$persistedId: null,
		$isNew: true,
		__entityType: undefined as unknown as T,
		__entityName: '__collector__',
		__availableRoles: [] as readonly string[],
		__schema: {} as Record<string, object>,
		// Error properties (stubs for collection phase)
		$errors: [],
		$hasError: false,
		$addError: () => {},
		$clearErrors: () => {},
		$clearAllErrors: () => {},
		// Event methods (stubs for collection phase)
		$on: noop,
		$intercept: noop,
		$onPersisted: noop,
		$interceptPersisting: noop,
	}

	// Add scope reference for nested component merging
	// This is an internal implementation detail, not part of public EntityRef interface
	;(ref as unknown as Record<symbol, unknown>)[SCOPE_REF] = scope

	// Wrap in Proxy to support direct field access
	return wrapEntityRefWithFieldAccessProxy(ref)
}

/**
 * Combined ref type for collector that satisfies all ref interfaces
 */
type CollectorRef = FieldRef<unknown> & HasManyRef<unknown> & HasOneRef<unknown>

/**
 * Creates a field reference for collection phase using SelectionScope.
 *
 * Key design:
 * - Initially marks field as scalar
 * - Lazily creates child scope when relation access happens (.fields, .entity, .map)
 * - Child scope creation automatically upgrades from scalar to relation
 * - Uses schema to determine field type and enable direct field access for hasOne relations
 *
 * @param parentScope - The parent SelectionScope
 * @param fieldName - The field being accessed
 * @param entityName - The parent entity type name (e.g., 'Task')
 * @param schemaRegistry - The schema registry for field type lookups
 */
function createCollectorFieldRef(
	parentScope: SelectionScope,
	fieldName: string,
	entityName: string | null,
	schemaRegistry: SchemaRegistry<Record<string, object>> | null,
): CollectorRef {
	// Look up field type from schema if available
	const fieldDef = entityName && schemaRegistry
		? schemaRegistry.getFieldDef(entityName, fieldName)
		: null
	const isHasOneRelation = fieldDef?.type === 'hasOne'
	const isHasManyRelation = fieldDef?.type === 'hasMany'
	const targetEntityName = (fieldDef?.type === 'hasOne' || fieldDef?.type === 'hasMany')
		? fieldDef.target
		: null

	// Initially add as scalar (will be upgraded to relation if .fields/.entity/.map is accessed)
	// Or immediately mark as relation if schema tells us it is one
	if (isHasOneRelation || isHasManyRelation) {
		parentScope.child(fieldName) // This upgrades to relation
		if (isHasManyRelation) {
			parentScope.markAsArray(fieldName)
		}
	} else {
		parentScope.addScalar(fieldName)
	}

	// Lazy child scope - created only when relation access happens
	let childScope: SelectionScope | null = null

	const getChildScope = (): SelectionScope => {
		if (!childScope) {
			// This automatically removes from scalars and creates relation
			childScope = parentScope.child(fieldName)
		}
		return childScope
	}

	const meta = {
		entityType: '', // Collection phase - no entity
		entityId: '', // Collection phase - no entity
		path: [fieldName],
		fieldName,
		isArray: isHasManyRelation,
		isRelation: isHasOneRelation || isHasManyRelation,
	}

	const noop = () => () => {}
	const placeholderId = generatePlaceholderId()

	const hasOneFieldsProxy = new Proxy({} as EntityFields<unknown>, {
		get(_, nestedFieldName: string) {
			// Get child scope (upgrades to relation)
			const scope = getChildScope()
			// Create nested field ref in the child scope, passing target entity info
			return createCollectorFieldRef(scope, nestedFieldName, targetEntityName, schemaRegistry)
		},
	})

	const mapFn = <R>(fn: (item: EntityAccessor<unknown>, index: number) => R): R[] => {
		// Get child scope and mark as array relation
		const scope = getChildScope()
		parentScope.markAsArray(fieldName)
		// Call fn once with collector to gather nested selection, passing target entity info
		fn(createCollectorProxy<unknown>(scope, targetEntityName, schemaRegistry), 0)
		return []
	}

	// Base object that satisfies all ref interfaces
	// Components will use only the parts they need
	const refObject = {
		[FIELD_REF_META]: meta,
		// SCOPE_REF allows nested components to merge their selection into this field's scope
		// This is accessed lazily to create the child scope only when needed
		get [SCOPE_REF](): SelectionScope {
			return getChildScope()
		},

		// FieldRef properties (non-$ versions)
		value: null,
		serverValue: null,
		isDirty: false,
		isTouched: false,
		touch: () => {},
		setValue: () => {},
		inputProps: { value: null, setValue: () => {}, onChange: () => {} },
		errors: [],
		hasError: false,
		addError: () => {},
		clearErrors: () => {},
		onChange: noop,
		onChanging: noop,

		// HasManyRef properties (non-$ versions)
		length: 0,
		items: [],
		map: mapFn,
		add: () => '',
		remove: () => {},
		move: () => {},
		connect: () => {},
		disconnect: () => {},
		reset: () => {},
		onItemConnected: noop,
		onItemDisconnected: noop,
		interceptItemConnecting: noop,
		interceptItemDisconnecting: noop,

		// HasOneRef properties ($ prefix only - for collision safety)
		$state: 'disconnected' as const,
		$id: placeholderId,
		$isDirty: false,
		$fields: hasOneFieldsProxy,
		get $entity(): EntityAccessor<unknown> {
			// Get child scope (upgrades to relation) and return proxy with scope
			const scope = getChildScope()
			return createCollectorProxy<unknown>(scope, targetEntityName, schemaRegistry)
		},
		$delete: () => {},
		$errors: [],
		$hasError: false,
		$addError: () => {},
		$clearErrors: () => {},
		$connect: () => {},
		$disconnect: () => {},
		$reset: () => {},
		$onConnect: noop,
		$onDisconnect: noop,
		$interceptConnect: noop,
		$interceptDisconnect: noop,

		// EntityRef-compatible properties (for HasOneAccessor = EntityAccessor compatibility)
		id: placeholderId,
		$data: null,
		$isNew: false,
		$persistedId: null,
		__entityName: targetEntityName ?? '',
		__availableRoles: [] as readonly string[],
		__schema: {} as Record<string, object>,
		$clearAllErrors: () => {},
		$on: noop,
		$intercept: noop,
		$onPersisted: noop,
		$interceptPersisting: noop,

		// Type brand (phantom property - only exists in type system)
		__entityType: undefined as unknown,
	}

	// Always wrap in proxy to support direct field access (e.g., task.project.name).
	// This works for all field types:
	// - Scalar fields: Accessing ref.value works (exists on target, passes through)
	// - Has-many fields: Accessing ref.items/length works (exists on target, passes through)
	// - Has-one with schema: Direct field access proxies to $fields
	// - Has-one without schema: Same - direct field access proxies to $fields
	// The hasOneFieldsProxy creates nested collector refs which properly track selection.
	return wrapCollectorRefWithFieldAccessProxy(refObject, hasOneFieldsProxy)
}

/**
 * Wraps a collector ref in a Proxy that supports direct field access for hasOne relations.
 * - `ref.fieldName` is equivalent to `ref.$fields.fieldName`
 * - Known ref properties pass through to the target
 */
function wrapCollectorRefWithFieldAccessProxy(
	ref: CollectorRef,
	fieldsProxy: EntityFields<unknown>,
): CollectorRef {
	return new Proxy(ref, {
		get(target, prop) {
			// Symbols - pass through
			if (typeof prop !== 'string') {
				return Reflect.get(target, prop)
			}

			// Check if property exists on target - if so, pass through
			if (prop in target) {
				return Reflect.get(target, prop)
			}

			// Otherwise, treat as field access
			return fieldsProxy[prop as keyof EntityFields<unknown>]
		},
	}) as CollectorRef
}


/**
 * Creates a runtime accessor with real data from SnapshotStore.
 * Supports direct field access: `entity.fieldName` is equivalent to `entity.$fields.fieldName`.
 *
 * @param selection - Optional selection metadata. When provided, accessing fields not in the selection will throw UnfetchedFieldError.
 */
export function createRuntimeAccessor<T>(
	entityType: string,
	entityId: string,
	store: SnapshotStore,
	notifyChange: NotifyChange,
	path: string[] = [],
	selection?: SelectionMeta,
): EntityAccessor<T> {
	const snapshot = store.getEntitySnapshot(entityType, entityId)

	// Cache field refs to maintain stable references across renders
	const fieldRefCache = new Map<string, FieldRef<unknown> | HasManyRef<unknown> | HasOneRef<unknown>>()

	const fieldsProxy = new Proxy({} as EntityFields<T>, {
		get(_, fieldName: string): FieldRef<unknown> | HasManyRef<unknown> | HasOneRef<unknown> {
			// Return cached ref if available
			const cached = fieldRefCache.get(fieldName)
			if (cached) {
				return cached
			}

			const fieldPath = [...path, fieldName]
			// Get the field's selection metadata (if selection is provided)
			const fieldSelection = selection?.fields.get(fieldName)
			const ref = createRuntimeFieldRef(entityType, entityId, store, notifyChange, fieldPath, fieldName, selection, fieldSelection?.nested)
			fieldRefCache.set(fieldName, ref)
			return ref
		},
	})

	const noop = () => () => {}

	const ref: EntityRef<T> = {
		id: entityId,
		$fields: fieldsProxy,
		$data: (snapshot?.data ?? null) as T | null,
		get $isDirty() {
			const snap = store.getEntitySnapshot(entityType, entityId)
			if (!snap) return false
			return !deepEqual(snap.data, snap.serverData)
		},
		get $persistedId() {
			return store.getPersistedId(entityType, entityId)
		},
		get $isNew() {
			return store.isNewEntity(entityType, entityId)
		},
		__entityType: undefined as unknown as T,
		__entityName: entityType,
		__availableRoles: [] as readonly string[],
		__schema: {} as Record<string, object>,
		// Error properties
		get $errors() {
			return store.getEntityErrors(entityType, entityId)
		},
		get $hasError() {
			return store.hasAnyErrors(entityType, entityId)
		},
		$addError: () => {
			// No-op in runtime proxy - use handle directly for mutations
		},
		$clearErrors: () => {
			// No-op in runtime proxy - use handle directly for mutations
		},
		$clearAllErrors: () => {
			// No-op in runtime proxy - use handle directly for mutations
		},
		// Event methods (stubs for runtime proxy - use handle directly for subscriptions)
		$on: noop,
		$intercept: noop,
		$onPersisted: noop,
		$interceptPersisting: noop,
	}

	// Wrap in Proxy to support direct field access
	return wrapEntityRefWithFieldAccessProxy(ref)
}

/**
 * Combined ref type for runtime that satisfies all ref interfaces
 */
type RuntimeRef = FieldRef<unknown> & HasManyRef<unknown> & HasOneRef<unknown>

/**
 * Creates a field reference for runtime phase with real data access
 *
 * @param selection - The parent entity's selection metadata (for checking if field was selected)
 * @param nestedSelection - The nested selection for this field (if it's a relation)
 */
function createRuntimeFieldRef(
	entityType: string,
	entityId: string,
	store: SnapshotStore,
	notifyChange: NotifyChange,
	path: string[],
	fieldName: string,
	selection?: SelectionMeta,
	nestedSelection?: SelectionMeta,
): RuntimeRef {
	const meta = {
		entityType,
		entityId,
		path,
		fieldName,
		isArray: false as boolean,
		isRelation: false as boolean,
	}

	const getValue = (): unknown => {
		const snapshot = store.getEntitySnapshot(entityType, entityId)
		if (!snapshot) return null

		// Check if this field was included in the selection
		// Only check when selection is provided (JSX pattern with selection tracking)
		if (selection && !selection.fields.has(fieldName)) {
			throw new UnfetchedFieldError(entityType, entityId, path)
		}

		return getNestedValue(snapshot.data, path)
	}

	const getServerValue = (): unknown => {
		const snapshot = store.getEntitySnapshot(entityType, entityId)
		if (!snapshot) return null
		return getNestedValue(snapshot.serverData, path)
	}

	const setValue = (value: unknown) => {
		store.setFieldValue(entityType, entityId, path, value)
		notifyChange()
	}

	const noop = () => () => {}

	const getItems = (): EntityAccessor<unknown>[] => {
		const items = getValue()
		if (!Array.isArray(items)) return []

		return items.map((item: unknown) => {
			if (typeof item !== 'object' || item === null || !('id' in item)) {
				throw new Error(`HasMany items must have an 'id' property`)
			}
			const itemId = (item as { id: string }).id
			const nestedEntityType = `${entityType}_${fieldName}`

			if (!store.hasEntity(nestedEntityType, itemId)) {
				store.setEntityData(nestedEntityType, itemId, item as Record<string, unknown>, true)
			}

			return createRuntimeAccessor<unknown>(
				nestedEntityType,
				itemId,
				store,
				notifyChange,
				[],
				nestedSelection,
			)
		})
	}

	const mapFn = <R>(fn: (item: EntityAccessor<unknown>, index: number) => R): R[] => {
		const items = getValue()
		if (!Array.isArray(items)) return []

		return items.map((item: unknown, index: number) => {
			if (typeof item !== 'object' || item === null || !('id' in item)) {
				throw new Error(`HasMany items must have an 'id' property`)
			}
			const itemId = (item as { id: string }).id

			// Determine the entity type for nested items
			// In a real implementation, this would be provided by schema metadata
			const nestedEntityType = `${entityType}_${fieldName}`

			// Ensure the item is in store
			if (!store.hasEntity(nestedEntityType, itemId)) {
				store.setEntityData(nestedEntityType, itemId, item as Record<string, unknown>, true)
			}

			const accessor = createRuntimeAccessor<unknown>(
				nestedEntityType,
				itemId,
				store,
				notifyChange,
				[],
				nestedSelection,
			)
			return fn(accessor, index)
		})
	}

	const addFn = (data?: Record<string, unknown>): string => {
		const items = getValue()
		const currentItems = Array.isArray(items) ? [...items] : []
		const newId = `__temp_${crypto.randomUUID()}`
		currentItems.push({ id: newId, ...data })
		setValue(currentItems)
		return newId
	}

	const removeFn = (key: string): void => {
		const items = getValue()
		if (!Array.isArray(items)) return
		const filtered = items.filter((item: unknown) => {
			if (typeof item !== 'object' || item === null || !('id' in item)) return true
			return (item as { id: string }).id !== key
		})
		setValue(filtered)
	}

	const moveFn = (fromIndex: number, toIndex: number): void => {
		const items = getValue()
		if (!Array.isArray(items)) return
		if (fromIndex < 0 || fromIndex >= items.length || toIndex < 0 || toIndex >= items.length) {
			return
		}
		if (fromIndex === toIndex) return
		const newItems = [...items]
		const [removed] = newItems.splice(fromIndex, 1)
		if (removed !== undefined) {
			newItems.splice(toIndex, 0, removed)
			setValue(newItems)
		}
	}

	const connectFn = (id: string): void => {
		// Check if this is a HasMany (array) or HasOne (object) relation
		const currentValue = getValue()
		if (Array.isArray(currentValue)) {
			// HasManyRef.connect - add item to list
			const items = [...currentValue]
			if (!items.some((item: unknown) => (item as { id: string }).id === id)) {
				items.push({ id })
			}
			setValue(items)
		} else {
			// HasOneRef.connect - set the related entity
			setValue({ id })
		}
	}

	const disconnectFn = (itemId?: string | null): void => {
		const currentValue = getValue()
		if (Array.isArray(currentValue) && itemId) {
			// HasManyRef.disconnect - remove item from list
			const filtered = currentValue.filter((item: unknown) => {
				if (typeof item !== 'object' || item === null || !('id' in item)) return true
				return (item as { id: string }).id !== itemId
			})
			setValue(filtered)
		} else if (!itemId) {
			// HasOneRef.disconnect - clear the relation
			setValue(null)
		}
		// If itemId is null for HasMany, it's a no-op
	}

	const deleteFn = (): void => {
		// For HasOneRef - mark relation for deletion
		// In real implementation, this would update relation state
		setValue(null)
	}

	const resetFn = (): void => {
		// Reset to server value
		const serverValue = getServerValue()
		setValue(serverValue)
	}

	const getFieldsProxy = (): EntityFields<unknown> => {
		const value = getValue()
		if (typeof value !== 'object' || value === null || !('id' in value)) {
			// Return a proxy that returns null values
			return new Proxy({} as EntityFields<unknown>, {
				get(_, nestedFieldName: string) {
					return createNullFieldRef([...path, nestedFieldName], nestedFieldName)
				},
			})
		}

		// Create inline fields proxy that reads directly from nested data
		// This avoids modifying the store during render
		return createInlineFieldsProxy(value as Record<string, unknown>, [...path], store, notifyChange, nestedSelection)
	}

	const getEntity = (): EntityAccessor<unknown> => {
		const value = getValue()
		if (typeof value !== 'object' || value === null || !('id' in value)) {
			// Return placeholder accessor with placeholder ID
			return createPlaceholderAccessor<unknown>()
		}

		// Create inline accessor that reads directly from nested data
		// This avoids modifying the store during render
		return createInlineAccessor(value as Record<string, unknown>, [...path], store, notifyChange, nestedSelection)
	}

	const getHasOneId = (): string => {
		const value = getValue()
		if (typeof value === 'object' && value !== null && 'id' in value) {
			return (value as { id: string }).id
		}
		// Return placeholder ID when disconnected
		return getEntity().id
	}

	const getState = (): 'connected' | 'disconnected' => {
		const value = getValue()
		return (typeof value === 'object' && value !== null && 'id' in value) ? 'connected' : 'disconnected'
	}

	const getLength = (): number => {
		const items = getValue()
		return Array.isArray(items) ? items.length : 0
	}

	const getValueOrNull = (): unknown => getValue() ?? null
	const getServerValueOrNull = (): unknown => getServerValue() ?? null
	const getIsDirty = (): boolean => !deepEqual(getValue(), getServerValue())
	const getInputProps = (): { value: unknown; setValue: (value: unknown) => void; onChange: (value: unknown) => void } => ({
		value: getValue() ?? null,
		setValue,
		onChange: setValue,
	})
	const getErrors = (): readonly FieldError[] => store.getFieldErrors(entityType, entityId, fieldName)
	const getHasError = (): boolean => store.getFieldErrors(entityType, entityId, fieldName).length > 0
	const addErrorFn = (): void => {
		// No-op in runtime proxy - use handle directly for mutations
	}
	const clearErrorsFn = (): void => {
		// No-op in runtime proxy - use handle directly for mutations
	}

	const refObject = {
		[FIELD_REF_META]: meta,

		// FieldRef properties (non-$ versions)
		get value() {
			return getValueOrNull()
		},
		get serverValue() {
			return getServerValueOrNull()
		},
		get isDirty() {
			return getIsDirty()
		},
		get isTouched() {
			return store.isFieldTouched(entityType, entityId, fieldName)
		},
		touch() {
			store.setFieldTouched(entityType, entityId, fieldName, true)
		},
		setValue,
		get inputProps() {
			return getInputProps()
		},
		get errors() {
			return getErrors()
		},
		get hasError() {
			return getHasError()
		},
		addError: addErrorFn,
		clearErrors: clearErrorsFn,
		onChange: noop,
		onChanging: noop,

		// HasManyRef properties (non-$ versions)
		get length() {
			return getLength()
		},
		get items() {
			return getItems()
		},
		map: mapFn,
		add: addFn,
		remove: removeFn,
		move: moveFn,
		connect: connectFn,
		disconnect: disconnectFn,
		reset: resetFn,
		onItemConnected: noop,
		onItemDisconnected: noop,
		interceptItemConnecting: noop,
		interceptItemDisconnecting: noop,

		// HasOneRef properties ($ prefix only - for collision safety)
		get $id() {
			return getHasOneId()
		},
		get $isDirty() {
			return getIsDirty()
		},
		get $fields() {
			return getFieldsProxy()
		},
		get $entity() {
			return getEntity()
		},
		get $state() {
			return getState()
		},
		$delete: deleteFn,
		$errors: [],
		$hasError: false,
		$addError: addErrorFn,
		$clearErrors: clearErrorsFn,
		$connect: connectFn,
		$disconnect: disconnectFn,
		$reset: resetFn,
		$onConnect: noop,
		$onDisconnect: noop,
		$interceptConnect: noop,
		$interceptDisconnect: noop,

		// EntityRef-compatible properties (for HasOneAccessor = EntityAccessor compatibility)
		get id() {
			return getHasOneId()
		},
		get $data() {
			return getEntity().$data
		},
		get $isNew() {
			return getEntity().$isNew
		},
		get $persistedId() {
			return getEntity().$persistedId
		},
		__entityName: '',
		__availableRoles: [] as readonly string[],
		__schema: {} as Record<string, object>,
		$clearAllErrors: () => {},
		$on: noop,
		$intercept: noop,
		$onPersisted: noop,
		$interceptPersisting: noop,

		// Type brand (phantom property - only exists in type system)
		__entityType: undefined as unknown,
	}

	// Always wrap in field access proxy to support direct field access on has-one relations.
	// This works for all cases:
	// - Scalar fields: Accessing ref.value works (exists on target, passes through)
	// - Has-many fields: Accessing ref.items/length works (exists on target, passes through)
	// - Has-one connected: Accessing ref.fieldName proxies to ref.$fields.fieldName
	// - Has-one disconnected: Accessing ref.fieldName proxies to ref.$fields.fieldName (returns null field ref)
	// The getFieldsProxy handles null values gracefully by returning null field refs.
	return wrapRuntimeRefWithFieldAccessProxy(refObject, getFieldsProxy)
}

/**
 * Properties that should never be treated as field access.
 * These are checked by React, Promise-like detection, iterators, etc.
 */
const NON_FIELD_PROPERTIES = new Set([
	'then', 'catch', 'finally', // Promise-like checks
	'toJSON', 'valueOf', 'toString', // Serialization
	'constructor', 'prototype', // Object internals
	'length', 'size', // Collection-like checks
	'$$typeof', '@@iterator', 'Symbol(Symbol.iterator)', // React/iterator internals
	'_reactFragment', '_owner', // React internals
	'nodeType', 'tagName', // DOM checks
])

/**
 * Wraps a runtime ref in a Proxy that supports direct field access for hasOne relations.
 * - `ref.fieldName` is equivalent to `ref.$fields.fieldName`
 * - Known ref properties pass through to the target
 */
function wrapRuntimeRefWithFieldAccessProxy(
	ref: RuntimeRef,
	getFieldsProxy: () => EntityFields<unknown>,
): RuntimeRef {
	// Cache the fields proxy to avoid creating new objects on each access
	let cachedFieldsProxy: EntityFields<unknown> | null = null

	return new Proxy(ref, {
		get(target, prop) {
			// Symbols - pass through
			if (typeof prop !== 'string') {
				return Reflect.get(target, prop)
			}

			// Check if property exists on target - if so, pass through
			if (prop in target) {
				return Reflect.get(target, prop)
			}

			// Skip known non-field properties (React internals, Promise checks, etc.)
			if (NON_FIELD_PROPERTIES.has(prop) || prop.startsWith('@@') || prop.startsWith('_')) {
				return undefined
			}

			// Cache and reuse the fields proxy
			if (!cachedFieldsProxy) {
				cachedFieldsProxy = getFieldsProxy()
			}

			// Treat as field access on the related entity
			return cachedFieldsProxy[prop as keyof EntityFields<unknown>]
		},
	}) as RuntimeRef
}

/**
 * Creates a null field ref for disconnected relations
 */
function createNullFieldRef(path: string[], fieldName: string): FieldRef<unknown> {
	const noop = () => () => {}
	const noopFn = (): void => {}
	const setValueFn = (): void => {}
	const inputPropsValue = {
		value: null,
		setValue: setValueFn,
		onChange: setValueFn,
	}

	return {
		[FIELD_REF_META]: {
			entityType: '', // Null ref - no entity
			entityId: '', // Null ref - no entity
			path,
			fieldName,
			isArray: false,
			isRelation: false,
		},
		// FieldRef properties (non-$ versions)
		value: null,
		serverValue: null,
		isDirty: false,
		isTouched: false,
		touch: noopFn,
		setValue: setValueFn,
		inputProps: inputPropsValue,
		errors: [],
		hasError: false,
		addError: noopFn,
		clearErrors: noopFn,
		onChange: noop,
		onChanging: noop,
	}
}

// ==================== Helper Functions ====================

/**
 * Gets a nested value from an object using a path array.
 */
function getNestedValue(obj: unknown, path: string[]): unknown {
	if (path.length === 0) return obj
	if (obj === null || typeof obj !== 'object') return undefined

	let current: unknown = obj
	for (const key of path) {
		if (current === null || typeof current !== 'object') return undefined
		current = (current as Record<string, unknown>)[key]
	}
	return current
}

/**
 * Creates a placeholder accessor for disconnected hasOne relations.
 * Returns an EntityAccessor with placeholder ID and empty fields.
 * Supports direct field access: entity.fieldName -> entity.$fields.fieldName
 */
function createPlaceholderAccessor<T>(): EntityAccessor<T> {
	const noop = () => () => {}
	const inputProps = { value: null, setValue: () => {}, onChange: () => {} }

	const fieldsProxy = new Proxy({} as EntityFields<T>, {
		get(_, fieldName: string): FieldRef<unknown> {
			return {
				[FIELD_REF_META]: {
					entityType: '',
					entityId: '',
					path: [fieldName],
					fieldName,
					isArray: false,
					isRelation: false,
				},
				// FieldRef properties (non-$ versions)
				value: null,
				serverValue: null,
				isDirty: false,
				isTouched: false,
				touch: () => {},
				setValue: () => {},
				inputProps,
				errors: [] as FieldError[],
				hasError: false,
				addError: () => {},
				clearErrors: () => {},
				onChange: noop,
				onChanging: noop,
			}
		},
	})

	const ref: EntityRef<T> = {
		id: generatePlaceholderId(),
		$fields: fieldsProxy,
		$data: null,
		$isDirty: false,
		$persistedId: null,
		$isNew: true,
		__entityType: undefined as unknown as T,
		__entityName: '__placeholder__',
		__availableRoles: [] as readonly string[],
		__schema: {} as Record<string, object>,
		$errors: [] as FieldError[],
		$hasError: false,
		$addError: () => {},
		$clearErrors: () => {},
		$clearAllErrors: () => {},
		$on: noop,
		$intercept: noop,
		$onPersisted: noop,
		$interceptPersisting: noop,
	}

	// Wrap in Proxy to support direct field access
	return wrapEntityRefWithFieldAccessProxy(ref)
}

/**
 * Creates a fields proxy that reads directly from inline data.
 * Used for nested relations to avoid store modifications during render.
 */
function createInlineFieldsProxy(
	data: Record<string, unknown>,
	basePath: string[],
	store: SnapshotStore,
	notifyChange: NotifyChange,
	selection?: SelectionMeta,
): EntityFields<unknown> {
	return new Proxy({} as EntityFields<unknown>, {
		get(_, fieldName: string): FieldRef<unknown> | HasManyRef<unknown> | HasOneRef<unknown> {
			const fieldSelection = selection?.fields.get(fieldName)
			return createInlineFieldRef(data, fieldName, basePath, store, notifyChange, selection, fieldSelection?.nested)
		},
	})
}

/**
 * Creates an accessor that reads directly from inline data.
 * Used for nested relations to avoid store modifications during render.
 */
function createInlineAccessor(
	data: Record<string, unknown>,
	basePath: string[],
	store: SnapshotStore,
	notifyChange: NotifyChange,
	selection?: SelectionMeta,
): EntityAccessor<unknown> {
	const noop = () => () => {}
	const entityId = (data as { id?: string }).id ?? ''

	const fieldsProxy = createInlineFieldsProxy(data, basePath, store, notifyChange, selection)

	const ref: EntityRef<unknown> = {
		id: entityId,
		$fields: fieldsProxy,
		$data: data as unknown,
		$isDirty: false,
		$persistedId: entityId,
		$isNew: false,
		__entityType: undefined as unknown,
		__entityName: '',
		__availableRoles: [] as readonly string[],
		__schema: {} as Record<string, object>,
		$errors: [] as FieldError[],
		$hasError: false,
		$addError: () => {},
		$clearErrors: () => {},
		$clearAllErrors: () => {},
		$on: noop,
		$intercept: noop,
		$onPersisted: noop,
		$interceptPersisting: noop,
	}

	return wrapEntityRefWithFieldAccessProxy(ref)
}

/**
 * Creates a field ref that reads directly from inline data.
 */
function createInlineFieldRef(
	data: Record<string, unknown>,
	fieldName: string,
	basePath: string[],
	store: SnapshotStore,
	notifyChange: NotifyChange,
	selection?: SelectionMeta,
	nestedSelection?: SelectionMeta,
): FieldRef<unknown> & HasManyRef<unknown> & HasOneRef<unknown> {
	const path = [...basePath, fieldName]
	const noop = () => () => {}

	const getValue = (): unknown => {
		// Check if this field was included in the selection
		// Only check when selection is provided
		if (selection && !selection.fields.has(fieldName)) {
			throw new UnfetchedFieldError('inline', '', path)
		}
		return data[fieldName]
	}

	const meta = {
		entityType: '',
		entityId: '',
		path,
		fieldName,
		isArray: false,
		isRelation: false,
	}

	const getFieldsProxy = (): EntityFields<unknown> => {
		const value = getValue()
		if (typeof value !== 'object' || value === null || !('id' in value)) {
			return new Proxy({} as EntityFields<unknown>, {
				get(_, nestedFieldName: string) {
					return createNullFieldRef([...path, nestedFieldName], nestedFieldName)
				},
			})
		}
		return createInlineFieldsProxy(value as Record<string, unknown>, path, store, notifyChange, nestedSelection)
	}

	const getEntity = (): EntityAccessor<unknown> => {
		const value = getValue()
		if (typeof value !== 'object' || value === null || !('id' in value)) {
			return createPlaceholderAccessor<unknown>()
		}
		return createInlineAccessor(value as Record<string, unknown>, path, store, notifyChange, nestedSelection)
	}

	const mapFn = <R>(fn: (item: EntityAccessor<unknown>, index: number) => R): R[] => {
		const items = getValue()
		if (!Array.isArray(items)) return []
		return items.map((item: unknown, index: number) => {
			if (typeof item !== 'object' || item === null) {
				return fn(createPlaceholderAccessor<unknown>(), index)
			}
			return fn(createInlineAccessor(item as Record<string, unknown>, [...path, String(index)], store, notifyChange, nestedSelection), index)
		})
	}

	const getItems = (): EntityAccessor<unknown>[] => {
		const items = getValue()
		if (!Array.isArray(items)) return []
		return items.map((item: unknown, index: number) => {
			if (typeof item !== 'object' || item === null) {
				return createPlaceholderAccessor<unknown>()
			}
			return createInlineAccessor(item as Record<string, unknown>, [...path, String(index)], store, notifyChange, nestedSelection)
		})
	}

	const inputProps = { value: getValue() ?? null, setValue: () => {}, onChange: () => {} }

	const refObject = {
		[FIELD_REF_META]: meta,

		// FieldRef properties
		get value() { return getValue() ?? null },
		serverValue: getValue() ?? null,
		isDirty: false,
		isTouched: false,
		touch: () => {},
		setValue: () => {},
		inputProps,
		errors: [] as FieldError[],
		hasError: false,
		addError: () => {},
		clearErrors: () => {},
		onChange: noop,
		onChanging: noop,

		// HasManyRef properties
		get length() { const v = getValue(); return Array.isArray(v) ? v.length : 0 },
		get items() { return getItems() },
		map: mapFn,
		add: () => '',
		remove: () => {},
		move: () => {},
		connect: () => {},
		disconnect: () => {},
		reset: () => {},
		onItemConnected: noop,
		onItemDisconnected: noop,
		interceptItemConnecting: noop,
		interceptItemDisconnecting: noop,

		// HasOneRef properties
		get $id() { const v = getValue(); return (typeof v === 'object' && v !== null && 'id' in v) ? (v as {id: string}).id : '' },
		$isDirty: false,
		get $fields() { return getFieldsProxy() },
		get $entity() { return getEntity() },
		get $state() { const v = getValue(); return (typeof v === 'object' && v !== null && 'id' in v) ? 'connected' as const : 'disconnected' as const },
		$delete: () => {},
		$errors: [] as FieldError[],
		$hasError: false,
		$addError: () => {},
		$clearErrors: () => {},
		$connect: () => {},
		$disconnect: () => {},
		$reset: () => {},
		$onConnect: noop,
		$onDisconnect: noop,
		$interceptConnect: noop,
		$interceptDisconnect: noop,

		// EntityRef compatibility
		get id() { const v = getValue(); return (typeof v === 'object' && v !== null && 'id' in v) ? (v as {id: string}).id : '' },
		get $data() { return getEntity().$data },
		$isNew: false,
		$persistedId: null,
		__entityName: '',
		__availableRoles: [] as readonly string[],
		__schema: {} as Record<string, object>,
		$clearAllErrors: () => {},
		$on: noop,
		$intercept: noop,
		$onPersisted: noop,
		$interceptPersisting: noop,
		__entityType: undefined as unknown,
	}

	// Only wrap for hasOne relations
	const value = getValue()
	const isHasOneRelation = typeof value === 'object' && value !== null && 'id' in value && !Array.isArray(value)

	if (isHasOneRelation) {
		return wrapInlineRefWithFieldAccessProxy(refObject, getFieldsProxy)
	}

	return refObject as RuntimeRef
}

/**
 * Wraps an inline field ref with direct field access proxy.
 */
function wrapInlineRefWithFieldAccessProxy(
	ref: RuntimeRef,
	getFieldsProxy: () => EntityFields<unknown>,
): RuntimeRef {
	let cachedFieldsProxy: EntityFields<unknown> | null = null

	return new Proxy(ref, {
		get(target, prop) {
			if (typeof prop !== 'string') {
				return Reflect.get(target, prop)
			}
			if (prop in target) {
				return Reflect.get(target, prop)
			}
			if (NON_FIELD_PROPERTIES.has(prop) || prop.startsWith('@@') || prop.startsWith('_')) {
				return undefined
			}
			if (!cachedFieldsProxy) {
				cachedFieldsProxy = getFieldsProxy()
			}
			return cachedFieldsProxy[prop as keyof EntityFields<unknown>]
		},
	}) as RuntimeRef
}

