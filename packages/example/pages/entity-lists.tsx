import type { ReactNode } from 'react'
import { Entity, EntityList, Field, HasOne } from '@contember/bindx-react'
import { schema } from '../generated/index.js'

/**
 * Author list using EntityList JSX component.
 *
 * Demonstrates:
 * - EntityList with implicit selection
 * - Loading/empty states
 */
export function AuthorListPage(): ReactNode {
	return (
		<div className="author-list" data-testid="author-list">
			<h3>All Authors</h3>
			<EntityList
				entity={schema.Author}
				loading={<div>Loading authors...</div>}
				empty={<div>No authors found</div>}
			>
				{author => (
					<div key={author.id} className="border-b py-2" data-testid={`author-item-${author.name.value}`}>
						<strong><Field field={author.name} /></strong>
						<span> - <Field field={author.email} /></span>
						<p className="text-sm text-gray-600"><Field field={author.bio} /></p>
					</div>
				)}
			</EntityList>
		</div>
	)
}

/**
 * Tag list with colored badges using EntityList JSX component.
 *
 * Demonstrates:
 * - EntityList with custom rendering
 * - Inline styles from entity field values
 */
export function TagListPage(): ReactNode {
	return (
		<div className="tag-list" data-testid="tag-list">
			<h3>Available Tags</h3>
			<div className="flex flex-wrap gap-2">
				<EntityList
					entity={schema.Tag}
					loading={<div>Loading tags...</div>}
					empty={<div>No tags found</div>}
				>
					{tag => (
						<span
							key={tag.id}
							className="inline-block px-2 py-1 rounded text-white text-sm"
							data-testid={`tag-list-badge-${tag.name.value}`}
							style={{ backgroundColor: tag.color.value ?? '#666' }}
						>
							<Field field={tag.name} />
						</span>
					)}
				</EntityList>
			</div>
		</div>
	)
}

/**
 * Combined entity lists page.
 */
export function EntityListsPage({ articleId }: { articleId: string }): ReactNode {
	return (
		<>
			<ArticleViewInline id={articleId} />
			<hr className="my-6" />
			<h3>Author List</h3>
			<AuthorListPage />
			<hr className="my-6" />
			<h3>Tag List</h3>
			<TagListPage />
		</>
	)
}

function ArticleViewInline({ id }: { id: string }): ReactNode {
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
