import { useEntityList } from '../../bindx.js'

/**
 * Example: Simple entity list display
 * Demonstrates basic useEntityList usage for displaying a list of entities
 */
export function AuthorListExample() {
	const authors = useEntityList('Author', {}, e => ({
		id: e.id,
		name: e.name,
		email: e.email,
		bio: e.bio,
	}))

	if (authors.isLoading) {
		return <div>Loading authors...</div>
	}

	return (
		<div className="author-list">
			<h3>All Authors ({authors.length})</h3>
			<ul>
				{authors.items.map(item => (
					<li key={item.key}>
						<strong>{item.entity.data.name}</strong>
						<span> - {item.entity.data.email}</span>
						<p>{item.entity.data.bio}</p>
					</li>
				))}
			</ul>
		</div>
	)
}
