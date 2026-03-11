/**
 * DefaultDataGrid — top-level component that wraps DataGrid with a pre-configured layout.
 *
 * Renders toolbar, table (auto from columns), optional named layouts, pagination, and empty state.
 * The user provides column markers (and optional toolbar/layout markers) via a children render function:
 *
 * ```tsx
 * <DefaultDataGrid entity={schema.Article} itemsPerPage={5}>
 *   {it => (
 *     <>
 *       <DataGridTextColumn field={it.title} header="Title" sortable filter />
 *       <DataGridDateColumn field={it.publishedAt} header="Published" sortable filter />
 *     </>
 *   )}
 * </DefaultDataGrid>
 * ```
 *
 * With named layouts:
 * ```tsx
 * <DefaultDataGrid entity={schema.Article}>
 *   {it => (
 *     <>
 *       <DataGridTextColumn field={it.title} header="Title" />
 *       <DataGridLayout name="grid" label="Grid" item={it}>
 *         {(item: typeof it) => (
 *           <div><Field field={item.title} /></div>
 *         )}
 *       </DataGridLayout>
 *       <DataGridToolbarContent>
 *         <DataGridTextFilter field={it.title} label="Title" />
 *       </DataGridToolbarContent>
 *     </>
 *   )}
 * </DefaultDataGrid>
 * ```
 */
import React, { type ReactElement, type ReactNode } from 'react'
import type { EntityAccessor } from '@contember/bindx'
import {
	DataGrid,
	type DataGridProps,
	DataViewLayout,
	DataViewEachRow,
	DataViewEmpty,
	DataViewNonEmpty,
	useDataViewContext,
} from '@contember/bindx-dataview'
import { DataGridToolbarUI } from './toolbar.js'
import { DataGridLoader } from './loader.js'
import { DataGridPaginationUI } from './pagination.js'
import { DataGridContainer } from './table.js'
import { DataGridAutoTable } from './auto-table.js'
import { DataGridNoResults } from './empty.js'

export type DefaultDataGridProps<TEntity extends object = object> =
	& Omit<DataGridProps<TEntity>, 'children'>
	& {
		/** Children render function: receives entity proxy `it`, returns column/toolbar/layout markers */
		children: (it: EntityAccessor<TEntity>) => ReactNode
		stickyToolbar?: boolean
		stickyPagination?: boolean
	}

export function DefaultDataGrid<TEntity extends object>({
	children,
	stickyToolbar,
	stickyPagination,
	...dataGridProps
}: DefaultDataGridProps<TEntity>): ReactElement {
	return (
		<DataGrid {...dataGridProps}>
			{it => (
				<>
					{children(it)}
					<DefaultDataGridLayout
						stickyToolbar={stickyToolbar}
						stickyPagination={stickyPagination}
					/>
				</>
			)}
		</DataGrid>
	)
}

interface DefaultDataGridLayoutProps {
	stickyToolbar?: boolean
	stickyPagination?: boolean
}

function DefaultDataGridLayout({
	stickyToolbar,
	stickyPagination,
}: DefaultDataGridLayoutProps): ReactElement {
	const { toolbarContent, layoutRenders } = useDataViewContext()

	return (
		<DataGridContainer>
			{toolbarContent && (
				<DataGridToolbarUI sticky={stickyToolbar}>
					{toolbarContent}
				</DataGridToolbarUI>
			)}

			<DataGridLoader>
				<DataViewEmpty>
					<DataGridNoResults />
				</DataViewEmpty>

				<DataViewNonEmpty>
					{layoutRenders.size > 0 ? (
						<>
							<DataViewLayout name="table">
								<DataGridAutoTable />
							</DataViewLayout>

							{Array.from(layoutRenders.entries()).map(([name, render]) => (
								<DataViewLayout key={name} name={name}>
									<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
										<DataViewEachRow>
											{render}
										</DataViewEachRow>
									</div>
								</DataViewLayout>
							))}
						</>
					) : (
						<DataGridAutoTable />
					)}
				</DataViewNonEmpty>
			</DataGridLoader>

			<DataGridPaginationUI sticky={stickyPagination} />
		</DataGridContainer>
	)
}
