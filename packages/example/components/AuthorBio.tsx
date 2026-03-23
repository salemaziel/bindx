import { createComponent, Field, HasMany } from '@contember/bindx-react'
import { schema } from '../generated/index.js'

/**
 * Reusable fragment component for author bio and recent articles.
 * Uses implicit selection (collected from JSX).
 */
export const AuthorBio = createComponent()
	.entity('author', schema.Author)
	.render(({ author }) => (
		<div className="author-bio">
			<p><Field field={author.bio} /></p>
			<h4>Recent Articles</h4>
			<ul>
				<HasMany field={author.articles} limit={3}>
					{article => (
						<li key={article.id}><Field field={article.title} /></li>
					)}
				</HasMany>
			</ul>
		</div>
	))
