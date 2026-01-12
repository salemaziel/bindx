import type { BackendAdapter } from '../adapter/types.js'
import type { SnapshotStore } from '../store/SnapshotStore.js'
import type { ActionDispatcher } from './ActionDispatcher.js'
import { setPersisting, commitEntity } from './actions.js'
import { deepEqual } from '../utils/deepEqual.js'
import type { UndoManager } from '../undo/UndoManager.js'

/**
 * Pending persist operation tracking
 */
interface PendingPersist {
	promise: Promise<void>
	abortController: AbortController
}

/**
 * Interface for custom mutation data collectors.
 * Used by ContemberAdapter to build proper nested mutations.
 */
export interface MutationDataCollector {
	/**
	 * Collects mutation data for updating an existing entity.
	 * Returns the mutation input or null if no changes.
	 */
	collectUpdateData(entityType: string, entityId: string): Record<string, unknown> | null

	/**
	 * Collects mutation data for creating a new entity.
	 * Returns the mutation input or null if no data.
	 */
	collectCreateData?(entityType: string, entityId: string): Record<string, unknown> | null
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
}

/**
 * PersistenceManager handles entity persistence with concurrency control.
 *
 * Key features:
 * - One persist operation per entity at a time (concurrent requests are queued)
 * - Optimistic updates (changes visible immediately)
 * - Abort support for cleanup
 * - Proper error handling
 * - Optional custom mutation collector for nested operations
 */
export class PersistenceManager {
	/** Pending persist operations keyed by "entityType:id" */
	private readonly pending = new Map<string, PendingPersist>()
	private readonly mutationCollector?: MutationDataCollector
	private readonly undoManager?: UndoManager

	constructor(
		private readonly adapter: BackendAdapter,
		private readonly store: SnapshotStore,
		private readonly dispatcher: ActionDispatcher,
		options?: PersistenceManagerOptions,
	) {
		this.mutationCollector = options?.mutationCollector
		this.undoManager = options?.undoManager
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
	 */
	async persist(entityType: string, id: string): Promise<void> {
		const key = this.getKey(entityType, id)

		// If already persisting, wait for existing operation
		const existing = this.pending.get(key)
		if (existing) {
			return existing.promise
		}

		const abortController = new AbortController()

		// Check if this is a new entity (not yet on server)
		const existsOnServer = this.store.existsOnServer(entityType, id)

		const promise = existsOnServer
			? this.doPersist(entityType, id, abortController.signal)
			: this.doCreate(entityType, id, abortController.signal)

		const wrappedPromise = promise.finally(() => {
			this.pending.delete(key)
			this.dispatcher.dispatch(setPersisting(entityType, id, false))
		})

		this.pending.set(key, { promise: wrappedPromise, abortController })
		this.dispatcher.dispatch(setPersisting(entityType, id, true))

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
			await this.adapter.persist(entityType, id, changes)

			// Check if aborted
			if (signal.aborted) {
				throw new Error('Persist operation was aborted')
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

			const persistedId = result['id'] as string

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
		const id = result['id'] as string
		const resultData = result['data'] as Record<string, unknown> | undefined

		// Store the new entity in SnapshotStore
		this.store.setEntityData(entityType, id, resultData ?? result, true)

		return { id, data: resultData ?? result }
	}

	/**
	 * Deletes an entity on the backend.
	 */
	async delete(entityType: string, id: string): Promise<void> {
		if (!this.adapter.delete) {
			throw new Error('Adapter does not support delete operation')
		}

		await this.adapter.delete(entityType, id)

		// Remove from SnapshotStore
		this.store.removeEntity(entityType, id)
	}
}

