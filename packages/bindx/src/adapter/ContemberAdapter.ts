import { GraphQlClient } from '@contember/graphql-client'
import { ContentClient, ContentQueryBuilder, ContentEntitySelection, SchemaNames } from '@contember/client-content'
import type { QuerySpec, QueryFieldSpec } from '../selection/buildQuery.js'
import type { BackendAdapter, FetchOptions } from './types.js'

/**
 * Options for ContemberAdapter
 */
export interface ContemberAdapterOptions {
	/** GraphQL client instance */
	client: GraphQlClient
	/** Contember schema names for query building */
	schema: SchemaNames
}

/**
 * Backend adapter for Contember Content API.
 * Uses @contember/client-content for type-safe GraphQL operations.
 */
export class ContemberAdapter implements BackendAdapter {	

	constructor(
		private readonly contentClient: ContentClient,
		private readonly queryBuilder: ContentQueryBuilder,
	) {
	}

	async fetchOne(
		entityType: string,
		id: string,
		query: QuerySpec,
		options?: FetchOptions,
	): Promise<Record<string, unknown>> {
		const selection = this.buildEntitySelection(entityType, query)
		const contentQuery = this.queryBuilder.get(entityType, { by: { id } }, selection)

		const result = await this.contentClient.query(contentQuery, {
			signal: options?.signal,
		})

		if (result === null) {
			throw new Error(`Entity '${entityType}:${id}' not found`)
		}

		return result as Record<string, unknown>
	}

	async fetchMany(
		entityType: string,
		query: QuerySpec,
		filter?: Record<string, unknown>,
		options?: FetchOptions,
	): Promise<Record<string, unknown>[]> {
		const selection = this.buildEntitySelection(entityType, query)
		const contentQuery = this.queryBuilder.list(
			entityType,
			{ filter: filter as any },
			selection,
		)

		const result = await this.contentClient.query(contentQuery, {
			signal: options?.signal,
		})

		return result as Record<string, unknown>[]
	}

	async persist(
		entityType: string,
		id: string,
		changes: Record<string, unknown>,
	): Promise<void> {
		const mutation = this.queryBuilder.update(entityType, {
			by: { id },
			data: changes as any,
		})

		const result = await this.contentClient.mutate(mutation)

		if (!result.ok) {
			throw new Error(result.errorMessage ?? `Failed to update ${entityType}:${id}`)
		}
	}

	async create(
		entityType: string,
		data: Record<string, unknown>,
	): Promise<Record<string, unknown>> {
		// Build selection to return created entity
		const selection = (s: ContentEntitySelection) => s.$('id')

		const mutation = this.queryBuilder.create(entityType, { data: data as any }, selection)
		const result = await this.contentClient.mutate(mutation)

		if (!result.ok) {
			throw new Error(result.errorMessage ?? `Failed to create ${entityType}`)
		}

		return result.node as Record<string, unknown>
	}

	async delete(entityType: string, id: string): Promise<void> {
		const mutation = this.queryBuilder.delete(entityType, { by: { id } })
		const result = await this.contentClient.mutate(mutation)

		if (!result.ok) {
			throw new Error(result.errorMessage ?? `Failed to delete ${entityType}:${id}`)
		}
	}

	/**
	 * Builds ContentEntitySelection from QuerySpec
	 */
	private buildEntitySelection(
		entityType: string,
		query: QuerySpec,
	): (selection: ContentEntitySelection) => ContentEntitySelection {
		return (selection: ContentEntitySelection) => {
			return this.applyFieldsToSelection(selection, query.fields)
		}
	}

	/**
	 * Recursively applies QueryFieldSpec[] to ContentEntitySelection
	 */
	private applyFieldsToSelection(
		selection: ContentEntitySelection,
		fields: QueryFieldSpec[],
	): ContentEntitySelection {
		let result = selection

		for (const field of fields) {
			const fieldName = field.sourcePath[0]
			if (!fieldName) continue

			if (field.nested) {
				// Relation field (has-one or has-many)
				const nestedCallback = (s: ContentEntitySelection) =>
					this.applyFieldsToSelection(s, field.nested!.fields)

				if (field.isArray) {
					// has-many relation with optional params
					const args: Record<string, unknown> = {}
					if (field.name !== fieldName) {
						args['as'] = field.name
					}
					if (field.filter) {
						args['filter'] = field.filter
					}
					if (field.orderBy) {
						args['orderBy'] = field.orderBy
					}
					if (field.limit !== undefined) {
						args['limit'] = field.limit
					}
					if (field.offset !== undefined) {
						args['offset'] = field.offset
					}

					result = result.$(fieldName, args as any, nestedCallback)
				} else {
					// has-one relation
					const args: Record<string, unknown> = {}
					if (field.name !== fieldName) {
						args['as'] = field.name
					}
					result = result.$(fieldName, args as any, nestedCallback)
				}
			} else {
				// Scalar field
				const args: Record<string, unknown> = {}
				if (field.name !== fieldName) {
					args['as'] = field.name
				}
				result = result.$(fieldName, Object.keys(args).length > 0 ? args : undefined)
			}
		}

		return result
	}
}
