import type { EntityAccessor } from '../../../src/index.js'
import { LocationFragment } from '../../fragments.js'
import { TextInput, CoordinatePicker } from '../inputs/index.js'

/**
 * Location editor - knows about Location model structure
 */
export function LocationEditor({
	location,
}: {
	location: EntityAccessor<typeof LocationFragment.__resultType>
}) {
	return (
		<div className="location-editor">
			<h3>Location</h3>
			<TextInput field={location.fields.label} label="Label" />
			<CoordinatePicker lat={location.fields.lat} lng={location.fields.lng} />
		</div>
	)
}
