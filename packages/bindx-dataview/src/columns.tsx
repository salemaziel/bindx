/**
 * DataGrid column components.
 *
 * These are "metadata" components — they are not rendered directly.
 * Instead, they carry `staticRender` methods that produce `ColumnLeaf`
 * elements, which the DataGrid extracts for column metadata.
 *
 * Scalar columns are built via `createColumn()` + column type defs.
 * Relation/action/generic columns use manual `staticRender`.
 */

import React from 'react'
import type { FieldRefBase, HasOneRef, HasManyRef, FilterHandler, FilterArtifact, EntityAccessor, EnumFilterArtifact, EnumListFilterArtifact } from '@contember/bindx'
import { FIELD_REF_META } from '@contember/bindx-react'
import { createColumn, type ColumnRenderProps } from './createColumn.js'
import {
	textColumnDef,
	numberColumnDef,
	dateColumnDef,
	dateTimeColumnDef,
	booleanColumnDef,
	enumColumnDef,
	enumListColumnDef,
	uuidColumnDef,
	isDefinedColumnDef,
} from './columnTypes.js'
import { ColumnLeaf, type ColumnLeafProps } from './columnLeaf.js'

// ============================================================================
// Re-export ColumnLeafProps as ColumnMeta for compatibility
// ============================================================================

export type ColumnMeta = ColumnLeafProps

// ============================================================================
// Extraction Helpers
// ============================================================================

/**
 * Extract field name from a field ref (works in both collector and runtime proxies)
 */
export function extractFieldName(ref: unknown): string | null {
	if (ref && typeof ref === 'object' && FIELD_REF_META in ref) {
		const meta = (ref as Record<symbol, { fieldName: string }>)[FIELD_REF_META]
		return meta?.fieldName ?? null
	}
	return null
}

// ============================================================================
// Default Cell Renderers
// ============================================================================

function renderScalarDefault({ value }: ColumnRenderProps<unknown>): React.ReactNode {
	return value != null ? String(value) : ''
}

function renderBooleanDefault({ value }: ColumnRenderProps<boolean | null>): React.ReactNode {
	return value != null ? String(value) : ''
}

function renderIsDefinedDefault({ value }: ColumnRenderProps<unknown>): React.ReactNode {
	return value != null ? '✓' : '✗'
}

function renderDateTimeDefault({ value }: ColumnRenderProps<string | null>): React.ReactNode {
	if (typeof value !== 'string') return ''
	const date = new Date(value)
	if (isNaN(date.getTime())) return value
	return date.toLocaleString()
}

function renderEnumListDefault({ value }: ColumnRenderProps<readonly string[] | null>): React.ReactNode {
	if (!Array.isArray(value)) return ''
	return value.join(', ')
}

// ============================================================================
// Scalar Column Props
// ============================================================================

interface DataGridScalarColumnPropsBase<T> {
	field: FieldRefBase<T>
	header?: React.ReactNode
	sortable?: boolean
	filter?: boolean
	children?: (value: T | null) => React.ReactNode
}

export interface DataGridTextColumnProps<T> extends DataGridScalarColumnPropsBase<T> {}
export interface DataGridNumberColumnProps<T> extends DataGridScalarColumnPropsBase<T> {}
export interface DataGridDateColumnProps<T> extends DataGridScalarColumnPropsBase<T> {}
export interface DataGridDateTimeColumnProps<T> extends DataGridScalarColumnPropsBase<T> {}
export interface DataGridBooleanColumnProps<T> extends DataGridScalarColumnPropsBase<T> {}
export interface DataGridUuidColumnProps<T> extends DataGridScalarColumnPropsBase<T> {}
export interface DataGridIsDefinedColumnProps<T> extends DataGridScalarColumnPropsBase<T> {}

interface EnumExtraProps {
	options: readonly string[]
}

export interface DataGridEnumColumnProps<T> extends DataGridScalarColumnPropsBase<T>, EnumExtraProps {}

export interface DataGridEnumListColumnProps<T> extends DataGridScalarColumnPropsBase<T>, EnumExtraProps {}

// ============================================================================
// Scalar Columns via createColumn()
//
// createColumn handles `children` (custom cell renderer) and `options` (enum)
// natively — no monkey-patching needed.
// ============================================================================

export const DataGridTextColumn = createColumn(textColumnDef, {
	renderCell: renderScalarDefault,
})

