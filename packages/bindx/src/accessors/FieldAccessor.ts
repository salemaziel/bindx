import type { FieldAccessor, ChangeCollector } from './types.js'
import type { IdentityMap } from '../store/IdentityMap.js'

/**
 * Implementation of FieldAccessor for scalar values.
 * Acts as a "lens" into the IdentityMap - doesn't store its own state.
 */
export class FieldAccessorImpl<T> implements FieldAccessor<T>, ChangeCollector {
	constructor(
		private readonly identityMap: IdentityMap,
		private readonly entityType: string,
		private readonly entityId: string,
		private readonly fieldPath: string[],
		private readonly onChange: () => void,
	) {}

	get value(): T | null {
		return this.identityMap.getValue(this.entityType, this.entityId, this.fieldPath) as T | null
	}

	get serverValue(): T | null {
		return this.identityMap.getServerValue(this.entityType, this.entityId, this.fieldPath) as T | null
	}

	get isDirty(): boolean {
		return this.value !== this.serverValue
	}

	setValue(value: T | null): void {
		if (this.value === value) return
		this.identityMap.setFieldValue(this.entityType, this.entityId, this.fieldPath, value)
		// Note: IdentityMap.setFieldValue already calls notifySubscribers,
		// but we still call onChange for this specific accessor's component
		this.onChange()
	}

	get inputProps() {
		return {
			value: this.value,
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
		this.identityMap.commitField(this.entityType, this.entityId, this.fieldPath)
	}

	// Internal methods

	/**
	 * Gets the current value for persistence
	 */
	_getCurrentValue(): T | null {
		return this.value
	}

	/**
	 * Resets the field value to server value
	 */
	_resetToServerValue(): void {
		const serverValue = this.serverValue
		this.identityMap.setFieldValue(this.entityType, this.entityId, this.fieldPath, serverValue)
	}
}
