import type { SelectionMeta, SelectionFieldMeta } from '../selection/types.js'
import type { BackendAdapter } from '../adapter/types.js'
import type { IdentityMap } from '../store/IdentityMap.js'
import type { RootEntityAccessor, AccessorFromShape, ChangeCollector } from './types.js'
import { FieldAccessorImpl } from './FieldAccessor.js'
import { EntityListAccessorImpl } from './EntityListAccessor.js'
import { HasOneAccessorImpl } from './HasOneAccessor.js'

/**
 * Implementation of RootEntityAccessor (also implements deprecated EntityAccessor).
 * Manages a collection of field accessors and coordinates persistence.
 * Data is stored in IdentityMap - this accessor is a projection/view into that data.
 */
export class EntityAccessorImpl<TData extends object>
	implements RootEntityAccessor<TData>, ChangeCollector
{
	private _fields: Map<string, FieldAccessorImpl<unknown> | HasOneAccessorImpl<object> | EntityAccessorImpl<object> | EntityListAccessorImpl<object>>
	private _isLoading: boolean = false
	private _isPersisting: boolean = false
	private _unsubscribe: (() => void) | null = null

	constructor(
		public readonly id: string,
		private readonly entityType: string,
		private readonly meta: SelectionMeta,
		private readonly adapter: BackendAdapter,
		private readonly identityMap: IdentityMap,
		initialData: TData,
		private readonly onChange: () => void,
		/** If true, creates HasOneAccessor for nested objects. If false, creates nested EntityAccessorImpl directly. */
		private readonly useHasOneForNested: boolean = true,
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
		meta: SelectionMeta,
	): Map<string, FieldAccessorImpl<unknown> | HasOneAccessorImpl<object> | EntityAccessorImpl<object> | EntityListAccessorImpl<object>> {
		const fields = new Map<
			string,
			FieldAccessorImpl<unknown> | HasOneAccessorImpl<object> | EntityAccessorImpl<object> | EntityListAccessorImpl<object>
		>()

		for (const [key, fieldMeta] of meta.fields) {
			// Detect array from actual data (for has-many relations)
			const fieldData = this.getFieldData(key)
			const isActuallyArray = Array.isArray(fieldData)

			if ((fieldMeta.isArray || isActuallyArray) && fieldMeta.nested) {
				// Has-many relation - create EntityListAccessor
				const arrayValue = isActuallyArray ? fieldData : []
				fields.set(
					key,
					new EntityListAccessorImpl(
						this.inferEntityType(fieldMeta),
						fieldMeta.nested,
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
				const nestedData = this.getFieldData(key) as object | null
				const nestedEntityType = this.inferEntityType(fieldMeta)

				if (this.useHasOneForNested) {
					// Has-one relation at root level - create HasOneAccessor
					fields.set(
						key,
						new HasOneAccessorImpl(
							this.entityType,
							this.id,
							key,
							nestedEntityType,
							fieldMeta.nested,
							this.adapter,
							this.identityMap,
							nestedData,
							this.onChange,
						),
					)
				} else {
					// Nested entity inside HasOneAccessor - create plain EntityAccessor
					const nestedId = this.extractNestedId(nestedData)
					if (nestedId) {
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
								false, // Don't create HasOneAccessor recursively
							),
						)
					} else {
						// Embedded object without ID
						const compositeId = `${this.id}:${key}`
						fields.set(
							key,
							new EntityAccessorImpl(
								compositeId,
								nestedEntityType,
								fieldMeta.nested,
								this.adapter,
								this.identityMap,
								(nestedData ?? {}) as object,
								this.onChange,
								false,
							),
						)
					}
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
	 * Extracts ID from nested data object
	 */
	private extractNestedId(data: object | null): string | undefined {
		if (!data) return undefined
		if ('id' in data && typeof (data as Record<string, unknown>)['id'] === 'string') {
			return (data as Record<string, unknown>)['id'] as string
		}
		return undefined
	}

	/**
	 * Gets field data from IdentityMap
	 */
	private getFieldData(key: string): unknown {
		return this.identityMap.getValue(this.entityType, this.id, [key])
	}

	/**
	 * Infers entity type from field name (uses field name capitalized)
	 */
	private inferEntityType(fieldMeta: SelectionFieldMeta): string {
		const fieldName = fieldMeta.fieldName
		if (!fieldName) return 'Unknown'
		// Simple heuristic: capitalize first letter
		return fieldName.charAt(0).toUpperCase() + fieldName.slice(1)
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
			} else if (accessor instanceof HasOneAccessorImpl) {
				result[key] = accessor.data
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

		// Also reset nested entities and relations
		for (const accessor of this._fields.values()) {
			if (accessor instanceof HasOneAccessorImpl) {
				accessor.reset()
			} else if (accessor instanceof EntityAccessorImpl) {
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
			} else if (accessor instanceof HasOneAccessorImpl) {
				const relationChange = accessor.collectChanges()
				if (relationChange !== null) {
					changes[key] = relationChange
				}
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
			} else if (accessor instanceof HasOneAccessorImpl) {
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
			if (accessor instanceof HasOneAccessorImpl) {
				accessor._dispose()
			} else if (accessor instanceof EntityAccessorImpl) {
				accessor._dispose()
			} else if (accessor instanceof EntityListAccessorImpl) {
				accessor._dispose()
			}
		}
	}
}