export const DataGridNumberColumn = createColumn(numberColumnDef, {
	renderCell: renderScalarDefault,
})

export const DataGridDateColumn = createColumn(dateColumnDef, {
	renderCell: renderScalarDefault,
})

export const DataGridDateTimeColumn = createColumn(dateTimeColumnDef, {
	renderCell: renderDateTimeDefault,
})

export const DataGridBooleanColumn = createColumn(booleanColumnDef, {
	renderCell: renderBooleanDefault,
})

export const DataGridEnumColumn = createColumn<string | null, EnumFilterArtifact, EnumExtraProps>(enumColumnDef, {
	renderCell: renderScalarDefault,
})

export const DataGridEnumListColumn = createColumn<readonly string[] | null, EnumListFilterArtifact, EnumExtraProps>(enumListColumnDef, {
	renderCell: renderEnumListDefault,
})

export const DataGridUuidColumn = createColumn(uuidColumnDef, {
	renderCell: renderScalarDefault,
})

export const DataGridIsDefinedColumn = createColumn(isDefinedColumnDef, {
	renderCell: renderIsDefinedDefault,
})

// ============================================================================
// Relation Column Props & Components
// ============================================================================

export interface DataGridHasOneColumnProps<TEntity, TSelected> {
	field: HasOneRef<TEntity, TSelected>
	header?: React.ReactNode
	children: (entity: EntityAccessor<TEntity, TSelected>) => React.ReactNode
}

export const DataGridHasOneColumn = Object.assign(
	function DataGridHasOneColumn<TEntity, TSelected>(
		_props: DataGridHasOneColumnProps<TEntity, TSelected>,
	): null {
		return null
	},
	{
		staticRender: (props: Record<string, unknown>): React.ReactNode => {
			const fieldRef = props['field'] as FieldRefBase<unknown> | undefined
			const fieldName = fieldRef ? extractFieldName(fieldRef) : null
			const renderer = props['children'] as ((ref: unknown) => React.ReactNode) | undefined
			const header = props['header'] as React.ReactNode | undefined

			const leafProps: ColumnLeafProps = {
				name: fieldName ?? `col-${Math.random().toString(36).slice(2, 8)}`,
				fieldName,
				fieldRef: fieldRef ?? null,
				sortingField: null,
				filterName: null,
				filterHandler: undefined,
				isTextSearchable: false,
				columnType: 'hasOne',
				header,
				collectSelection: () => {
					if (renderer && fieldRef) {
						renderer(fieldRef)
					}
				},
				renderCell: (accessor: EntityAccessor<object>) => {
					if (!fieldName) return null
					const ref = (accessor as unknown as Record<string, unknown>)[fieldName]
					if (!renderer) return null
					const result = renderer(ref)
					if (result && typeof result === 'object' && 'value' in result) {
						return (result as { value: unknown }).value != null
							? String((result as { value: unknown }).value)
							: ''
					}
					return result
				},
			}

			return React.createElement(ColumnLeaf, leafProps as ColumnLeafProps)
		},
	},
)

// ============================================================================
// HasMany Column
// ============================================================================

export interface DataGridHasManyColumnProps<TEntity, TSelected> {
	field: HasManyRef<TEntity, TSelected>
	header?: React.ReactNode
	children: (entity: EntityAccessor<TEntity, TSelected>) => React.ReactNode
}

