/**
 * Internal implementation exports.
 *
 * These exports are for advanced use cases only.
 * The public API should be preferred in most cases.
 *
 * @internal
 */

// Selection internals
export {
	SELECTION_META,
	createSelectionBuilder,
	getSelectionMeta,
	collectPaths,
} from './selection/index.js'

// Core internals
export { EntityLoader } from './core/index.js'
