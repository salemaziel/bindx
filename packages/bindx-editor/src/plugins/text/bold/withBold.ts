import { boldMark, boldMarkPlugin } from './boldMark.js'
import type { EditorPlugin } from '../../../types/plugins.js'
import { createMarkHtmlDeserializer } from '../../behaviour/paste/createMarkHtmlDeserializer.js'

export const withBold = (): EditorPlugin => editor => {
	editor.registerMark(boldMarkPlugin)
	editor.htmlDeserializer.registerPlugin(
		createMarkHtmlDeserializer(
			boldMark,
			el => el.nodeName === 'STRONG' || (el.nodeName === 'B' && !el.id.startsWith('docs-internal-guid')),
			el => ['italic', 'oblique'].includes(el.style.fontWeight),
		),
	)
}
