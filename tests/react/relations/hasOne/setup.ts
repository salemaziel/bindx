/**
 * Shared setup for hasOne relation tests
 */
import {
	createBindx,
	defineSchema,
	scalar,
	hasOne,
} from '@contember/bindx-react'
import { getByTestId as _getByTestId, queryByTestId as _queryByTestId } from '../../../shared/helpers'

// Re-export helpers
export { getByTestId, queryByTestId } from '../../../shared/helpers'

// HasOne-specific types
export interface Author {
	id: string
	name: string
	email: string
}

export interface Article {
	id: string
	title: string
	author: Author | null
}

export interface TestSchema {
	Article: Article
	Author: Author
}

export const schema = defineSchema<TestSchema>({
	entities: {
		Article: {
			fields: {
				id: scalar(),
				title: scalar(),
				author: hasOne('Author'),
			},
		},
		Author: {
			fields: {
				id: scalar(),
				name: scalar(),
				email: scalar(),
			},
		},
	},
})

export const { useEntity, useEntityList } = createBindx(schema)

// Test data factory
export function createMockData() {
	return {
		Article: {
			'article-1': {
				id: 'article-1',
				title: 'Test Article',
				author: {
					id: 'author-1',
					name: 'John Doe',
					email: 'john@example.com',
				},
			},
			'article-no-author': {
				id: 'article-no-author',
				title: 'No Author Article',
				author: null,
			},
		},
		Author: {
			'author-1': {
				id: 'author-1',
				name: 'John Doe',
				email: 'john@example.com',
			},
			'author-2': {
				id: 'author-2',
				name: 'Jane Smith',
				email: 'jane@example.com',
			},
		},
	}
}
