import './setup'
import { describe, test, expect, afterEach } from 'bun:test'
import { render, waitFor, cleanup } from '@testing-library/react'
import React from 'react'
import {
	BindxProvider,
	createBindx,
	MockAdapter,
	createComponent,
	isBindxComponent,
	mergeFragments,
	defineSchema,
	scalar,
	hasOne,
	hasMany,
	COMPONENT_MARKER,
	COMPONENT_SELECTIONS,
	type EntityRef,
} from '@contember/react-bindx'

afterEach(() => {
	cleanup()
})

// ============================================================================
// Test Types
// ============================================================================

interface Author {
	id: string
	name: string
	email: string
	bio: string
	articles: Article[]
}

interface Tag {
	id: string
	name: string
	color: string
}

interface Article {
	id: string
	title: string
	content: string
	author: Author
	tags: Tag[]
}

// ============================================================================
// Schema Setup
// ============================================================================

interface TestSchema {
	Article: Article
	Author: Author
	Tag: Tag
}

const schema = defineSchema<TestSchema>({
	entities: {
		Article: {
			fields: {
				id: scalar(),
				title: scalar(),
				content: scalar(),
				author: hasOne('Author'),
				tags: hasMany('Tag'),
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
			},
		},
	},
})

// Get typed createComponent from createBindx
const {
	useEntity,
	Entity,
	createComponent: schemaCreateComponent,
} = createBindx(schema)

// ============================================================================
// Test Helpers
// ============================================================================

function getByTestId(container: Element, testId: string): Element {
	const el = container.querySelector(`[data-testid="${testId}"]`)
	if (!el) throw new Error(`Element with data-testid="${testId}" not found`)
	return el
}

function queryByTestId(container: Element, testId: string): Element | null {
	return container.querySelector(`[data-testid="${testId}"]`)
}

function createMockData() {
	return {
		Article: {
			'article-1': {
				id: 'article-1',
				title: 'Hello World',
				content: 'This is the content',
				author: {
					id: 'author-1',
					name: 'John Doe',
					email: 'john@example.com',
					bio: 'A passionate writer',
					articles: [],
				},
				tags: [
					{ id: 'tag-1', name: 'JavaScript', color: '#f7df1e' },
					{ id: 'tag-2', name: 'React', color: '#61dafb' },
				],
			},
		},
		Author: {
			'author-1': {
				id: 'author-1',
				name: 'John Doe',
				email: 'john@example.com',
				bio: 'A passionate writer',
				articles: [
					{ id: 'article-1', title: 'Hello World', content: 'Content 1' },
					{ id: 'article-2', title: 'Second Post', content: 'Content 2' },
				],
			},
		},
	}
}

// ============================================================================
// Component Definitions - Explicit Mode (factory-based)
// ============================================================================

// Simple component with one entity prop - using factory.fragment()
const AuthorCard = schemaCreateComponent(
	it => ({
		author: it.fragment('Author').name().email(),
	}),
	({ author }) => (
		<div data-testid="author-card">
			<span data-testid="author-name">{author.data?.name}</span>
			<span data-testid="author-email">{author.data?.email}</span>
		</div>
	),
)

// Component with scalar props - use builder pattern
const AuthorCardWithOptions = schemaCreateComponent<{ showEmail?: boolean; className?: string }>()(
	it => ({
		author: it.fragment('Author').name().email().bio(),
	}),
	({ author, showEmail, className }) => (
		<div data-testid="author-card" className={className}>
			<span data-testid="author-name">{author.data?.name}</span>
			{showEmail && <span data-testid="author-email">{author.data?.email}</span>}
			<span data-testid="author-bio">{author.data?.bio}</span>
		</div>
	),
)

// Component with multiple entity props
const ArticleWithAuthor = schemaCreateComponent(
	it => ({
		article: it.fragment('Article').title().content(),
		author: it.fragment('Author').name(),
	}),
	({ article, author }) => (
		<div data-testid="article-with-author">
			<h1 data-testid="article-title">{article.data?.title}</h1>
			<p data-testid="article-content">{article.data?.content}</p>
			<span data-testid="author-name">{author.data?.name}</span>
		</div>
	),
)

// ============================================================================
// Component Definitions - Implicit Mode (standalone createComponent)
// ============================================================================

interface ImplicitAuthorCardProps {
	author: EntityRef<Author, { name: string; email: string }>
}

// Implicit mode collects fields through .fields access pattern
const ImplicitAuthorCard = createComponent<ImplicitAuthorCardProps>(({ author }) => (
	<div data-testid="implicit-author-card">
		<span data-testid="author-name">{author.fields.name.value}</span>
		<span data-testid="author-email">{author.fields.email.value}</span>
	</div>
))

// ============================================================================
// Tests
// ============================================================================

