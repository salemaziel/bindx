/**
 * SelectPlaceholder — renders children only when no entities are selected.
 *
 * Usage:
 * ```tsx
 * <SelectPlaceholder>
 *   <span>Select an option...</span>
 * </SelectPlaceholder>
 * ```
 */

import type { ReactNode } from 'react'
import { useSelectCurrentEntities } from './selectContext.js'

export interface SelectPlaceholderProps {
	children: ReactNode
}

export function SelectPlaceholder({ children }: SelectPlaceholderProps): ReactNode {
	const entities = useSelectCurrentEntities()
	return entities.length > 0 ? null : <>{children}</>
}
