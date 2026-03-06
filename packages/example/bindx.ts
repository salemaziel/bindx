import { createBindx, defineSchema, scalar, hasOne, hasMany } from '@contember/bindx-react'
import type { Article, Author, Tag, Location, ContentReference } from './types.js'

/**
 * Schema mapping entity names to their types.
 * This enables type-safe entity name autocomplete and automatic model inference.
 */
export interface Schema {
	Article: Article
	Author: Author
	Tag: Tag
	Location: Location
	ContentReference: ContentReference
}

/**
 * Schema definition with field types and relations.
 */
const schema = defineSchema<Schema>({
	entities: {
		Article: {
			fields: {
				id: scalar(),
				title: scalar(),
				content: scalar(),
				richContent: scalar(),
				publishedAt: scalar(),
				author: hasOne('Author'),
				location: hasOne('Location'),
				tags: hasMany('Tag'),
				contentReferences: hasMany('ContentReference'),
			},
		},
		Author: {
			fields: {
				id: scalar(),
				name: scalar(),
				email: scalar(),
				bio: scalar(),
				articles: hasMany('Article'),
			},
		},
		Tag: {
			fields: {
				id: scalar(),
				name: scalar(),
				color: scalar(),
				articles: hasMany('Article'),
			},
		},
		Location: {
			fields: {
				id: scalar(),
				lat: scalar(),
				lng: scalar(),
				label: scalar(),
			},
		},
		ContentReference: {
			fields: {
				id: scalar(),
				type: scalar(),
				imageUrl: scalar(),
				caption: scalar(),
			},
		},
	},
})

/**
 * Type-safe bindx hooks and components for this project's schema.
 */
export const { useEntity, useEntityList, Entity, createComponent } = createBindx(schema)
