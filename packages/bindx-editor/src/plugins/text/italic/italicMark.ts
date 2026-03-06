import { isHotkey } from '../../../utils/hotkeys.js'
import { createElement } from 'react'
import type { EditorMarkPlugin } from '../../../types/plugins.js'

export const italicMark = 'isItalic'

export const italicMarkPlugin: EditorMarkPlugin = {
	type: italicMark,
	isHotKey: isHotkey('mod+i'),
	render: ({ children }) => createElement('i', undefined, children),
}
