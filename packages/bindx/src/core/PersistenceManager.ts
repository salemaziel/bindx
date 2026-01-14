import type { BackendAdapter } from '../adapter/types.js'
import type { SnapshotStore } from '../store/SnapshotStore.js'
import type { ActionDispatcher } from './ActionDispatcher.js'
import { setPersisting, commitEntity, addFieldError, addEntityError, addRelationError, clearAllServerErrors } from './actions.js'
import { deepEqual } from '../utils/deepEqual.js'
import type { UndoManager } from '../undo/UndoManager.js'
import type { SchemaRegistry } from '../schema/SchemaRegistry.js'
import { extractMappedErrors, type ContemberMutationResult } from '../errors/pathMapper.js'
import { createServerError } from '../errors/types.js'
import type {
	EntityPersistingEvent,
	EntityPersistedEvent,
	EntityPersistFailedEvent,
} from '../events/types.js'
import type { MutationDataCollector } from '../persistence/types.js'

// Re-export for backward compatibility
export type { MutationDataCollector } from '../persistence/types.js'

/**
 * Pending persist operation tracking
 */
interface PendingPersist {
	promise: Promise<void>
	abortController: AbortController
}

/**
 * Options for PersistenceManager
 */
export interface PersistenceManagerOptions {
	/**
	 * Custom mutation collector for building complex mutation inputs.
	 * If provided, will be used instead of simple field diff.
	 */
	mutationCollector?: MutationDataCollector
	/**
	 * UndoManager instance to block during persist operations.
	 * When provided, undo/redo will be blocked during persistence.
	 */
	undoManager?: UndoManager
	/**
	 * Schema registry for mapping server errors to fields.
	 * Required for detailed error mapping.
	 */
	schema?: SchemaRegistry
}

/**
 * Error thrown when persist fails due to client validation errors.
 */
export class ClientValidationError extends Error {
	constructor(entityType: string, id: string) {
		super(`Cannot persist ${entityType}:${id} - entity has client validation errors`)
		this.name = 'ClientValidationError'
	}
}

/**
 * Error thrown when persist fails due to server errors.
 * Contains the detailed mutation result for inspection.
 */
export class PersistError extends Error {
	constructor(
		message: string,
		public readonly entityType: string,
		public readonly entityId: string,
		public readonly mutationResult?: ContemberMutationResult,
	) {
		super(message)
		this.name = 'PersistError'
	}
}

/**
 * PersistenceManager handles entity persistence with concurrency control.
 *
 * Key features:
 * - One persist operation per entity at a time (concurrent requests are queued)
 * - Optimistic updates (changes visible immediately)
 * - Abort support for cleanup
 * - Proper error handling with field-level error mapping
 * - Optional custom mutation collector for nested operations
 * - Blocks persist when client validation errors exist
 */
export class PersistenceManager {
	/** Pending persist operations keyed by "entityType:id" */
	private readonly pending = new Map<string, PendingPersist>()
	private readonly mutationCollector?: MutationDataCollector
	private readonly undoManager?: UndoManager
	private readonly schema?: SchemaRegistry

	constructor(
		private readonly adapter: BackendAdapter,
		private readonly store: SnapshotStore,
		private readonly dispatcher: ActionDispatcher,
		options?: PersistenceManagerOptions,
	) {
		this.mutationCollector = options?.mutationCollector
		this.undoManager = options?.undoManager
		this.schema = options?.schema
	}

	/**
	 * Gets the key for an entity.
	 */
	private getKey(entityType: string, id: string): string {
		return `${entityType}:${id}`
	}

	/**
	 * Checks if an entity is currently being persisted.
	 */
	isPersisting(entityType: string, id: string): boolean {
		const key = this.getKey(entityType, id)
		return this.pending.has(key)
	}

