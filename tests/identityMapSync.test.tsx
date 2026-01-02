import './setup'
import { describe, test, expect, afterEach } from 'bun:test'
import { render, waitFor, act, cleanup } from '@testing-library/react'
import React from 'react'
import {
	BindxProvider,
	createBindx,
	MockAdapter,
	IdentityMap,
} from '../src/index.js'

afterEach(() => {
	cleanup()
})

// Test types
interface Author {
	id: string
	name: string
	email: string
}

interface Tag {
	id: string
	name: string
}

interface Article {
	id: string
	title: string
	content: string
	author: Author
	tags: Tag[]
}

// Create typed hooks using createBindx
interface TestSchema {
	Article: Article
	Author: Author
	Tag: Tag
}

const { useEntity } = createBindx<TestSchema>()

// Helper to query by data-testid
function getByTestId(container: Element, testId: string): Element {
	const el = container.querySelector(`[data-testid="${testId}"]`)
	if (!el) throw new Error(`Element with data-testid="${testId}" not found`)
	return el
}

function queryByTestId(container: Element, testId: string): Element | null {
	return container.querySelector(`[data-testid="${testId}"]`)
}

// Test data factory
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
				},
				tags: [
					{ id: 'tag-1', name: 'JavaScript' },
					{ id: 'tag-2', name: 'React' },
				],
			},
		},
		Author: {
			'author-1': {
				id: 'author-1',
				name: 'John Doe',
				email: 'john@example.com',
			},
		},
		Tag: {
			'tag-1': {
				id: 'tag-1',
				name: 'JavaScript',
			},
			'tag-2': {
				id: 'tag-2',
				name: 'React',
			},
		},
	}
}

