import type { FieldAccessor, ChangeCollector } from './types.js'

/**
 * Implementation of FieldAccessor for scalar values.
 */
export class FieldAccessorImpl<T> implements FieldAccessor<T>, ChangeCollector {
	private _value: T | null
	private _serverValue: T | null

	constructor(
		initialValue: T | null,
		private readonly onChange: () => void,
	) {
		this._value = initialValue
		this._serverValue = initialValue
	}

	get value(): T | null {
		return this._value
	}

	get serverValue(): T | null {
		return this._serverValue
	}

	get isDirty(): boolean {
		return this._value !== this._serverValue
	}

	setValue(value: T | null): void {
		if (this._value === value) return
		this._value = value
		this.onChange()
	}

	get inputProps() {
		return {
			value: this._value,
			setValue: (value: T | null) => this.setValue(value),
		}
	}

	// ChangeCollector implementation

	collectChanges(): Record<string, unknown> {
		// For field accessors, this returns the value if dirty
		// The parent EntityAccessor handles the key mapping
		return {}
	}

	commitChanges(): void {
		this._serverValue = this._value
	}

	// Internal methods for IdentityMap integration

	/**
	 * Updates the server value (called after fetch or persist)
	 */
	_setServerValue(value: T | null): void {
		this._serverValue = value
		this._value = value
	}

	/**
	 * Gets the current value for persistence
	 */
	_getCurrentValue(): T | null {
		return this._value
	}
}
