import type { ReactNode } from 'react'

/**
 * Attaches a static render function to a component for selection collection.
 *
 * During the collection phase, the analyzer calls `staticRender(props)` instead of
 * analyzing runtime children. Props contain collector proxies, so field accesses
 * are tracked automatically. The returned JSX is analyzed for nested components.
 *
 * @example
 * ```tsx
 * // Simple: children is a render prop receiving has-one entity
 * export const SelectField = withCollector(
 *   function SelectField({ field, children, ... }) { ... },
 *   (props) => props.children(props.field.$entity)
 * )
 *
 * // Composing with HasMany for iteration
 * export const DefaultRepeater = withCollector(
 *   function DefaultRepeater({ field, children, ... }) { ... },
 *   (props) => (
 *     <HasMany field={props.field}>
 *       {item => props.children(item, collectionItemInfo)}
 *     </HasMany>
 *   )
 * )
 *
 * // Programmatic field access (no JSX needed)
 * export const Uploader = withCollector(
 *   function Uploader({ field, fileType }) { ... },
 *   (props) => {
 *     const entity = props.field.$entity
 *     for (const ext of props.fileType.extractors) entity[ext.fieldName]
 *     return null
 *   }
 * )
 * ```
 */
export function withCollector<TComponent extends (...args: never[]) => ReactNode>(
	component: TComponent,
	staticRender: (props: Parameters<TComponent>[0]) => ReactNode,
): TComponent {
	(component as TComponent & { staticRender: typeof staticRender }).staticRender = staticRender
	return component
}
