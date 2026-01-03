/**
 * Internal implementation exports.
 *
 * These exports are for advanced use cases only.
 * The public API should be preferred in most cases.
 *
 * @internal
 */

// Accessor implementations
export {
	FieldAccessorImpl,
	EntityAccessorImpl,
	EntityListAccessorImpl,
	HasOneAccessorImpl,
	PlaceholderEntityAccessorImpl,
	isPlaceholder,
} from './accessors/index.js'

// Store implementation
export { IdentityMap, getNestedValue, type EntityRecord } from './store/index.js'

// JSX internals
export {
	SelectionMetaCollector,
	mergeSelections,
	createEmptySelection,
	toSelectionMeta,
	fromSelectionMeta,
	createCollectorProxy,
	createRuntimeAccessor,
	analyzeJsx,
	collectSelection,
	convertToQuerySelection,
	debugSelection,
} from './jsx/index.js'

// Selection internals
export {
	SELECTION_META,
	createSelectionBuilder,
	getSelectionMeta,
	collectPaths,
} from './selection/index.js'

// Core internals
export { EntityLoader } from './core/index.js'
