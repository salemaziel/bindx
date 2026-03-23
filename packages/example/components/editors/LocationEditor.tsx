import type { EntityFields } from '@contember/bindx-react'
import type { Location } from '../../generated/entities.js'
import { InputField } from '@contember/bindx-ui'

/**
 * Location editor - knows about Location model structure
 * Receives the whole location fields object for encapsulated access
 */
export function LocationEditor({ fields }: { fields: EntityFields<Location> }) {
	return (
		<div className="location-editor">
			<h3>Location</h3>
			<InputField field={fields.label} label="Label" />
			<div className="flex gap-4">
				<InputField field={fields.lat} label="Latitude" inputProps={{ type: 'number', step: '0.0001' }} parseValue={v => parseFloat(v) || null} />
				<InputField field={fields.lng} label="Longitude" inputProps={{ type: 'number', step: '0.0001' }} parseValue={v => parseFloat(v) || null} />
			</div>
		</div>
	)
}
