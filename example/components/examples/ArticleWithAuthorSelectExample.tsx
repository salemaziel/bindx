import { useEntity, useEntityList } from '../../bindx.js'
import { TextInput } from '../inputs/index.js'

/**
 * Example: Article form with author select
 * Demonstrates combining useEntity for the main form with useEntityList for select options.
 *
 * Now uses HasOneAccessor API:
 * - article.fields.author.connect(id) to change the relation
 * - article.fields.author.disconnect() to set to null
 * - article.fields.author.id to get current ID
 * - article.fields.author.isRelationDirty to check for changes
 */
export function ArticleWithAuthorSelectExample({ id }: { id: string }) {
	// Load the article
	const article = useEntity('Article', { id }, e =>
		e
			.id()
			.title()
			.content()
			.author(a => a.name()),
	)

	// Load all authors for the select dropdown
	const authors = useEntityList('Author', {}, e => e.id().name().email())

	if (article.isLoading) {
		return <div>Loading article...</div>
	}

	const handleAuthorChange = (newAuthorId: string) => {
		if (newAuthorId === '') {
			// Disconnect the relation (set to null)
			article.fields.author.disconnect()
		} else {
			// Connect to a different author
			article.fields.author.connect(newAuthorId)
		}
	}

	return (
		<div className="article-with-select">
			<h3>Edit Article (with Author Select)</h3>

			<TextInput field={article.fields.title} label="Title" />
			<TextInput field={article.fields.content} label="Content" />

			<div className="field">
				<label>Author</label>
				{authors.isLoading ? (
					<select disabled>
						<option>Loading authors...</option>
					</select>
				) : (
					<select
						value={article.fields.author.id ?? ''}
						onChange={e => handleAuthorChange(e.target.value)}
					>
						<option value="">No author</option>
						{authors.items.map(item => (
							<option key={item.key} value={item.entity.id}>
								{item.entity.data.name} ({item.entity.data.email})
							</option>
						))}
					</select>
				)}
			</div>

			<div className="current-author">
				{article.fields.author.state === 'connected' && (
					<p>
						<strong>Current author:</strong> {article.fields.author.fields.name.value}
					</p>
				)}
				{article.fields.author.state === 'disconnected' && (
					<p>
						<strong>Author:</strong> None (disconnected)
					</p>
				)}
				{article.fields.author.isRelationDirty && (
					<p className="warning">Author change will be applied on save</p>
				)}
			</div>

			<div className="actions">
				<button onClick={() => article.persist()} disabled={!article.isDirty}>
					Save
				</button>
				<button onClick={() => article.reset()} disabled={!article.isDirty}>
					Reset
				</button>
			</div>
		</div>
	)
}
