import { Editor as SlateEditor, Element as SlateElement, Node as SlateNode, Path as SlatePath } from 'slate'
import { BindxEditor } from '../index.js'

export const hasParentOfType = <Editor extends SlateEditor, Element extends SlateElement>(
	editor: Editor,
	nodeEntry: [SlateNode | SlateElement, SlatePath],
	type: Element['type'],
	suchThat?: Partial<Element>,
): boolean => {
	const [, path] = nodeEntry
	if (path.length === 1) {
		return false
	}
	const parentPath = SlatePath.parent(path)
	const parent = SlateNode.get(editor, parentPath)

	return BindxEditor.isElementType(parent, type, suchThat)
}
