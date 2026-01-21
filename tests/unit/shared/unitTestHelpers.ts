/**
 * Shared utilities for unit tests.
 * Provides helper functions for creating test fixtures without React dependencies.
 */

import { SnapshotStore, ActionDispatcher, EventEmitter } from '@contember/bindx'

/**
 * Creates a fresh SnapshotStore for testing.
 */
export function createTestStore(): SnapshotStore {
	return new SnapshotStore()
}

/**
 * Creates an ActionDispatcher with a fresh store for testing.
 */
export function createTestDispatcher(store?: SnapshotStore): {
	store: SnapshotStore
	dispatcher: ActionDispatcher
	eventEmitter: EventEmitter
} {
	const testStore = store ?? createTestStore()
	const eventEmitter = new EventEmitter()
	const dispatcher = new ActionDispatcher(testStore, eventEmitter)
	return { store: testStore, dispatcher, eventEmitter }
}

/**
 * Sets up a test entity with initial data.
 */
export function setupEntity(
	store: SnapshotStore,
	entityType: string,
	id: string,
	data: Record<string, unknown>,
	isServerData: boolean = true,
): void {
	store.setEntityData(entityType, id, { id, ...data }, isServerData)
}

/**
 * Creates a mock subscriber function for testing subscriptions.
 */
export function createMockSubscriber(): { fn: () => void; callCount: () => number; reset: () => void } {
	let count = 0
	return {
		fn: () => {
			count++
		},
		callCount: () => count,
		reset: () => {
			count = 0
		},
	}
}

/**
 * Test entity types for consistent testing.
 */
export interface TestArticle {
	id: string
	title: string
	content?: string
	publishedAt?: string | null
}

export interface TestAuthor {
	id: string
	name: string
	email?: string
}

export interface TestTag {
	id: string
	name: string
	color?: string
}

/**
 * Creates sample article data.
 */
export function createArticleData(overrides?: Partial<TestArticle>): TestArticle {
	return {
		id: 'article-1',
		title: 'Test Article',
		content: 'Test content',
		publishedAt: null,
		...overrides,
	}
}

/**
 * Creates sample author data.
 */
export function createAuthorData(overrides?: Partial<TestAuthor>): TestAuthor {
	return {
		id: 'author-1',
		name: 'Test Author',
		email: 'author@example.com',
		...overrides,
	}
}

/**
 * Creates sample tag data.
 */
export function createTagData(overrides?: Partial<TestTag>): TestTag {
	return {
		id: 'tag-1',
		name: 'Test Tag',
		color: 'blue',
		...overrides,
	}
}

/**
 * Waits for a condition to be true (useful for async tests).
 */
export async function waitFor(
	condition: () => boolean,
	timeout: number = 1000,
	interval: number = 10,
): Promise<void> {
	const startTime = Date.now()
	while (!condition()) {
		if (Date.now() - startTime > timeout) {
			throw new Error('waitFor timeout exceeded')
		}
		await new Promise((resolve) => setTimeout(resolve, interval))
	}
}

/**
 * Creates a deferred promise for controlling async flow in tests.
 */
export function createDeferred<T>(): {
	promise: Promise<T>
	resolve: (value: T) => void
	reject: (error: Error) => void
} {
	let resolve!: (value: T) => void
	let reject!: (error: Error) => void
	const promise = new Promise<T>((res, rej) => {
		resolve = res
		reject = rej
	})
	return { promise, resolve, reject }
}
