import { highlightMarkPlugin } from './highlightMark.js'
import type { EditorPlugin } from '../../../types/plugins.js'

export const withHighlight = (): EditorPlugin => editor => {
	editor.registerMark(highlightMarkPlugin)
}
