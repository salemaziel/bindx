import { describe, test, expect } from 'bun:test'
import { qb, entityDef, ContentClient, type ContentQuery } from '@contember/bindx-client'

// ============================================================================
// Test schema
// ============================================================================

interface Author {
	id: string
	name: string
	email: string
}

interface Tag {
	id: string
	name: string
	active: boolean
}

interface Article {
	id: string
	title: string
	content: string
	published: boolean
	author: Author | null
	tags: Tag[]
}

const schema = {
	Article: entityDef<Article>('Article'),
	Author: entityDef<Author>('Author'),
	Tag: entityDef<Tag>('Tag'),
} as const

// ============================================================================
// qb.get
// ============================================================================

describe('qb.get', () => {
	test('creates a get query descriptor', () => {
		const query = qb.get(schema.Article, { by: { id: '123' } }, it => it.title())
		expect(query.type).toBe('query')
		expect(query.fieldName).toBe('getArticle')
		expect(query.args).toBeDefined()
		expect(query.selection).toBeDefined()
	})

	test('includes id in selection automatically', () => {
		const query = qb.get(schema.Article, { by: { id: '123' } }, it => it.title())
		expect(query.selection).toBeDefined()
		// Selection should contain both id and title fields
		const fieldNames = query.selection!.map((f: any) => f.name)
		expect(fieldNames).toContain('id')
		expect(fieldNames).toContain('title')
	})

	test('parse returns null for null result', () => {
		const query = qb.get(schema.Article, { by: { id: '123' } }, it => it.title())
		expect(query.parse(null)).toBeNull()
	})

	test('handles nested has-one relation', () => {
		const query = qb.get(schema.Article, { by: { id: '123' } }, it =>
			it.title().author(a => a.name().email()),
		)
		expect(query.selection).toBeDefined()
		expect(query.selection!.length).toBeGreaterThan(0)
	})
})

// ============================================================================
// qb.list
// ============================================================================

describe('qb.list', () => {
	test('creates a list query descriptor', () => {
		const query = qb.list(schema.Article, {}, it => it.title())
		expect(query.type).toBe('query')
		expect(query.fieldName).toBe('listArticle')
	})

	test('passes filter and limit args', () => {
		const query = qb.list(
			schema.Article,
			{ filter: { published: { eq: true } }, limit: 10 },
			it => it.title(),
		)
		expect(query.args).toBeDefined()
		expect(query.args['filter']).toBeDefined()
		expect(query.args['limit']).toBeDefined()
	})

	test('parse returns empty array for null result', () => {
		const query = qb.list(schema.Article, {}, it => it.title())
		expect(query.parse(null)).toEqual([])
	})
})

// ============================================================================
// qb.count
// ============================================================================

describe('qb.count', () => {
	test('creates a count query descriptor', () => {
		const query = qb.count(schema.Article, {})
		expect(query.type).toBe('query')
		expect(query.fieldName).toBe('paginateArticle')
	})

	test('parse extracts totalCount from pageInfo', () => {
		const query = qb.count(schema.Article, {})
		const result = query.parse({ pageInfo: { totalCount: 42 } })
		expect(result).toBe(42)
	})

	test('parse returns 0 for null result', () => {
		const query = qb.count(schema.Article, {})
		expect(query.parse(null)).toBe(0)
	})
})

// ============================================================================
// qb.create
// ============================================================================

describe('qb.create', () => {
	test('creates a create mutation descriptor', () => {
		const mutation = qb.create(schema.Article, { data: { title: 'New' } })
		expect(mutation.type).toBe('mutation')
		expect(mutation.fieldName).toBe('createArticle')
	})

	test('includes node selection when definer provided', () => {
		const mutation = qb.create(
			schema.Article,
			{ data: { title: 'New' } },
			it => it.title(),
		)
		expect(mutation.selection).toBeDefined()
		// Should have ok, errorMessage, errors, validation, node
		const fieldNames = mutation.selection!.map((f: any) => f.name)
		expect(fieldNames).toContain('ok')
		expect(fieldNames).toContain('node')
	})
})

