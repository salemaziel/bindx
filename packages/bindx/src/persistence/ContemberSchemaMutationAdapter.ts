import type { SchemaNames } from '@contember/client-content'
import type { MutationSchemaProvider } from './MutationSchemaProvider.js'

/**
 * Adapter that wraps Contember SchemaNames to implement MutationSchemaProvider.
 * Translates Contember's schema format (column/one/many) to the unified format (scalar/hasOne/hasMany).
 */
export class ContemberSchemaMutationAdapter implements MutationSchemaProvider {
	constructor(private readonly schema: SchemaNames) {}

	getScalarFields(entityType: string): readonly string[] {
		const entitySchema = this.schema.entities[entityType]
		if (!entitySchema) return []

		return Object.entries(entitySchema.fields)
			.filter(([_, fieldDef]) => fieldDef.type === 'column')
			.map(([name]) => name)
	}

	getRelationFields(entityType: string): readonly string[] {
		const entitySchema = this.schema.entities[entityType]
		if (!entitySchema) return []

		return Object.entries(entitySchema.fields)
			.filter(([_, fieldDef]) => fieldDef.type === 'one' || fieldDef.type === 'many')
			.map(([name]) => name)
	}

	getRelationType(entityType: string, fieldName: string): 'hasOne' | 'hasMany' | undefined {
		const entitySchema = this.schema.entities[entityType]
		if (!entitySchema) return undefined

		const fieldDef = entitySchema.fields[fieldName]
		if (!fieldDef) return undefined

		if (fieldDef.type === 'one') return 'hasOne'
		if (fieldDef.type === 'many') return 'hasMany'
		return undefined
	}

	getRelationTarget(entityType: string, fieldName: string): string | undefined {
		const entitySchema = this.schema.entities[entityType]
		if (!entitySchema) return undefined

		const fieldDef = entitySchema.fields[fieldName]
		if (!fieldDef) return undefined

		if (fieldDef.type === 'one' || fieldDef.type === 'many') {
			return fieldDef.entity
		}
		return undefined
	}

	hasEntity(entityType: string): boolean {
		return entityType in this.schema.entities
	}
}
