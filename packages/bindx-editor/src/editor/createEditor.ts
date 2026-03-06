import { createEditorWithEssentials } from './createEditorWithEssentials.js'
import { Editor } from 'slate'
import type { EditorPluginWrapperProps, CreateEditorOptions } from '../types/plugins.js'
import { createElement, FunctionComponent, ReactNode } from 'react'

export const createEditor = ({
	plugins = [],
	defaultElementType,
}: CreateEditorOptions): {
	editor: Editor
	OuterWrapper: FunctionComponent<{ children: ReactNode }>
	InnerWrapper: FunctionComponent<{ children: ReactNode }>
} => {
	const editor = createEditorWithEssentials({ defaultElementType })
	const outerWrappers: FunctionComponent<EditorPluginWrapperProps>[] = []
	const innerWrappers: FunctionComponent<EditorPluginWrapperProps>[] = []
	plugins?.forEach(plugin => {
		if (typeof plugin === 'function') {
			plugin(editor)
			return
		}
		plugin.extendEditor?.({ editor })
		if (plugin?.OuterWrapper) {
			outerWrappers.push(plugin.OuterWrapper)
		}
		if (plugin?.InnerWrapper) {
			innerWrappers.push(plugin.InnerWrapper)
		}
	})
	return {
		editor,
		OuterWrapper: ({ children }) => outerWrappers.reduceRight((acc, Wrapper) => createElement(Wrapper, { editor }, acc), children),
		InnerWrapper: ({ children }) => innerWrappers.reduceRight((acc, Wrapper) => createElement(Wrapper, { editor }, acc), children),
	}
}
