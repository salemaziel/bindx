import { createElement } from 'react'
import { isHotkey } from '../../../utils/hotkeys.js'
import type { EditorMarkPlugin } from '../../../types/plugins.js'

export const strikeThroughMark = 'isStruckThrough'
export const strikeThroughPlugin: EditorMarkPlugin = {
	type: strikeThroughMark,
	render: ({ children }) => createElement('s', undefined, children),
	isHotKey: isHotkey('mod+alt+s'),
}
