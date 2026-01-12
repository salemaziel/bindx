/**
 * Unified createComponent builder implementation.
 *
 * Provides a fluent builder for creating bindx components with support for
 * both implicit (JSX-analyzed) and explicit (selector-based) entity props.
 */

import type { ReactNode } from 'react'
import { memo } from 'react'
import type {
	FluentFragment,
	SelectionMeta,
	SelectionBuilder,
	AnyBrand,
	SchemaRegistry,
} from '@contember/bindx'
import {
	SELECTION_META,
	ComponentBrand,
	createSelectionBuilder,
} from '@contember/bindx'
import type {
	ComponentBuilder,
	ComponentBuilderState,
	BindxComponent,
	BuildProps,
	SelectionPropMeta,
} from './componentBuilder.types.js'
export type { SelectionPropMeta } from './componentBuilder.types.js'
import type { SelectionProvider, SelectionFieldMeta } from './types.js'
import { FIELD_REF_META, BINDX_COMPONENT } from './types.js'
import { createCollectorProxy } from './proxy.js'
import { collectSelection } from './analyzer.js'
import { SelectionMetaCollector, mergeSelections } from './SelectionMeta.js'

// ============================================================================
// Symbols
// ============================================================================

/**
 * Marker symbol for identifying components created with createComponent
 */
export const COMPONENT_MARKER = Symbol('BINDX_COMPONENT')

/**
 * Symbol for storing component brand on the component
 */
export const COMPONENT_BRAND = Symbol('COMPONENT_BRAND')

/**
 * Symbol for stored selection metadata
 */
export const COMPONENT_SELECTIONS = Symbol('COMPONENT_SELECTIONS')

// ============================================================================
// Entity Config (Runtime)
// ============================================================================

interface EntityConfig {
	readonly entityName: string
	readonly selector?: (builder: SelectionBuilder<object>) => SelectionBuilder<object, object, object>
}

// ============================================================================
// Builder Implementation
// ============================================================================

/**
 * Implementation of the ComponentBuilder interface.
 * Accumulates entity configs and builds the component on .render().
 *
 * Note: The implementation uses `any` returns because TypeScript cannot
 * properly infer the accumulating state types through method chaining.
 * Type safety is provided by the interface definition.
 */
export class ComponentBuilderImpl<
	TSchema extends Record<string, object>,
	TState extends ComponentBuilderState<TSchema>,
