import type { SelectionMeta } from '../selection/types.js'
import type {
	PlaceholderEntityAccessor,
	AccessorFromShapeInternal,
	ChangeCollector,
	FieldAccessor,
	EntityListAccessor,
	HasOneAccessor,
} from './types.js'

/**
 * Field accessor for placeholder entities.
 * Stores values in-memory (not in IdentityMap) since placeholder has no ID.
 */
class PlaceholderFieldAccessor<T> implements FieldAccessor<T>, ChangeCollector {
	private _value: T | null = null

	constructor(
		private readonly onChange: () => void,
		private readonly onValueSet: () => void,
	) {}

	get value(): T | null {
		return this._value
	}

	get serverValue(): T | null {
		return null // Placeholder has no server value
	}

	get isDirty(): boolean {
		return this._value !== null
	}

	setValue(value: T | null): void {
		if (this._value === value) return
		this._value = value
		if (value !== null) {
			this.onValueSet()
		}
		this.onChange()
	}

	get inputProps() {
		return {
			value: this.value,
			setValue: (value: T | null) => this.setValue(value),
		}
	}

	collectChanges(): Record<string, unknown> {
		return {}
	}

	commitChanges(): void {
		// No-op for placeholder
	}

	_getCurrentValue(): T | null {
		return this._value
	}

	_reset(): void {
		this._value = null
	}
}

/**
 * Implementation of PlaceholderEntityAccessor.
 * Created when a has-one relation is disconnected to allow implicit create.
 */
export class PlaceholderEntityAccessorImpl<TData extends object>
	implements PlaceholderEntityAccessor<TData>, ChangeCollector
{
	readonly __isPlaceholder = true as const
	private _fields: Map<string, PlaceholderFieldAccessor<unknown> | PlaceholderEntityAccessorImpl<object> | EntityListAccessor<object>>
	private _hasValues = false

	constructor(
		private readonly meta: SelectionMeta,
		private readonly onChange: () => void,
		private readonly onHasValuesChange: () => void,
	) {
		this._fields = this.buildFields(meta)
	}

	private buildFields(
		meta: SelectionMeta,
	): Map<string, PlaceholderFieldAccessor<unknown> | PlaceholderEntityAccessorImpl<object> | EntityListAccessor<object>> {
		const fields = new Map<
			string,
			PlaceholderFieldAccessor<unknown> | PlaceholderEntityAccessorImpl<object> | EntityListAccessor<object>
		>()

		for (const [key, fieldMeta] of meta.fields) {
			if (fieldMeta.isArray && fieldMeta.nested) {
				// Has-many relations are not supported in placeholder for now
				// Could be extended later if needed
				continue
			} else if (fieldMeta.nested) {
				// Nested placeholder for nested has-one
				fields.set(
					key,
					new PlaceholderEntityAccessorImpl(
						fieldMeta.nested,
						this.onChange,
						() => this.markHasValues(),
					),
				)
			} else {
				// Scalar field
				fields.set(
					key,
					new PlaceholderFieldAccessor(
						this.onChange,
						() => this.markHasValues(),
					),
				)
			}
		}

		return fields
	}

	private markHasValues(): void {
		if (!this._hasValues) {
			this._hasValues = true
			this.onHasValuesChange()
		}
	}

	get id(): null {
		return null
	}

	get fields(): AccessorFromShapeInternal<TData> {
		return new Proxy({} as AccessorFromShapeInternal<TData>, {
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

	get data(): TData | null {
		if (!this._hasValues) return null

		const result: Record<string, unknown> = {}
		for (const [key, accessor] of this._fields) {
			if (accessor instanceof PlaceholderFieldAccessor) {
				const value = accessor.value
				if (value !== null) {
					result[key] = value
				}
			} else if (accessor instanceof PlaceholderEntityAccessorImpl) {
				const nestedData = accessor.data
				if (nestedData !== null) {
					result[key] = nestedData
				}
			}
		}
		return result as TData
	}

	get hasValues(): boolean {
		return this._hasValues
	}

	get isDirty(): boolean {
		return this._hasValues
	}

	get isLoading(): boolean {
		return false
	}

	collectChanges(): Record<string, unknown> {
		if (!this._hasValues) return {}

		const changes: Record<string, unknown> = {}
		for (const [key, accessor] of this._fields) {
			if (accessor instanceof PlaceholderFieldAccessor) {
				const value = accessor._getCurrentValue()
				if (value !== null) {
					changes[key] = value
				}
			} else if (accessor instanceof PlaceholderEntityAccessorImpl) {
				const nestedChanges = accessor.collectChanges()
				if (Object.keys(nestedChanges).length > 0) {
					changes[key] = nestedChanges
				}
			}
		}
		return changes
	}

	commitChanges(): void {
		// After commit, placeholder becomes a real entity
		// This is handled by HasOneAccessor
	}

	/**
	 * Resets placeholder to empty state
	 */
	_reset(): void {
		this._hasValues = false
		for (const accessor of this._fields.values()) {
			if (accessor instanceof PlaceholderFieldAccessor) {
				accessor._reset()
			} else if (accessor instanceof PlaceholderEntityAccessorImpl) {
				accessor._reset()
			}
		}
	}

	/**
	 * Cleanup (no-op for placeholder)
	 */
	_dispose(): void {
		// No subscriptions to clean up
	}
}

/**
 * Type guard to check if an entity accessor is a placeholder
 */
export function isPlaceholder<TData>(
	accessor: unknown,
): accessor is PlaceholderEntityAccessor<TData> {
	return (
		accessor !== null &&
		typeof accessor === 'object' &&
		'__isPlaceholder' in accessor &&
		accessor.__isPlaceholder === true
	)
}
