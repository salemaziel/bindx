import { useEntity } from '../../bindx.js'
import { AuthorFragment, LocationFragment, TagFragment } from '../../fragments.js'
import { TextInput } from '../inputs/index.js'
import { AuthorEditor, LocationEditor, TagListEditor } from '../editors/index.js'

/**
 * Full article editor - defines what data to fetch and composes fragments
 */
export function ArticleEditor({ id }: { id: string }) {
	// Type is inferred automatically from the schema and fragment definition
	const article = useEntity('Article', { id }, e =>
		e
			.id()
			.title()
			.content()
			.author(AuthorFragment)
			.location(LocationFragment)
			.tags(TagFragment),
	)

	if (article.isLoading) {
		return <div>Loading article...</div>
	}

	return (
		<div className="article-editor">
			<h1>Edit Article</h1>

			<div className="form-section">
				<TextInput field={article.fields.title} label="Title" />
				<TextInput field={article.fields.content} label="Content" />
			</div>

			<div className="form-section">
				<AuthorEditor author={article.fields.author} />
			</div>

			<div className="form-section">
				<LocationEditor location={article.fields.location} />
			</div>

			<div className="form-section">
				<TagListEditor tags={article.fields.tags} />
			</div>

			<div className="actions">
				<button disabled={!article.isDirty || article.isPersisting} onClick={() => article.persist()}>
					{article.isPersisting ? 'Saving...' : 'Save'}
				</button>
				<button disabled={!article.isDirty} onClick={() => article.reset()}>
					Reset
				</button>
			</div>

			{article.isDirty && <p className="dirty-notice">You have unsaved changes</p>}
		</div>
	)
}