> {
	constructor(
		private readonly schemaRegistry: SchemaRegistry<Record<string, object>> | null,
		private readonly entityConfigs: Map<string, EntityConfig>,
		private readonly roles: readonly string[],
	) {}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	entity(
		propName: string,
		entityName: string,
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		selector?: (builder: any) => any,
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	): any {
		const newConfigs = new Map(this.entityConfigs)
		newConfigs.set(propName, { entityName, selector })
		return new ComponentBuilderImpl(
			this.schemaRegistry,
			newConfigs,
			this.roles,
		)
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	props<TNewScalarProps extends object>(): any {
		// Type-only operation - runtime is a no-op
		return new ComponentBuilderImpl(
			this.schemaRegistry,
			this.entityConfigs,
			this.roles,
		)
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	render(renderFn: (props: any) => ReactNode): any {
		return buildComponent(
			this.entityConfigs,
			this.roles,
			renderFn,
		)
	}
}

// ============================================================================
// Component Building
// ============================================================================

/**
 * Builds a bindx component from entity configs and render function.
 *
 * Note: Implicit selection collection is deferred (lazy) to avoid TDZ errors
 * when components reference other components defined later in the same file.
 */
function buildComponent<TProps extends object>(
	entityConfigs: Map<string, EntityConfig>,
	roles: readonly string[],
	renderFn: (props: TProps) => ReactNode,
): unknown {
	const selectionsMap = new Map<string, SelectionPropMeta>()

	// Generate unique brand for this component
	const componentBrand = new ComponentBrand(`component_${Math.random().toString(36).slice(2)}`)

	// 1. Process explicit entities (those with selectors) - these are safe to do eagerly
	for (const [propName, config] of entityConfigs) {
		if (config.selector) {
			const builder = createSelectionBuilder<object>()
			const resultBuilder = config.selector(builder)
			const selection = resultBuilder[SELECTION_META]

			selectionsMap.set(propName, {
				selection,
				fragment: createFragment(selection, componentBrand, roles),
			})
		}
	}

	// 2. Implicit entities - collect lazily to avoid TDZ errors
	const implicitConfigs = [...entityConfigs.entries()].filter(([_, c]) => !c.selector)
	let implicitCollected = false

	function ensureImplicitCollected(): void {
		if (implicitCollected || implicitConfigs.length === 0) {
			return
		}
		implicitCollected = true
		collectImplicitSelections(implicitConfigs, renderFn, selectionsMap, componentBrand, roles)
	}

	// 3. Create React component
	function ComponentImpl(props: TProps): ReactNode {
		ensureImplicitCollected()
		return renderFn(props)
	}

	const MemoizedComponent = memo(ComponentImpl)

	// 4. Attach metadata
	const comp = MemoizedComponent as unknown as Record<symbol | string, unknown>
	comp[BINDX_COMPONENT] = true
	comp[COMPONENT_MARKER] = true
	comp[COMPONENT_SELECTIONS] = selectionsMap
	comp[COMPONENT_BRAND] = componentBrand

	if (roles.length > 0) {
		comp['__componentRoles'] = roles
	}

	// 5. Add SelectionProvider interface with lazy collection
	;(MemoizedComponent as unknown as SelectionProvider).getSelection = (
		props: Record<string, unknown>,
		collectNested,
	): SelectionFieldMeta | SelectionFieldMeta[] | null => {
		ensureImplicitCollected()
		return createGetSelection(selectionsMap)(props, collectNested)
	}

	// 6. Attach fragment properties ($propName) for explicit entities
	for (const [propName, meta] of selectionsMap) {
		comp[`$${propName}`] = meta.fragment
	}

	// 7. Define lazy getters for implicit entity props
	// This allows accessing $propName without first rendering the component
	for (const [propName] of implicitConfigs) {
		Object.defineProperty(comp, `$${propName}`, {
			get(): FluentFragment<unknown, object, AnyBrand> | undefined {
				ensureImplicitCollected()
				return selectionsMap.get(propName)?.fragment
			},
			enumerable: true,
			configurable: true,
		})
	}

	return MemoizedComponent
}

// ============================================================================
// Implicit Selection Collection
// ============================================================================

/**
 * Creates a mock object for explicit entity props during collection phase.
 * This prevents crashes when accessing .data or .fields on explicit props.
 */
function createExplicitPropMock(): unknown {
	const fieldsProxy = new Proxy({}, {
		get(): unknown {
			return { value: null }
		},
	})

	return new Proxy({}, {
		get(_target, prop): unknown {
			switch (prop) {
				case 'data':
				case 'id':
					return null
				case 'fields':
					return fieldsProxy
				default:
					return undefined
			}
		},
	})
}

/**
 * Collects selections from JSX for implicit entity props.
 */
function collectImplicitSelections<TProps extends object>(
	implicitConfigs: [string, EntityConfig][],
	renderFn: (props: TProps) => ReactNode,
	selectionsMap: Map<string, SelectionPropMeta>,
	componentBrand: ComponentBrand,
	roles: readonly string[],
): void {
	const propCollectors = new Map<string, SelectionMetaCollector>()
	const implicitPropNames = new Set(implicitConfigs.map(([name]) => name))
	const explicitPropNames = new Set(
		[...selectionsMap.keys()].filter(name => !implicitPropNames.has(name)),
	)

	// Create proxy for props that captures field accesses
	const propsProxy = new Proxy({} as TProps, {
		get(_target, propName: string | symbol): unknown {
			if (typeof propName === 'symbol') {
				return undefined
			}

			// For implicit entity props, create collectors
			if (implicitPropNames.has(propName)) {
				const selection = new SelectionMetaCollector()
				propCollectors.set(propName, selection)
				return createCollectorProxy(selection)
			}

			// For explicit entity props, return a mock object that won't crash
			// when accessing .data or .fields during the collection phase
			if (explicitPropNames.has(propName)) {
				return createExplicitPropMock()
			}

			// Scalar prop - return undefined
			return undefined
		},
	})

	// Execute render to capture field accesses
	const jsx = renderFn(propsProxy)

	// Analyze JSX tree for component-level selections
	const jsxSelection = collectSelection(jsx)

	// Create fragments for captured entities
	for (const [propName, collector] of propCollectors) {
		if (collector.fields.size > 0) {
			mergeSelections(collector, jsxSelection)

			selectionsMap.set(propName, {
				selection: collector,
				fragment: createFragment(collector, componentBrand, roles),
			})
		}
	}
}

// ============================================================================
// Fragment Creation
// ============================================================================

/**
 * Creates a FluentFragment from selection metadata.
 */
function createFragment(
	selection: SelectionMeta,
	componentBrand: ComponentBrand,
	roles: readonly string[],
): FluentFragment<unknown, object, AnyBrand> {
	return {
		__meta: selection,
		__resultType: {} as object,
		__modelType: undefined as unknown,
		__isFragment: true,
		__brand: componentBrand,
		__brands: new Set([componentBrand.brandSymbol]),
		__availableRoles: roles.length > 0 ? roles : undefined,
		__roles: roles.length > 0 ? roles : undefined,
	}
}

// ============================================================================
// Selection Provider
// ============================================================================

/**
 * Creates the getSelection function for SelectionProvider interface.
 */
function createGetSelection(
	selectionsMap: Map<string, SelectionPropMeta>,
): SelectionProvider['getSelection'] {
	return (
		props: Record<string, unknown>,
		_collectNested,
	): SelectionFieldMeta[] | null => {
		const fields: SelectionFieldMeta[] = []

		for (const [propName, meta] of selectionsMap) {
			const propValue = props[propName]

			// Case 1: Prop is a field reference (from relation)
			if (propValue && typeof propValue === 'object' && FIELD_REF_META in propValue) {
				const refMeta = (propValue as { [FIELD_REF_META]: { path: string[]; fieldName: string } })[FIELD_REF_META]

				for (const [_key, field] of meta.selection.fields) {
					if (field.path.length === 1) {
						fields.push({
							...field,
							path: [...refMeta.path, ...field.path],
						})
					}
				}
			}
			// Case 2: Prop is an EntityRef from root level
			else if (propValue && typeof propValue === 'object' && 'id' in propValue && 'fields' in propValue) {
				for (const [_key, field] of meta.selection.fields) {
					if (field.path.length === 1) {
						fields.push({ ...field })
					}
				}
			}
		}

		return fields.length > 0 ? fields : null
	}
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Creates a new component builder with initial state.
 *
 * @param schemaRegistry - Optional schema registry for validation
 * @param roles - Optional role constraints
 */
export function createComponentBuilder<TSchema extends Record<string, object>>(
	schemaRegistry: SchemaRegistry<Record<string, object>> | null,
	roles: readonly string[] = [],
): ComponentBuilder<TSchema, ComponentBuilderState<TSchema, Record<string, never>, object, typeof roles>> {
	return new ComponentBuilderImpl(
		schemaRegistry,
		new Map(),
		roles,
	) as unknown as ComponentBuilder<TSchema, ComponentBuilderState<TSchema, Record<string, never>, object, typeof roles>>
}

// ============================================================================
// Type Guards & Utilities
// ============================================================================

/**
 * Type guard to check if a value is a component created with createComponent
 */
export function isBindxComponent(value: unknown): boolean {
	if (value === null || value === undefined) {
		return false
	}
	if (typeof value !== 'object' && typeof value !== 'function') {
		return false
	}
	return COMPONENT_MARKER in value && (value as Record<symbol, unknown>)[COMPONENT_MARKER] === true
}

/**
 * Gets the component brand from a bindx component
 */
export function getComponentBrand(component: unknown): ComponentBrand | undefined {
	if (!isBindxComponent(component)) {
		return undefined
	}
	return (component as unknown as Record<symbol, ComponentBrand>)[COMPONENT_BRAND]
}
