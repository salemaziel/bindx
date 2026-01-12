/**
 * Error types for bindx error handling system.
 *
 * Supports both client-side validation errors and server-side errors
 * from Contember mutations.
 */

/**
 * Execution error types from Contember.
 * These represent database-level constraint violations.
 */
export type ExecutionErrorType =
	| 'NotNullConstraintViolation'
	| 'UniqueConstraintViolation'
	| 'ForeignKeyConstraintViolation'
	| 'NotFoundOrDenied'
	| 'NonUniqueWhereInput'
	| 'InvalidDataInput'
	| 'SqlError'

/**
 * Base interface for all bindx errors.
 */
export interface BindxError {
	/** Human-readable error message */
	readonly message: string
	/** Optional error code for programmatic handling (e.g., 'REQUIRED', 'UNIQUE_CONSTRAINT') */
	readonly code?: string
	/** If true, error won't auto-clear when field value changes */
	readonly sticky?: boolean
}

/**
 * Client-side error - added by user code for validation.
 */
export interface ClientError extends BindxError {
	readonly source: 'client'
}

/**
 * Server-side error - from Contember mutation response.
 */
export interface ServerError extends BindxError {
	readonly source: 'server'
	/** Contember execution error type for database errors */
	readonly type?: ExecutionErrorType
}

/**
 * Union type for all error sources.
 */
export type FieldError = ClientError | ServerError

/**
 * Error state stored in the SnapshotStore.
 */
export interface ErrorState {
	readonly errors: readonly FieldError[]
	readonly version: number
}

/**
 * Input type for addError - allows string shorthand or full error object.
 */
export type ErrorInput = string | Omit<ClientError, 'source'>

/**
 * Creates a ClientError from ErrorInput.
 */
export function createClientError(input: ErrorInput): ClientError {
	if (typeof input === 'string') {
		return { source: 'client', message: input }
	}
	return { ...input, source: 'client' }
}

/**
 * Creates a ServerError from Contember error data.
 */
export function createServerError(
	message: string,
	type?: ExecutionErrorType,
	code?: string,
): ServerError {
	return {
		source: 'server',
		message,
		type,
		code,
	}
}

/**
 * Checks if an error is a client error.
 */
export function isClientError(error: FieldError): error is ClientError {
	return error.source === 'client'
}

/**
 * Checks if an error is a server error.
 */
export function isServerError(error: FieldError): error is ServerError {
	return error.source === 'server'
}

/**
 * Filters errors by source.
 */
export function filterErrorsBySource(
	errors: readonly FieldError[],
	source: 'client' | 'server',
): FieldError[] {
	return errors.filter(e => e.source === source)
}

/**
 * Filters out non-sticky client errors.
 * Used when auto-clearing errors on value change.
 */
export function filterStickyErrors(errors: readonly FieldError[]): FieldError[] {
	return errors.filter(e => e.source === 'server' || e.sticky === true)
}
