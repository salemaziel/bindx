import { useEntity } from '../../bindx.js'

/**
 * Simple article view using inline fragment definition
 */
export function ArticleView({ id }: { id: string }) {
	const article = useEntity('Article', { id }, e => e.title().author(a => a.name()))

	if (article.isLoading) {
		return <div>Loading...</div>
	}

	return (
		<div className="article-view">
			<h2>{article.fields.title.value}</h2>
			<p>By: {article.fields.author.fields.name.value}</p>
		</div>
	)
}
