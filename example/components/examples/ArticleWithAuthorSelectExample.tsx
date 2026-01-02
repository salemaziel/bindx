import { useState } from 'react'
import { useEntity, useEntityList } from '../../bindx.js'
import { TextInput } from '../inputs/index.js'

/**
 * Example: Article form with author select
 * Demonstrates combining useEntity for the main form with useEntityList for select options
 */
export function ArticleWithAuthorSelectExample({ id }: { id: string }) {
	const [selectedAuthorId, setSelectedAuthorId] = useState<string | null>(null)

	// Load the article
	const article = useEntity('Article', { id }, e => ({
		id: e.id,
		title: e.title,
		content: e.content,
		author: {
			id: e.author.id,
			name: e.author.name,
		},
	}))

	// Load all authors for the select dropdown
	const authors = useEntityList('Author', {}, e => ({
		id: e.id,
		name: e.name,
		email: e.email,
	}))

	if (article.isLoading) {
		return <div>Loading article...</div>
	}

	// Initialize selected author from article data
	const currentAuthorId = selectedAuthorId ?? article.fields.author.fields.id.value

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
						value={currentAuthorId ?? ''}
						onChange={e => setSelectedAuthorId(e.target.value || null)}
					>
						<option value="">Select author...</option>
						{authors.items.map(item => (
							<option key={item.key} value={item.entity.id}>
								{item.entity.data.name} ({item.entity.data.email})
							</option>
						))}
					</select>
				)}
			</div>

			<div className="current-author">
				<p>
					<strong>Current author:</strong> {article.fields.author.fields.name.value}
				</p>
				{selectedAuthorId && selectedAuthorId !== article.fields.author.fields.id.value && (
					<p className="warning">Author change will be applied on save</p>
				)}
			</div>
		</div>
	)
}
