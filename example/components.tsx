import type { FieldAccessor, EntityAccessor, EntityListAccessor } from '../src/index.js'
import { useEntity, isLoading } from './bindx.js'
import { AuthorFragment, LocationFragment, TagFragment } from './fragments.js'

// ============================================================================
// LEAF COMPONENTS (Model-Unaware)
// ============================================================================

/**
 * Generic text input - doesn't know about models
 */
export function TextInput({ field, label }: { field: FieldAccessor<string>; label: string }) {
	return (
		<div className="field">
			<label>{label}</label>
			<input
				type="text"
				value={field.value ?? ''}
				onChange={e => field.setValue(e.target.value)}
			/>
			{field.isDirty && <span className="dirty-indicator">*</span>}
		</div>
	)
}

/**
 * Generic number input
 */
export function NumberInput({ field, label }: { field: FieldAccessor<number>; label: string }) {
	return (
		<div className="field">
			<label>{label}</label>
			<input
				type="number"
				value={field.value ?? ''}
				onChange={e => field.setValue(parseFloat(e.target.value))}
			/>
		</div>
	)
}

/**
 * Generic coordinate picker - takes two number fields
 */
export function CoordinatePicker({
	lat,
	lng,
}: {
	lat: FieldAccessor<number>
	lng: FieldAccessor<number>
}) {
	return (
		<div className="coordinate-picker">
			<div>
				<label>Latitude</label>
				<input
					type="number"
					step="0.0001"
					value={lat.value ?? ''}
					onChange={e => lat.setValue(parseFloat(e.target.value))}
				/>
			</div>
			<div>
				<label>Longitude</label>
				<input
					type="number"
					step="0.0001"
					value={lng.value ?? ''}
					onChange={e => lng.setValue(parseFloat(e.target.value))}
				/>
			</div>
		</div>
	)
}

// ============================================================================
// FRAGMENT COMPONENTS (Model-Aware)
// ============================================================================

/**
 * Author editor - knows about Author model structure
 */
export function AuthorEditor({
	author,
}: {
	author: EntityAccessor<typeof AuthorFragment.__resultType>
}) {
	return (
		<div className="author-editor">
			<h3>Author</h3>
			<TextInput field={author.fields.name} label="Name" />
			<TextInput field={author.fields.email} label="Email" />
		</div>
	)
}

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

/**
 * Tag editor - knows about Tag model structure
 */
export function TagEditor({ tag }: { tag: EntityAccessor<typeof TagFragment.__resultType> }) {
	return (
		<div className="tag-editor">
			<TextInput field={tag.fields.name} label="Tag Name" />
			<TextInput field={tag.fields.color} label="Color" />
		</div>
	)
}

/**
 * Tag list editor with add/remove functionality
 */
export function TagListEditor({
	tags,
}: {
	tags: EntityListAccessor<typeof TagFragment.__resultType>
}) {
	return (
		<div className="tag-list-editor">
			<h3>Tags ({tags.length})</h3>

			{tags.items.map(item => (
				<div key={item.key} className="tag-item">
					<TagEditor tag={item.entity} />
					<button onClick={() => item.remove()}>Remove</button>
				</div>
			))}

			<button onClick={() => tags.add({ name: '', color: '#000000' })}>Add Tag</button>
		</div>
	)
}

// ============================================================================
// ENTITY COMPONENT (Query Definer)
// ============================================================================

/**
 * Full article editor - defines what data to fetch and composes fragments
 */
export function ArticleEditor({ id }: { id: string }) {
	// Type is inferred automatically from the schema and fragment definition
	const article = useEntity('Article', { id }, e => ({
		id: e.id,
		title: e.title,
		content: e.content,
		author: AuthorFragment.compose(e.author),
		location: LocationFragment.compose(e.location),
		tags: e.tags.map(tag => TagFragment.compose(tag)),
	}))

	if (isLoading(article)) {
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

// ============================================================================
// INLINE FRAGMENT EXAMPLE
// ============================================================================

/**
 * Simple article view using inline fragment definition
 */
export function ArticleView({ id }: { id: string }) {
	const article = useEntity('Article', { id }, e => ({
		title: e.title,
		author: {
			name: e.author.name,
		},
	}))

	if (isLoading(article)) {
		return <div>Loading...</div>
	}

	return (
		<div className="article-view">
			<h2>{article.fields.title.value}</h2>
			<p>By: {article.fields.author.fields.name.value}</p>
		</div>
	)
}
