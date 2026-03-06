import { isHotkey } from '../../../utils/hotkeys.js'
import { createElement } from 'react'
import type { EditorMarkPlugin } from '../../../types/plugins.js'

export const codeMark = 'isCode'

export const codeMarkPlugin: EditorMarkPlugin = {
	type: codeMark,
	isHotKey: isHotkey('mod+`'),
	render: ({ children }) => createElement('code', undefined, children),
}
