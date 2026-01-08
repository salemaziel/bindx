import { useMemo, type ReactElement } from 'react'
import type { SchemaDefinition } from '@contember/bindx'
import { SchemaRegistry } from '@contember/bindx'
import { resolveSelectionMeta, type SelectionInput } from '@contember/bindx'
import { useEntityImpl, type UseEntityOptions, type EntityAccessorResult } from './useEntityImpl.js'
import { useEntityListImpl, type UseEntityListOptions, type EntityListAccessorResult } from './useEntityListImpl.js'
import { createComponentFactory, COMPONENT_MARKER, COMPONENT_SELECTIONS, type SelectionPropMeta } from '../jsx/createComponent.js'
import { Entity, type EntityProps } from '../jsx/components/Entity.js'
import { EntityList, type EntityListProps } from '../jsx/components/EntityList.js'

// Re-export symbols needed for declaration files
export { COMPONENT_MARKER, COMPONENT_SELECTIONS, type SelectionPropMeta } from '../jsx/createComponent.js'

// Re-export types for convenience
export type { EntityFields } from '@contember/bindx'
export type { UseEntityOptions, EntityAccessorResult, LoadingEntityAccessor, ErrorEntityAccessor, ReadyEntityAccessor } from './useEntityImpl.js'
export type { UseEntityListOptions, EntityListAccessorResult, LoadingEntityListAccessor, ErrorEntityListAccessor, ReadyEntityListAccessor } from './useEntityListImpl.js'

/**
 * Creates type-safe bindx hooks and components for a specific schema.
 *
 * @example
 * ```ts
 * const schema = defineSchema<{
 *   Article: Article
 *   Author: Author
 * }>({
 *   entities: {
 *     Article: {
 *       fields: {
 *         id: scalar(),
 *         title: scalar(),
 *         author: hasOne('Author')
 *       }
 *     },
 *     Author: {
 *       fields: {
 *         id: scalar(),
 *         name: scalar()
 *       }
 *     }
 *   }
 * })
 *
 * export const { useEntity, useEntityList, Entity, createComponent } = createBindx(schema)
 *
 * // Usage:
 * const article = useEntity('Article', { id }, e =>
 *   e.id().title().author(a => a.name())
 * )
 *
 * const AuthorCard = createComponent({
 *   author: ['Author', e => e.name().email()],
 * }, ({ author }) => <div>{author.data?.name}</div>)
 * ```
 */
export function createBindx<TModels extends { [K in keyof TModels]: object }>(
	schemaDefinition: SchemaDefinition<TModels>,
) {
	const schema = new SchemaRegistry(schemaDefinition)

	/**
	 * Hook to fetch and manage a single entity with full type inference.
	 */
	function useEntity<TEntityName extends keyof TModels & string, TResult extends object>(
		entityType: TEntityName,
		options: UseEntityOptions,
		definer: SelectionInput<TModels[TEntityName], TResult>,
	): EntityAccessorResult<TModels[TEntityName], TResult> {
		// Resolve selection metadata
		const selectionMeta = useMemo(
			() => resolveSelectionMeta(definer),
			// eslint-disable-next-line react-hooks/exhaustive-deps
			[entityType], // Only recreate if entity type changes
		)

		return useEntityImpl<TModels[TEntityName], TResult>(
			entityType,
			options,
			selectionMeta,
			schema as SchemaRegistry<Record<string, object>>,
		)
	}

	/**
	 * Hook to fetch and manage a list of entities with full type inference.
	 */
	function useEntityList<TEntityName extends keyof TModels & string, TResult extends object>(
		entityType: TEntityName,
		options: UseEntityListOptions,
		definer: SelectionInput<TModels[TEntityName], TResult>,
	): EntityListAccessorResult<TResult> {
		// Resolve selection metadata
		const selectionMeta = useMemo(
			() => resolveSelectionMeta(definer),
			// eslint-disable-next-line react-hooks/exhaustive-deps
			[entityType],
		)

		return useEntityListImpl<TResult>(
			entityType,
			options,
			selectionMeta,
			schema as SchemaRegistry<Record<string, object>>,
		)
	}

	// Create typed Entity component interface
	type TypedEntityComponent = <K extends keyof TModels & string>(
		props: EntityProps<TModels, K>
	) => ReactElement | null
	const TypedEntity = Entity as TypedEntityComponent

	// Create typed EntityList component interface
	type TypedEntityListComponent = <K extends keyof TModels & string>(
		props: EntityListProps<TModels, K>
	) => ReactElement | null
	const TypedEntityList = EntityList as TypedEntityListComponent

	// Create schema-aware createComponent
	const createComponent = createComponentFactory<TModels>()

	return {
		useEntity,
		useEntityList,
		Entity: TypedEntity,
		EntityList: TypedEntityList,
		createComponent,
		schema,
	}
}
