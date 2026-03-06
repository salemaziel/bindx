import { Editor as SlateEditor, Element as SlateElement, Text as SlateText } from 'slate'
import type { SerializableEditorNode } from '../../types/editor.js'

export const serializeNodes = <E extends SlateEditor>(
	editor: E,
	elements: Array<SlateElement | SlateText>,
	errorMessage?: string,
): string => {
	try {
		const serialized: SerializableEditorNode = {
			formatVersion: editor.formatVersion,
			children: elements,
		}
		return JSON.stringify(serialized)
	} catch {
		throw new Error(errorMessage ?? 'Editor: serialization error')
	}
}
