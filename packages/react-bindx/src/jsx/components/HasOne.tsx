import React, { memo, type ReactElement, type ReactNode } from 'react'
import type { HasOneProps, SelectionFieldMeta, SelectionMeta, SelectionProvider } from '../types.js'
import { FIELD_REF_META, BINDX_COMPONENT } from '../types.js'
import { createCollectorProxy } from '../proxy.js'
import { SelectionMetaCollector, mergeSelections } from '../SelectionMeta.js'

/**
 * HasOne component - renders a has-one relation
 *
 * @example
 * ```tsx
 * <HasOne field={article.fields.author}>
 *   {author => (
 *     <div>
 *       <Field field={author.fields.name} />
 *       <Field field={author.fields.email} />
 *     </div>
 *   )}
 * </HasOne>
 * ```
 */
function HasOneImpl<T, TSelected = T>({ field, children }: HasOneProps<T, TSelected>): ReactElement | null {
	// Get the related entity reference
	// Returns null if the relation is disconnected
	const entity = field.entity
	if (!entity) {
		return null
	}

	return <>{children(entity)}</>
}

export const HasOne = memo(HasOneImpl) as typeof HasOneImpl

// Static method for selection extraction
const hasOneWithSelection = HasOne as typeof HasOne & SelectionProvider & { [BINDX_COMPONENT]: true }

hasOneWithSelection.getSelection = (
	props: HasOneProps<unknown>,
	collectNested: (children: ReactNode) => SelectionMeta,
): SelectionFieldMeta => {
	const meta = props.field[FIELD_REF_META]

	// Create nested selection by calling children with collector
	const nestedSelection = new SelectionMetaCollector()
	// createCollectorProxy returns EntityRef, so we can use it directly
	const nestedCollector = createCollectorProxy<unknown>(nestedSelection)

	// Call children once to gather nested field access
	const syntheticChildren = props.children(nestedCollector)

	// Also analyze the JSX structure
	const jsxSelection = collectNested(syntheticChildren)
	mergeSelections(nestedSelection, jsxSelection)

	return {
		fieldName: meta.fieldName,
		alias: meta.fieldName,
		path: meta.path,
		isArray: false,
		isRelation: true,
		nested: nestedSelection,
	}
}

hasOneWithSelection[BINDX_COMPONENT] = true

export { hasOneWithSelection as HasOneWithMeta }
