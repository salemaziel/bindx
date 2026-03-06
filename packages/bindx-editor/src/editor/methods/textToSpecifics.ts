import { Text as SlateText } from 'slate'
import type { TextSpecifics } from '../../types/editor.js'

export const textToSpecifics = <Text extends SlateText = SlateText>(textNode: Text): TextSpecifics<Text> => {
	const { text, ...specifics } = textNode
	return specifics as TextSpecifics<Text>
}
