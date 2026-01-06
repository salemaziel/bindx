import type { ReactNode, ComponentType } from 'react'
import { memo } from 'react'
import type { EntityRef, SelectionProvider } from './types.js'
import { BINDX_COMPONENT, FIELD_REF_META } from './types.js'
import type { FluentFragment, SelectionMeta, SelectionFieldMeta, SelectionBuilder, AnyBrand } from '@contember/bindx'
import { SELECTION_META, ComponentBrand } from '@contember/bindx'
import { createSelectionBuilder } from '@contember/bindx'
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
// Type Helpers - Implicit mode (from props interface)
// ============================================================================

/**
 * Extract keys from props type where value is EntityRef<any, any>
 */
export type EntityPropKeys<P> = {
	[K in keyof P]: P[K] extends EntityRef<infer _T, infer _S> ? K : never
}[keyof P]

/**
 * Extract the full entity type from an EntityRef prop
 */
export type EntityFromProp<P, K extends keyof P> = P[K] extends EntityRef<infer T, infer _S> ? T : never

/**
 * Extract the selection type from an EntityRef prop
 */
export type SelectionFromProp<P, K extends keyof P> = P[K] extends EntityRef<infer _T, infer S> ? S : never

/**
 * Fragment properties for implicit mode - $propName for each entity prop
 */
export type ImplicitFragmentProperties<P> = {
	[K in EntityPropKeys<P> as `$${K & string}`]: FluentFragment<EntityFromProp<P, K>, SelectionFromProp<P, K>>
}

// ============================================================================
// Type Helpers - Explicit mode (factory-based)
// ============================================================================

/**
 * Fragment factory interface - creates typed SelectionBuilders
 */
export interface FragmentFactory<TModels> {
	/**
	 * Creates a typed SelectionBuilder for the specified entity
	 */
	fragment<E extends keyof TModels & string>(entityName: E): SelectionBuilder<TModels[E]>
}

/**
 * Extract model type from SelectionBuilder
 */
type ExtractBuilderModel<T> = T extends SelectionBuilder<infer M, infer _R, infer _N> ? M : never

/**
 * Extract result type from SelectionBuilder
 */
type ExtractBuilderResult<T> = T extends SelectionBuilder<infer _M, infer R, infer _N> ? R : never

/**
 * Convert fragment config to props types (EntityRef with corresponding selection)
 */
export type FragmentConfigToProps<TConfig> = {
	[K in keyof TConfig]: EntityRef<
		ExtractBuilderModel<TConfig[K]>,
		ExtractBuilderResult<TConfig[K]>
	>
}

/**
 * Fragment properties for explicit mode - $propName for each fragment key
 */
export type FragmentConfigToFragments<TConfig> = {
	[K in keyof TConfig as `$${K & string}`]: TConfig[K] extends SelectionBuilder<infer M, infer R, infer _N>
		? FluentFragment<M, R>
		: never
}

/**
 * Combined props = scalar props + entity props from fragments
 */
type CombinedPropsWithFragments<TScalarProps extends object, TConfig> =
	TScalarProps & FragmentConfigToProps<TConfig>

// ============================================================================
// Result Component Types
// ============================================================================

/**
 * Metadata for entity prop selections
 */
export interface SelectionPropMeta {
	selection: SelectionMeta
	fragment: FluentFragment<unknown, object>
}

/**
 * Base component type with markers
 */
type BindxComponentBase<TProps extends object> = ComponentType<TProps> &
	SelectionProvider & {
		readonly [COMPONENT_MARKER]: true
		readonly [COMPONENT_SELECTIONS]: Map<string, SelectionPropMeta>
	}

/**
 * Component type for implicit mode (infers fragments from props interface)
 */
type ImplicitComponent<P extends object> = BindxComponentBase<P> & ImplicitFragmentProperties<P>

/**
 * Component type for explicit mode with fragments
 */
type ExplicitFragmentComponent<TScalarProps extends object, TConfig> =
	BindxComponentBase<CombinedPropsWithFragments<TScalarProps, TConfig>> &
	FragmentConfigToFragments<TConfig>

// ============================================================================
// Implicit Mode - createComponent (standalone)
// ============================================================================

/**
 * Creates a bindx component with automatic dependency collection from JSX.
 *
 * Use this for simple components where dependencies can be
 * automatically inferred from JSX field accesses.
 *
 * @example
 * ```tsx
 * interface AuthorCardProps {
 *   author: EntityRef<Author, { name: string; email: string }>
 *   showEmail?: boolean
 * }
 *
 * const AuthorCard = createComponent<AuthorCardProps>(({ author, showEmail }) => (
 *   <div>
 *     <Field field={author.fields.name} />
 *     {showEmail && <Field field={author.fields.email} />}
 *   </div>
 * ))
 *
 * // Fragment for useEntity:
 * const article = useEntity('Article', { id }, e =>
 *   e.title().author(AuthorCard.$author)
 * )
 * ```
 */
