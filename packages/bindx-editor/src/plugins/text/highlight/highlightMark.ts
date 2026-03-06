import { isHotkey } from '../../../utils/hotkeys.js'
import { createElement } from 'react'
import type { EditorMarkPlugin } from '../../../types/plugins.js'

export const highlightMark = 'isHighlighted'

export const highlightMarkPlugin: EditorMarkPlugin = {
	type: highlightMark,
	isHotKey: isHotkey('mod+e'),
	render: ({ children }) => createElement('em', undefined, children),
}
