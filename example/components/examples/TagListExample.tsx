import { useEntityList } from '../../bindx.js'

/**
 * Example: Tag list with colored badges
 * Demonstrates useEntityList with custom rendering
 */
export function TagListExample() {
	const tags = useEntityList('Tag', {}, e => ({
		id: e.id,
		name: e.name,
		color: e.color,
	}))

	if (tags.isLoading) {
		return <div>Loading tags...</div>
	}

	return (
		<div className="tag-list">
			<h3>Available Tags</h3>
			<div className="tag-badges">
				{tags.items.map(item => (
					<span
						key={item.key}
						className="tag-badge"
						style={{
							backgroundColor: item.entity.data.color,
							color: '#fff',
							padding: '4px 8px',
							borderRadius: '4px',
							marginRight: '8px',
							display: 'inline-block',
						}}
					>
						{item.entity.data.name}
					</span>
				))}
			</div>
		</div>
	)
}
