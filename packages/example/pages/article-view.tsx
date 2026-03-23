import type { ReactNode } from 'react'
import { Entity, Field, HasOne } from '@contember/bindx-react'
import { schema } from '../generated/index.js'

/**
 * Simple read-only article view using Entity JSX.
 *
 * Demonstrates:
 * - Entity component with by prop
 * - Field for scalar values
 * - HasOne for relation traversal
 * - Implicit selection (auto-collected from JSX)
 */
export function ArticleViewPage({ id }: { id: string }): ReactNode {
	return (
		<Entity
			entity={schema.Article}
			by={{ id }}
			loading={<div>Loading...</div>}
			notFound={<div>Article not found</div>}
		>
			{article => (
				<div className="article-view" data-testid="article-view">
					<h2 data-testid="article-view-title"><Field field={article.title} /></h2>
					<p data-testid="article-view-author">
						By: <HasOne field={article.author}>
							{author => <Field field={author.name} />}
						</HasOne>
					</p>
				</div>
			)}
		</Entity>
	)
}
