import { createContext, useContext } from 'react'
import type { Path } from 'slate'
import type { EntityAccessor } from '@contember/bindx'

export type GetReferencedEntity = (path: Path, id: string) => EntityAccessor<unknown, unknown>

const EditorGetReferencedEntityContext = createContext<GetReferencedEntity | null>(null)

export const EditorGetReferencedEntityProvider = EditorGetReferencedEntityContext.Provider

export function useEditorGetReferencedEntity(): GetReferencedEntity {
	const ctx = useContext(EditorGetReferencedEntityContext)
	if (!ctx) {
		throw new Error('useEditorGetReferencedEntity must be used within an EditorGetReferencedEntityProvider')
	}
	return ctx
}
