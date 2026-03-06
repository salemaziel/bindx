import {
	addMarks,
	canToggleMark,
	closest,
	closestBlockEntry,
	closestViableBlockContainerEntry,
	ejectElement,
	elementToSpecifics,
	getElementDataAttributes,
	getPreviousSibling,
	hasMarks,
	hasParentOfType,
	isElementType,
	permissivelyDeserializeNodes,
	removeMarks,
	serializeNodes,
	strictlyDeserializeNodes,
	textToSpecifics,
	toLatestFormat,
	topLevelNodes,
} from './methods/index.js'

export type { ElementDataAttributes } from './methods/index.js'

export const BindxEditor = {
	addMarks,
	canToggleMark,
	closest,
	closestBlockEntry,
	closestViableBlockContainerEntry,
	ejectElement,
	elementToSpecifics,
	getElementDataAttributes,
	getPreviousSibling,
	hasMarks,
	hasParentOfType,
	isElementType,
	permissivelyDeserializeNodes,
	removeMarks,
	serializeNodes,
	strictlyDeserializeNodes,
	textToSpecifics,
	toLatestFormat,
	topLevelNodes,
}

export { createEditor } from './createEditor.js'
