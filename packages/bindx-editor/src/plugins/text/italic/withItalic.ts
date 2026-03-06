import { italicMark, italicMarkPlugin } from './italicMark.js'
import type { EditorPlugin } from '../../../types/plugins.js'
import { createMarkHtmlDeserializer } from '../../behaviour/paste/createMarkHtmlDeserializer.js'

export const withItalic = (): EditorPlugin => editor => {
	editor.registerMark(italicMarkPlugin)
	editor.htmlDeserializer.registerPlugin(
		createMarkHtmlDeserializer(
			italicMark,
			el => ['I', 'EM'].includes(el.nodeName),
			el => ['italic', 'oblique'].includes(el.style.fontStyle),
		),
	)
}
