import { ReactElement } from 'react'
import { Slot } from '@radix-ui/react-slot'
import { Editor } from 'slate'
import { useSlate } from 'slate-react'

export interface EditorGenericTriggerProps {
	isActive?: (args: { editor: Editor }) => boolean
	shouldDisplay?: (args: { editor: Editor }) => boolean
	toggle: (args: { editor: Editor }) => void
	children: ReactElement
}

export const EditorGenericTrigger = ({ toggle, isActive, shouldDisplay, ...props }: EditorGenericTriggerProps): ReactElement | null => {
	const editor = useSlate()
	const onClick = (): void => {
		toggle({ editor })
	}
	const active = isActive?.({ editor }) ?? false
	const display = shouldDisplay?.({ editor }) ?? true
	if (!display) {
		return null
	}
	return <Slot onClick={onClick} data-active={active ? '' : undefined} {...props} />
}
