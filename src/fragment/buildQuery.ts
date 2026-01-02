import type { FragmentMeta, FieldMeta } from './types.js'

/**
 * Query specification for a single field
 */
export interface QueryFieldSpec {
	/** Name of the field as it appears in the output */
	name: string
	/** Path to the field in the source entity */
	sourcePath: string[]
	/** For nested objects/entities */
	nested?: QuerySpec
	/** Whether this is an array/collection */
	isArray?: boolean
}

/**
 * Query specification for fetching data.
 * Backend adapters use this to construct their queries.
 */
export interface QuerySpec {
	/** List of fields to fetch */
	fields: QueryFieldSpec[]
}

/**
 * Builds a QuerySpec from FragmentMeta.
 * This is what gets passed to the backend adapter.
 */
export function buildQuery(meta: FragmentMeta): QuerySpec {
	const fields: QueryFieldSpec[] = []

	for (const [name, fieldMeta] of meta.fields) {
		fields.push(buildFieldSpec(name, fieldMeta))
	}

	return { fields }
}

/**
 * Builds a QueryFieldSpec from FieldMeta
 */
function buildFieldSpec(name: string, meta: FieldMeta): QueryFieldSpec {
	const spec: QueryFieldSpec = {
		name,
		sourcePath: meta.path,
	}

	if (meta.isArray) {
		spec.isArray = true
		if (meta.arrayItemMeta) {
			spec.nested = buildQuery(meta.arrayItemMeta)
		}
	} else if (meta.nested) {
		spec.nested = buildQuery(meta.nested)
	}

	return spec
}

/**
 * Collects all unique paths that need to be fetched.
 * Useful for debugging and optimization.
 */
export function collectPaths(meta: FragmentMeta, basePath: string[] = []): string[][] {
	const paths: string[][] = []

	for (const [_name, fieldMeta] of meta.fields) {
		const fullPath = [...basePath, ...fieldMeta.path]

		if (fieldMeta.isArray && fieldMeta.arrayItemMeta) {
			// For arrays, collect paths from item metadata
			const itemPaths = collectPaths(fieldMeta.arrayItemMeta, fullPath)
			paths.push(...itemPaths)
		} else if (fieldMeta.nested) {
			// For nested objects, collect paths recursively
			const nestedPaths = collectPaths(fieldMeta.nested, fullPath)
			paths.push(...nestedPaths)
		} else {
			// Scalar field
			paths.push(fullPath)
		}
	}

	return paths
}
