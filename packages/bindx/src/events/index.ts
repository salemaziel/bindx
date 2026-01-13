/**
 * Event system for bindx.
 *
 * Provides type-safe event subscriptions and interceptors for:
 * - Field value changes
 * - Relation changes (hasOne, hasMany)
 * - Entity lifecycle (persist, reset, delete)
 * - Errors
 * - Load state changes
 */

export { EventEmitter } from './EventEmitter.js'

export {
	createBeforeEvent,
	createAfterEvent,
	captureStateBeforeAction,
	createHasManyConnectingEvent,
	createHasManyConnectedEvent,
	createHasManyDisconnectingEvent,
	createHasManyDisconnectedEvent,
} from './eventFactory.js'

export type {
	// Base types
	BindxEvent,
	FieldScopedEvent,

	// Field events
	FieldChangingEvent,
	FieldChangedEvent,

	// HasOne relation events
	RelationConnectingEvent,
	RelationConnectedEvent,
	RelationDisconnectingEvent,
	RelationDisconnectedEvent,
	RelationDeletingEvent,
	RelationDeletedEvent,

	// HasMany relation events
	HasManyConnectingEvent,
	HasManyConnectedEvent,
	HasManyDisconnectingEvent,
	HasManyDisconnectedEvent,

	// Entity lifecycle events
	EntityPersistingEvent,
	EntityPersistedEvent,
	EntityPersistFailedEvent,
	EntityResettingEvent,
	EntityResetEvent,
	EntityDeletingEvent,
	EntityDeletedEvent,

	// Error events
	ErrorAddedEvent,
	ErrorsClearedEvent,

	// Load state events
	LoadStateChangedEvent,

	// Union types
	BeforeEvent,
	AfterEvent,
	AnyBindxEvent,

	// Event type strings
	BeforeEventType,
	AfterEventType,
	AnyEventType,

	// Type map
	EventTypeMap,
	EventByType,

	// Interceptor types
	InterceptorResult,
	Interceptor,
	EventListener,
	Unsubscribe,

	// Helper types
	BeforeEventTypes,
	AfterEventTypes,
	FieldScopedEventTypes,
} from './types.js'

export type { CapturedState } from './eventFactory.js'
