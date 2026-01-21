import { memo, type ReactElement } from 'react'
import type { FieldProps, SelectionFieldMeta, SelectionProvider, FieldRef } from '../types.js'
import { FIELD_REF_META, BINDX_COMPONENT } from '../types.js'

/**
 * Field component - renders a scalar field value
 *
 * @example
 * ```tsx
 * // Basic usage - renders value as string
 * <Field field={entity.fields.name} />
 *
 * // With custom render function
 * <Field field={entity.fields.email}>
 *   {field => <a href={`mailto:${field.value}`}>{field.value}</a>}
 * </Field>
 *
 * // With format function
 * <Field field={entity.fields.date} format={d => d?.toLocaleDateString()} />
 * ```
 */
function FieldImpl<T>({ field, children, format }: FieldProps<T>): ReactElement | null {
	// Handle undefined field (e.g., when accessing field on disconnected has-one relation)
	if (field === undefined || field === null) {
		return null
	}

	// At runtime, field is always a full FieldRef (proxy provides all properties)
	// Props accept FieldRefBase for type compatibility with both implicit and explicit modes
	const fullField = field as FieldRef<T>

	if (children) {
		return <>{children(fullField)}</>
	}

	if (format) {
		return <>{format(fullField.value)}</>
	}

	// Default: render value as string
	if (fullField.value === null || fullField.value === undefined) {
		return null
	}

	return <>{String(fullField.value)}</>
}

export const Field = memo(FieldImpl) as typeof FieldImpl

// Static method for selection extraction
const fieldWithSelection = Field as typeof Field & SelectionProvider & { [BINDX_COMPONENT]: true }

fieldWithSelection.getSelection = (props: FieldProps<unknown>): SelectionFieldMeta | null => {
	// Handle undefined field (e.g., when accessing field on disconnected has-one relation)
	if (props.field === undefined || props.field === null) {
		return null
	}
	const meta = props.field[FIELD_REF_META]
	if (!meta) {
		return null
	}
	return {
		fieldName: meta.fieldName,
		alias: meta.fieldName,
		path: meta.path,
		isArray: false,
		isRelation: false,
	}
}

fieldWithSelection[BINDX_COMPONENT] = true

export { fieldWithSelection as FieldWithMeta }
