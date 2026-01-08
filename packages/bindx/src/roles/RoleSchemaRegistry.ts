/**
 * Runtime registry for role-based schemas.
 *
 * Manages multiple schema registries (one per role) and provides
 * utilities for role-aware field access and query building.
 */

import { SchemaRegistry } from '../schema/SchemaRegistry.js'
import type { SchemaDefinition } from '../schema/types.js'
import type { RoleSchemaDefinitions, RoleNames } from './types.js'

/**
 * Registry that manages multiple schemas, one for each role.
 *
 * @typeParam TRoleSchemas - Map of role names to their model types
 *
 * @example
 * ```typescript
 * interface RoleSchemas {
 *   public: { Article: PublicArticle; Author: PublicAuthor }
 *   editor: { Article: EditorArticle; Author: EditorAuthor }
 *   admin: { Article: AdminArticle; Author: AdminAuthor }
 * }
 *
 * const registry = new RoleSchemaRegistry<RoleSchemas>({
 *   public: publicSchemaDefinition,
 *   editor: editorSchemaDefinition,
 *   admin: adminSchemaDefinition,
 * })
 * ```
 */
export class RoleSchemaRegistry<TRoleSchemas extends { [K in keyof TRoleSchemas]: { [E: string]: object } }> {
	private readonly registries: Map<keyof TRoleSchemas, SchemaRegistry>
	private readonly roleNames: readonly (keyof TRoleSchemas)[]

	constructor(schemas: RoleSchemaDefinitions<TRoleSchemas>) {
		this.registries = new Map()
		this.roleNames = Object.keys(schemas) as (keyof TRoleSchemas)[]

		for (const [role, schemaDefinition] of Object.entries(schemas)) {
			const registry = new SchemaRegistry(schemaDefinition as SchemaDefinition<Record<string, object>>)
			this.registries.set(role as keyof TRoleSchemas, registry)
		}
	}

	/**
	 * Gets all registered role names.
	 */
	getRoleNames(): readonly (keyof TRoleSchemas)[] {
		return this.roleNames
	}

	/**
	 * Gets the SchemaRegistry for a specific role.
	 */
	getSchemaForRole<TRole extends keyof TRoleSchemas>(role: TRole): SchemaRegistry {
		const registry = this.registries.get(role)
		if (!registry) {
			throw new Error(`Unknown role: ${String(role)}`)
		}
		return registry
	}

	/**
	 * Checks if a role exists in the registry.
	 */
	hasRole(role: keyof TRoleSchemas): boolean {
		return this.registries.has(role)
	}

	/**
	 * Gets field names available for an entity across ALL specified roles (intersection).
	 *
	 * @param roles - Roles to check
	 * @param entityName - Entity to get fields for
	 * @returns Array of field names available in ALL specified roles
	 */
	getFieldsForRoles(roles: readonly (keyof TRoleSchemas)[], entityName: string): string[] {
		if (roles.length === 0) {
			return []
		}

		// Get fields for first role
		const firstRole = roles[0]!
		const firstRegistry = this.registries.get(firstRole)
		if (!firstRegistry) {
			return []
		}

		let fields = new Set(firstRegistry.getAllFields(entityName))

		// Intersect with fields from other roles
		for (let i = 1; i < roles.length; i++) {
			const role = roles[i]!
			const registry = this.registries.get(role)
			if (!registry) {
				return [] // Role doesn't exist
			}

			const roleFields = new Set(registry.getAllFields(entityName))
			fields = new Set([...fields].filter(f => roleFields.has(f)))
		}

		return [...fields]
	}

	/**
	 * Gets entity names available across ALL specified roles (intersection).
	 *
	 * @param roles - Roles to check
	 * @returns Array of entity names available in ALL specified roles
	 */
	getEntityNamesForRoles(roles: readonly (keyof TRoleSchemas)[]): string[] {
		if (roles.length === 0) {
			return []
		}

		// Get entities for first role
		const firstRole = roles[0]!
		const firstRegistry = this.registries.get(firstRole)
		if (!firstRegistry) {
			return []
		}

		let entities = new Set(firstRegistry.getEntityNames())

		// Intersect with entities from other roles
		for (let i = 1; i < roles.length; i++) {
			const role = roles[i]!
			const registry = this.registries.get(role)
			if (!registry) {
				return []
			}

			const roleEntities = new Set(registry.getEntityNames())
			entities = new Set([...entities].filter(e => roleEntities.has(e)))
		}

		return [...entities]
	}

	/**
	 * Checks if a field is accessible for all specified roles.
	 */
	isFieldAccessible(
		roles: readonly (keyof TRoleSchemas)[],
		entityName: string,
		fieldName: string,
	): boolean {
		for (const role of roles) {
			const registry = this.registries.get(role)
			if (!registry) {
				return false
			}

			const entityDef = registry.getEntityDef(entityName)
			if (!entityDef || !(fieldName in entityDef.fields)) {
				return false
			}
		}

		return true
	}

	/**
	 * Checks if an entity is accessible for all specified roles.
	 */
	isEntityAccessible(
		roles: readonly (keyof TRoleSchemas)[],
		entityName: string,
	): boolean {
		for (const role of roles) {
			const registry = this.registries.get(role)
			if (!registry || !registry.hasEntity(entityName)) {
				return false
			}
		}

		return true
	}

	/**
	 * Validates all registered schemas.
	 */
	validate(): void {
		for (const [role, registry] of this.registries) {
			try {
				registry.validate()
			} catch (error) {
				throw new Error(
					`Validation failed for role "${String(role)}": ${error instanceof Error ? error.message : String(error)}`,
				)
			}
		}
	}
}
