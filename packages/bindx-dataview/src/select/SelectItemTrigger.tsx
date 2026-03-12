/**
 * SelectItemTrigger — clickable handler for option items.
 *
 * Slot-based: wraps its single child element, adding an onClick handler
 * that calls the select handler with the specified action.
 *
 * Usage:
 * ```tsx
 * <SelectItemTrigger action="toggle">
 *   <button><Field field={it.name} /></button>
 * </SelectItemTrigger>
 * ```
 */

import React, { forwardRef, type ReactElement, useCallback } from 'react'
import { Slot } from '@radix-ui/react-slot'
import { composeEventHandlers } from '@radix-ui/primitive'
import { useSelectHandleSelect, type SelectAction } from './selectContext.js'
import type { EntityAccessor } from '@contember/bindx'

export interface SelectItemTriggerProps {
	/** Entity accessor for this option */
	entity: EntityAccessor<object>
	/** Action to perform on click. Default: 'toggle' */
	action?: SelectAction
	children: ReactElement
}

export const SelectItemTrigger = forwardRef<HTMLElement, SelectItemTriggerProps>(
	({ entity, action = 'toggle', ...props }, ref) => {
		const handleSelect = useSelectHandleSelect()

		const handleClick = useCallback(
			(): void => {
				handleSelect(entity, action)
			},
			[entity, action, handleSelect],
		)

		const { onClick, ...otherProps } = props as React.HTMLAttributes<HTMLElement> & { children: ReactElement }

		return (
			<Slot
				ref={ref}
				onClick={composeEventHandlers(onClick, handleClick)}
				{...otherProps}
			/>
		)
	},
)
SelectItemTrigger.displayName = 'SelectItemTrigger'
