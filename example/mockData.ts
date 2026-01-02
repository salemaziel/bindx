import type { MockDataStore } from '../src/index.js'

/**
 * Example mock data for testing
 */
export const mockData: MockDataStore = {
	Article: {
		'article-1': {
			id: 'article-1',
			title: 'Introduction to React',
			content: 'React is a JavaScript library for building user interfaces...',
			publishedAt: '2024-01-15',
			author: {
				id: 'author-1',
				name: 'John Doe',
				email: 'john@example.com',
				bio: 'Senior developer at Example Corp',
			},
			location: {
				id: 'location-1',
				lat: 40.7128,
				lng: -74.006,
				label: 'New York',
			},
			tags: [
				{ id: 'tag-1', name: 'React', color: '#61dafb' },
				{ id: 'tag-2', name: 'JavaScript', color: '#f7df1e' },
			],
		},
		'article-2': {
			id: 'article-2',
			title: 'TypeScript Best Practices',
			content: 'TypeScript adds static typing to JavaScript...',
			publishedAt: '2024-02-20',
			author: {
				id: 'author-2',
				name: 'Jane Smith',
				email: 'jane@example.com',
				bio: 'TypeScript enthusiast',
			},
			location: {
				id: 'location-2',
				lat: 51.5074,
				lng: -0.1278,
				label: 'London',
			},
			tags: [
				{ id: 'tag-3', name: 'TypeScript', color: '#3178c6' },
				{ id: 'tag-2', name: 'JavaScript', color: '#f7df1e' },
			],
		},
	},
	Author: {
		'author-1': {
			id: 'author-1',
			name: 'John Doe',
			email: 'john@example.com',
			bio: 'Senior developer at Example Corp',
		},
		'author-2': {
			id: 'author-2',
			name: 'Jane Smith',
			email: 'jane@example.com',
			bio: 'TypeScript enthusiast',
		},
	},
}