describe('Identity Map Synchronization', () => {
	describe('same entity from multiple useEntity hooks', () => {
		test('two components using the same entity should stay in sync', async () => {
			const adapter = new MockAdapter(createMockData(), { delay: 0 })
			const identityMap = new IdentityMap()

			// Component A displays author name
			function ComponentA() {
				const author = useEntity('Author', { id: 'author-1' }, e => ({
					name: e.name,
				}))

				if (author.isLoading) {
					return <div data-testid="a-loading">Loading A...</div>
				}

				return (
					<div>
						<span data-testid="a-name">{author.fields.name.value}</span>
						<button
							data-testid="a-update"
							onClick={() => author.fields.name.setValue('Jane Doe')}
						>
							Update A
						</button>
					</div>
				)
			}

			// Component B also displays author name
			function ComponentB() {
				const author = useEntity('Author', { id: 'author-1' }, e => ({
					name: e.name,
				}))

				if (author.isLoading) {
					return <div data-testid="b-loading">Loading B...</div>
				}

				return (
					<div>
						<span data-testid="b-name">{author.fields.name.value}</span>
						<button
							data-testid="b-update"
							onClick={() => author.fields.name.setValue('Bob Smith')}
						>
							Update B
						</button>
					</div>
				)
			}

			const { container } = render(
				<BindxProvider adapter={adapter} identityMap={identityMap}>
					<ComponentA />
					<ComponentB />
				</BindxProvider>,
			)

			// Wait for both to load
			await waitFor(() => {
				expect(queryByTestId(container, 'a-name')).not.toBeNull()
				expect(queryByTestId(container, 'b-name')).not.toBeNull()
			})

			// Both should show initial value
			expect(getByTestId(container, 'a-name').textContent).toBe('John Doe')
			expect(getByTestId(container, 'b-name').textContent).toBe('John Doe')

			// Update from Component A
			act(() => {
				;(getByTestId(container, 'a-update') as HTMLButtonElement).click()
			})

			// Both should now show updated value
			expect(getByTestId(container, 'a-name').textContent).toBe('Jane Doe')
			expect(getByTestId(container, 'b-name').textContent).toBe('Jane Doe')

			// Update from Component B
			act(() => {
				;(getByTestId(container, 'b-update') as HTMLButtonElement).click()
			})

			// Both should show the new value
			expect(getByTestId(container, 'a-name').textContent).toBe('Bob Smith')
			expect(getByTestId(container, 'b-name').textContent).toBe('Bob Smith')
		})
	})

	describe('nested entity syncs with direct entity', () => {
		test('article.author should sync with direct author access', async () => {
			const adapter = new MockAdapter(createMockData(), { delay: 0 })
			const identityMap = new IdentityMap()

			// Component that accesses author through article
			function ArticleComponent() {
				const article = useEntity('Article', { id: 'article-1' }, e => ({
					title: e.title,
					author: {
						id: e.author.id,
						name: e.author.name,
					},
				}))

				if (article.isLoading) {
					return <div data-testid="article-loading">Loading...</div>
				}

				return (
					<div>
						<span data-testid="article-title">{article.fields.title.value}</span>
						<span data-testid="article-author-name">{article.fields.author.fields.name.value}</span>
						<button
							data-testid="article-update-author"
							onClick={() => article.fields.author.fields.name.setValue('Updated via Article')}
						>
							Update via Article
						</button>
					</div>
				)
			}

			// Component that accesses author directly
			function AuthorComponent() {
				const author = useEntity('Author', { id: 'author-1' }, e => ({
					name: e.name,
					email: e.email,
				}))

				if (author.isLoading) {
					return <div data-testid="author-loading">Loading...</div>
				}

				return (
					<div>
						<span data-testid="author-name">{author.fields.name.value}</span>
						<span data-testid="author-email">{author.fields.email.value}</span>
						<button
							data-testid="author-update"
							onClick={() => author.fields.name.setValue('Updated Directly')}
						>
							Update Directly
						</button>
					</div>
				)
			}

			const { container } = render(
				<BindxProvider adapter={adapter} identityMap={identityMap}>
					<ArticleComponent />
					<AuthorComponent />
				</BindxProvider>,
			)

			// Wait for both to load
			await waitFor(() => {
				expect(queryByTestId(container, 'article-author-name')).not.toBeNull()
				expect(queryByTestId(container, 'author-name')).not.toBeNull()
			})

			// Both should show initial value
			expect(getByTestId(container, 'article-author-name').textContent).toBe('John Doe')
			expect(getByTestId(container, 'author-name').textContent).toBe('John Doe')

			// Update via nested entity (article.author)
			act(() => {
				;(getByTestId(container, 'article-update-author') as HTMLButtonElement).click()
			})

			// Both should reflect the change
			expect(getByTestId(container, 'article-author-name').textContent).toBe('Updated via Article')
			expect(getByTestId(container, 'author-name').textContent).toBe('Updated via Article')

			// Update via direct entity
			act(() => {
				;(getByTestId(container, 'author-update') as HTMLButtonElement).click()
			})

			// Both should reflect the change
			expect(getByTestId(container, 'article-author-name').textContent).toBe('Updated Directly')
			expect(getByTestId(container, 'author-name').textContent).toBe('Updated Directly')
		})
	})

	describe('dirty state synchronization', () => {
		test('isDirty should be consistent across all views', async () => {
			const adapter = new MockAdapter(createMockData(), { delay: 0 })
			const identityMap = new IdentityMap()

			function ComponentA() {
				const author = useEntity('Author', { id: 'author-1' }, e => ({
					name: e.name,
				}))

				if (author.isLoading) return <div>Loading...</div>

				return (
					<div>
						<span data-testid="a-dirty">{author.isDirty ? 'dirty' : 'clean'}</span>
						<span data-testid="a-field-dirty">{author.fields.name.isDirty ? 'dirty' : 'clean'}</span>
						<button
							data-testid="a-update"
							onClick={() => author.fields.name.setValue('Changed')}
						>
							Change
						</button>
					</div>
				)
			}

			function ComponentB() {
				const author = useEntity('Author', { id: 'author-1' }, e => ({
					name: e.name,
				}))

				if (author.isLoading) return <div>Loading...</div>

				return (
					<div>
						<span data-testid="b-dirty">{author.isDirty ? 'dirty' : 'clean'}</span>
						<span data-testid="b-field-dirty">{author.fields.name.isDirty ? 'dirty' : 'clean'}</span>
					</div>
				)
			}

			const { container } = render(
				<BindxProvider adapter={adapter} identityMap={identityMap}>
					<ComponentA />
					<ComponentB />
				</BindxProvider>,
			)

			await waitFor(() => {
				expect(queryByTestId(container, 'a-dirty')).not.toBeNull()
				expect(queryByTestId(container, 'b-dirty')).not.toBeNull()
			})

			// Initially both should be clean
			expect(getByTestId(container, 'a-dirty').textContent).toBe('clean')
			expect(getByTestId(container, 'b-dirty').textContent).toBe('clean')
			expect(getByTestId(container, 'a-field-dirty').textContent).toBe('clean')
			expect(getByTestId(container, 'b-field-dirty').textContent).toBe('clean')

			// Make a change
			act(() => {
				;(getByTestId(container, 'a-update') as HTMLButtonElement).click()
			})

			// Both should show dirty
			expect(getByTestId(container, 'a-dirty').textContent).toBe('dirty')
			expect(getByTestId(container, 'b-dirty').textContent).toBe('dirty')
			expect(getByTestId(container, 'a-field-dirty').textContent).toBe('dirty')
			expect(getByTestId(container, 'b-field-dirty').textContent).toBe('dirty')
		})
	})

	describe('cache option', () => {
		test('with cache: true, should use cached data from IdentityMap', async () => {
			const adapter = new MockAdapter(createMockData(), { delay: 50 })
			const identityMap = new IdentityMap()

			// Pre-populate the IdentityMap
			identityMap.getOrCreate('Author', 'author-1', {
				id: 'author-1',
				name: 'Cached Name',
				email: 'cached@example.com',
			})

			function TestComponent() {
				const author = useEntity('Author', { id: 'author-1', cache: true }, e => ({
					name: e.name,
				}))

				if (author.isLoading) {
					return <div data-testid="loading">Loading...</div>
				}

				return <span data-testid="name">{author.fields.name.value}</span>
			}

			const { container } = render(
				<BindxProvider adapter={adapter} identityMap={identityMap}>
					<TestComponent />
				</BindxProvider>,
			)

			// Should immediately show cached data without loading state
			await waitFor(() => {
				expect(queryByTestId(container, 'name')).not.toBeNull()
			})

			// Should show cached name, not the one from mock data
			expect(getByTestId(container, 'name').textContent).toBe('Cached Name')
		})
	})

	describe('list items synchronization', () => {
		test('two components accessing same list items should stay in sync', async () => {
			const adapter = new MockAdapter(createMockData(), { delay: 0 })
			const identityMap = new IdentityMap()

			function ArticleTagsComponentA() {
				const article = useEntity('Article', { id: 'article-1' }, e => ({
					tags: e.tags.map(t => ({
						id: t.id,
						name: t.name,
					})),
				}))

				if (article.isLoading) return <div>Loading...</div>

				return (
					<div data-testid="tags-a">
						{article.fields.tags.items.map(item => (
							<span key={item.key} data-testid={`tag-a-${item.key}`}>
								{item.fields.name.value}
							</span>
						))}
						<button
							data-testid="update-first-tag"
							onClick={() => {
								const firstTag = article.fields.tags.items[0]
								if (firstTag) {
									firstTag.fields.name.setValue('Updated Tag')
								}
							}}
						>
							Update First Tag
						</button>
					</div>
				)
			}

			function ArticleTagsComponentB() {
				const article = useEntity('Article', { id: 'article-1' }, e => ({
					tags: e.tags.map(t => ({
						id: t.id,
						name: t.name,
					})),
				}))

				if (article.isLoading) return <div>Loading...</div>

				return (
					<div data-testid="tags-b">
						{article.fields.tags.items.map(item => (
							<span key={item.key} data-testid={`tag-b-${item.key}`}>
								{item.fields.name.value}
							</span>
						))}
					</div>
				)
			}

			const { container } = render(
				<BindxProvider adapter={adapter} identityMap={identityMap}>
					<ArticleTagsComponentA />
					<ArticleTagsComponentB />
				</BindxProvider>,
			)

			await waitFor(() => {
				expect(queryByTestId(container, 'tag-a-tag-1')).not.toBeNull()
				expect(queryByTestId(container, 'tag-b-tag-1')).not.toBeNull()
			})

			// Both should show initial value
			expect(getByTestId(container, 'tag-a-tag-1').textContent).toBe('JavaScript')
			expect(getByTestId(container, 'tag-b-tag-1').textContent).toBe('JavaScript')

			// Update via component A
			act(() => {
				;(getByTestId(container, 'update-first-tag') as HTMLButtonElement).click()
			})

			// Both components should show updated value
			expect(getByTestId(container, 'tag-a-tag-1').textContent).toBe('Updated Tag')
			expect(getByTestId(container, 'tag-b-tag-1').textContent).toBe('Updated Tag')
		})
	})
})
