import { defineFragment, type ModelProxy } from '../src/index.js'
import type { Author, Location, Tag, Article } from './types.js'

/**
 * Fragment for author fields - reusable across components
 */
export const AuthorFragment = defineFragment((author: ModelProxy<Author>) => ({
	id: author.id,
	name: author.name,
	email: author.email,
}))

/**
 * Fragment for location fields
 */
export const LocationFragment = defineFragment((location: ModelProxy<Location>) => ({
	id: location.id,
	lat: location.lat,
	lng: location.lng,
	label: location.label,
}))

/**
 * Fragment for tag fields
 */
export const TagFragment = defineFragment((tag: ModelProxy<Tag>) => ({
	id: tag.id,
	name: tag.name,
	color: tag.color,
}))

/**
 * Full article fragment composing other fragments
 */
export const ArticleFragment = defineFragment((article: ModelProxy<Article>) => ({
	id: article.id,
	title: article.title,
	content: article.content,
	publishedAt: article.publishedAt,
	// Compose author fragment
	author: AuthorFragment.compose(article.author),
	// Compose location fragment
	location: LocationFragment.compose(article.location),
	// Has-many with fragment composition
	tags: article.tags.map(tag => TagFragment.compose(tag)),
}))

/**
 * Minimal article fragment for list views
 */
export const ArticleListFragment = defineFragment((article: ModelProxy<Article>) => ({
	id: article.id,
	title: article.title,
	author: {
		name: article.author.name,
	},
}))
