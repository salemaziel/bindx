import { underlineMark, underlineMarkPlugin } from './underlineMark.js'
import { createMarkHtmlDeserializer } from '../../behaviour/paste/createMarkHtmlDeserializer.js'
import type { EditorPlugin } from '../../../types/plugins.js'

export const withUnderline = (): EditorPlugin => editor => {
	editor.registerMark(underlineMarkPlugin)
	editor.htmlDeserializer.registerPlugin(
		createMarkHtmlDeserializer(
			underlineMark,
			el => el.nodeName === 'U',
			el => el.style.textDecoration === 'underline',
		),
	)
}