export const DataGridHasManyColumn = Object.assign(
	function DataGridHasManyColumn<TEntity, TSelected>(
		_props: DataGridHasManyColumnProps<TEntity, TSelected>,
	): null {
		return null
	},
	{
		staticRender: (props: Record<string, unknown>): React.ReactNode => {
			const fieldRef = props['field'] as FieldRefBase<unknown> | undefined
			const fieldName = fieldRef ? extractFieldName(fieldRef) : null
			const renderer = props['children'] as ((ref: unknown) => React.ReactNode) | undefined
			const header = props['header'] as React.ReactNode | undefined

			const leafProps: ColumnLeafProps = {
				name: fieldName ?? `col-${Math.random().toString(36).slice(2, 8)}`,
				fieldName,
				fieldRef: fieldRef ?? null,
				sortingField: null,
				filterName: null,
				filterHandler: undefined,
				isTextSearchable: false,
				columnType: 'hasMany',
				header,
				collectSelection: () => {
					if (renderer && fieldRef) {
						const mapFn = (fieldRef as { map?: (fn: (item: unknown, index: number) => unknown) => unknown[] }).map
						if (mapFn) {
							mapFn((item: unknown) => {
								renderer(item)
								return null
							})
						}
					}
				},
				renderCell: (accessor: EntityAccessor<object>) => {
					if (!fieldName) return null
					const ref = (accessor as unknown as Record<string, unknown>)[fieldName]
					const items = (ref as { items?: unknown[] })?.items
					if (!Array.isArray(items) || items.length === 0) return ''
					if (!renderer) return null

					return items.map((item, i) => {
						const result = renderer(item)
						if (result && typeof result === 'object' && 'value' in result) {
							const val = (result as { value: unknown }).value
							return <React.Fragment key={i}>{i > 0 ? ', ' : ''}{val != null ? String(val) : ''}</React.Fragment>
						}
						return <React.Fragment key={i}>{i > 0 ? ', ' : ''}{result}</React.Fragment>
					})
				},
			}

			return React.createElement(ColumnLeaf, leafProps as ColumnLeafProps)
		},
	},
)

// ============================================================================
// Action Column
// ============================================================================

export interface DataGridActionColumnProps {
	children: React.ReactNode | ((entity: EntityAccessor<object>) => React.ReactNode)
	header?: React.ReactNode
}

export const DataGridActionColumn = Object.assign(
	function DataGridActionColumn(_props: DataGridActionColumnProps): null {
		return null
	},
	{
		staticRender: (props: Record<string, unknown>): React.ReactNode => {
			const header = (props['header'] as React.ReactNode) ?? ''
			const children = props['children']
			const cellRenderer = typeof children === 'function'
				? children as (value: unknown) => React.ReactNode
				: () => children as React.ReactNode

			const leafProps: ColumnLeafProps = {
				name: `action-${Math.random().toString(36).slice(2, 8)}`,
				fieldName: null,
				fieldRef: null,
				sortingField: null,
				filterName: null,
				filterHandler: undefined,
				isTextSearchable: false,
				header,
				renderCell: (accessor: EntityAccessor<object>) => cellRenderer(accessor),
			}

			return React.createElement(ColumnLeaf, leafProps as ColumnLeafProps)
		},
	},
)

// ============================================================================
// Generic Column
// ============================================================================

export interface DataGridColumnProps<T> {
	field?: FieldRefBase<T>
	header?: React.ReactNode
	sortable?: boolean
	filter?: boolean
	filterHandler?: FilterHandler<FilterArtifact>
	children?: (value: T | null) => React.ReactNode
}

export const DataGridColumn = Object.assign(
	function DataGridColumn<T>(_props: DataGridColumnProps<T>): null {
		return null
	},
	{
		staticRender: (props: Record<string, unknown>): React.ReactNode => {
			const fieldRef = props['field'] as FieldRefBase<unknown> | undefined
			const fieldName = fieldRef ? extractFieldName(fieldRef) : null
			const header = props['header'] as React.ReactNode | undefined
			const sortable = (props['sortable'] as boolean | undefined) ?? false
			const filterEnabled = (props['filter'] as boolean | undefined) ?? false
			const customHandler = props['filterHandler'] as FilterHandler<FilterArtifact> | undefined
			const children = props['children'] as ((value: unknown) => React.ReactNode) | undefined

			const leafProps: ColumnLeafProps = {
				name: fieldName ?? `col-${Math.random().toString(36).slice(2, 8)}`,
				fieldName,
				fieldRef: fieldRef ?? null,
				sortingField: sortable && fieldName ? fieldName : null,
				filterName: filterEnabled && fieldName ? fieldName : null,
				filterHandler: filterEnabled && fieldName
					? (customHandler ?? textColumnDef.createFilterHandler(fieldName) as FilterHandler<FilterArtifact>)
					: undefined,
				isTextSearchable: false,
				header,
				renderCell: (accessor: EntityAccessor<object>) => {
					if (!fieldName) return null
					const ref = (accessor as unknown as Record<string, unknown>)[fieldName]
					const value = ref && typeof ref === 'object' && 'value' in ref
						? (ref as { value: unknown }).value ?? null
						: null
					if (children) return children(value)
					return value != null ? String(value) : ''
				},
			}

			return React.createElement(ColumnLeaf, leafProps as ColumnLeafProps)
		},
	},
)
