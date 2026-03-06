import { isHotkey } from '../../../utils/hotkeys.js'
import { createElement } from 'react'
import type { EditorMarkPlugin } from '../../../types/plugins.js'

export const underlineMark = 'isUnderlined'

export const underlineMarkPlugin: EditorMarkPlugin = {
	type: underlineMark,
	isHotKey: isHotkey('mod+u'),
	render: ({ children }) => createElement('u', undefined, children),
}
