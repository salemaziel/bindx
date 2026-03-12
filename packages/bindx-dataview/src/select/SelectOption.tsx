/**
 * SelectOption — marks an option item with data-selected attribute.
 *
 * Slot-based: wraps its single child element, adding `data-selected`
 * when the current entity is selected.
 *
 * Usage:
 * ```tsx
 * <SelectOption>
 *   <button>Option label</button>
 * </SelectOption>
 * ```
 */

import { forwardRef, type ReactElement } from 'react'
import { Slot } from '@radix-ui/react-slot'
import { useSelectIsSelected } from './selectContext.js'
import { dataAttribute } from '../dataAttribute.js'

export interface SelectOptionProps {
	/** Entity accessor for this option (passed automatically by DataViewEachRow) */
	entity: { id: string }
	children: ReactElement
}

export const SelectOption = forwardRef<HTMLElement, SelectOptionProps>(
	({ entity, children, ...rest }, ref) => {
		const isSelected = useSelectIsSelected()
		return (
			<Slot
				ref={ref}
				data-selected={dataAttribute(isSelected({ id: entity.id } as Parameters<typeof isSelected>[0]))}
				{...rest}
			>
				{children}
			</Slot>
		)
	},
)
SelectOption.displayName = 'SelectOption'
