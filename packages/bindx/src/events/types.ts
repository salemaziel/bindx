/**
 * Type-safe event system for bindx.
 *
 * Events are categorized into:
 * - Before events (interceptable): Can be cancelled or modified
 * - After events (notifications): Fired after state changes
 */

import type { FieldError } from '../errors/types.js'

// ============================================================================
// Base Event Types
// ============================================================================

/**
 * Base interface for all bindx events.
 */
export interface BindxEvent<TType extends string = string> {
	readonly type: TType
	readonly timestamp: number
	readonly entityType: string
	readonly entityId: string
}

/**
 * Base interface for field-scoped events.
 */
export interface FieldScopedEvent<TType extends string> extends BindxEvent<TType> {
	readonly fieldName: string
}

// ============================================================================
// Field Events
// ============================================================================

/**
 * Fired before a field value changes. Can be intercepted to cancel or modify.
 */
export interface FieldChangingEvent extends FieldScopedEvent<'field:changing'> {
	readonly fieldPath: readonly string[]
	readonly oldValue: unknown
	readonly newValue: unknown
}

/**
 * Fired after a field value has changed.
 */
export interface FieldChangedEvent extends FieldScopedEvent<'field:changed'> {
	readonly fieldPath: readonly string[]
	readonly oldValue: unknown
	readonly newValue: unknown
}

// ============================================================================
// HasOne Relation Events
// ============================================================================

/**
 * Fired before a has-one relation is connected.
 */
export interface RelationConnectingEvent extends FieldScopedEvent<'relation:connecting'> {
	readonly targetId: string
	readonly previousId: string | null
}

/**
 * Fired after a has-one relation has been connected.
 */
export interface RelationConnectedEvent extends FieldScopedEvent<'relation:connected'> {
	readonly targetId: string
	readonly previousId: string | null
}

/**
 * Fired before a has-one relation is disconnected.
 */
export interface RelationDisconnectingEvent extends FieldScopedEvent<'relation:disconnecting'> {
	readonly currentId: string | null
}

/**
 * Fired after a has-one relation has been disconnected.
 */
export interface RelationDisconnectedEvent extends FieldScopedEvent<'relation:disconnected'> {
	readonly previousId: string | null
}

/**
 * Fired before a has-one relation is deleted.
 */
export interface RelationDeletingEvent extends FieldScopedEvent<'relation:deleting'> {
	readonly currentId: string | null
}

/**
 * Fired after a has-one relation has been deleted.
 */
export interface RelationDeletedEvent extends FieldScopedEvent<'relation:deleted'> {
	readonly previousId: string | null
}

// ============================================================================
// HasMany Relation Events
// ============================================================================

/**
 * Fired before an item is connected to a has-many relation.
 */
export interface HasManyConnectingEvent extends FieldScopedEvent<'hasMany:connecting'> {
	readonly itemId: string
}

/**
 * Fired after an item has been connected to a has-many relation.
 */
export interface HasManyConnectedEvent extends FieldScopedEvent<'hasMany:connected'> {
	readonly itemId: string
}

/**
 * Fired before an item is disconnected from a has-many relation.
 */
export interface HasManyDisconnectingEvent extends FieldScopedEvent<'hasMany:disconnecting'> {
	readonly itemId: string
}

/**
 * Fired after an item has been disconnected from a has-many relation.
 */
export interface HasManyDisconnectedEvent extends FieldScopedEvent<'hasMany:disconnected'> {
	readonly itemId: string
}

// ============================================================================
// Entity Lifecycle Events
// ============================================================================

/**
 * Fired before an entity is persisted (create or update).
 */
export interface EntityPersistingEvent extends BindxEvent<'entity:persisting'> {
	readonly isNew: boolean
}

/**
 * Fired after an entity has been successfully persisted.
 */
export interface EntityPersistedEvent extends BindxEvent<'entity:persisted'> {
	readonly isNew: boolean
	readonly persistedId: string
}

/**
 * Fired when entity persistence fails.
 */
export interface EntityPersistFailedEvent extends BindxEvent<'entity:persistFailed'> {
	readonly isNew: boolean
	readonly error: Error
}

/**
 * Fired before an entity is reset to server state.
 */
export interface EntityResettingEvent extends BindxEvent<'entity:resetting'> {}

/**
 * Fired after an entity has been reset to server state.
 */
export interface EntityResetEvent extends BindxEvent<'entity:reset'> {}

/**
 * Fired before an entity is deleted.
 */
export interface EntityDeletingEvent extends BindxEvent<'entity:deleting'> {}

/**
 * Fired after an entity has been deleted.
 */
export interface EntityDeletedEvent extends BindxEvent<'entity:deleted'> {}

// ============================================================================
// Error Events
// ============================================================================

/**
 * Fired when an error is added to a field, entity, or relation.
 */
export interface ErrorAddedEvent extends BindxEvent<'error:added'> {
	readonly target: 'entity' | 'field' | 'relation'
	readonly targetName: string | null
	readonly error: FieldError
}

