import { Entity, createComponent, useEntity } from '../../bindx.js'
import { Field, HasMany, mergeFragments, type EntityRef } from '@contember/react-bindx'
import type { Author } from '../../types.js'


export const AuthorArticlesExplicit = createComponent((it) => ({
	author: it.fragment('Author').name().articles({ limit: 5 }, it => it.title().id()),
}), props => {
	return (
		<ul>
			<HasMany field={props.author.fields.articles}>
				{article => (
					<li key={article.id}>
						<Field field={article.fields.title} />
					</li>
				)}
			</HasMany>
		</ul>
	)
})


export const AuthorArticlesImplicit = createComponent<{
	author: EntityRef<Author>
}>(props => {
	return (
		<ul>
			<HasMany field={props.author.fields.articles} limit={5}>
				{article => (
					<li key={article.id}>
						<Field field={article.fields.title} />
					</li>
				)}
			</HasMany>
		</ul>
	)
})

export const AuthorBioImplicit = createComponent<{
	author: EntityRef<Author>
}>(props => {
	return (
		<div>
			<p>
				<Field field={props.author.fields.bio} />
			</p>
		</div>
	)
})

export const ArticleImplicitInImplicit = () => {
	return <Entity name="Article" id="some-article-id">
		{article => (
			<article className="article-detail">
				<header>
					<h1><Field field={article.fields.title} /></h1>
				</header>
				<AuthorArticlesImplicit author={article.fields.author.entity} />

			</article>
		)}
	</Entity>
}
export const ArticleExplicitInImplicit = () => {
	return <Entity name="Article" id="some-article-id">
		{article => (
			<article className="article-detail">
				<header>
					<h1><Field field={article.fields.title} /></h1>
				</header>
				<AuthorArticlesExplicit author={article.fields.author.entity} />
			</article>
		)}
	</Entity>
}

export const ArticleExplicitInExplicit = () => {
	const article = useEntity('Article', { id: 'some-article-id' }, e => e.title().author(AuthorArticlesExplicit.$author))

	if (article.isLoading) {
		return <div>Loading article...</div>
	}

	if (article.isError) {
		return <div>Error: {article.error.message}</div>
	}

	return (
		<article className="article-detail">
			<header>
				<h1><Field field={article.fields.title} /></h1>
			</header>
			<AuthorArticlesExplicit author={article.fields.author.entity} />
		</article>
	)
}

export const ArticleImplicitInExplicit = () => {
	// Use mergeFragments to combine fragment selections from both components
	// This ensures the EntityRef has the required brands for both components
	const article = useEntity('Article', { id: 'some-article-id' }, e => e.title()
		.author(mergeFragments(AuthorArticlesImplicit.$author, AuthorBioImplicit.$author))
	)

	if (article.isLoading) {
		return <div>Loading article...</div>
	}

	if (article.isError) {
		return <div>Error: {article.error.message}</div>
	}

	return (
		<article className="article-detail">
			<header>
				<h1><Field field={article.fields.title} /></h1>
			</header>
			<AuthorBioImplicit author={article.fields.author.entity} />

			<AuthorArticlesImplicit author={article.fields.author.entity} />
		</article>
	)
}
