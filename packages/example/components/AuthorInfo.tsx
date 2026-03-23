import { createComponent, Field } from '@contember/bindx-react'
import { schema } from '../generated/index.js'

/**
 * Reusable fragment component for displaying author information.
 * Uses implicit selection (collected from JSX).
 *
 * Can be used:
 * 1. Inside <Entity> with typed props: `<AuthorInfo author={author} />`
 * 2. With useEntity via `$author` fragment: `e.author(AuthorInfo.$author)`
 */
export const AuthorInfo = createComponent()
	.entity('author', schema.Author)
	.props<{ showEmail?: boolean }>()
	.render(({ author, showEmail }) => (
		<div className="author-info">
			<strong><Field field={author.name} /></strong>
			{showEmail && (
				<span className="email"> (<Field field={author.email} />)</span>
			)}
		</div>
	))