/**
 * Fired when errors are cleared.
 */
export interface ErrorsClearedEvent extends BindxEvent<'errors:cleared'> {
	readonly target: 'entity' | 'field' | 'relation' | 'all'
	readonly targetName: string | null
}

// ============================================================================
// Load State Events
// ============================================================================

/**
 * Fired when entity load state changes.
 */
export interface LoadStateChangedEvent extends BindxEvent<'load:stateChanged'> {
	readonly previousStatus: string | undefined
	readonly newStatus: string
	readonly error?: Error
}

// ============================================================================
// Union Types
// ============================================================================

/**
 * All "before" events that can be intercepted and cancelled.
 */
export type BeforeEvent =
	| FieldChangingEvent
	| RelationConnectingEvent
	| RelationDisconnectingEvent
	| RelationDeletingEvent
	| HasManyConnectingEvent
	| HasManyDisconnectingEvent
	| EntityPersistingEvent
	| EntityResettingEvent
	| EntityDeletingEvent

/**
 * All "after" events (notifications).
 */
export type AfterEvent =
	| FieldChangedEvent
	| RelationConnectedEvent
	| RelationDisconnectedEvent
	| RelationDeletedEvent
	| HasManyConnectedEvent
	| HasManyDisconnectedEvent
	| EntityPersistedEvent
	| EntityPersistFailedEvent
	| EntityResetEvent
	| EntityDeletedEvent
	| ErrorAddedEvent
	| ErrorsClearedEvent
	| LoadStateChangedEvent

/**
 * All bindx events.
 */
export type AnyBindxEvent = BeforeEvent | AfterEvent

/**
 * All before event type strings.
 */
export type BeforeEventType = BeforeEvent['type']

/**
 * All after event type strings.
 */
export type AfterEventType = AfterEvent['type']

/**
 * All event type strings.
 */
export type AnyEventType = AnyBindxEvent['type']

// ============================================================================
// Event Type Map
// ============================================================================

/**
 * Map of event types to their event objects.
 * Enables type-safe subscriptions.
 */
export interface EventTypeMap {
	// Field events
	'field:changing': FieldChangingEvent
	'field:changed': FieldChangedEvent

	// HasOne relation events
	'relation:connecting': RelationConnectingEvent
	'relation:connected': RelationConnectedEvent
	'relation:disconnecting': RelationDisconnectingEvent
	'relation:disconnected': RelationDisconnectedEvent
	'relation:deleting': RelationDeletingEvent
	'relation:deleted': RelationDeletedEvent

	// HasMany relation events
	'hasMany:connecting': HasManyConnectingEvent
	'hasMany:connected': HasManyConnectedEvent
	'hasMany:disconnecting': HasManyDisconnectingEvent
	'hasMany:disconnected': HasManyDisconnectedEvent

	// Entity lifecycle events
	'entity:persisting': EntityPersistingEvent
	'entity:persisted': EntityPersistedEvent
	'entity:persistFailed': EntityPersistFailedEvent
	'entity:resetting': EntityResettingEvent
	'entity:reset': EntityResetEvent
	'entity:deleting': EntityDeletingEvent
	'entity:deleted': EntityDeletedEvent

	// Error events
	'error:added': ErrorAddedEvent
	'errors:cleared': ErrorsClearedEvent

	// Load state events
	'load:stateChanged': LoadStateChangedEvent
}

/**
 * Extract event type from event name.
 */
export type EventByType<T extends keyof EventTypeMap> = EventTypeMap[T]

// ============================================================================
// Interceptor Types
// ============================================================================

/**
 * Result of an interceptor execution.
 */
export type InterceptorResult<T extends BeforeEvent = BeforeEvent> =
	| { readonly action: 'cancel' }
	| { readonly action: 'continue' }
	| { readonly action: 'modify'; readonly event: T }

/**
 * Interceptor function type.
 * Can be sync or async.
 * Return undefined/void to continue without changes.
 */
export type Interceptor<T extends BeforeEvent> = (
	event: T,
) => InterceptorResult<T> | Promise<InterceptorResult<T>> | void | Promise<void>

/**
 * Event listener function type.
 */
export type EventListener<T extends AfterEvent> = (event: T) => void

/**
 * Unsubscribe function returned by subscription methods.
 */
export type Unsubscribe = () => void

// ============================================================================
// Helper Types
// ============================================================================

/**
 * Extract before events from EventTypeMap.
 */
export type BeforeEventTypes = {
	[K in keyof EventTypeMap]: EventTypeMap[K] extends BeforeEvent ? K : never
}[keyof EventTypeMap]

/**
 * Extract after events from EventTypeMap.
 */
export type AfterEventTypes = {
	[K in keyof EventTypeMap]: EventTypeMap[K] extends AfterEvent ? K : never
}[keyof EventTypeMap]

/**
 * Extract field-scoped events.
 */
export type FieldScopedEventTypes = {
	[K in keyof EventTypeMap]: EventTypeMap[K] extends FieldScopedEvent<string> ? K : never
}[keyof EventTypeMap]
