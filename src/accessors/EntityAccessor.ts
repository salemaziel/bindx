import type { FragmentMeta, FieldMeta } from '../fragment/types.js'
import type { BackendAdapter } from '../adapter/types.js'
import type { IdentityMap } from '../store/IdentityMap.js'
import type { EntityAccessor, AccessorFromShape, ChangeCollector } from './types.js'
import { FieldAccessorImpl } from './FieldAccessor.js'
import { EntityListAccessorImpl } from './EntityListAccessor.js'

/**
 * Implementation of EntityAccessor.
 * Manages a collection of field accessors and coordinates persistence.
 * Data is stored in IdentityMap - this accessor is a projection/view into that data.
 */
export class EntityAccessorImpl<TData extends object>
	implements EntityAccessor<TData>, ChangeCollector
{
	private _fields: Map<string, FieldAccessorImpl<unknown> | EntityAccessorImpl<object> | EntityListAccessorImpl<object>>
	private _isLoading: boolean = false
	private _isPersisting: boolean = false
	private _unsubscribe: (() => void) | null = null

	constructor(
		public readonly id: string,
		private readonly entityType: string,
		private readonly meta: FragmentMeta,
		private readonly adapter: BackendAdapter,
		private readonly identityMap: IdentityMap,
		initialData: TData,
		private readonly onChange: () => void,
	) {
		// Register entity in IdentityMap (or get existing)
		this.identityMap.getOrCreate(entityType, id, initialData as Record<string, unknown>)

		// Subscribe to changes in IdentityMap for this entity
		this._unsubscribe = this.identityMap.subscribe(entityType, id, () => {
			this.onChange()
		})

		this._fields = this.buildFields(meta)
	}

	/**
	 * Builds field accessors from metadata.
	 * Field values are read from IdentityMap, not passed directly.
	 */
	private buildFields(
		meta: FragmentMeta,
	): Map<string, FieldAccessorImpl<unknown> | EntityAccessorImpl<object> | EntityListAccessorImpl<object>> {
		const fields = new Map<
			string,
			FieldAccessorImpl<unknown> | EntityAccessorImpl<object> | EntityListAccessorImpl<object>
		>()

		for (const [key, fieldMeta] of meta.fields) {
			if (fieldMeta.isArray && fieldMeta.arrayItemMeta) {
				// Has-many relation - create EntityListAccessor
				const arrayData = this.getFieldData(key)
				const arrayValue = Array.isArray(arrayData) ? arrayData : []
				fields.set(
					key,
					new EntityListAccessorImpl(
						this.inferEntityType(fieldMeta),
						fieldMeta.arrayItemMeta,
						this.adapter,
						this.identityMap,
						arrayValue as object[],
						this.onChange,
						this.entityType,
						this.id,
						key,
					),
				)
			} else if (fieldMeta.nested) {
				// Nested object/entity - create EntityAccessor
				const nestedData = (this.getFieldData(key) ?? {}) as Record<string, unknown>
				const nestedId = this.extractId(nestedData)
				const nestedEntityType = this.inferEntityType(fieldMeta)

				if (nestedId) {
					// Entity with ID -> separate entry in IdentityMap
					fields.set(
						key,
						new EntityAccessorImpl(
							nestedId,
							nestedEntityType,
							fieldMeta.nested,
							this.adapter,
							this.identityMap,
							nestedData as object,
							this.onChange,
						),
					)
				} else {
					// Embedded object without ID -> stays inline in parent entity
					// Use composite ID and store in parent's data
					const compositeId = `${this.id}:${key}`
					fields.set(
						key,
						new EntityAccessorImpl(
							compositeId,
							nestedEntityType,
							fieldMeta.nested,
							this.adapter,
							this.identityMap,
							nestedData as object,
							this.onChange,
						),
					)
				}
			} else {
				// Scalar field - create FieldAccessor that reads from IdentityMap
				fields.set(
					key,
					new FieldAccessorImpl(
						this.identityMap,
						this.entityType,
						this.id,
						[key],
						this.onChange,
					),
				)
			}
		}

		return fields
	}

	/**
	 * Gets field data from IdentityMap
	 */
	private getFieldData(key: string): unknown {
		return this.identityMap.getValue(this.entityType, this.id, [key])
	}

	/**
	 * Infers entity type from field path (uses last segment capitalized)
	 */
	private inferEntityType(fieldMeta: FieldMeta): string {
		const lastSegment = fieldMeta.path[fieldMeta.path.length - 1]
		if (!lastSegment) return 'Unknown'
		// Simple heuristic: capitalize first letter
		return lastSegment.charAt(0).toUpperCase() + lastSegment.slice(1)
	}

	/**
	 * Extracts ID from an object if present
	 */
	private extractId(obj: object): string | undefined {
		if ('id' in obj && typeof obj.id === 'string') {
			return obj.id
		}
		return undefined
	}

	get fields(): AccessorFromShape<TData> {
		// Create a proxy that maps field names to accessors
		return new Proxy({} as AccessorFromShape<TData>, {
			get: (_target, prop: string) => {
				return this._fields.get(prop)
			},
			ownKeys: () => {
				return Array.from(this._fields.keys())
			},
			getOwnPropertyDescriptor: (_target, prop: string) => {
				if (this._fields.has(prop)) {
					return { enumerable: true, configurable: true }
				}
				return undefined
			},
		})
	}

	get data(): TData {
		const result: Record<string, unknown> = {}

		for (const [key, accessor] of this._fields) {
			if (accessor instanceof FieldAccessorImpl) {
				result[key] = accessor.value
			} else if (accessor instanceof EntityAccessorImpl) {
				result[key] = accessor.data
			} else if (accessor instanceof EntityListAccessorImpl) {
				result[key] = accessor.items.map(item => item.entity.data)
			}
		}

		return result as TData
	}

	get isDirty(): boolean {
		for (const accessor of this._fields.values()) {
			if (accessor.isDirty) return true
		}
		return false
	}

	get isLoading(): boolean {
		return this._isLoading
	}

	get isPersisting(): boolean {
		return this._isPersisting
	}

	async persist(): Promise<void> {
		if (!this.isDirty) return

		this._isPersisting = true
		this.onChange()

		try {
			const changes = this.collectChanges()
			await this.adapter.persist(this.entityType, this.id, changes)
			this.commitChanges()
		} finally {
			this._isPersisting = false
			this.onChange()
		}
	}

	reset(): void {
		// Reset entity in IdentityMap
		this.identityMap.reset(this.entityType, this.id)

		// Also reset nested entities
		for (const accessor of this._fields.values()) {
			if (accessor instanceof EntityAccessorImpl) {
				accessor.reset()
			} else if (accessor instanceof EntityListAccessorImpl) {
				accessor.reset()
			}
		}

		this.onChange()
	}

	// ChangeCollector implementation

	collectChanges(): Record<string, unknown> {
		const changes: Record<string, unknown> = {}

		for (const [key, accessor] of this._fields) {
			if (!accessor.isDirty) continue

			if (accessor instanceof FieldAccessorImpl) {
				changes[key] = accessor._getCurrentValue()
			} else if (accessor instanceof EntityAccessorImpl) {
				changes[key] = accessor.collectChanges()
			} else if (accessor instanceof EntityListAccessorImpl) {
				changes[key] = accessor.items.map(item => {
					const entityAccessor = item.entity as EntityAccessorImpl<object>
					return entityAccessor.collectChanges()
				})
			}
		}

		return changes
	}

	commitChanges(): void {
		for (const accessor of this._fields.values()) {
			if (accessor instanceof FieldAccessorImpl) {
				accessor.commitChanges()
			} else if (accessor instanceof EntityAccessorImpl) {
				accessor.commitChanges()
			} else if (accessor instanceof EntityListAccessorImpl) {
				accessor.commitChanges()
			}
		}
	}

	// Internal methods

	/**
	 * Sets loading state
	 */
	_setLoading(loading: boolean): void {
		this._isLoading = loading
	}

	/**
	 * Cleanup subscriptions (call on unmount)
	 */
	_dispose(): void {
		if (this._unsubscribe) {
			this._unsubscribe()
			this._unsubscribe = null
		}

		// Dispose nested accessors
		for (const accessor of this._fields.values()) {
			if (accessor instanceof EntityAccessorImpl) {
				accessor._dispose()
			} else if (accessor instanceof EntityListAccessorImpl) {
				accessor._dispose()
			}
		}
	}
}
