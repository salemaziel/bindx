import { createElement } from 'react'
import { isHotkey } from '../../../utils/hotkeys.js'
import type { EditorMarkPlugin } from '../../../types/plugins.js'

export const boldMark = 'isBold'

export const boldMarkPlugin: EditorMarkPlugin = {
	type: boldMark,
	isHotKey: isHotkey('mod+b'),
	render: ({ children }) => createElement('b', undefined, children),
}
