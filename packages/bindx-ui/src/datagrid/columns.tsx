/**
 * Styled DataGrid column components with inline filter UI.
 *
 * These wrap the headless columns from `@contember/bindx-dataview` with
 * `renderFilter` implementations that use the styled filter controls
 * from the `filters/` directory.
 *
 * The filter controls use hooks internally (via `useDataViewFilterName()`),
 * which requires the `DataViewFilterScope` wrapping provided by
 * `ColumnFilterRenderer` in `auto-table.tsx`.
 */

import React, { type ReactElement } from 'react'
import type { EnumFilterArtifact, EnumListFilterArtifact } from '@contember/bindx'
import {
	createColumn,
	textColumnDef,
	numberColumnDef,
	dateColumnDef,
	dateTimeColumnDef,
	booleanColumnDef,
	enumColumnDef,
	enumListColumnDef,
	uuidColumnDef,
	isDefinedColumnDef,
	useDataViewFilterName,
	useDataViewContext,
} from '@contember/bindx-dataview'
import type { ColumnRenderProps } from '@contember/bindx-dataview'
import { DataGridTextFilterInner } from './filters/text.js'
import { DataGridBooleanFilterControls } from './filters/boolean.js'
import { DataGridNumberFilterControls } from './filters/number.js'
import { DataGridDateFilterControls } from './filters/date.js'
import { DataGridEnumFilterControls } from './filters/enum.js'
import { DataGridIsDefinedFilterControls } from './filters/defined.js'

// Re-export relation/action/generic columns unchanged from dataview
export {
	DataGridHasOneColumn,
	DataGridHasManyColumn,
	DataGridActionColumn,
	DataGridColumn,
	type DataGridTextColumnProps,
	type DataGridNumberColumnProps,
	type DataGridDateColumnProps,
	type DataGridDateTimeColumnProps,
	type DataGridBooleanColumnProps,
	type DataGridEnumColumnProps,
	type DataGridEnumListColumnProps,
	type DataGridUuidColumnProps,
	type DataGridIsDefinedColumnProps,
	type DataGridHasOneColumnProps,
	type DataGridHasManyColumnProps,
	type DataGridActionColumnProps,
	type DataGridColumnProps,
} from '@contember/bindx-dataview'

// ============================================================================
// Default Cell Renderers (same as headless columns)
// ============================================================================

function renderScalarDefault({ value }: ColumnRenderProps<unknown>): React.ReactNode {
	return value != null ? String(value) : ''
}

function renderBooleanDefault({ value }: ColumnRenderProps<boolean | null>): React.ReactNode {
	return value != null ? String(value) : ''
}

function renderIsDefinedDefault({ value }: ColumnRenderProps<unknown>): React.ReactNode {
	return value != null ? '\u2713' : '\u2717'
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
// Enum Filter Helper
// ============================================================================

/**
 * Reads `enumOptions` from the DataView context column matching the current
 * filter name, then renders `DataGridEnumFilterControls` with those options.
 */
function ColumnEnumFilterControls(): ReactElement {
	const filterName = useDataViewFilterName()
	const { columns } = useDataViewContext()
	const column = columns.find(c => c.filterName === filterName)
	const options = column?.enumOptions ?? []
	const optionsRecord = Object.fromEntries(options.map(o => [o, o] as const))
	return <DataGridEnumFilterControls options={optionsRecord} />
}

// ============================================================================
// Styled Scalar Columns with Filters
// ============================================================================

interface EnumExtraProps {
	options: readonly string[]
}

export const DataGridTextColumn = createColumn(textColumnDef, {
	renderCell: renderScalarDefault,
	renderFilter: () => <DataGridTextFilterInner />,
})

export const DataGridNumberColumn = createColumn(numberColumnDef, {
	renderCell: renderScalarDefault,
	renderFilter: () => <DataGridNumberFilterControls />,
})

export const DataGridDateColumn = createColumn(dateColumnDef, {
	renderCell: renderScalarDefault,
	renderFilter: () => <DataGridDateFilterControls layout="column" />,
})

export const DataGridDateTimeColumn = createColumn(dateTimeColumnDef, {
	renderCell: renderDateTimeDefault,
	renderFilter: () => <DataGridDateFilterControls layout="column" />,
})

export const DataGridBooleanColumn = createColumn(booleanColumnDef, {
	renderCell: renderBooleanDefault,
	renderFilter: () => <DataGridBooleanFilterControls />,
})

export const DataGridEnumColumn = createColumn<string | null, EnumFilterArtifact, EnumExtraProps>(enumColumnDef, {
	renderCell: renderScalarDefault,
	renderFilter: () => <ColumnEnumFilterControls />,
})

export const DataGridEnumListColumn = createColumn<readonly string[] | null, EnumListFilterArtifact, EnumExtraProps>(enumListColumnDef, {
	renderCell: renderEnumListDefault,
	renderFilter: () => <ColumnEnumFilterControls />,
})

export const DataGridUuidColumn = createColumn(uuidColumnDef, {
	renderCell: renderScalarDefault,
})

export const DataGridIsDefinedColumn = createColumn(isDefinedColumnDef, {
	renderCell: renderIsDefinedDefault,
	renderFilter: () => <DataGridIsDefinedFilterControls />,
})
