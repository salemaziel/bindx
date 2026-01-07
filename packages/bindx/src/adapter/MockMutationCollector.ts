import type { SnapshotStore } from '../store/SnapshotStore.js'
import type { SchemaRegistry } from '../schema/SchemaRegistry.js'
import type { MutationDataCollector } from '../core/PersistenceManager.js'
import { deepEqual } from '../utils/deepEqual.js'

/**
 * MockMutationCollector builds Contember-compatible mutation data
 * using SchemaRegistry (not Contember schema).
 *
 * This collector generates the same format as the Contember MutationCollector:
 * - HasOne: { connect: { id } }, { disconnect: true }, { update: {...} }
 * - HasMany: [{ connect: { id } }, { disconnect: { id } }, ...]
 *
 * This allows MockAdapter to use the same mutation format as ContemberAdapter.
 */
export class MockMutationCollector implements MutationDataCollector {
	constructor(
		private readonly store: SnapshotStore,
		private readonly schema: SchemaRegistry,
	) {}

	/**
	 * Collects update data for an entity in Contember mutation format.
	 * Returns the changes or null if no changes.
	 */
	collectUpdateData(entityType: string, entityId: string): Record<string, unknown> | null {
		const snapshot = this.store.getEntitySnapshot(entityType, entityId)
		if (!snapshot) {
			return null
		}

		const data = snapshot.data as Record<string, unknown>
		const serverData = snapshot.serverData as Record<string, unknown>
		const mutation: Record<string, unknown> = {}

		// Collect scalar field changes
		this.collectScalarChanges(entityType, data, serverData, mutation)

		// Collect relation changes
		this.collectRelationChanges(entityType, entityId, mutation)

		return Object.keys(mutation).length > 0 ? mutation : null
	}

	/**
	 * Collects scalar field changes.
	 */
	private collectScalarChanges(
		entityType: string,
		data: Record<string, unknown>,
		serverData: Record<string, unknown>,
		mutation: Record<string, unknown>,
	): void {
		const scalarFields = this.schema.getScalarFields(entityType)

		for (const fieldName of scalarFields) {
			const currentValue = data[fieldName]
			const serverValue = serverData[fieldName]

			if (!deepEqual(currentValue, serverValue)) {
				mutation[fieldName] = currentValue
			}
		}
	}

	/**
	 * Collects relation changes (hasOne and hasMany).
	 */
	private collectRelationChanges(
		entityType: string,
		entityId: string,
		mutation: Record<string, unknown>,
	): void {
		const relationFields = this.schema.getRelationFields(entityType)

		for (const fieldName of relationFields) {
			const relationType = this.schema.getRelationType(entityType, fieldName)

			if (relationType === 'hasOne') {
				const operation = this.collectHasOneOperation(entityType, entityId, fieldName)
				if (operation !== null) {
					mutation[fieldName] = operation
				}
			} else if (relationType === 'hasMany') {
				const operations = this.collectHasManyOperations(entityType, entityId, fieldName)
				if (operations !== null && operations.length > 0) {
					mutation[fieldName] = operations
				}
			}
		}
	}

	/**
	 * Collects hasOne relation operation in Contember format.
	 */
	private collectHasOneOperation(
		entityType: string,
		entityId: string,
		fieldName: string,
	): Record<string, unknown> | null {
		const relationState = this.store.getRelation(entityType, entityId, fieldName)
		if (!relationState) {
			return null
		}

		const { state, serverState, currentId, serverId, placeholderData } = relationState

		switch (state) {
			case 'connected':
				if (currentId !== serverId) {
					// Changed to different entity
					return { connect: { id: currentId } }
				} else if (currentId && currentId === serverId) {
					// Same entity - check for nested updates
					const targetType = this.schema.getRelationTarget(entityType, fieldName)
					if (targetType) {
						const nestedChanges = this.collectUpdateData(targetType, currentId)
						if (nestedChanges) {
							return { update: nestedChanges }
						}
					}
				}
				return null

			case 'disconnected':
				// Only emit disconnect if server had a connection
				if (serverState === 'connected' && serverId !== null) {
					return { disconnect: true }
				}
				return null

			case 'deleted':
				return { delete: true }

			case 'creating':
				if (Object.keys(placeholderData).length > 0) {
					return { create: placeholderData }
				}
				return null

			default:
				return null
		}
	}

	/**
	 * Collects hasMany relation operations in Contember format.
	 */
	private collectHasManyOperations(
		entityType: string,
		entityId: string,
		fieldName: string,
	): Array<Record<string, unknown>> | null {
		const plannedRemovals = this.store.getHasManyPlannedRemovals(entityType, entityId, fieldName)
		const plannedConnections = this.store.getHasManyPlannedConnections(entityType, entityId, fieldName)

		const operations: Array<Record<string, unknown>> = []

		// Process removals
		if (plannedRemovals) {
			for (const [removedId, removalType] of plannedRemovals) {
				if (removalType === 'delete') {
					operations.push({ delete: { id: removedId } })
				} else if (removalType === 'disconnect') {
					operations.push({ disconnect: { id: removedId } })
				}
			}
		}

		// Process connections
		if (plannedConnections) {
			for (const connectedId of plannedConnections) {
				operations.push({ connect: { id: connectedId } })
			}
		}

		return operations.length > 0 ? operations : null
	}
}
