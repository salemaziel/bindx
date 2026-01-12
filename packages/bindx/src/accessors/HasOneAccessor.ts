import type { SelectionMeta } from '../selection/types.js'
import type { BackendAdapter } from '../adapter/types.js'
import type { IdentityMap } from '../store/IdentityMap.js'
import type {
	HasOneAccessor,
	HasOneRelationState,
	EntityAccessorBase,
	AccessorFromShapeInternal,
	ChangeCollector,
	RelationChange,
} from './types.js'
import { EntityAccessorImpl } from './EntityAccessor.js'
import { PlaceholderEntityAccessorImpl } from './PlaceholderEntityAccessor.js'
import { buildQueryFromSelection } from '../selection/buildQuery.js'

/**
 * Implementation of HasOneAccessor for has-one relations.
 * Manages relation state and provides connect/disconnect/delete operations.
 */
export class HasOneAccessorImpl<TData extends object>
	implements HasOneAccessor<TData>, ChangeCollector
{
	private _entity: EntityAccessorImpl<TData> | PlaceholderEntityAccessorImpl<TData>
	private _serverEntity: EntityAccessorImpl<TData> | null
	private _unsubscribe: (() => void) | null = null
	private _isLoading = false
	private _fetchVersion = 0

	constructor(
		private readonly parentEntityType: string,
		private readonly parentEntityId: string,
		private readonly fieldKey: string,
		private readonly relatedEntityType: string,
		private readonly meta: SelectionMeta,
		private readonly adapter: BackendAdapter,
		private readonly identityMap: IdentityMap,
		initialData: TData | null,
		private readonly onChange: () => void,
	) {
		const initialId = this.extractId(initialData)
		const initialState: HasOneRelationState = initialId ? 'connected' : 'disconnected'

		// Initialize relation state in IdentityMap
		this.identityMap.getOrCreateRelation(
			parentEntityType,
			parentEntityId,
			fieldKey,
			{
				currentId: initialId,
				serverId: initialId,
				state: initialState,
				serverState: initialState,
				placeholderData: {},
			},
		)

		// Subscribe to relation state changes
		this._unsubscribe = this.identityMap.subscribeRelation(
			parentEntityType,
			parentEntityId,
			fieldKey,
			() => this.onChange(),
		)

		// Create initial entity or placeholder
		if (initialData && initialId) {
			this._entity = new EntityAccessorImpl(
				initialId,
				relatedEntityType,
				meta,
				adapter,
				identityMap,
				initialData,
				onChange,
				false, // Don't create HasOneAccessor for nested objects inside the relation
			)
			this._serverEntity = this._entity
		} else {
			this._entity = new PlaceholderEntityAccessorImpl(
				meta,
				onChange,
				() => this.updateStateToCreating(),
			)
			this._serverEntity = null
		}
	}

	private extractId(data: TData | null): string | null {
		if (!data || typeof data !== 'object') return null
		const record = data as Record<string, unknown>
		if ('id' in record && typeof record['id'] === 'string') {
			return record['id']
		}
		return null
	}

	private getRelationState() {
		return this.identityMap.getRelation(
			this.parentEntityType,
			this.parentEntityId,
			this.fieldKey,
		)!
	}

	private updateStateToCreating(): void {
		const relationState = this.getRelationState()
		if (relationState.state === 'disconnected') {
			this.identityMap.setRelation(
				this.parentEntityType,
				this.parentEntityId,
				this.fieldKey,
				{ state: 'creating' },
			)
		}
	}

	get state(): HasOneRelationState {
		return this.getRelationState().state
	}

	get id(): string | null {
		return this.getRelationState().currentId
	}

	get entity(): EntityAccessorBase<TData> {
		return this._entity
	}

	get serverEntity(): EntityAccessorBase<TData> | null {
		return this._serverEntity
	}

	get fields(): AccessorFromShapeInternal<TData> {
		return this._entity.fields
	}

	get data(): TData | null {
		return this._entity.data
	}

	get isRelationDirty(): boolean {
		const relationState = this.getRelationState()
		return (
			relationState.currentId !== relationState.serverId ||
			relationState.state !== relationState.serverState
		)
	}

	get isDirty(): boolean {
		if (this.isRelationDirty) return true
		if (this._entity instanceof EntityAccessorImpl) {
			return this._entity.isDirty
		}
		if (this._entity instanceof PlaceholderEntityAccessorImpl) {
			return this._entity.hasValues
		}
		return false
	}

	get isLoading(): boolean {
		return this._isLoading
	}

	connect(id: string): void {
		const relationState = this.getRelationState()

		// If connecting to same ID, no-op
		if (relationState.currentId === id && relationState.state === 'connected') {
			return
		}

		// Dispose current entity if it's different
		if (this._entity instanceof EntityAccessorImpl && this._entity.id !== id) {
			// Don't dispose server entity
			if (this._entity !== this._serverEntity) {
				this._entity._dispose()
			}
		}

		// Check if entity exists in IdentityMap
		if (this.identityMap.has(this.relatedEntityType, id)) {
			// Entity already in cache, use it
			const record = this.identityMap.get(this.relatedEntityType, id)!
			this._entity = new EntityAccessorImpl(
				id,
				this.relatedEntityType,
				this.meta,
				this.adapter,
				this.identityMap,
				record.data as TData,
				this.onChange,
				false,
			)

			this.identityMap.setRelation(
				this.parentEntityType,
				this.parentEntityId,
				this.fieldKey,
				{
					currentId: id,
					state: 'connected',
				},
			)
		} else {
			// Need to fetch entity from backend
			this._isLoading = true
			const version = ++this._fetchVersion
			this.identityMap.setRelation(
				this.parentEntityType,
				this.parentEntityId,
				this.fieldKey,
				{
					currentId: id,
					state: 'connected',
				},
			)

			// Fetch asynchronously with version check
			this.fetchEntity(id, version)
		}

		this.onChange()
	}

	private async fetchEntity(id: string, version: number): Promise<void> {
		try {
			const spec = buildQueryFromSelection(this.meta)
			const results = await this.adapter.query([
				{ type: 'get', entityType: this.relatedEntityType, by: { id }, spec },
			])

			// Check if this fetch is still relevant (not superseded by newer connect call)
			if (version !== this._fetchVersion) {
				return
			}

			const result = results[0]
			if (result && result.type === 'get' && result.data) {
				this._entity = new EntityAccessorImpl(
					id,
					this.relatedEntityType,
					this.meta,
					this.adapter,
					this.identityMap,
					result.data as TData,
					this.onChange,
					false,
				)
			}
		} finally {
			// Only update loading state if this is still the current fetch
			if (version === this._fetchVersion) {
				this._isLoading = false
				this.onChange()
			}
		}
	}

	disconnect(): void {
		const relationState = this.getRelationState()

		// If already disconnected with no values, no-op
		if (relationState.state === 'disconnected' && !this._entity.isDirty) {
			return
		}

		// Dispose current entity if it's not server entity
		if (this._entity instanceof EntityAccessorImpl && this._entity !== this._serverEntity) {
			this._entity._dispose()
		}

		// Create placeholder for potential implicit create
		this._entity = new PlaceholderEntityAccessorImpl(
			this.meta,
			this.onChange,
			() => this.updateStateToCreating(),
		)

		this.identityMap.setRelation(
			this.parentEntityType,
			this.parentEntityId,
			this.fieldKey,
			{
				currentId: null,
				state: 'disconnected',
			},
		)

		this.onChange()
	}

	delete(): void {
		const relationState = this.getRelationState()

		// Can only delete if there was a server entity
		if (!relationState.serverId) {
			return
		}

		this.identityMap.setRelation(
			this.parentEntityType,
			this.parentEntityId,
			this.fieldKey,
			{
				state: 'deleted',
			},
		)

		this.onChange()
	}

	reset(): void {
		// Dispose current entity if it's not server entity
		if (this._entity instanceof EntityAccessorImpl && this._entity !== this._serverEntity) {
			this._entity._dispose()
		} else if (this._entity instanceof PlaceholderEntityAccessorImpl) {
			this._entity._reset()
		}

		// Reset relation state in IdentityMap
		this.identityMap.resetRelation(
			this.parentEntityType,
			this.parentEntityId,
			this.fieldKey,
		)

		// Restore server entity or create new placeholder
		if (this._serverEntity) {
			this._entity = this._serverEntity
			// Also reset nested entity fields
			this._serverEntity.reset()
		} else {
			this._entity = new PlaceholderEntityAccessorImpl(
				this.meta,
				this.onChange,
				() => this.updateStateToCreating(),
			)
		}

		this.onChange()
	}

	collectChanges(): RelationChange | null {
		const relationState = this.getRelationState()

		// Case 1: Relation was deleted
		if (relationState.state === 'deleted') {
			return { __operation: 'delete' }
		}

		// Case 2: Disconnected - check for implicit create
		if (relationState.state === 'disconnected' && relationState.serverState === 'connected') {
			return { __operation: 'disconnect' }
		}

		// Case 3: Creating new entity from placeholder
		if (relationState.state === 'creating' && this._entity instanceof PlaceholderEntityAccessorImpl) {
			const data = this._entity.collectChanges()
			if (Object.keys(data).length > 0) {
				return { __operation: 'create', data }
			}
			// Placeholder with no values -> just disconnect
			return { __operation: 'disconnect' }
		}

		// Case 4: Connected to different entity
		if (
			relationState.state === 'connected' &&
			relationState.currentId !== relationState.serverId
		) {
			return { __operation: 'connect', id: relationState.currentId! }
		}

		// Case 5: Same entity but fields changed
		if (
			relationState.state === 'connected' &&
			relationState.currentId === relationState.serverId &&
			this._entity instanceof EntityAccessorImpl &&
			this._entity.isDirty
		) {
			return {
				__operation: 'update',
				id: relationState.currentId!,
				data: this._entity.collectChanges(),
			}
		}

		return null
	}

	commitChanges(): void {
		// Commit relation state
		this.identityMap.commitRelation(
			this.parentEntityType,
			this.parentEntityId,
			this.fieldKey,
		)

		// Commit entity changes
		if (this._entity instanceof EntityAccessorImpl) {
			this._entity.commitChanges()
			// Update server entity reference
			this._serverEntity = this._entity
		} else if (this._entity instanceof PlaceholderEntityAccessorImpl) {
			// After commit, placeholder becomes server entity
			// This would need to be handled by refetching
			this._entity._reset()
		}
	}

	/**
	 * Cleanup subscriptions
	 */
	_dispose(): void {
		if (this._unsubscribe) {
			this._unsubscribe()
			this._unsubscribe = null
		}

		if (this._entity instanceof EntityAccessorImpl && this._entity !== this._serverEntity) {
			this._entity._dispose()
		}

		// Don't dispose server entity - it may be shared
	}
}
