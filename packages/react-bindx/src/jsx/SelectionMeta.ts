import type { SelectionMeta } from '@contember/bindx'

// Re-export from @contember/bindx
export { SelectionMetaCollector, mergeSelections, createEmptySelection } from '@contember/bindx'

/**
 * @deprecated Types are now unified - this is an identity function
 * Converts JsxSelectionMeta to SelectionMeta (now the same type).
 */
export function toSelectionMeta(meta: SelectionMeta): SelectionMeta {
	return meta
}

/**
 * @deprecated Types are now unified - this is an identity function
 * Converts SelectionMeta to JsxSelectionMeta (now the same type).
 */
export function fromSelectionMeta(meta: SelectionMeta): SelectionMeta {
	return meta
}
