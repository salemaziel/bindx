import type { FieldAccessor } from '@contember/react-bindx'

/**
 * Generic number input
 */
export function NumberInput({ field, label }: { field: FieldAccessor<number>; label: string }) {
	return (
		<div className="field">
			<label>{label}</label>
			<input
				type="number"
				value={field.value ?? ''}
				onChange={e => field.setValue(parseFloat(e.target.value))}
			/>
		</div>
	)
}
