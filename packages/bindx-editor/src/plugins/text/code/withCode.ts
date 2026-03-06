import { codeMarkPlugin } from './codeMark.js'
import type { EditorPlugin } from '../../../types/plugins.js'

export const withCode = (): EditorPlugin => editor => {
	editor.registerMark(codeMarkPlugin)
}
