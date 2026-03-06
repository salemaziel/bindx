import { createContext, useContext, type ReactNode } from 'react'
import type { EntityHandle } from '@contember/bindx'

const EntityScopeContext = createContext<EntityHandle | null>(null)

export interface EntityScopeProps {
	entity: EntityHandle
	children: ReactNode
}

/**
 * Provides an EntityHandle into React context for nested components.
 * Useful for scoping entity access in editors, repeaters, selects, etc.
 *
 * @example
 * ```tsx
 * <EntityScope entity={handle}>
 *   <MyComponent /> // can use useEntityScope() inside
 * </EntityScope>
 * ```
 */
export function EntityScope({ entity, children }: EntityScopeProps): ReactNode {
	return <EntityScopeContext.Provider value={entity}>{children}</EntityScopeContext.Provider>
}

/**
 * Reads the closest EntityHandle from EntityScope context.
 * Throws if used outside of an EntityScope.
 */
export function useEntityScope(): EntityHandle {
	const entity = useContext(EntityScopeContext)
	if (!entity) {
		throw new Error('useEntityScope must be used within an EntityScope')
	}
	return entity
}

/**
 * Reads the closest EntityHandle from EntityScope context, or null if not in scope.
 */
export function useOptionalEntityScope(): EntityHandle | null {
	return useContext(EntityScopeContext)
}