	/**
	 * Persists an entity's changes to the backend.
	 * Handles both create (new entities) and update (existing entities) operations.
	 *
	 * If already persisting, waits for the existing operation to complete.
	 * This prevents duplicate requests and ensures consistency.
	 *
	 * @throws {ClientValidationError} If entity has client validation errors
	 * @throws {PersistError} If server returns an error
	 */
	async persist(entityType: string, id: string): Promise<void> {
		const key = this.getKey(entityType, id)

		// Check for client validation errors - block persist if any exist
		if (this.store.hasClientErrors(entityType, id)) {
			throw new ClientValidationError(entityType, id)
		}

		// If already persisting, wait for existing operation
		const existing = this.pending.get(key)
		if (existing) {
			return existing.promise
		}

		// Check if this is a new entity (not yet on server)
		const isNew = !this.store.existsOnServer(entityType, id)
		const eventEmitter = this.dispatcher.getEventEmitter()

		// Run interceptors for entity:persisting
		const persistingEvent: EntityPersistingEvent = {
			type: 'entity:persisting',
			timestamp: Date.now(),
			entityType,
			entityId: id,
			isNew,
		}

		// Set persisting state BEFORE running interceptors (so UI updates immediately)
		this.dispatcher.dispatch(setPersisting(entityType, id, true))

		const interceptorResult = await eventEmitter.runInterceptors(persistingEvent)
		if (interceptorResult === null) {
			// Interceptor cancelled the persist - reset persisting state
			this.dispatcher.dispatch(setPersisting(entityType, id, false))
			throw new Error(`Persist cancelled by interceptor for ${entityType}:${id}`)
		}

		// Clear server errors before new persist attempt
		this.dispatcher.dispatch(clearAllServerErrors(entityType, id))

		const abortController = new AbortController()

		const promise = isNew
			? this.doCreate(entityType, id, abortController.signal)
			: this.doPersist(entityType, id, abortController.signal)

		const wrappedPromise = promise
			.then(() => {
				// Emit success event
				const persistedEvent: EntityPersistedEvent = {
					type: 'entity:persisted',
					timestamp: Date.now(),
					entityType,
					entityId: id,
					isNew,
					persistedId: this.store.getPersistedId(entityType, id) ?? id,
				}
				eventEmitter.emit(persistedEvent)
			})
			.catch((error) => {
				// Emit failure event
				const failedEvent: EntityPersistFailedEvent = {
					type: 'entity:persistFailed',
					timestamp: Date.now(),
					entityType,
					entityId: id,
					isNew,
					error: error instanceof Error ? error : new Error(String(error)),
				}
				eventEmitter.emit(failedEvent)
				throw error
			})
			.finally(() => {
				this.pending.delete(key)
				this.dispatcher.dispatch(setPersisting(entityType, id, false))
			})

		this.pending.set(key, { promise: wrappedPromise, abortController })

		return wrappedPromise
	}

	/**
	 * Performs the actual persist operation.
	 */
	private async doPersist(
		entityType: string,
		id: string,
		signal: AbortSignal,
	): Promise<void> {
		// Block undo during persist
		this.undoManager?.block()

		try {
			const snapshot = this.store.getEntitySnapshot(entityType, id)
			if (!snapshot) {
				throw new Error(`Entity ${entityType}:${id} not found`)
			}

			// Collect changes using custom collector or simple field diff
			let changes: Record<string, unknown> | null

			if (this.mutationCollector) {
				// Use custom mutation collector (e.g., for Contember nested operations)
				changes = this.mutationCollector.collectUpdateData(entityType, id)
			} else {
				// Simple field diff
				changes = this.collectChanges(
					snapshot.data as Record<string, unknown>,
					snapshot.serverData as Record<string, unknown>,
				)
			}

			if (!changes || Object.keys(changes).length === 0) {
				// Nothing to persist
				return
			}

			// Persist to backend
			const result = await this.adapter.persist(entityType, id, changes)

			// Check if aborted
			if (signal.aborted) {
				throw new Error('Persist operation was aborted')
			}

			// Handle errors
			if (!result.ok) {
				this.mapServerErrors(entityType, id, result.mutationResult)
				throw new PersistError(
					result.errorMessage ?? `Failed to persist ${entityType}:${id}`,
					entityType,
					id,
					result.mutationResult,
				)
			}

			// Commit changes (serverData = data)
			this.dispatcher.dispatch(commitEntity(entityType, id))

			// Commit all relations (hasOne and hasMany)
			this.store.commitAllRelations(entityType, id)
		} finally {
			// Unblock undo after persist completes (success or failure)
			this.undoManager?.unblock()
		}
	}

	/**
	 * Performs the create operation for new entities.
	 */
	private async doCreate(
		entityType: string,
		id: string,
		signal: AbortSignal,
	): Promise<void> {
		// Block undo during persist
		this.undoManager?.block()

		try {
			const snapshot = this.store.getEntitySnapshot(entityType, id)
			if (!snapshot) {
				throw new Error(`Entity ${entityType}:${id} not found`)
			}

			// Collect create data using custom collector or all data
			let createData: Record<string, unknown> | null

			if (this.mutationCollector?.collectCreateData) {
				// Use custom mutation collector (e.g., for Contember nested operations)
				createData = this.mutationCollector.collectCreateData(entityType, id)
			} else {
				// Simple approach - use all data except temp id
				createData = this.collectCreateData(snapshot.data as Record<string, unknown>)
			}

			if (!createData || Object.keys(createData).length === 0) {
				// Nothing to create - mark as created with same ID
				// This handles the case where entity has no data yet
				return
			}

			if (!this.adapter.create) {
				throw new Error('Adapter does not support create operation')
			}

			// Create entity on backend
			const result = await this.adapter.create(entityType, createData)

			// Check if aborted
			if (signal.aborted) {
				throw new Error('Create operation was aborted')
			}

			// Handle errors
			if (!result.ok) {
				this.mapServerErrors(entityType, id, result.mutationResult)
				throw new PersistError(
					result.errorMessage ?? `Failed to create ${entityType}`,
					entityType,
					id,
					result.mutationResult,
				)
			}

			const persistedId = result.data?.['id'] as string

			// Map temp ID to persisted ID in store
			this.store.mapTempIdToPersistedId(entityType, id, persistedId)

			// Commit changes (serverData = data)
			this.dispatcher.dispatch(commitEntity(entityType, id))

			// Commit all relations (hasOne and hasMany)
			this.store.commitAllRelations(entityType, id)
		} finally {
			// Unblock undo after persist completes (success or failure)
			this.undoManager?.unblock()
		}
	}

