import { Descendant, Editor, Element, Element as SlateElement, Node as SlateNode, Text, Transforms } from 'slate'
import { isInReferenceElement, prepareElementForInsertion } from './utils/index.js'
import { BindxEditor } from '../../editor/index.js'
import { isElementWithReference } from './elements/ElementWithReference.js'

export const referenceOverrides = (editor: Editor): void => {
	const { insertData, insertFragment, insertBreak, insertNode } = editor

	const stripNodeReferences = (nodes: SlateNode[]): SlateNode[] =>
		nodes.flatMap(node => {
			if (Text.isText(node)) {
				return node as SlateNode
			}
			if (SlateElement.isElement(node) && 'referenceId' in node) {
				return stripNodeReferences((node as SlateElement).children)
			}
			return {
				...node,
				children: stripNodeReferences(node.children),
			} as Descendant
		})

	editor.insertFragment = fragment => {
		insertFragment(stripNodeReferences(fragment))
	}

	editor.insertData = data => {
		if (editor.selection && isInReferenceElement(editor)) {
			const text = data.getData('text/plain').trim()
			Transforms.insertText(editor, text)
			return
		}
		return insertData(data)
	}

	editor.insertBreak = () => {
		const closestBlockEntry = BindxEditor.closestBlockEntry(editor)
		if (closestBlockEntry && isElementWithReference(closestBlockEntry[0])) {
			const selection = editor.selection
			const [, closestBlockPath] = closestBlockEntry
			const [referenceStart, referenceEnd] = Editor.edges(editor, closestBlockPath)

			if (!selection) {
				return
			}

			return Editor.withoutNormalizing(editor, () => {
				Transforms.wrapNodes(editor, editor.createDefaultElement([]), {
					at: {
						anchor: referenceStart,
						focus: referenceEnd,
					},
					match: node => Text.isText(node) || (Element.isElement(node) && editor.isInline(node)),
				})

				const relative = closestBlockPath.length > 0
					? selection.focus.path.slice(closestBlockPath.length)
					: selection.focus.path
				Transforms.splitNodes(editor, {
					at: {
						path: [...closestBlockPath, 0, ...relative],
						offset: selection.focus.offset,
					},
					always: true,
				})
			})
		}

		if (isInReferenceElement(editor)) {
			return
		}

		return insertBreak()
	}

	editor.insertNode = node => {
		if (!SlateElement.isElement(node)) {
			return insertNode(node)
		}
		Editor.withoutNormalizing(editor, () => {
			const preppedPath = prepareElementForInsertion(editor, isElementWithReference(node))
			Transforms.insertNodes(editor, node, {
				at: preppedPath,
			})
		})
	}
}
