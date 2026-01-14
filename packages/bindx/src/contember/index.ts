/**
 * Contember-specific utilities for bindx
 *
 * @packageDocumentation
 */

// Re-export unified MutationCollector from persistence
export { MutationCollector, type EntityMutationResult } from '../persistence/MutationCollector.js'
export { ContemberSchemaMutationAdapter } from '../persistence/ContemberSchemaMutationAdapter.js'
export type { MutationSchemaProvider } from '../persistence/MutationSchemaProvider.js'

// Re-export commonly used types from @contember/client-content
export type {
	SchemaNames,
	SchemaEntityNames,
	ContentClientInput,
} from '@contember/client-content'
