/**
 * Contember-specific utilities for bindx
 *
 * @packageDocumentation
 */

export { MutationCollector, type EntityMutationResult } from './MutationCollector.js'

// Re-export commonly used types from @contember/client-content
export type {
	SchemaNames,
	SchemaEntityNames,
	ContentClientInput,
} from '@contember/client-content'
