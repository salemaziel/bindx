import type { EntityRef, UseEntityListResult } from '@contember/bindx-react'
import { InputField } from '@contember/bindx-ui'
import { Button } from '@contember/bindx-ui'

interface TagData {
	id: string
	name: string
	color: string | null
}

/**
 * Tag editor - knows about Tag model structure
 */
export function TagEditor({ tag }: { tag: EntityRef<TagData> }) {
	return (
		<div className="tag-editor">
			<InputField field={tag.$fields.name} label="Tag Name" />
			<InputField field={tag.$fields.color} label="Color" />
		</div>
	)
}

/**
 * Tag list editor with add/remove functionality
 */
export function TagListEditor({
	tags,
}: {
	tags: UseEntityListResult<TagData>
}) {
	if (tags.$isLoading) {
		return <div>Loading tags...</div>
	}

	if (tags.$isError) {
		return <div>Error loading tags: {tags.$error.message}</div>
	}

	return (
		<div className="tag-list-editor">
			<h3>Tags ({tags.length})</h3>

			{tags.items.map(item => (
				<div key={item.id} className="tag-item">
					<TagEditor tag={item} />
					<Button variant="destructive" size="sm" onClick={() => tags.$remove(item.id)}>Remove</Button>
				</div>
			))}

			<Button variant="outline" size="sm" onClick={() => tags.$add({ name: '', color: '#000000' })}>Add Tag</Button>
		</div>
	)
}
