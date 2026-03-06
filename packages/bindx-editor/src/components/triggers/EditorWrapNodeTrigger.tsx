import { Selection, Transforms } from 'slate'
import { MouseEventHandler, ReactElement } from 'react'
import { useSlate } from 'slate-react'
import { Slot } from '@radix-ui/react-slot'

export interface EditorWrapNodeTriggerProps {
	elementType: string
	selection?: Selection
	suchThat?: Record<string, unknown>
	children: ReactElement
	onClick?: MouseEventHandler<HTMLElement>
}

export const EditorWrapNodeTrigger = ({ elementType, suchThat, selection, ...props }: EditorWrapNodeTriggerProps): ReactElement => {
	const editor = useSlate()
	const onClick: MouseEventHandler<HTMLElement> = e => {
		props.onClick?.(e)
		if (selection) {
			Transforms.select(editor, selection)
		}
		Transforms.wrapNodes(
			editor,
			{
				type: elementType,
				children: [{ text: '' }],
				...suchThat,
			},
			{ split: true },
		)
		Transforms.collapse(editor, { edge: 'end' })
	}

	return <Slot {...props} onClick={onClick} />
}
