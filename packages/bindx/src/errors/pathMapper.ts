/**
 * Types for Contember error paths and mutation results.
 */

/**
 * Contember path element - either a field name or an array index.
 */
export type PathElement =
	| { field: string }
	| { index: number; alias: string | null }

/**
 * Contember mutation error structure.
 */
export interface ContemberMutationError {
	readonly paths: PathElement[][]
	readonly message: string
	readonly type: string
}

/**
 * Contember validation error structure.
 */
export interface ContemberValidationError {
	readonly path: PathElement[]
	readonly message: { text: string }
}

/**
 * Processes a Contember mutation result and extracts errors.
 */
export interface ContemberMutationResult {
	readonly ok: boolean
	readonly errorMessage: string | null
	readonly errors: ContemberMutationError[]
	readonly validation: {
		readonly valid: boolean
		readonly errors: ContemberValidationError[]
	}
}
