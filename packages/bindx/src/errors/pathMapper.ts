/**
 * Maps Contember error paths to field/relation names.
 *
 * Contember errors include a path array that indicates where the error occurred.
 * This module converts those paths to bindx field/relation names.
 */

import type { SchemaRegistry } from '../schema/SchemaRegistry.js'
import { createServerError, type ExecutionErrorType, type ServerError } from './types.js'

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
	readonly type: ExecutionErrorType
}

/**
 * Contember validation error structure.
 */
export interface ContemberValidationError {
	readonly path: PathElement[]
	readonly message: { text: string }
}

/**
 * Result of mapping an error to a field/relation.
 */
export interface MappedError {
	readonly type: 'field' | 'relation' | 'entity'
	readonly name?: string
	readonly error: ServerError
}

/**
 * Maps a Contember mutation error to field/relation targets.
 */
export function mapMutationError(
	error: ContemberMutationError,
	entityType: string,
	schema: SchemaRegistry,
): MappedError[] {
	const results: MappedError[] = []

	// Mutation errors can have multiple paths
	for (const path of error.paths) {
		const mapped = mapPath(path, entityType, schema, error.message, error.type)
		if (mapped) {
			results.push(mapped)
		}
	}

	// If no paths could be mapped, create an entity-level error
	if (results.length === 0) {
		results.push({
			type: 'entity',
			error: createServerError(error.message, error.type, getErrorCode(error.type)),
		})
	}

	return results
}

/**
 * Maps a Contember validation error to a field/relation target.
 */
export function mapValidationError(
	error: ContemberValidationError,
	entityType: string,
	schema: SchemaRegistry,
): MappedError {
	const mapped = mapPath(error.path, entityType, schema, error.message.text)

	if (mapped) {
		return mapped
	}

	// If path couldn't be mapped, create an entity-level error
	return {
		type: 'entity',
		error: createServerError(error.message.text, undefined, 'VALIDATION_ERROR'),
	}
}

/**
 * Maps a path array to a field/relation name.
 */
function mapPath(
	path: PathElement[],
	entityType: string,
	schema: SchemaRegistry,
	message: string,
	errorType?: ExecutionErrorType,
): MappedError | null {
	if (path.length === 0) {
		return null
	}

	// Get the first path element - this is the field/relation on the root entity
	const firstElement = path[0]
	if (!firstElement || !('field' in firstElement)) {
		return null
	}

	const fieldName = firstElement.field

	// Determine if this is a field or a relation
	const fieldDef = schema.getFieldDef(entityType, fieldName)
	if (!fieldDef) {
		// Unknown field - return as field error anyway
		return {
			type: 'field',
			name: fieldName,
			error: createServerError(message, errorType, getErrorCode(errorType)),
		}
	}

	if (fieldDef.type === 'scalar') {
		return {
			type: 'field',
			name: fieldName,
			error: createServerError(message, errorType, getErrorCode(errorType)),
		}
	}

	// It's a relation (hasOne or hasMany)
	return {
		type: 'relation',
		name: fieldName,
		error: createServerError(message, errorType, getErrorCode(errorType)),
	}
}

/**
 * Converts Contember ExecutionErrorType to a user-friendly error code.
 */
function getErrorCode(errorType?: ExecutionErrorType): string | undefined {
	if (!errorType) return undefined

	switch (errorType) {
		case 'UniqueConstraintViolation':
			return 'UNIQUE_CONSTRAINT'
		case 'NotNullConstraintViolation':
			return 'NOT_NULL'
		case 'ForeignKeyConstraintViolation':
			return 'FOREIGN_KEY'
		case 'NotFoundOrDenied':
			return 'NOT_FOUND'
		case 'NonUniqueWhereInput':
			return 'NON_UNIQUE_WHERE'
		case 'InvalidDataInput':
			return 'INVALID_DATA'
		case 'SqlError':
			return 'SQL_ERROR'
		default:
			return undefined
	}
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

/**
 * Extracts all mapped errors from a Contember mutation result.
 */
export function extractMappedErrors(
	result: ContemberMutationResult,
	entityType: string,
	schema: SchemaRegistry,
): MappedError[] {
	const mappedErrors: MappedError[] = []

	// Process mutation errors
	for (const error of result.errors) {
		const mapped = mapMutationError(error, entityType, schema)
		mappedErrors.push(...mapped)
	}

	// Process validation errors
	for (const error of result.validation.errors) {
		const mapped = mapValidationError(error, entityType, schema)
		mappedErrors.push(mapped)
	}

	return mappedErrors
}
