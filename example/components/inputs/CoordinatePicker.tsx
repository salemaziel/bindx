import type { FieldAccessor } from '../../../src/index.js'

/**
 * Generic coordinate picker - takes two number fields
 */
export function CoordinatePicker({
	lat,
	lng,
}: {
	lat: FieldAccessor<number>
	lng: FieldAccessor<number>
}) {
	return (
		<div className="coordinate-picker">
			<div>
				<label>Latitude</label>
				<input
					type="number"
					step="0.0001"
					value={lat.value ?? ''}
					onChange={e => lat.setValue(parseFloat(e.target.value))}
				/>
			</div>
			<div>
				<label>Longitude</label>
				<input
					type="number"
					step="0.0001"
					value={lng.value ?? ''}
					onChange={e => lng.setValue(parseFloat(e.target.value))}
				/>
			</div>
		</div>
	)
}
