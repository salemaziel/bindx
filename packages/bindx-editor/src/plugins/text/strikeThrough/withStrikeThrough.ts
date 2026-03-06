import { strikeThroughMark, strikeThroughPlugin } from './strikeThroughMark.js'
import type { EditorPlugin } from '../../../types/plugins.js'
import { createMarkHtmlDeserializer } from '../../behaviour/paste/createMarkHtmlDeserializer.js'

export const withStrikeThrough = (): EditorPlugin => editor => {
	editor.registerMark(strikeThroughPlugin)
	editor.htmlDeserializer.registerPlugin(
		createMarkHtmlDeserializer(
			strikeThroughMark,
			el => el.nodeName === 'S',
			el => el.style.textDecoration === 'line-through',
		),
	)
}
