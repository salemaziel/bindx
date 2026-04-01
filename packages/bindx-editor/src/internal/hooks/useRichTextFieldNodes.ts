import type { FieldRef } from '@contember/bindx'
import { Descendant, Editor } from 'slate'
import { useRef } from 'react'
import type { SerializableEditorNode } from '../../types/editor.js'
import { useField } from '@contember/bindx-react'

export interface UseRichTextFieldNodesOptions {
	editor: Editor
	field: FieldRef<SerializableEditorNode | null>
}

export const useRichTextFieldNodes = ({
	editor,
	field,
}: UseRichTextFieldNodesOptions): Descendant[] => {
	const accessor = useField(field)
	const cacheRef = useRef<{ value: SerializableEditorNode | null; nodes: Descendant[] } | null>(null)

	const fieldValue = accessor.value

	if (cacheRef.current && cacheRef.current.value === fieldValue) {
		return cacheRef.current.nodes
	}

	const elements: Descendant[] =
		fieldValue === null || (typeof fieldValue === 'object' && 'children' in fieldValue && fieldValue.children.length === 0)
			? [editor.createDefaultElement([{ text: '' }])]
			: typeof fieldValue === 'object' && fieldValue !== null && 'children' in fieldValue
				? [editor.createDefaultElement(fieldValue.children as Descendant[])]
				: [editor.createDefaultElement([{ text: '' }])]

	cacheRef.current = { value: fieldValue, nodes: elements }

	return elements
}
