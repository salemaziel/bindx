import { Editor as SlateEditor, Element as SlateElement } from 'slate'

export const topLevelNodes = <E extends SlateEditor>(editor: E): ReturnType<typeof SlateEditor.nodes> => {
	return SlateEditor.nodes(editor, {
		match: node => SlateElement.isElement(node) && !editor.isVoid(node),
		mode: 'highest',
		voids: false,
	})
}
