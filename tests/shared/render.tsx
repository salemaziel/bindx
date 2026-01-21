/**
 * Shared render utilities for tests
 */
import React from 'react'
import { render, RenderOptions, RenderResult } from '@testing-library/react'
import { BindxProvider, MockAdapter } from '@contember/bindx-react'
import { testSchema } from './schema'
import { createMockData } from './mockData'

export interface RenderWithBindxOptions extends Omit<RenderOptions, 'wrapper'> {
	/** Mock data to use for the adapter. Defaults to createMockData() */
	mockData?: ReturnType<typeof createMockData>
	/** Adapter delay in ms. Defaults to 0 */
	delay?: number
	/** Pre-configured adapter (takes precedence over mockData/delay) */
	adapter?: MockAdapter
	/** Schema to use. Defaults to testSchema */
	schema?: typeof testSchema
}

export interface RenderWithBindxResult extends RenderResult {
	adapter: MockAdapter
}

/**
 * Renders a component wrapped with BindxProvider and MockAdapter
 *
 * @example
 * ```tsx
 * const { container, adapter } = renderWithBindx(<MyComponent />)
 * // Test assertions...
 * ```
 *
 * @example
 * ```tsx
 * // With custom mock data
 * const { container } = renderWithBindx(<MyComponent />, {
 *   mockData: {
 *     Article: { 'article-1': { id: 'article-1', title: 'Custom' } },
 *     Author: {},
 *     Location: {},
 *     Tag: {},
 *   },
 * })
 * ```
 */
export function renderWithBindx(
	ui: React.ReactElement,
	options: RenderWithBindxOptions = {},
): RenderWithBindxResult {
	const {
		mockData = createMockData(),
		delay = 0,
		adapter: providedAdapter,
		schema = testSchema,
		...renderOptions
	} = options

	const adapter = providedAdapter ?? new MockAdapter(mockData, { delay })

	const Wrapper = ({ children }: { children: React.ReactNode }) => (
		<BindxProvider adapter={adapter} schema={schema}>
			{children}
		</BindxProvider>
	)

	const result = render(ui, { wrapper: Wrapper, ...renderOptions })

	return {
		...result,
		adapter,
	}
}

/**
 * Creates a mock adapter with default or custom data
 *
 * @example
 * ```tsx
 * const adapter = createTestAdapter()
 * // or
 * const adapter = createTestAdapter(customMockData, { delay: 50 })
 * ```
 */
export function createTestAdapter(
	mockData: ReturnType<typeof createMockData> = createMockData(),
	options: { delay?: number } = {},
): MockAdapter {
	return new MockAdapter(mockData, { delay: options.delay ?? 0 })
}
