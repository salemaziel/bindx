import { ReactElement } from 'react'
import { useSlate } from 'slate-react'
import { Slot } from '@radix-ui/react-slot'

export interface EditorMarkTriggerProps {
	mark: string
	children: ReactElement
}

export const EditorMarkTrigger = ({ mark, ...props }: EditorMarkTriggerProps): ReactElement => {
	const editor = useSlate()

	const isActive = editor.hasMarks({ [mark]: true })
	const onClick = (): void => {
		editor.toggleMarks({ [mark]: true })
	}

	return <Slot onClick={onClick} data-active={isActive ? '' : undefined} {...props} />
}