export function createComponent<P extends object>(
	render: (props: P) => ReactNode,
): ImplicitComponent<P> {
	return createImplicitComponent(render)
}

// ============================================================================
// Explicit Mode - createComponentFactory (for createBindx)
// ============================================================================

/**
 * Creates a schema-aware createComponent function.
 * Used internally by createBindx.
 */
export function createComponentFactory<TModels extends Record<string, object>>() {
	// Create the fragment factory
	const fragmentFactory: FragmentFactory<TModels> = {
		fragment<E extends keyof TModels & string>(_entityName: E): SelectionBuilder<TModels[E]> {
			return createSelectionBuilder<TModels[E]>()
		},
	}

	/**
	 * Creates a bindx component with explicitly defined entity dependencies.
	 * Entity types are inferred from the schema.
	 *
	 * @example
	 * ```tsx
	 * const { createComponent } = createBindx(schema)
	 *
	 * // Without scalar props
	 * const AuthorCard = createComponent(
	 *   it => ({
	 *     author: it.fragment('Author').name().email(),
	 *   }),
	 *   ({ author }) => (
	 *     <div>{author.data?.name}</div>
	 *   )
	 * )
	 *
	 * // With scalar props
	 * const AuthorCard = createComponent<{ showEmail?: boolean }>()(
	 *   it => ({
	 *     author: it.fragment('Author').name().email(),
	 *   }),
	 *   ({ author, showEmail }) => (
	 *     <div>{author.data?.name}</div>
	 *   )
	 * )
	 * ```
	 */
	// Signature 1: No scalar props - two arguments
	function schemaCreateComponent<TConfig extends object>(
		definer: (factory: FragmentFactory<TModels>) => TConfig,
		render: (props: FragmentConfigToProps<TConfig>) => ReactNode,
	): ExplicitFragmentComponent<object, TConfig>

	// Signature 2: With scalar props (builder pattern) - zero arguments, returns function
	function schemaCreateComponent<TScalarProps extends object>(): <TConfig extends object>(
		definer: (factory: FragmentFactory<TModels>) => TConfig,
		render: (props: CombinedPropsWithFragments<TScalarProps, TConfig>) => ReactNode,
	) => ExplicitFragmentComponent<TScalarProps, TConfig>

	// Signature 3: Implicit mode - single render function (same as standalone createComponent)
	function schemaCreateComponent<P extends object>(
		render: (props: P) => ReactNode,
	): ImplicitComponent<P>

	// Implementation - handles all cases
	function schemaCreateComponent<TScalarPropsOrConfig extends object, TConfig extends object = TScalarPropsOrConfig>(
		definerOrRenderOrNothing?: ((factory: FragmentFactory<TModels>) => TConfig) | ((props: TScalarPropsOrConfig) => ReactNode),
		maybeRender?: (props: FragmentConfigToProps<TConfig>) => ReactNode,
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
	): any {
		// Signature 2: createComponent<ScalarProps>() - returns builder
		if (definerOrRenderOrNothing === undefined) {
			return <TConfig extends object>(
				definer: (factory: FragmentFactory<TModels>) => TConfig,
				render: (props: CombinedPropsWithFragments<TScalarPropsOrConfig, TConfig>) => ReactNode,
			) => {
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				return createExplicitFragmentComponent<TScalarPropsOrConfig, TConfig>(
					fragmentFactory as unknown as FragmentFactory<object>,
					definer as unknown as (factory: FragmentFactory<object>) => TConfig,
					render,
				)
			}
		}

		// Signature 3: createComponent(render) - implicit mode
		if (maybeRender === undefined) {
			return createImplicitComponent(definerOrRenderOrNothing as (props: TScalarPropsOrConfig) => ReactNode)
		}

		// Signature 1: createComponent(definer, render)
		return createExplicitFragmentComponent<object, TConfig>(
			fragmentFactory as unknown as FragmentFactory<object>,
			definerOrRenderOrNothing as unknown as (factory: FragmentFactory<object>) => TConfig,
			maybeRender as unknown as (props: CombinedPropsWithFragments<object, TConfig>) => ReactNode,
		)
	}

	return schemaCreateComponent
}

