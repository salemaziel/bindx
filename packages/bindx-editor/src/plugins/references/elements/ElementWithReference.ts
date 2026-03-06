import { Element, Node, Text } from 'slate'

export interface ElementWithReference extends Element {
	referenceId: string
}

export const isElementWithReference = (candidate: Node): candidate is ElementWithReference => {
	return !Text.isText(candidate) && 'referenceId' in candidate && !!candidate['referenceId']
}
