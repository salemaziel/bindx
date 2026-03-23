import { useEntity } from '@contember/bindx-react'
import { schema } from '../../generated/index.js'
import { InputField, SelectField, Button } from '@contember/bindx-ui'

/**
 * Example: Article form with author select
 * Demonstrates combining useEntity with SelectField for relation editing.
 */
export function ArticleWithAuthorSelectExample({ id }: { id: string }) {
	const article = useEntity(schema.Article, { by: { id } }, e =>
		e
			.id()
			.title()
			.content()
			.author(a => a.id().name().email()),
	)

	if (article.$isLoading) {
		return <div>Loading article...</div>
	}

	if (article.$isError || article.$isNotFound) {
		return <div>Error: {article.$error?.message ?? 'Not found'}</div>
	}

	const currentAuthorId = article.$fields.author.$id ?? ''
	const authorEntity = article.$fields.author.$entity

	return (
		<div className="article-with-select" data-testid="article-with-author-select">
			<h3>Edit Article (with Author Select)</h3>

			<InputField field={article.$fields.title} label="Title" inputProps={{ 'data-testid': 'author-select-title-input' }} />
			<InputField field={article.$fields.content} label="Content" inputProps={{ 'data-testid': 'author-select-content-input' }} />

			<SelectField field={article.$fields.author} label="Author">
				{it => <>{it.$fields['name'].value} ({it.$fields['email'].value})</>}
			</SelectField>

			<div className="current-author" data-testid="current-author-display">
				{currentAuthorId ? (
					<p>
						<strong>Current author:</strong> {authorEntity.$fields['name'].value} ({authorEntity.$fields['email'].value})
					</p>
				) : (
					<p>
						<strong>Author:</strong> None
					</p>
				)}
				{article.$isDirty && (
					<p className="warning">Changes will be applied on save</p>
				)}
			</div>

			<div className="actions">
				<Button onClick={() => article.$persist()} disabled={!article.$isDirty} data-testid="author-select-save-button">
					Save
				</Button>
				<Button variant="outline" onClick={() => article.$reset()} disabled={!article.$isDirty} data-testid="author-select-reset-button">
					Reset
				</Button>
			</div>
		</div>
	)
}
