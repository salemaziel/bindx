import { createContext, useContext } from 'react'
import type { RenderElementProps } from 'slate-react'

const EditorBlockElementContext = createContext<RenderElementProps | null>(null)

export const EditorBlockElementProvider = EditorBlockElementContext.Provider

export function useEditorBlockElement(): RenderElementProps {
	const ctx = useContext(EditorBlockElementContext)
	if (!ctx) {
		throw new Error('useEditorBlockElement must be used within an EditorBlockElementProvider')
	}
	return ctx
}
