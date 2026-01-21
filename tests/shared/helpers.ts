/**
 * Shared DOM query helpers for tests
 */

/**
 * Query an element by data-testid attribute. Throws if not found.
 */
export function getByTestId(container: Element, testId: string): Element {
	const el = container.querySelector(`[data-testid="${testId}"]`)
	if (!el) throw new Error(`Element with data-testid="${testId}" not found`)
	return el
}

/**
 * Query an element by data-testid attribute. Returns null if not found.
 */
export function queryByTestId(container: Element, testId: string): Element | null {
	return container.querySelector(`[data-testid="${testId}"]`)
}

/**
 * Query all elements by data-testid attribute.
 */
export function getAllByTestId(container: Element, testId: string): Element[] {
	return Array.from(container.querySelectorAll(`[data-testid="${testId}"]`))
}

/**
 * Helper to create client-side errors for testing
 */
export function createClientError(message: string, code?: string): { source: 'client'; message: string; code?: string } {
	return { source: 'client', message, code }
}
