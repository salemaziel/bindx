import type { Editor as SlateEditor, Text as SlateText } from 'slate'

export const canToggleMark = <T extends SlateText, E extends SlateEditor>(
	editor: E,
	_markName: string,
	_markValue: unknown = true,
): boolean => {
	return editor.canToggleMarks({ [_markName]: _markValue })
}