describe('createComponent', () => {
	describe('explicit mode (schema-aware)', () => {
		test('creates a component with fragment properties', () => {
			expect(AuthorCard.$author).toBeDefined()
			expect(AuthorCard.$author.__isFragment).toBe(true)
			expect(AuthorCard.$author.__meta).toBeDefined()
			expect(AuthorCard.$author.__meta.fields.size).toBe(2) // name, email
		})

		test('creates correct selection metadata', () => {
			const meta = AuthorCard.$author.__meta
			expect(meta.fields.has('name')).toBe(true)
			expect(meta.fields.has('email')).toBe(true)

			const nameField = meta.fields.get('name')
			expect(nameField?.fieldName).toBe('name')
			expect(nameField?.isRelation).toBe(false)
		})

		test('isBindxComponent returns true for created components', () => {
			expect(isBindxComponent(AuthorCard)).toBe(true)
			expect(isBindxComponent(AuthorCardWithOptions)).toBe(true)
			expect(isBindxComponent(ArticleWithAuthor)).toBe(true)
		})

		test('component has COMPONENT_MARKER symbol', () => {
			expect((AuthorCard as any)[COMPONENT_MARKER]).toBe(true)
		})

		test('component has COMPONENT_SELECTIONS map', () => {
			const selections = (AuthorCard as any)[COMPONENT_SELECTIONS]
			expect(selections).toBeInstanceOf(Map)
			expect(selections.has('author')).toBe(true)
		})
	})

	describe('implicit mode (standalone)', () => {
		test('creates component from props interface', () => {
			expect(ImplicitAuthorCard.$author).toBeDefined()
			expect(ImplicitAuthorCard.$author.__isFragment).toBe(true)
		})

		test('isBindxComponent returns true', () => {
			expect(isBindxComponent(ImplicitAuthorCard)).toBe(true)
		})
	})

	describe('scalar props', () => {
		test('component with scalar props has fragment', () => {
			expect(AuthorCardWithOptions.$author).toBeDefined()
			expect(AuthorCardWithOptions.$author.__meta.fields.has('name')).toBe(true)
			expect(AuthorCardWithOptions.$author.__meta.fields.has('bio')).toBe(true)
		})
	})

	describe('multiple entity props', () => {
		test('component with multiple props has all fragments', () => {
			expect(ArticleWithAuthor.$article).toBeDefined()
			expect(ArticleWithAuthor.$author).toBeDefined()

			expect(ArticleWithAuthor.$article.__meta.fields.has('title')).toBe(true)
			expect(ArticleWithAuthor.$author.__meta.fields.has('name')).toBe(true)
		})
	})

	describe('fragment merging', () => {
		test('can merge fragments from different components', () => {
			const AuthorName = schemaCreateComponent(
				it => ({ author: it.fragment('Author').name() }),
				({ author }) => <span>{author.data?.name}</span>,
			)

			const AuthorEmail = schemaCreateComponent(
				it => ({ author: it.fragment('Author').email() }),
				({ author }) => <span>{author.data?.email}</span>,
			)

			const merged = mergeFragments(AuthorName.$author, AuthorEmail.$author)

			expect(merged.__meta.fields.has('name')).toBe(true)
			expect(merged.__meta.fields.has('email')).toBe(true)
		})
	})

	describe('type inference', () => {
		test('author prop is correctly typed', () => {
			// This test verifies compile-time type checking
			// If types are wrong, this file won't compile
			const _testComponent = schemaCreateComponent(
				it => ({ author: it.fragment('Author').name().email() }),
				({ author }) => {
					// These should be typed correctly
					const name: string | undefined = author.data?.name
					const email: string | undefined = author.data?.email
					return <div>{name} {email}</div>
				},
			)

			expect(_testComponent.$author).toBeDefined()
		})
	})
})

describe('createComponent rendering', () => {
	test('renders component with data', async () => {
		const adapter = new MockAdapter(createMockData())

		const { container } = render(
			<BindxProvider adapter={adapter}>
				<Entity name="Author" id="author-1">
					{author => <AuthorCard author={author} />}
				</Entity>
			</BindxProvider>,
		)

		await waitFor(() => {
			expect(getByTestId(container, 'author-name').textContent).toBe('John Doe')
		})

		expect(getByTestId(container, 'author-email').textContent).toBe('john@example.com')
	})

	test('renders component with scalar props', async () => {
		const adapter = new MockAdapter(createMockData())

		const { container } = render(
			<BindxProvider adapter={adapter}>
				<Entity name="Author" id="author-1">
					{author => (
						<AuthorCardWithOptions
							author={author}
							showEmail={true}
							className="custom-class"
						/>
					)}
				</Entity>
			</BindxProvider>,
		)

		await waitFor(() => {
			expect(getByTestId(container, 'author-name').textContent).toBe('John Doe')
		})

		expect(getByTestId(container, 'author-email').textContent).toBe('john@example.com')
		expect(getByTestId(container, 'author-bio').textContent).toBe('A passionate writer')
		expect(getByTestId(container, 'author-card').className).toBe('custom-class')
	})

	test('scalar prop controls conditional rendering', async () => {
		const adapter = new MockAdapter(createMockData())

		const { container } = render(
			<BindxProvider adapter={adapter}>
				<Entity name="Author" id="author-1">
					{author => <AuthorCardWithOptions author={author} showEmail={false} />}
				</Entity>
			</BindxProvider>,
		)

		await waitFor(() => {
			expect(getByTestId(container, 'author-name').textContent).toBe('John Doe')
		})

		// Email should NOT be rendered when showEmail=false
		expect(queryByTestId(container, 'author-email')).toBeNull()
	})
})
