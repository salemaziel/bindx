import type { MockDataStore } from '@contember/bindx-react'

/**
 * Example mock data for testing
 */
export const mockData: MockDataStore = {
	Article: {
		'00000000-0000-0000-0000-000000000e01': {
			id: '00000000-0000-0000-0000-000000000e01',
			title: 'Introduction to React',
			content: 'React is a JavaScript library for building user interfaces...',
			richContent: {
				formatVersion: 2,
				children: [
					{ type: 'paragraph', children: [{ text: 'This is a block editor example with ' }, { text: 'bold text', bold: true }, { text: ' and ' }, { text: 'italic text', italic: true }, { text: '.' }] },
					{ type: 'paragraph', children: [{ text: 'Try editing this content!' }] },
				],
			},
			publishedAt: '2024-01-15',
			contentReferences: [
				{ id: '00000000-0000-0000-0000-000000000d01', type: 'image', imageUrl: 'https://picsum.photos/400/200', caption: 'A sample image' },
			],
			author: {
				id: '00000000-0000-0000-0000-000000000a01',
				name: 'John Doe',
				email: 'john@example.com',
				bio: 'Senior developer at Example Corp',
			},
			location: {
				id: '00000000-0000-0000-0000-000000000c01',
				lat: 40.7128,
				lng: -74.006,
				label: 'New York',
			},
			tags: [
				{ id: '00000000-0000-0000-0000-000000000b01', name: 'React', color: '#61dafb' },
				{ id: '00000000-0000-0000-0000-000000000b02', name: 'JavaScript', color: '#f7df1e' },
			],
		},
		'00000000-0000-0000-0000-000000000e02': {
			id: '00000000-0000-0000-0000-000000000e02',
			title: 'TypeScript Best Practices',
			content: 'TypeScript adds static typing to JavaScript...',
			richContent: null,
			publishedAt: '2024-02-20',
			contentReferences: [],
			author: {
				id: '00000000-0000-0000-0000-000000000a02',
				name: 'Jane Smith',
				email: 'jane@example.com',
				bio: 'TypeScript enthusiast',
			},
			location: {
				id: '00000000-0000-0000-0000-000000000c02',
				lat: 51.5074,
				lng: -0.1278,
				label: 'London',
			},
			tags: [
				{ id: '00000000-0000-0000-0000-000000000b03', name: 'TypeScript', color: '#3178c6' },
				{ id: '00000000-0000-0000-0000-000000000b02', name: 'JavaScript', color: '#f7df1e' },
			],
		},
	},
	Author: {
		'00000000-0000-0000-0000-000000000a01': {
			id: '00000000-0000-0000-0000-000000000a01',
			name: 'John Doe',
			email: 'john@example.com',
			bio: 'Senior developer at Example Corp',
		},
		'00000000-0000-0000-0000-000000000a02': {
			id: '00000000-0000-0000-0000-000000000a02',
			name: 'Jane Smith',
			email: 'jane@example.com',
			bio: 'TypeScript enthusiast',
		},
		'00000000-0000-0000-0000-000000000a03': {
			id: '00000000-0000-0000-0000-000000000a03',
			name: 'Bob Wilson',
			email: 'bob@example.com',
			bio: 'Full-stack developer',
		},
		'00000000-0000-0000-0000-000000000a04': {
			id: '00000000-0000-0000-0000-000000000a04',
			name: 'Alice Brown',
			email: 'alice@example.com',
			bio: 'Frontend architect',
		},
		'00000000-0000-0000-0000-000000000a05': {
			id: '00000000-0000-0000-0000-000000000a05',
			name: 'Charlie Davis',
			email: 'charlie@example.com',
			bio: 'DevOps engineer',
		},
	},
	Tag: {
		'00000000-0000-0000-0000-000000000b01': { id: '00000000-0000-0000-0000-000000000b01', name: 'React', color: '#61dafb' },
		'00000000-0000-0000-0000-000000000b02': { id: '00000000-0000-0000-0000-000000000b02', name: 'JavaScript', color: '#f7df1e' },
		'00000000-0000-0000-0000-000000000b03': { id: '00000000-0000-0000-0000-000000000b03', name: 'TypeScript', color: '#3178c6' },
		'00000000-0000-0000-0000-000000000b04': { id: '00000000-0000-0000-0000-000000000b04', name: 'CSS', color: '#264de4' },
		'00000000-0000-0000-0000-000000000b05': { id: '00000000-0000-0000-0000-000000000b05', name: 'Node.js', color: '#339933' },
		'00000000-0000-0000-0000-000000000b06': { id: '00000000-0000-0000-0000-000000000b06', name: 'GraphQL', color: '#e10098' },
	},
	ContentReference: {
		'00000000-0000-0000-0000-000000000d01': { id: '00000000-0000-0000-0000-000000000d01', type: 'image', imageUrl: 'https://picsum.photos/400/200', caption: 'A sample image' },
	},
	Location: {
		'00000000-0000-0000-0000-000000000c01': { id: '00000000-0000-0000-0000-000000000c01', lat: 40.7128, lng: -74.006, label: 'New York' },
		'00000000-0000-0000-0000-000000000c02': { id: '00000000-0000-0000-0000-000000000c02', lat: 51.5074, lng: -0.1278, label: 'London' },
		'00000000-0000-0000-0000-000000000c03': { id: '00000000-0000-0000-0000-000000000c03', lat: 48.8566, lng: 2.3522, label: 'Paris' },
		'00000000-0000-0000-0000-000000000c04': { id: '00000000-0000-0000-0000-000000000c04', lat: 35.6762, lng: 139.6503, label: 'Tokyo' },
	},
}
