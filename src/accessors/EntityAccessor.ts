import type { FragmentMeta, FieldMeta } from '../fragment/types.js'
import type { BackendAdapter } from '../adapter/types.js'
import type { IdentityMap } from '../store/IdentityMap.js'
import type { EntityAccessor, AccessorFromShape, ChangeCollector } from './types.js'
import { FieldAccessorImpl } from './FieldAccessor.js'
import { EntityListAccessorImpl } from './EntityListAccessor.js'

/**
 * Implementation of EntityAccessor.
 * Manages a collection of field accessors and coordinates persistence.
 */
export class EntityAccessorImpl<TData extends object>
	implements EntityAccessor<TData>, ChangeCollector
{
	private _fields: Map<string, FieldAccessorImpl<unknown> | EntityAccessorImpl<object> | EntityListAccessorImpl<object>>
	private _isLoading: boolean = false
	private _isPersisting: boolean = false

	constructor(
		public readonly id: string,
		private readonly entityType: string,
		private readonly meta: FragmentMeta,
		private readonly adapter: BackendAdapter,
		private readonly identityMap: IdentityMap,
		initialData: TData,
		private readonly onChange: () => void,
	) {
		this._fields = this.buildFields(initialData, meta)
	}

	/**
	 * Builds field accessors from initial data and metadata
	 */
	private buildFields(
		data: object,
		meta: FragmentMeta,
	): Map<string, FieldAccessorImpl<unknown> | EntityAccessorImpl<object> | EntityListAccessorImpl<object>> {
		const fields = new Map<
			string,
			FieldAccessorImpl<unknown> | EntityAccessorImpl<object> | EntityListAccessorImpl<object>
		>()

		for (const [key, fieldMeta] of meta.fields) {
			const value = (data as Record<string, unknown>)[key]

			if (fieldMeta.isArray && fieldMeta.arrayItemMeta) {
				// Has-many relation - create EntityListAccessor
				const arrayData = Array.isArray(value) ? value : []
				fields.set(
					key,
					new EntityListAccessorImpl(
						this.inferEntityType(fieldMeta),
						fieldMeta.arrayItemMeta,
						this.adapter,
						this.identityMap,
						arrayData as object[],
						this.onChange,
					),
				)
			} else if (fieldMeta.nested) {
				// Nested object/entity - create EntityAccessor
				const nestedData = (value ?? {}) as object
				const nestedId = this.extractId(nestedData) ?? `${this.id}:${key}`
				const nestedEntityType = this.inferEntityType(fieldMeta)

				fields.set(
					key,
					new EntityAccessorImpl(
						nestedId,
						nestedEntityType,
						fieldMeta.nested,
						this.adapter,
						this.identityMap,
						nestedData,
						this.onChange,
					),
				)
			} else {
				// Scalar field - create FieldAccessor
				fields.set(key, new FieldAccessorImpl(value as unknown, this.onChange))
			}
		}

		return fields
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
		for (const accessor of this._fields.values()) {
			if (accessor instanceof FieldAccessorImpl) {
				accessor._setServerValue(accessor.serverValue)
			} else if (accessor instanceof EntityAccessorImpl) {
				accessor.reset()
			} else if (accessor instanceof EntityListAccessorImpl) {
				// TODO: Reset list to server state
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
}
