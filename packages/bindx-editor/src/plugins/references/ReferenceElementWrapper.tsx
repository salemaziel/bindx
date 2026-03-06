import { type FC, type ReactNode } from 'react'
import { ReactEditor, useSlateStatic } from 'slate-react'
import type { ElementWithReference } from './elements/ElementWithReference.js'
import { EntityScope } from '@contember/bindx-react'
import { useEditorGetReferencedEntity } from '../../contexts/EditorReferencesContext.js'

export interface ReferenceElementWrapperProps {
	element: ElementWithReference
	children?: ReactNode
}

export const ReferenceElementWrapper: FC<ReferenceElementWrapperProps> = ({ children, element }) => {
	const editor = useSlateStatic()
	const path = ReactEditor.findPath(editor, element)
	const getReferencedEntity = useEditorGetReferencedEntity()
	const ref = getReferencedEntity(path, element.referenceId)
	return <EntityScope entity={ref as any}>{children}</EntityScope>
}
