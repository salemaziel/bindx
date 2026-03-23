import type { ReactNode } from 'react'
import { Entity, Field, HasMany, HasOne, If, Show } from '@contember/bindx-react'
import { schema } from '../generated/index.js'

/**
 * Showcase of all JSX components: Entity, Field, HasMany, HasOne, If, Show.
 *
 * Demonstrates:
 * - Two-pass JSX approach with full type safety
 * - Field for scalar values (with render function)
 * - HasMany for has-many relations with index
 * - HasOne for has-one relations
 * - Show for conditional display based on field value
 * - If for conditional rendering
 * - Nested relation traversal
 */
export function JsxShowcasePage({ authorId }: { authorId: string }): ReactNode {
	return (
		<Entity
			entity={schema.Author}
			by={{ id: authorId }}
			loading={<div>Loading author...</div>}
			error={err => <div className="error">Failed to load: {err.message}</div>}
		>
			{author => (
				<div className="author-card">
					{/* Scalar fields */}
					<h2><Field field={author.name} /></h2>

					{/* Field with render function */}
					<p className="email">
						<Field field={author.email}>
							{field => <a href={`mailto:${field.value}`}>{field.value}</a>}
						</Field>
					</p>

					{/* Show component — renders only when field is non-null */}
					<Show field={author.bio} fallback={<p className="text-gray-400 italic">No bio available</p>}>
						{bio => <p className="bio">{bio}</p>}
					</Show>

					{/* HasMany relation with index */}
					<section className="articles mt-4">
						<h3>Articles</h3>
						<HasMany field={author.articles} limit={5}>
							{(article, index) => (
								<article key={article.id} className="border-l-2 border-gray-200 pl-3 mb-3">
									<h4>
										{index + 1}. <Field field={article.title} />
									</h4>

									{/* Nested HasOne relation */}
									<HasOne field={article.location}>
										{location => (
											<span className="text-sm text-gray-500">
												Location: <Field field={location.label} />
											</span>
										)}
									</HasOne>

									{/* Nested HasMany relation */}
									<div className="flex gap-1 mt-1">
										<HasMany field={article.tags}>
											{tag => (
												<span
												key={tag.id}
													className="inline-block px-1.5 py-0.5 rounded text-white text-xs"
													style={{ backgroundColor: tag.color.value ?? '#666' }}
												>
													<Field field={tag.name} />
												</span>
											)}
										</HasMany>
									</div>

									{/* If component for conditional rendering */}
									<If
										condition={article.publishedAt.value !== null}
										then={
											<time className="text-xs text-green-600">
												Published: <Field field={article.publishedAt} />
											</time>
										}
										else={<span className="text-xs text-orange-500">Draft</span>}
									/>
								</article>
							)}
						</HasMany>
					</section>
				</div>
			)}
		</Entity>
	)
}

/**
 * Interactive editing example using Entity JSX.
 *
 * Demonstrates:
 * - Direct field mutation via setValue
 * - Dirty state tracking
 */
export function AuthorEditPage({ authorId }: { authorId: string }): ReactNode {
	return (
		<Entity
			entity={schema.Author}
			by={{ id: authorId }}
			loading={<div>Loading author...</div>}
			error={err => <div className="error">Failed to load: {err.message}</div>}
		>
			{author => (
				<form className="flex flex-col gap-3">
					<div>
						<label className="block text-sm font-medium">Name</label>
						<input
							type="text"
							className="border rounded px-2 py-1 w-full"
							value={author.name.value ?? ''}
							onChange={e => author.name.setValue(e.target.value)}
						/>
						{author.name.isDirty && <span className="text-orange-500 text-xs ml-1">*</span>}
					</div>

					<div>
						<label className="block text-sm font-medium">Email</label>
						<input
							type="email"
							className="border rounded px-2 py-1 w-full"
							value={author.email.value ?? ''}
							onChange={e => author.email.setValue(e.target.value)}
						/>
					</div>

					<div>
						<label className="block text-sm font-medium">Bio</label>
						<textarea
							className="border rounded px-2 py-1 w-full"
							value={author.bio.value ?? ''}
							onChange={e => author.bio.setValue(e.target.value)}
						/>
					</div>

					{author.$isDirty && (
						<div className="flex gap-2">
							<button type="button" className="px-3 py-1 bg-blue-500 text-white rounded text-sm">
								Save Changes
							</button>
						</div>
					)}
				</form>
			)}
		</Entity>
	)
}

/**
 * Combined JSX showcase page.
 */
export function JsxShowcaseFullPage({ authorId, articleId }: { authorId: string; articleId: string }): ReactNode {
	return (
		<>
			<h3>Author Profile (Entity + Field + HasMany + HasOne + If + Show)</h3>
			<JsxShowcasePage authorId={authorId} />
			<hr className="my-6" />
			<h3>Interactive Editing</h3>
			<AuthorEditPage authorId={authorId} />
			<hr className="my-6" />
			<h3>Article Detail</h3>
			<ArticleDetailPage articleId={articleId} />
		</>
	)
}

/**
 * Article detail with author and tags.
 */
function ArticleDetailPage({ articleId }: { articleId: string }): ReactNode {
	return (
		<Entity entity={schema.Article} by={{ id: articleId }} loading={<div>Loading...</div>}>
			{article => (
				<article>
					<header>
						<h2><Field field={article.title} /></h2>
						<HasOne field={article.author}>
							{author => (
								<div className="text-sm text-gray-600">
									By <strong><Field field={author.name} /></strong> (<Field field={author.email} />)
								</div>
							)}
						</HasOne>
					</header>
					<div className="my-2">
						<Field field={article.content} />
					</div>
					<footer className="flex gap-1">
						<HasMany field={article.tags}>
							{tag => (
								<span key={tag.id} className="inline-block px-1.5 py-0.5 rounded text-white text-xs" style={{ backgroundColor: tag.color.value ?? '#666' }}>
									<Field field={tag.name} />
								</span>
							)}
						</HasMany>
					</footer>
				</article>
			)}
		</Entity>
	)
}
