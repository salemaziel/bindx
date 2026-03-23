import type { ReactNode } from 'react'
import { Entity, Field, usePersist } from '@contember/bindx-react'
import { InputField, SelectField, Button } from '@contember/bindx-ui'
import { schema } from '../generated/index.js'

/**
 * Article form with author select using Entity JSX.
 *
 * Demonstrates:
 * - Entity component with relation editing
 * - SelectField for has-one relation
 * - usePersist for saving changes
 */
export function AuthorSelectPage({ id }: { id: string }): ReactNode {
	const { persistAll } = usePersist()

	return (
		<Entity
			entity={schema.Article}
			by={{ id }}
			loading={<div>Loading article...</div>}
			notFound={<div>Article not found</div>}
		>
			{article => (
				<div className="article-with-select" data-testid="article-with-author-select">
					<h3>Edit Article (with Author Select)</h3>

					<InputField field={article.title} label="Title" inputProps={{ 'data-testid': 'author-select-title-input' }} />
					<InputField field={article.content} label="Content" inputProps={{ 'data-testid': 'author-select-content-input' }} />

					<SelectField field={article.author} label="Author">
						{it => <>{it.name.value} ({it.email.value})</>}
					</SelectField>

					<div className="current-author" data-testid="current-author-display">
						<p>
							<strong>Current author:</strong>{' '}
							<Field field={article.author.name} /> (<Field field={article.author.email} />)
						</p>
						{article.$isDirty && (
							<p className="warning">Changes will be applied on save</p>
						)}
					</div>

					<div className="actions">
						<Button onClick={() => persistAll()} disabled={!article.$isDirty} data-testid="author-select-save-button">
							Save
						</Button>
					</div>
				</div>
			)}
		</Entity>
	)
}
