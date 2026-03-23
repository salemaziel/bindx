import { useState, type ReactNode } from 'react'
import { EntityList, Field } from '@contember/bindx-react'
import { schema } from '../generated/index.js'

/**
 * Location picker using EntityList JSX.
 *
 * Demonstrates:
 * - EntityList for rendering options inside a select
 * - Local React state for selection
 * - Conditional detail display
 */
export function LocationPickerPage(): ReactNode {
	const [selectedId, setSelectedId] = useState<string | null>(null)

	return (
		<div className="location-select-example" data-testid="location-picker">
			<h3>Location Picker</h3>

			<div className="field">
				<label>Select Location</label>
				<select
					value={selectedId ?? ''}
					onChange={e => setSelectedId(e.target.value || null)}
					data-testid="location-select"
				>
					<option value="">Choose a location...</option>
					<EntityList entity={schema.Location} loading={null} empty={null}>
						{location => (
							<option key={location.id} value={location.id}>
								{location.label.value}
							</option>
						)}
					</EntityList>
				</select>
			</div>

			{selectedId && (
				<EntityList entity={schema.Location} filter={{ id: { eq: selectedId } }} loading={null} empty={null}>
					{location => (
						<div className="location-details" data-testid="location-details">
							<h4 data-testid="location-selected-label">Selected: {location.label.value}</h4>
							<p data-testid="location-coordinates">
								Coordinates: {location.lat.value?.toFixed(4) ?? 'N/A'}, {location.lng.value?.toFixed(4) ?? 'N/A'}
							</p>
							{location.lat.value != null && location.lng.value != null && (
								<p>
									<a
										href={`https://www.google.com/maps?q=${location.lat.value},${location.lng.value}`}
										target="_blank"
										rel="noopener noreferrer"
										data-testid="location-maps-link"
									>
										View on Google Maps
									</a>
								</p>
							)}
						</div>
					)}
				</EntityList>
			)}
		</div>
	)
}
