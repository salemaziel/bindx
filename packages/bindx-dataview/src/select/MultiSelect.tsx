/**
 * MultiSelect — headless multi-select component for has-many relations.
 *
 * Manages selection state for a has-many relation field and provides
 * context for descendant components (SelectDataView, SelectOption, etc.).
 *
 * Usage:
 * ```tsx
 * <MultiSelect relation={article.tags} options={schema.Tag}>
 *   <SelectDataView queryField={['name']}>
 *     {it => <SelectOption><SelectItemTrigger><Field field={it.name} /></SelectItemTrigger></SelectOption>}
 *   </SelectDataView>
 * </MultiSelect>
 * ```
 */

import { type ReactNode, useCallback, useMemo } from 'react'
import type { EntityAccessor, EntityDef, HasManyRef } from '@contember/bindx'
import {
	SelectCurrentEntitiesContext,
	SelectHandleSelectContext,
	SelectIsSelectedContext,
	SelectOptionsContext,
	type SelectAction,
	type SelectEvents,
	type SelectHandler,
} from './selectContext.js'

export interface MultiSelectProps extends SelectEvents {
	/** Has-many relation ref from parent entity */
	relation: HasManyRef<object>
	/** Entity definition for the options list */
	options: EntityDef
	children: ReactNode
}

export function MultiSelect({
	relation,
	options,
	children,
	onSelect,
	onUnselect,
}: MultiSelectProps): ReactNode {
	const items = relation.items
	const selectedIds = useMemo(
		() => new Set(items.map(it => it.id)),
		[items],
	)

	const entitiesArr = useMemo(
		(): readonly EntityAccessor<object>[] => items as EntityAccessor<object>[],
		[items],
	)

	const handleSelect = useCallback<SelectHandler>(
		(entity: EntityAccessor<object>, action: SelectAction = 'toggle') => {
			const isCurrentlySelected = selectedIds.has(entity.id)
			if (action === 'toggle') {
				action = isCurrentlySelected ? 'unselect' : 'select'
			}
			if (action === 'unselect' && isCurrentlySelected) {
				relation.disconnect(entity.id)
				onUnselect?.(entity)
			} else if (action === 'select' && !isCurrentlySelected) {
				relation.connect(entity.id)
				onSelect?.(entity)
			}
		},
		[relation, selectedIds, onSelect, onUnselect],
	)

	const isSelected = useCallback(
		(entity: EntityAccessor<object>): boolean => selectedIds.has(entity.id),
		[selectedIds],
	)

	return (
		<SelectCurrentEntitiesContext.Provider value={entitiesArr}>
			<SelectIsSelectedContext.Provider value={isSelected}>
				<SelectHandleSelectContext.Provider value={handleSelect}>
					<SelectOptionsContext.Provider value={options}>
						{children}
					</SelectOptionsContext.Provider>
				</SelectHandleSelectContext.Provider>
			</SelectIsSelectedContext.Provider>
		</SelectCurrentEntitiesContext.Provider>
	)
}
