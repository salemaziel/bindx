import { cloneElement, isValidElement, type ReactNode } from 'react'

/**
 * Whether dev-mode data attributes are enabled.
 *
 * Controlled via `BINDX_DEV_ANNOTATIONS` env variable.
 * Bundlers (Vite, webpack) replace `import.meta.env` at build time,
 * so this entire module tree-shakes away in production builds.
 */
// @ts-ignore -- import.meta.env is provided by bundler
const DEV_ANNOTATIONS: boolean = typeof import.meta !== 'undefined' && import.meta.env?.VITE_BINDX_DEV_ANNOTATIONS === 'true'

/**
 * In dev mode, injects data attributes onto an existing React element via cloneElement.
 * If annotations are disabled or the node is not a valid element, returns as-is.
 */
export function annotateElement(
	element: ReactNode,
	attrs: Record<string, string>,
): ReactNode {
	if (!DEV_ANNOTATIONS || !isValidElement(element)) {
		return element
	}
	return cloneElement(element, attrs)
}

/**
 * Returns true if dev annotations are enabled.
 * Use for conditional wrapping (e.g., Field text render in span).
 */
export function isDevAnnotationsEnabled(): boolean {
	return DEV_ANNOTATIONS
}
