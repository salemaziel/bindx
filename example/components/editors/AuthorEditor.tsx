import type { HasOneAccessor } from '../../../src/index.js'
import { AuthorFragment } from '../../fragments.js'
import { TextInput } from '../inputs/index.js'

/**
 * Author editor - knows about Author model structure
 */
export function AuthorEditor({
	author,
}: {
	author: HasOneAccessor<typeof AuthorFragment.__resultType>
}) {
	return (
		<div className="author-editor">
			<h3>Author</h3>
			<TextInput field={author.fields.name} label="Name" />
			<TextInput field={author.fields.email} label="Email" />
		</div>
	)
}
