import React, { memo, type ReactElement } from 'react'
import { useBindxContext } from '../../hooks/BackendAdapterContext.js'
import { useEntityCore } from '../../hooks/useEntityCore.js'
import { useSelectionCollection } from '../../hooks/useSelectionCollection.js'
import { createRuntimeAccessor } from '../proxy.js'
import type { EntityRef } from '../types.js'

/**
 * Props for Entity component
 */
export interface EntityProps<TSchema, K extends keyof TSchema> {
	/** Entity type name */
	name: K
	/** Entity ID to fetch */
	id: string
	/** Render function receiving typed entity accessor */
	children: (entity: EntityRef<TSchema[K]>) => React.ReactNode
	/** Loading fallback */
	loading?: React.ReactNode
	/** Error fallback */
	error?: (error: Error) => React.ReactNode
	/** Not found fallback */
	notFound?: React.ReactNode
}

/**
 * Entity component - orchestrates the two-pass rendering approach.
 *
 * Phase 1 (Collection): Renders children with collector proxy to determine which fields are needed
 * Phase 2 (Loading): Fetches data based on collected selection
 * Phase 3 (Runtime): Renders children with real data accessors
 *
 * @example
 * ```tsx
 * <Entity name="Author" id="author-1">
 *   {author => (
 *     <>
 *       <Field field={author.fields.name} />
 *       <HasMany field={author.fields.articles}>
 *         {article => <Field field={article.fields.title} />}
 *       </HasMany>
 *     </>
 *   )}
 * </Entity>
 * ```
 */
function EntityImpl<TSchema, K extends keyof TSchema>({
	name,
	id,
	children,
	loading,
	error: errorFallback,
	notFound,
}: EntityProps<TSchema, K>): ReactElement | null {
	const { store } = useBindxContext()
	const entityType = name as string

	// Phase 1: Collect JSX selection
	const { standardSelection, queryKey } = useSelectionCollection({
		entityType,
		entityId: id,
		children,
	})

	// Phase 2: Load data using core hook
	const result = useEntityCore({
		entityType,
		id,
		selectionMeta: standardSelection,
		queryKey,
	})

	// Render based on status
	if (result.status === 'loading') {
		return <>{loading ?? <DefaultLoading />}</>
	}

	if (result.status === 'error') {
		if (errorFallback) {
			return <>{errorFallback(result.error!)}</>
		}
		return <DefaultError error={result.error!} />
	}

	if (result.status === 'not_found') {
		return <>{notFound ?? <DefaultNotFound entityType={entityType} id={id} />}</>
	}

	// Phase 3: Runtime render with real data
	const accessor = createRuntimeAccessor<TSchema[K]>(
		entityType,
		id,
		store,
		() => {}, // Changes are automatically handled by useSyncExternalStore
	)

	return <>{children(accessor)}</>
}

// Note: Using type assertion for generic memo component
export const Entity = memo(EntityImpl) as unknown as typeof EntityImpl

/**
 * Default loading component
 */
function DefaultLoading(): ReactElement {
	return <div className="bindx-loading">Loading...</div>
}

/**
 * Default error component
 */
function DefaultError({ error }: { error: Error }): ReactElement {
	return (
		<div className="bindx-error">
			<strong>Error:</strong> {error.message}
		</div>
	)
}

/**
 * Default not found component
 */
function DefaultNotFound({ entityType, id }: { entityType: string; id: string }): ReactElement {
	return (
		<div className="bindx-not-found">
			{entityType} with id &quot;{id}&quot; not found
		</div>
	)
}
