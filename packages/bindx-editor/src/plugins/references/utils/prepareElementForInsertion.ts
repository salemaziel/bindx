import { Editor, Element as SlateElement, Location, Node as SlateNode, NodeEntry, Path as SlatePath, Point, Range as SlateRange, Transforms } from 'slate'
import { BindxEditor } from '../../../editor/index.js'
import { isElementWithReference } from '../elements/ElementWithReference.js'

export const prepareElementForInsertion = (editor: Editor, isReference: boolean): SlatePath => {
	const selection = editor.selection

	let targetLocation: Location

	if (selection) {
		targetLocation = selection
	} else if (editor.children.length) {
		targetLocation = Editor.end(editor, [])
	} else {
		targetLocation = { path: [], offset: 0 }
	}

	if (SlateRange.isRange(targetLocation)) {
		if (SlateRange.isExpanded(targetLocation)) {
			const [, end] = SlateRange.edges(targetLocation)
			const pointRef = Editor.pointRef(editor, end)
			Transforms.delete(editor, { at: targetLocation })
			targetLocation = pointRef.unref()!
		} else {
			targetLocation = targetLocation.focus
		}
	}

	const targetPoint = targetLocation as Point

	if (!isReference) {
		if (targetPoint.offset === 0) {
			return targetPoint.path
		}
		Transforms.splitNodes(editor, {
			at: targetPoint,
		})
		return SlatePath.next(targetPoint.path)
	}

	const closestBlock = BindxEditor.closestBlockEntry(editor, {
		at: targetPoint,
	})
	if (!closestBlock) {
		return targetPoint.path
	}
	const [closestBlockElement, closestBlockPath] = closestBlock as NodeEntry<SlateElement>

	if (editor.canContainAnyBlocks(closestBlockElement)) {
		return targetPoint.path
	}

	if (isElementWithReference(closestBlockElement)) {
		const newPath = SlatePath.next(closestBlockPath)
		Promise.resolve().then(() => {
			return Transforms.select(editor, newPath)
		}).catch(() => {})
		return newPath
	}

	if (SlateNode.string(closestBlockElement) === '') {
		Transforms.removeNodes(editor, {
			at: closestBlockPath,
		})
		return closestBlockPath
	}

	const [start, end] = Editor.edges(editor, closestBlockPath)

	if (Point.equals(start, targetPoint)) {
		return closestBlockPath
	} else if (Point.equals(end, targetPoint)) {
		return SlatePath.next(closestBlockPath)
	} else {
		Transforms.splitNodes(editor, {
			at: targetPoint,
		})
		return SlatePath.next(SlatePath.parent(targetPoint.path))
	}
}
