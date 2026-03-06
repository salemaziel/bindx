import { ReactElement } from 'react'
import { useSlate } from 'slate-react'
import { Slot } from '@radix-ui/react-slot'

export interface EditorElementTriggerProps {
	elementType: string
	suchThat?: Record<string, unknown>
	children: ReactElement
}

export const EditorElementTrigger = ({ elementType, suchThat, ...props }: EditorElementTriggerProps): ReactElement => {
	const editor = useSlate()

	const isActive = editor.isElementActive(elementType, suchThat)
	const onClick = (): void => {
		editor.toggleElement(elementType, suchThat)
	}

	return <Slot onClick={onClick} data-active={isActive ? '' : undefined} {...props} />
}