// ============================================================================
// qb.update
// ============================================================================

describe('qb.update', () => {
	test('creates an update mutation descriptor', () => {
		const mutation = qb.update(schema.Article, {
			by: { id: '123' },
			data: { title: 'Updated' },
		})
		expect(mutation.type).toBe('mutation')
		expect(mutation.fieldName).toBe('updateArticle')
	})
})

// ============================================================================
// qb.delete
// ============================================================================

describe('qb.delete', () => {
	test('creates a delete mutation descriptor', () => {
		const mutation = qb.delete(schema.Article, { by: { id: '123' } })
		expect(mutation.type).toBe('mutation')
		expect(mutation.fieldName).toBe('deleteArticle')
	})

	test('delete selection does not include node or validation', () => {
		const mutation = qb.delete(schema.Article, { by: { id: '123' } })
		const fieldNames = mutation.selection!.map((f: any) => f.name)
		expect(fieldNames).toContain('ok')
		expect(fieldNames).not.toContain('validation')
		expect(fieldNames).not.toContain('node')
	})
})

// ============================================================================
// qb.fragment
// ============================================================================

describe('qb.fragment', () => {
	test('creates a reusable fragment', () => {
		const AuthorCard = qb.fragment(schema.Author, e => e.name().email())
		expect(AuthorCard.__isFragment).toBe(true)
		expect(AuthorCard.__meta).toBeDefined()
		expect(AuthorCard.__meta.fields.size).toBe(2)
	})

	test('fragment can be used in get query', () => {
		const AuthorCard = qb.fragment(schema.Author, e => e.name().email())
		const query = qb.get(schema.Article, { by: { id: '123' } }, it =>
			it.title().author(AuthorCard),
		)
		expect(query.selection).toBeDefined()
	})
})

// ============================================================================
// ContentClient
// ============================================================================

describe('ContentClient', () => {
	function createMockClient(response: unknown) {
		return {
			execute: async (_query: string, _options?: unknown) => response as any,
		}
	}

	test('query executes single query', async () => {
		const mockClient = createMockClient({ value: { id: '1', title: 'Test' } })
		const client = new ContentClient(mockClient)

		const query = qb.get(schema.Article, { by: { id: '1' } }, it => it.title())
		const result = await client.query(query)

		expect(result).toEqual({ id: '1', title: 'Test' })
	})

	test('query executes named batch', async () => {
		const mockClient = createMockClient({
			article: { id: '1', title: 'Test' },
			count: { pageInfo: { totalCount: 5 } },
		})
		const client = new ContentClient(mockClient)

		const result = await client.query({
			article: qb.get(schema.Article, { by: { id: '1' } }, it => it.title()),
			count: qb.count(schema.Article, {}),
		})

		expect(result.article).toEqual({ id: '1', title: 'Test' })
		expect(result.count).toBe(5)
	})

	test('mutate throws on failure', async () => {
		const mockClient = createMockClient({
			mut: { ok: false, errorMessage: 'Validation failed', errors: [], validation: { valid: false, errors: [] } },
		})
		const client = new ContentClient(mockClient)

		const mutation = qb.create(schema.Article, { data: { title: 'New' } })

		await expect(client.mutate(mutation)).rejects.toThrow('Validation failed')
	})

	test('mutate returns result on success', async () => {
		const mockClient = createMockClient({
			mut: { ok: true, errorMessage: null, errors: [], validation: { valid: true, errors: [] }, node: { id: '1' } },
		})
		const client = new ContentClient(mockClient)

		const mutation = qb.create(schema.Article, { data: { title: 'New' } })
		const result = await client.mutate(mutation)

		expect(result).toEqual({
			ok: true,
			errorMessage: null,
			errors: [],
			validation: { valid: true, errors: [] },
			node: { id: '1' },
		})
	})
})
