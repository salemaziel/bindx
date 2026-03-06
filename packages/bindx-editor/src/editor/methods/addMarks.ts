import { Editor as SlateEditor, Editor, Text as SlateText } from 'slate'
import type { TextSpecifics } from '../../types/editor.js'

export const addMarks = <T extends SlateText, E extends SlateEditor>(editor: E, marks: TextSpecifics<T>): void => {
	Editor.withoutNormalizing(editor, () => {
		for (const mark in marks) {
			Editor.addMark(editor, mark, (marks as Record<string, unknown>)[mark])
		}
	})
}