// ============================================================================
// Implicit Mode Implementation
// ============================================================================

function createImplicitComponent<P extends object>(
	render: (props: P) => ReactNode,
): ImplicitComponent<P> {
	const selectionsMap = new Map<string, SelectionPropMeta>()

	// Generate unique brand for this component
	const componentBrand = new ComponentBrand(`implicit_${Math.random().toString(36).slice(2)}`)

	// Collect selections from JSX at component creation time
	const collectEntityProps = (): void => {
		const propCollectors = new Map<string, SelectionMetaCollector>()

		const propsProxy = new Proxy({} as P, {
			get(_target, propName: string | symbol): unknown {
				if (typeof propName === 'symbol') {
					return undefined
				}

				const selection = new SelectionMetaCollector()
				propCollectors.set(propName, selection)

				return createCollectorProxy<unknown>(selection)
			},
		})

		// Execute render to capture field accesses
		const jsx = render(propsProxy)

		// Analyze JSX tree for component-level selections
		const jsxSelection = collectSelection(jsx)

		// Create fragments for props that had field accesses
		for (const [propName, collector] of propCollectors) {
			if (collector.fields.size > 0) {
				mergeSelections(collector, jsxSelection)

				const fragment: FluentFragment<unknown, object, typeof componentBrand> = {
					__meta: collector,
					__resultType: {} as object,
					__modelType: undefined as unknown,
					__isFragment: true,
					__brand: componentBrand,
					__brands: new Set([componentBrand.brandSymbol]),
				}
				selectionsMap.set(propName, { selection: collector, fragment })
			}
		}
	}

	collectEntityProps()

	// Create React component
	function ComponentImpl(props: P): ReactNode {
		return render(props)
	}

	const MemoizedComponent = memo(ComponentImpl) as unknown as BindxComponentBase<P>

	// SelectionProvider for JSX analysis
	MemoizedComponent.getSelection = createGetSelection(selectionsMap)

	// Add markers
	assignMarkers(MemoizedComponent, selectionsMap)

	// Store component brand for runtime validation
	const comp = MemoizedComponent as unknown as Record<symbol, unknown>
	comp[COMPONENT_BRAND] = componentBrand

	// Add $propName properties
	const result = MemoizedComponent as unknown as Record<string, unknown>
	for (const [propName, meta] of selectionsMap) {
		result[`$${propName}`] = meta.fragment
	}

	return result as ImplicitComponent<P>
}

// ============================================================================
// Explicit Fragment Mode Implementation
// ============================================================================

function createExplicitFragmentComponent<
	TScalarProps extends object,
	TConfig extends object
>(
	factory: FragmentFactory<object>,
	definer: (factory: FragmentFactory<object>) => TConfig,
	render: (props: CombinedPropsWithFragments<TScalarProps, TConfig>) => ReactNode,
): ExplicitFragmentComponent<TScalarProps, TConfig> {
	const selectionsMap = new Map<string, SelectionPropMeta>()

	// Generate unique brand for this component
	const componentBrand = new ComponentBrand(`explicit_${Math.random().toString(36).slice(2)}`)

	// Execute definer to get fragment config
	const config = definer(factory)

	// Process each fragment in config
	for (const [propName, builder] of Object.entries(config)) {
		// Get SelectionMeta from the builder
		const selection = (builder as SelectionBuilder<object, object, object>)[SELECTION_META]

		const fragment: FluentFragment<unknown, object, typeof componentBrand> = {
			__meta: selection,
			__resultType: {} as object,
			__modelType: undefined as unknown,
			__isFragment: true,
			__brand: componentBrand,
			__brands: new Set([componentBrand.brandSymbol]),
		}

		selectionsMap.set(propName, { selection, fragment })
	}

	// Create React component
	function ComponentImpl(props: CombinedPropsWithFragments<TScalarProps, TConfig>): ReactNode {
		return render(props)
	}

	const MemoizedComponent = memo(ComponentImpl) as unknown as
		BindxComponentBase<CombinedPropsWithFragments<TScalarProps, TConfig>>

	// SelectionProvider for JSX analysis
	MemoizedComponent.getSelection = createGetSelection(selectionsMap)

	// Add markers
	assignMarkers(MemoizedComponent, selectionsMap)

	// Store component brand for runtime validation
	const comp = MemoizedComponent as unknown as Record<symbol, unknown>
	comp[COMPONENT_BRAND] = componentBrand

	// Add $propName properties
	const result = MemoizedComponent as unknown as Record<string, unknown>
	for (const [propName, meta] of selectionsMap) {
		result[`$${propName}`] = meta.fragment
	}

	return result as ExplicitFragmentComponent<TScalarProps, TConfig>
}

