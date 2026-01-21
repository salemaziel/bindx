/**
 * Shared mock data factories for tests
 *
 * These factories create consistent test data that can be reused across test files.
 */

// ============================================================================
// Standard Mock Data (Full Schema)
// ============================================================================

/**
 * Creates standard mock data with Article, Author, Location, and Tags
 * Suitable for most integration tests
 */
export function createMockData() {
	return {
		Article: {
			'article-1': {
				id: 'article-1',
				title: 'Hello World',
				content: 'This is the content',
				published: true,
				status: 'draft',
				views: 100,
				rating: 4.5,
				publishedAt: '2024-01-15',
				createdAt: '2024-01-15T10:30:00Z',
				author: {
					id: 'author-1',
					name: 'John Doe',
					email: 'john@example.com',
					bio: 'Writer',
				},
				location: {
					id: 'location-1',
					label: 'New York',
					lat: 40.7128,
					lng: -74.006,
				},
				tags: [
					{ id: 'tag-1', name: 'JavaScript', color: '#f7df1e' },
					{ id: 'tag-2', name: 'React', color: '#61dafb' },
				],
			},
			'article-2': {
				id: 'article-2',
				title: 'Another Article',
				content: 'More content here',
				published: null,
				status: 'published',
				views: null,
				rating: null,
				publishedAt: null,
				createdAt: null,
				author: null,
				location: null,
				tags: [],
			},
		},
		Author: {
			'author-1': {
				id: 'author-1',
				name: 'John Doe',
				email: 'john@example.com',
				bio: 'Writer',
			},
			'author-2': {
				id: 'author-2',
				name: 'Jane Smith',
				email: 'jane@example.com',
				bio: 'Editor',
			},
		},
		Location: {
			'location-1': {
				id: 'location-1',
				label: 'New York',
				lat: 40.7128,
				lng: -74.006,
			},
			'location-2': {
				id: 'location-2',
				label: 'Los Angeles',
				lat: 34.0522,
				lng: -118.2437,
			},
		},
		Tag: {
			'tag-1': { id: 'tag-1', name: 'JavaScript', color: '#f7df1e' },
			'tag-2': { id: 'tag-2', name: 'React', color: '#61dafb' },
			'tag-3': { id: 'tag-3', name: 'TypeScript', color: '#3178c6' },
			'tag-4': { id: 'tag-4', name: 'Vue', color: '#42b883' },
		},
	}
}

// ============================================================================
// HasOne-focused Mock Data
// ============================================================================

/**
 * Creates mock data for HasOne relation tests
 * Includes articles with and without authors
 */
export function createHasOneMockData() {
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

// ============================================================================
// HasMany-focused Mock Data
// ============================================================================

/**
 * Creates mock data for HasMany relation tests
 * Includes articles with various tag configurations
 */
export function createHasManyMockData() {
	return {
		Article: {
			'article-1': {
				id: 'article-1',
				title: 'Test Article',
				tags: [
					{ id: 'tag-1', name: 'JavaScript', color: '#f7df1e' },
					{ id: 'tag-2', name: 'React', color: '#61dafb' },
				],
			},
			'article-empty': {
				id: 'article-empty',
				title: 'Empty Article',
				tags: [],
			},
			'article-single': {
				id: 'article-single',
				title: 'Single Tag Article',
				tags: [
					{ id: 'tag-1', name: 'JavaScript', color: '#f7df1e' },
				],
			},
		},
		Tag: {
			'tag-1': { id: 'tag-1', name: 'JavaScript', color: '#f7df1e' },
			'tag-2': { id: 'tag-2', name: 'React', color: '#61dafb' },
			'tag-3': { id: 'tag-3', name: 'TypeScript', color: '#3178c6' },
			'tag-4': { id: 'tag-4', name: 'Vue', color: '#42b883' },
		},
	}
}

// ============================================================================
// Empty Mock Data
// ============================================================================

/**
 * Creates empty mock data for entity creation tests
 */
export function createEmptyMockData() {
	return {
		Article: {},
		Author: {},
		Location: {},
		Tag: {},
	}
}

// ============================================================================
// Complex Relation Mock Data
// ============================================================================

/**
 * Creates mock data with complex relation scenarios
 * Useful for testing deep nesting and multiple relations
 */
export function createRelationMockData() {
	return {
		Article: {
			'article-1': {
				id: 'article-1',
				title: 'Complex Article',
				content: 'With many relations',
				author: {
					id: 'author-1',
					name: 'John Doe',
					email: 'john@example.com',
				},
				location: {
					id: 'location-1',
					label: 'New York',
					lat: 40.7128,
					lng: -74.006,
				},
				tags: [
					{ id: 'tag-1', name: 'JavaScript', color: '#f7df1e' },
					{ id: 'tag-2', name: 'React', color: '#61dafb' },
					{ id: 'tag-3', name: 'TypeScript', color: '#3178c6' },
				],
			},
			'article-2': {
				id: 'article-2',
				title: 'Minimal Article',
				content: 'No relations',
				author: null,
				location: null,
				tags: [],
			},
			'article-3': {
				id: 'article-3',
				title: 'Partial Article',
				content: 'Some relations',
				author: {
					id: 'author-2',
					name: 'Jane Smith',
					email: 'jane@example.com',
				},
				location: null,
				tags: [
					{ id: 'tag-1', name: 'JavaScript', color: '#f7df1e' },
				],
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
			'author-3': {
				id: 'author-3',
				name: 'Bob Wilson',
				email: 'bob@example.com',
			},
		},
		Location: {
			'location-1': {
				id: 'location-1',
				label: 'New York',
				lat: 40.7128,
				lng: -74.006,
			},
			'location-2': {
				id: 'location-2',
				label: 'Los Angeles',
				lat: 34.0522,
				lng: -118.2437,
			},
		},
		Tag: {
			'tag-1': { id: 'tag-1', name: 'JavaScript', color: '#f7df1e' },
			'tag-2': { id: 'tag-2', name: 'React', color: '#61dafb' },
			'tag-3': { id: 'tag-3', name: 'TypeScript', color: '#3178c6' },
			'tag-4': { id: 'tag-4', name: 'Vue', color: '#42b883' },
			'tag-5': { id: 'tag-5', name: 'Node.js', color: '#339933' },
		},
	}
}
