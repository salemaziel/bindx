/**
 * SelectField — styled single-select input for has-one relations.
 *
 * Renders a button that opens a popover with searchable option list.
 * Selected entity is displayed in the input, with clear/disconnect button.
 *
 * Usage:
 * ```tsx
 * <Entity entity={schema.Article} by={{ id }}>
 *   {article => (
 *     <SelectField
 *       relation={article.category}
 *       options={schema.Category}
 *       queryField={['name']}
 *     >
 *       {it => <Field field={it.name} />}
 *     </SelectField>
 *   )}
 * </Entity>
 * ```
 */

import React, { type ReactNode, useState } from 'react'
import type { EntityAccessor, EntityDef, HasOneRef, OrderDirection } from '@contember/bindx'
import { isPlaceholderId } from '@contember/bindx'
import type { FieldRefBase } from '@contember/bindx'
import { Select, SelectEachValue, SelectPlaceholder } from '@contember/bindx-dataview'
import { FormHasOneRelationScope } from '@contember/bindx-form'
import { Popover, PopoverTrigger } from '../ui/popover.js'
import { Button } from '../ui/button.js'
import { ChevronDownIcon, XIcon } from 'lucide-react'
import { DefaultSelectDataView } from './list.js'
import {
	SelectDefaultPlaceholderUI,
	SelectInputActionsUI,
	SelectInputUI,
	SelectInputWrapperUI,
	SelectPopoverContent,
} from './ui.js'

export interface SelectFieldProps {
	/** Has-one relation ref */
	relation: HasOneRef<object>
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

export function SelectField({
	relation,
	options,
	children,
	placeholder,
	queryField,
	initialSorting,
	filter,
	required,
}: SelectFieldProps): ReactNode {
	const [open, setOpen] = useState(false)

	return (
		<FormHasOneRelationScope relation={relation} required={required}>
			<Select
				relation={relation}
				options={options}
				onSelect={() => setOpen(false)}
			>
				<div className="flex gap-1 items-center">
					<Popover open={open} onOpenChange={setOpen}>
						<SelectInputWrapperUI>
							<PopoverTrigger asChild>
								<SelectInputUI>
									<SelectPlaceholder>
										{placeholder ?? <SelectDefaultPlaceholderUI />}
									</SelectPlaceholder>
									<SelectEachValue>
										{entity => children(entity)}
									</SelectEachValue>
									<SelectInputActionsUI>
										{!isPlaceholderId(relation.$entity.id) && (
											<Button
												size="xs"
												variant="ghost"
												onClick={(e: React.MouseEvent) => {
													e.stopPropagation()
													relation.$disconnect()
												}}
											>
												<XIcon className="w-4 h-4" />
											</Button>
										)}
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
			</Select>
		</FormHasOneRelationScope>
	)
}
