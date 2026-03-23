import type { FieldRef } from '@contember/bindx-react'
import { InputField } from '@contember/bindx-ui'

/**
 * Author editor - knows about Author model structure
 * Receives only the fields it needs for flexible composition
 */
export function AuthorEditor({
	author,
}: {
	author: { name: FieldRef<string>; email: FieldRef<string | null> }
}) {
	return (
		<div className="author-editor" data-testid="author-editor">
			<h3>Author</h3>
			<InputField field={author.name} label="Name" inputProps={{ 'data-testid': 'author-name-input' }} />
			<InputField field={author.email} label="Email" inputProps={{ 'data-testid': 'author-email-input' }} />
		</div>
	)
}