	/**
	 * Collects data for creating a new entity.
	 * Excludes the temporary ID.
	 */
	private collectCreateData(
		data: Record<string, unknown>,
	): Record<string, unknown> {
		const createData: Record<string, unknown> = {}

		for (const [key, value] of Object.entries(data)) {
			// Skip the temp ID
			if (key === 'id' && typeof value === 'string' && value.startsWith('__temp_')) {
				continue
			}

			// Skip null/undefined values
			if (value === null || value === undefined) {
				continue
			}

			createData[key] = value
		}

		return createData
	}

	/**
	 * Collects changed fields by comparing data to serverData.
	 */
	private collectChanges(
		data: Record<string, unknown>,
		serverData: Record<string, unknown>,
	): Record<string, unknown> {
		const changes: Record<string, unknown> = {}

		for (const [key, value] of Object.entries(data)) {
			const serverValue = serverData[key]

			if (!deepEqual(value, serverValue)) {
				changes[key] = value
			}
		}

		return changes
	}

	/**
	 * Maps server errors from mutation result to entity fields/relations.
	 */
	private mapServerErrors(
		entityType: string,
		entityId: string,
		mutationResult?: ContemberMutationResult,
	): void {
		if (!mutationResult) {
			// No detailed error info - add generic entity error
			this.dispatcher.dispatch(
				addEntityError(entityType, entityId, createServerError('Persist operation failed')),
			)
			return
		}

		if (this.schema) {
			// Use schema to map errors to specific fields/relations
			const mappedErrors = extractMappedErrors(mutationResult, entityType, this.schema)

			for (const mapped of mappedErrors) {
				if (mapped.type === 'field' && mapped.name) {
					this.dispatcher.dispatch(
						addFieldError(entityType, entityId, mapped.name, mapped.error),
					)
				} else if (mapped.type === 'relation' && mapped.name) {
					this.dispatcher.dispatch(
						addRelationError(entityType, entityId, mapped.name, mapped.error),
					)
				} else {
					this.dispatcher.dispatch(
						addEntityError(entityType, entityId, mapped.error),
					)
				}
			}
		} else {
			// No schema available - add all errors as entity-level errors
			for (const error of mutationResult.errors) {
				this.dispatcher.dispatch(
					addEntityError(entityType, entityId, createServerError(error.message, error.type)),
				)
			}
			for (const error of mutationResult.validation.errors) {
				this.dispatcher.dispatch(
					addEntityError(entityType, entityId, createServerError(error.message.text, undefined, 'VALIDATION_ERROR')),
				)
			}
		}
	}

	/**
	 * Cancels a pending persist operation.
	 */
	cancel(entityType: string, id: string): void {
		const key = this.getKey(entityType, id)
		const pending = this.pending.get(key)

		if (pending) {
			pending.abortController.abort()
			this.pending.delete(key)
			this.dispatcher.dispatch(setPersisting(entityType, id, false))
		}
	}

	/**
	 * Cancels all pending persist operations.
	 */
	cancelAll(): void {
		for (const pending of this.pending.values()) {
			pending.abortController.abort()
		}
		this.pending.clear()
	}

	/**
	 * Creates a new entity on the backend.
	 */
	async create(
		entityType: string,
		data: Record<string, unknown>,
	): Promise<{ id: string; data: Record<string, unknown> }> {
		if (!this.adapter.create) {
			throw new Error('Adapter does not support create operation')
		}

		const result = await this.adapter.create(entityType, data)

		if (!result.ok) {
			throw new PersistError(
				result.errorMessage ?? `Failed to create ${entityType}`,
				entityType,
				'',
				result.mutationResult,
			)
		}

		const id = result.data?.['id'] as string
		const resultData = result.data

		// Store the new entity in SnapshotStore
		this.store.setEntityData(entityType, id, resultData ?? {}, true)

		return { id, data: resultData ?? {} }
	}

	/**
	 * Deletes an entity on the backend.
	 */
	async delete(entityType: string, id: string): Promise<void> {
		if (!this.adapter.delete) {
			throw new Error('Adapter does not support delete operation')
		}

		const result = await this.adapter.delete(entityType, id)

		if (!result.ok) {
			throw new PersistError(
				result.errorMessage ?? `Failed to delete ${entityType}:${id}`,
				entityType,
				id,
				result.mutationResult,
			)
		}

		// Remove from SnapshotStore
		this.store.removeEntity(entityType, id)
	}
}

