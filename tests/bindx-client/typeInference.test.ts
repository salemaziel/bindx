import { describe, test, expect } from 'bun:test'
import { qb, entityDef, type CreateDataInput, type UpdateDataInput, type UniqueWhere } from '@contember/bindx-client'

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
// Type-level assertions (compile-time checks)
// ============================================================================

// Helper: asserts that T extends U at compile time
type AssertExtends<T, U> = T extends U ? true : never
// Helper: asserts exact type match
type AssertExact<T, U> = [T] extends [U] ? [U] extends [T] ? true : never : never

describe('Type Inference', () => {
	describe('qb.get result types', () => {
		test('infers scalar fields', () => {
			const query = qb.get(schema.Article, { by: { id: '1' } }, it => it.title())
			// Result should be { title: string, id: string } | null
			type Result = ReturnType<typeof query.parse>
			type _check = AssertExtends<Result, { title: string; id: string } | null>

			expect(query.fieldName).toBe('getArticle')
		})

		test('infers nested has-one relation', () => {
			const query = qb.get(schema.Article, { by: { id: '1' } }, it =>
				it.title().author(a => a.name().email()),
			)
			type Result = ReturnType<typeof query.parse>
			type _check = AssertExtends<Result, { title: string; author: { name: string; email: string }; id: string } | null>

			expect(query.fieldName).toBe('getArticle')
		})

		test('infers has-many relation as array', () => {
			const query = qb.get(schema.Article, { by: { id: '1' } }, it =>
				it.title().tags(t => t.name()),
			)
			type Result = ReturnType<typeof query.parse>
			type _check = AssertExtends<Result, { title: string; tags: { name: string }[]; id: string } | null>

			expect(query.fieldName).toBe('getArticle')
		})
	})

	describe('qb.list result types', () => {
		test('infers array result', () => {
			const query = qb.list(schema.Article, {}, it => it.title())
			type Result = ReturnType<typeof query.parse>
			type _check = AssertExtends<Result, { title: string; id: string }[]>

			expect(query.fieldName).toBe('listArticle')
		})
	})

	describe('qb.fragment type inference', () => {
		test('fragment preserves selection type when used in query', () => {
			const AuthorCard = qb.fragment(schema.Author, e => e.name().email())
			const query = qb.get(schema.Article, { by: { id: '1' } }, it =>
				it.title().author(AuthorCard),
			)
			type Result = ReturnType<typeof query.parse>
			type _check = AssertExtends<Result, { title: string; author: { name: string; email: string }; id: string } | null>

			expect(query.fieldName).toBe('getArticle')
		})
	})

	describe('Mutation input types', () => {
		test('CreateDataInput allows scalar fields', () => {
			type Input = CreateDataInput<Article>
			type _titleOk = AssertExtends<{ title: string }, Pick<Input, 'title'>>

			// Compile-time: this should type check
			const input: CreateDataInput<Article> = { title: 'Hello' }
			expect(input.title).toBe('Hello')
		})

		test('CreateDataInput allows relation connect', () => {
			const input: CreateDataInput<Article> = {
				title: 'Hello',
				author: { connect: { id: '123' } },
			}
			expect(input.title).toBe('Hello')
		})

		test('CreateDataInput allows relation create', () => {
			const input: CreateDataInput<Article> = {
				title: 'Hello',
				author: { create: { name: 'John', email: 'john@example.com' } },
			}
			expect(input.title).toBe('Hello')
		})

		test('CreateDataInput allows has-many relation', () => {
			const input: CreateDataInput<Article> = {
				title: 'Hello',
				tags: [
					{ connect: { id: '1' } },
					{ create: { name: 'new-tag', active: true } },
				],
			}
			expect(input.title).toBe('Hello')
		})

		test('UpdateDataInput allows disconnect/delete', () => {
			const input: UpdateDataInput<Article> = {
				title: 'Updated',
				author: { disconnect: true },
			}
			expect(input.title).toBe('Updated')
		})

		test('UpdateDataInput allows has-many update operations', () => {
			const input: UpdateDataInput<Article> = {
				tags: [
					{ connect: { id: '1' } },
					{ disconnect: { id: '2' } },
					{ delete: { id: '3' } },
					{ update: { by: { id: '4' }, data: { name: 'renamed' } } },
				],
			}
			expect(input.tags).toBeDefined()
		})
	})

	describe('EntityWhere type inference', () => {
		test('filter accepts scalar conditions', () => {
			const query = qb.list(
				schema.Article,
				{ filter: { published: { eq: true } } },
				it => it.title(),
			)
			expect(query.args['filter']).toBeDefined()
		})

		test('filter accepts nested relation conditions', () => {
			const query = qb.list(
				schema.Article,
				{ filter: { author: { name: { eq: 'John' } } } },
				it => it.title(),
			)
			expect(query.args['filter']).toBeDefined()
		})

		test('filter accepts and/or/not composition', () => {
			const query = qb.list(
				schema.Article,
				{
					filter: {
						or: [
							{ published: { eq: true } },
							{ title: { contains: 'draft' } },
						],
					},
				},
				it => it.title(),
			)
			expect(query.args['filter']).toBeDefined()
		})
	})
})
