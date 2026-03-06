import { toLatestFormat } from './toLatestFormat.js'
import { Editor as SlateEditor, Element as SlateElement, Text as SlateText } from 'slate'
import type { SerializableEditorNode } from '../../types/editor.js'

export const permissivelyDeserializeNodes = <E extends SlateEditor>(
	editor: E,
	serializedElement: string,
	errorMessage?: string,
): Array<SlateElement | SlateText> => {
	let deserialized: SerializableEditorNode | SlateElement | null = null
	try {
		deserialized = JSON.parse(serializedElement)
	} catch {}

	if (typeof deserialized !== 'object' || deserialized === null) {
		return [editor.createDefaultElement([{ text: serializedElement }])]
	}

	if ('formatVersion' in deserialized) {
		return toLatestFormat(editor, deserialized as SerializableEditorNode).children
	}

	return toLatestFormat(editor, {
		formatVersion: 0,
		children: [deserialized],
	}).children
}
