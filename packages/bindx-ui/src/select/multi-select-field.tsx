/**
 * MultiSelectField — styled multi-select input for has-many relations.
 *
 * Renders selected entities as chips with remove buttons, and a popover
 * with searchable option list.
 *
 * Usage:
 * ```tsx
 * <Entity entity={schema.Article} by={{ id }}>
 *   {article => (
 *     <MultiSelectField
 *       relation={article.tags}
 *       options={schema.Tag}
 *       queryField={['name']}
 *     >
 *       {it => <Field field={it.name} />}
 *     </MultiSelectField>
 *   )}
 * </Entity>
 * ```
 */

import React, { type ReactNode } from 'react'
import type { EntityAccessor, EntityDef, HasManyRef, OrderDirection } from '@contember/bindx'
import type { FieldRefBase } from '@contember/bindx'
import { MultiSelect, SelectEachValue, SelectPlaceholder } from '@contember/bindx-dataview'
import { FormHasManyRelationScope } from '@contember/bindx-form'
import { Popover, PopoverTrigger } from '../ui/popover.js'
import { ChevronDownIcon } from 'lucide-react'
import { DefaultSelectDataView } from './list.js'
import {
	MultiSelectItemContentUI,
	MultiSelectItemRemoveButtonUI,
	MultiSelectItemUI,
	MultiSelectItemWrapperUI,
	SelectDefaultPlaceholderUI,
	SelectInputActionsUI,
	SelectInputUI,
	SelectInputWrapperUI,
	SelectPopoverContent,
} from './ui.js'

export interface MultiSelectFieldProps {
	/** Has-many relation ref */
	relation: HasManyRef<object>
	/** Entity definition for the options list */
	options: EntityDef
	/** Per-item render function */
	children: (it: EntityAccessor<object>) => ReactNode
	/** Placeholder when nothing is selected */
	placeholder?: ReactNode
	/** Field(s) to search across */
	queryField?: FieldRefBase<unknown> | FieldRefBase<unknown>[] | string[]
	/** Initial sort order */
	initialSorting?: Partial<Record<string, OrderDirection>>
	/** Static filter for the options list */
	filter?: Record<string, unknown>
	/** Whether this field is required */
	required?: boolean
}

export function MultiSelectField({
	relation,
	options,
	children,
	placeholder,
	queryField,
	initialSorting,
	filter,
	required,
}: MultiSelectFieldProps): ReactNode {
	return (
		<FormHasManyRelationScope relation={relation} required={required}>
			<MultiSelect
				relation={relation}
				options={options}
			>
				<div className="flex gap-1 items-center">
					<Popover>
						<SelectInputWrapperUI>
							<PopoverTrigger asChild>
								<SelectInputUI>
									<SelectPlaceholder>
										{placeholder ?? <SelectDefaultPlaceholderUI />}
									</SelectPlaceholder>
									<MultiSelectItemWrapperUI>
										<SelectEachValue>
											{(entity) => (
												<MultiSelectItemUI>
													<MultiSelectItemContentUI>
														{children(entity)}
													</MultiSelectItemContentUI>
													<MultiSelectItemRemoveButtonUI
														onClick={(e: React.MouseEvent) => {
															e.stopPropagation()
															relation.disconnect(entity.id)
														}}
													/>
												</MultiSelectItemUI>
											)}
										</SelectEachValue>
									</MultiSelectItemWrapperUI>
									<SelectInputActionsUI>
										<ChevronDownIcon className="w-4 h-4" />
									</SelectInputActionsUI>
								</SelectInputUI>
							</PopoverTrigger>
						</SelectInputWrapperUI>
						<SelectPopoverContent>
							<DefaultSelectDataView
								queryField={queryField}
								initialSorting={initialSorting}
								filter={filter}
							>
								{children}
							</DefaultSelectDataView>
						</SelectPopoverContent>
					</Popover>
				</div>
			</MultiSelect>
		</FormHasManyRelationScope>
	)
}
