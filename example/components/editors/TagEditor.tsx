import type { EntityAccessor, EntityListAccessor } from '../../../src/index.js'
import { TagFragment } from '../../fragments.js'
import { TextInput } from '../inputs/index.js'

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