// ============================================================================
// Shared Helpers
// ============================================================================

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

function assignMarkers(
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	component: BindxComponentBase<any>,
	selectionsMap: Map<string, SelectionPropMeta>,
): void {
	const comp = component as unknown as Record<symbol, unknown>
	comp[BINDX_COMPONENT] = true
	comp[COMPONENT_MARKER] = true
	comp[COMPONENT_SELECTIONS] = selectionsMap
}

// ============================================================================
// Type Guards & Utilities
// ============================================================================

/**
 * Type guard to check if a value is a component created with createComponent
 */
export function isBindxComponent(value: unknown): value is BindxComponentBase<object> {
	if (value === null || value === undefined) {
		return false
	}
	if (typeof value !== 'object' && typeof value !== 'function') {
		return false
	}
	return (
		COMPONENT_MARKER in value &&
		(value as Record<symbol, unknown>)[COMPONENT_MARKER] === true
	)
}

/**
 * Flag to enable/disable brand validation.
 * Set to false in production for performance.
 */
let brandValidationEnabled = true

/**
 * Enables or disables brand validation.
 * Call with false in production to disable warnings.
 */
export function setBrandValidation(enabled: boolean): void {
	brandValidationEnabled = enabled
}

/**
 * Validates that an EntityRef has the required component brand.
 * Logs a warning in development mode if the brand is missing.
 *
 * @param entityRef - The EntityRef to validate
 * @param component - The component that requires the brand
 * @param propName - The prop name for error messages
 */
export function validateBrand(
	entityRef: { __brands?: Set<symbol> } | null | undefined,
	component: { [COMPONENT_BRAND]?: ComponentBrand },
	propName: string,
): void {
	if (!brandValidationEnabled) {
		return
	}

	if (!entityRef) {
		return
	}

	const componentBrand = component[COMPONENT_BRAND]
	if (!componentBrand) {
		return
	}

	const entityBrands = entityRef.__brands
	if (!entityBrands) {
		// EntityRef doesn't have brands yet (might be from legacy code)
		return
	}

	if (!entityBrands.has(componentBrand.brandSymbol)) {
		console.warn(
			`[bindx] EntityRef passed to "${propName}" is missing the required component brand. ` +
			`Use mergeFragments() to combine fragment selections when using multiple components. ` +
			`Expected brand: ${componentBrand.name}`,
		)
	}
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

/**
 * Merges multiple fragment selections into one.
 * Combines both the selection metadata and brand symbols.
 *
 * @example
 * ```tsx
 * const article = useEntity('Article', { id }, e =>
 *   e.author(mergeFragments(AuthorInfo.$author, AuthorCard.$author))
 * )
 * ```
 */
export function mergeFragments<T, R1 extends object, B1 extends AnyBrand>(
	fragment1: FluentFragment<T, R1, B1>,
): FluentFragment<T, R1, B1>
export function mergeFragments<T, R1 extends object, R2 extends object, B1 extends AnyBrand, B2 extends AnyBrand>(
	fragment1: FluentFragment<T, R1, B1>,
	fragment2: FluentFragment<T, R2, B2>,
): FluentFragment<T, R1 & R2, B1 | B2>
export function mergeFragments<T, R1 extends object, R2 extends object, R3 extends object, B1 extends AnyBrand, B2 extends AnyBrand, B3 extends AnyBrand>(
	fragment1: FluentFragment<T, R1, B1>,
	fragment2: FluentFragment<T, R2, B2>,
	fragment3: FluentFragment<T, R3, B3>,
): FluentFragment<T, R1 & R2 & R3, B1 | B2 | B3>
export function mergeFragments<T>(
	...fragments: FluentFragment<T, object, AnyBrand>[]
): FluentFragment<T, object, AnyBrand> {
	if (fragments.length === 0) {
		throw new Error('mergeFragments requires at least one fragment')
	}

	if (fragments.length === 1) {
		return fragments[0]!
	}

	const mergedSelection = new SelectionMetaCollector()
	const mergedBrands = new Set<symbol>()

	for (const fragment of fragments) {
		mergeSelections(mergedSelection, fragment.__meta)
		// Merge brand symbols from all fragments
		if (fragment.__brands) {
			fragment.__brands.forEach(b => mergedBrands.add(b))
		}
	}

	return {
		__meta: mergedSelection,
		__resultType: {} as object,
		__modelType: undefined as unknown as T,
		__isFragment: true,
		__brands: mergedBrands,
	}
}
