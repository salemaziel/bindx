import { Entity } from '@contember/bindx-react'
import { Field, HasMany, HasOne, If, Show } from '@contember/bindx-react'
import { schema } from '../../generated/index.js'

/**
 * Simple example using the two-pass JSX approach.
 * This is fully type-safe - TypeScript validates all field references.
 */
export function AuthorSimpleExample({ authorId }: { authorId: string }) {
	return (
		<Entity entity={schema.Author} by={{ id: authorId }}>
			{author => (
				<div className="author-card">
					{/* Scalar fields - fully typed */}
					<h2><Field field={author.name} /></h2>
					<p className="email">
						<Field field={author.email}>
							{field => <a href={`mailto:${field.value}`}>{field.value}</a>}
						</Field>
					</p>

					{/* Optional field with Show component */}
					<Show field={author.bio} fallback={<p className="no-bio">No bio available</p>}>
						{bio => <p className="bio">{bio}</p>}
					</Show>

					{/* HasMany relation - nested type safety */}
					<section className="articles">
						<h3>Articles</h3>
						<HasMany field={author.articles} limit={5}>
							{(article, index) => (
								<article key={article.id} className="article-preview">
									<h4>
										{index + 1}. <Field field={article.title} />
									</h4>

									{/* Nested HasOne relation */}
									<HasOne field={article.location}>
										{location => (
											<span className="location">
												<Field field={location.label} />
											</span>
										)}
									</HasOne>

									{/* Nested HasMany relation */}
									<div className="tags">
										<HasMany field={article.tags}>
											{tag => (
												<span
													className="tag"
													style={{ backgroundColor: tag.color.value ?? undefined }}
												>
													<Field field={tag.name} />
												</span>
											)}
										</HasMany>
									</div>

									{/* Conditional rendering with If */}
									<If
										condition={article.publishedAt.value !== null}
										then={
											<time className="published">
												Published: <Field field={article.publishedAt} />
											</time>
										}
										else={<span className="draft">Draft</span>}
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
 * Article detail example
 */
export function ArticleDetailExample({ articleId }: { articleId: string }) {
	return (
		<Entity entity={schema.Article} by={{ id: articleId }}>
			{article => (
				<article className="article-detail">
					<header>
						<h1><Field field={article.title} /></h1>

						{/* Author info with HasOne */}
						<HasOne field={article.author}>
							{author => (
								<div className="author-info">
									<span>By </span>
									<strong><Field field={author.name} /></strong>
									<span> (</span>
									<Field field={author.email} />
									<span>)</span>
								</div>
							)}
						</HasOne>
					</header>

					<div className="content">
						<Field field={article.content} />
					</div>

					<footer>
						<HasMany field={article.tags}>
							{tag => (
								<span className="tag" key={tag.id}>
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

/**
 * Interactive editing example
 */
export function AuthorEditExample({ authorId }: { authorId: string }) {
	return (
		<Entity
			entity={schema.Author}
			by={{ id: authorId }}
			loading={<div>Loading author...</div>}
			error={err => <div className="error">Failed to load: {err.message}</div>}
		>
			{author => (
				<form className="author-edit">
					<div className="form-field">
						<label>Name</label>
						<input
							type="text"
							value={author.name.value ?? ''}
							onChange={e => author.name.setValue(e.target.value)}
						/>
						{author.name.isDirty && <span className="dirty">*</span>}
					</div>

					<div className="form-field">
						<label>Email</label>
						<input
							type="email"
							value={author.email.value ?? ''}
							onChange={e => author.email.setValue(e.target.value)}
						/>
					</div>

					<div className="form-field">
						<label>Bio</label>
						<textarea
							value={author.bio.value ?? ''}
							onChange={e => author.bio.setValue(e.target.value)}
						/>
					</div>

					{author.$isDirty && (
						<div className="actions">
							<button type="button">Save Changes</button>
						</div>
					)}
				</form>
			)}
		</Entity>
	)
}
