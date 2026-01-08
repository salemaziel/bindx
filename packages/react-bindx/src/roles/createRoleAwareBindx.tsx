/**
 * Factory for creating role-aware bindx hooks and components.
 *
 * This provides type-safe data binding with role-based schema narrowing.
 */

import React, { useMemo, memo, type ReactNode, type ReactElement, type ComponentType } from 'react'
import {
	RoleSchemaRegistry,
	type RoleSchemaDefinitions,
	type IntersectRoleSchemas,
	type EntityForRoles,
	type EntityNamesForRoles,
	type EntityRef,
	type SelectedEntityFields,
	SchemaRegistry,
	EntityHandle,
	resolveSelectionMeta,
	type SelectionInput,
	type SelectionBuilder,
	type FluentFragment,
	type SelectionMeta,
	createSelectionBuilder,
	SELECTION_META,
	ComponentBrand,
	AnyBrand,
	type RolesAreSubset,
} from '@contember/bindx'
import {
	createRoleContext,
	createUseRoleContext,
	EntityContext,
	type RoleContextValue,
	type EntityContextValue,
	useHasRoleContext,
	HasRoleProvider,
} from './RoleContext.js'
import { useBindxContext } from '../hooks/BackendAdapterContext.js'
import { useEntityCore } from '../hooks/useEntityCore.js'
import type { UseEntityOptions, EntityAccessorResult } from '../hooks/useEntityImpl.js'

// ============================================================================
// Helper Types
// ============================================================================

/**
 * Constraint for role schema maps that works with interfaces (no index signature required).
 */
type RoleSchemasBase<T> = { [K in keyof T]: { [E: string]: object } }

/**
 * Helper type to extract entity type with object constraint.
 */
type EntityForRolesObject<
	TRoleSchemas extends RoleSchemasBase<TRoleSchemas>,
	TRoles extends readonly (keyof TRoleSchemas)[],
	TEntityName extends string,
> = EntityForRoles<TRoleSchemas, TRoles, TEntityName> extends object
	? EntityForRoles<TRoleSchemas, TRoles, TEntityName>
	: object

// ============================================================================
// Role-Aware Fragment Factory Types
// ============================================================================

/**
 * Fragment factory that is aware of roles.
 * Creates typed SelectionBuilders restricted to specific roles.
 */
export interface RoleAwareFragmentFactory<
	TRoleSchemas extends RoleSchemasBase<TRoleSchemas>,
	TRoles extends readonly (keyof TRoleSchemas & string)[],
> {
	/**
	 * Creates a typed SelectionBuilder for the specified entity,
	 * using the intersection of all specified roles.
	 */
	fragment<E extends EntityNamesForRoles<TRoleSchemas, TRoles>>(
		entityName: E,
	): SelectionBuilder<EntityForRolesObject<TRoleSchemas, TRoles, E>>
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
 * Convert fragment config to props types with role-narrowed entity types.
 */
export type RoleAwareFragmentConfigToProps<
	TRoleSchemas extends RoleSchemasBase<TRoleSchemas>,
	TConfig,
	TRoles extends readonly (keyof TRoleSchemas & string)[],
> = {
	[K in keyof TConfig]: TConfig[K] extends SelectionBuilder<infer _M, infer R, infer _N>
		? EntityRef<
				EntityForRolesObject<TRoleSchemas, TRoles, string>,
				R,
				AnyBrand,
				string,
				TRoles
			>
		: never
}

/**
 * Fragment properties for role-aware explicit mode.
 * Includes role information in the fragment type.
 */
export type RoleAwareFragmentConfigToFragments<
	TConfig,
	TRoles extends readonly string[],
> = {
	[K in keyof TConfig as `$${K & string}`]: TConfig[K] extends SelectionBuilder<infer M, infer R, infer _N>
		? FluentFragment<M, R, AnyBrand, TRoles>
		: never
}

/**
 * Combined props = scalar props + entity props from fragments with roles.
 */
type RoleAwareCombinedPropsWithFragments<
	TRoleSchemas extends RoleSchemasBase<TRoleSchemas>,
	TScalarProps extends object,
	TConfig,
	TRoles extends readonly (keyof TRoleSchemas & string)[],
> = TScalarProps & RoleAwareFragmentConfigToProps<TRoleSchemas, TConfig, TRoles>

/**
 * Selection provider interface for JSX analysis
 */
interface SelectionProvider {
	getSelection: (
		props: Record<string, unknown>,
		collectNested: (element: ReactNode) => void,
	) => { fieldName: string; alias: string; path: string[]; isRelation: boolean; isArray: boolean; nested?: SelectionMeta }[] | null
}

/**
 * Metadata for entity prop selections
 */
interface SelectionPropMeta {
	selection: SelectionMeta
	fragment: FluentFragment<unknown, object, AnyBrand, readonly string[]>
}

/**
 * Symbol for component marker
 */
const COMPONENT_MARKER = Symbol('ROLE_AWARE_COMPONENT')

/**
 * Symbol for component selections
 */
const COMPONENT_SELECTIONS = Symbol('COMPONENT_SELECTIONS')

/**
 * Base component type with markers
 */
type RoleAwareBindxComponentBase<TProps extends object, TRoles extends readonly string[]> = ComponentType<TProps> &
	SelectionProvider & {
		readonly [COMPONENT_MARKER]: true
		readonly [COMPONENT_SELECTIONS]: Map<string, SelectionPropMeta>
		readonly __componentRoles: TRoles
	}

/**
 * Component type for role-aware explicit mode with fragments.
 */
export type RoleAwareExplicitFragmentComponent<
	TRoleSchemas extends RoleSchemasBase<TRoleSchemas>,
	TScalarProps extends object,
	TConfig,
	TRoles extends readonly (keyof TRoleSchemas & string)[],
> = RoleAwareBindxComponentBase<
	RoleAwareCombinedPropsWithFragments<TRoleSchemas, TScalarProps, TConfig, TRoles>,
	TRoles
> & RoleAwareFragmentConfigToFragments<TConfig, TRoles>

/**
 * Options for role-aware createComponent.
 */
export interface RoleAwareCreateComponentOptions<TRoles extends readonly string[]> {
	/** Roles that this component requires. Entity must have ALL these roles available. */
	roles: TRoles
}

/**
 * Role-aware createComponent function type.
 */
export type RoleAwareCreateComponent<TRoleSchemas extends RoleSchemasBase<TRoleSchemas>> = {
	/**
	 * Creates a component with explicit role restrictions and fragment definitions.
	 *
	 * @example
	 * ```typescript
	 * const AdminArticleCard = createComponent({
	 *   roles: ['admin'] as const,
	 * }, (it) => ({
	 *   article: it.fragment('Article').internalNotes().title(),
	 * }), ({ article }) => (
	 *   <div>{article.data?.internalNotes}</div>
	 * ))
	 * ```
	 */
	<
		const TRoles extends readonly (keyof TRoleSchemas & string)[],
		TConfig extends Record<string, SelectionBuilder<object, object, object>>,
	>(
		options: RoleAwareCreateComponentOptions<TRoles>,
		definer: (factory: RoleAwareFragmentFactory<TRoleSchemas, TRoles>) => TConfig,
		render: (props: RoleAwareCombinedPropsWithFragments<TRoleSchemas, object, TConfig, TRoles>) => ReactNode,
	): RoleAwareExplicitFragmentComponent<TRoleSchemas, object, TConfig, TRoles>

	/**
	 * Creates a component with scalar props, role restrictions, and fragment definitions.
	 *
	 * @example
	 * ```typescript
	 * const AdminArticleCard = createComponent<{ showNotes?: boolean }>()({
	 *   roles: ['admin'] as const,
	 * }, (it) => ({
	 *   article: it.fragment('Article').internalNotes().title(),
	 * }), ({ article, showNotes }) => (
	 *   <div>
	 *     <h1>{article.data?.title}</h1>
	 *     {showNotes && <p>{article.data?.internalNotes}</p>}
	 *   </div>
	 * ))
	 * ```
	 */
	<TScalarProps extends object>(): <
		const TRoles extends readonly (keyof TRoleSchemas & string)[],
		TConfig extends Record<string, SelectionBuilder<object, object, object>>,
	>(
		options: RoleAwareCreateComponentOptions<TRoles>,
		definer: (factory: RoleAwareFragmentFactory<TRoleSchemas, TRoles>) => TConfig,
		render: (props: RoleAwareCombinedPropsWithFragments<TRoleSchemas, TScalarProps, TConfig, TRoles>) => ReactNode,
	) => RoleAwareExplicitFragmentComponent<TRoleSchemas, TScalarProps, TConfig, TRoles>
}

// ============================================================================
// Entity Component Types
// ============================================================================

/**
 * Props for Entity component with optional roles.
 */
export interface RoleAwareEntityProps<
	TRoleSchemas extends RoleSchemasBase<TRoleSchemas>,
	TEntityName extends string,
	TRoles extends readonly (keyof TRoleSchemas & string)[] | undefined,
> {
	/** Entity type name */
	name: TEntityName

	/** Entity ID */
	id: string

	/** Optional roles - when provided, entity type is narrowed to intersection of these roles */
	roles?: TRoles

	/** Render function receiving typed entity ref */
	children: TRoles extends readonly (keyof TRoleSchemas & string)[]
		? (entity: EntityRef<
				EntityForRolesObject<TRoleSchemas, TRoles, TEntityName>,
				EntityForRolesObject<TRoleSchemas, TRoles, TEntityName>,
				AnyBrand,
				TEntityName,
				TRoles
			>) => ReactNode
		: (entity: EntityRef<object, object, AnyBrand, TEntityName, readonly string[]>) => ReactNode
}

/**
 * Entity component type that accepts optional roles prop.
 */
export type RoleAwareEntityComponent<TRoleSchemas extends RoleSchemasBase<TRoleSchemas>> = <
	TEntityName extends string,
	const TRoles extends readonly (keyof TRoleSchemas & string)[] | undefined = undefined,
>(
	props: RoleAwareEntityProps<TRoleSchemas, TEntityName, TRoles>,
) => ReactElement | null

// ============================================================================
// HasRole Component Types
// ============================================================================

/**
 * Extract available roles from EntityRef type.
 */
type ExtractAvailableRoles<T> = T extends EntityRef<any, any, any, any, infer TRoles> ? TRoles : readonly string[]

/**
 * Extract entity name from EntityRef type.
 */
type ExtractEntityName<T> = T extends EntityRef<any, any, any, infer TName, any> ? TName : string

/**
 * Props for HasRole component.
 */
export interface HasRoleProps<
	TRoleSchemas extends RoleSchemasBase<TRoleSchemas>,
	TEntityRef extends EntityRef<any, any, any, any, any>,
	TNewRoles extends readonly (ExtractAvailableRoles<TEntityRef>[number] & string)[],
> {
	/** Roles to narrow scope to */
	roles: TNewRoles

	/** Parent entity reference */
	entity: TEntityRef

	/** Render function receiving entity ref with narrowed type */
	children: (
		entity: EntityRef<
			EntityForRolesObject<TRoleSchemas, TNewRoles, ExtractEntityName<TEntityRef>>,
			EntityForRolesObject<TRoleSchemas, TNewRoles, ExtractEntityName<TEntityRef>>,
			AnyBrand,
			ExtractEntityName<TEntityRef>,
			TNewRoles
		>,
	) => ReactNode
}

/**
 * HasRole component type.
 */
export type HasRoleComponent<TRoleSchemas extends RoleSchemasBase<TRoleSchemas>> = <
	TEntityRef extends EntityRef<any, any, any, any, any>,
	const TNewRoles extends readonly (ExtractAvailableRoles<TEntityRef>[number] & string)[],
>(
	props: HasRoleProps<TRoleSchemas, TEntityRef, TNewRoles>,
) => ReactElement | null

// ============================================================================
// useEntity Hook Type
// ============================================================================

/**
 * Role-aware useEntity hook type.
 */
export type RoleAwareUseEntity<TRoleSchemas extends RoleSchemasBase<TRoleSchemas>> = <
	TEntityName extends string,
	TResult extends object,
	const TRoles extends readonly (keyof TRoleSchemas & string)[] | undefined = undefined,
>(
	entityType: TEntityName,
	options: UseEntityOptions & { roles?: TRoles },
	definer: TRoles extends readonly (keyof TRoleSchemas & string)[]
		? SelectionInput<EntityForRolesObject<TRoleSchemas, TRoles, TEntityName>, TResult>
		: SelectionInput<object, TResult>,
) => EntityAccessorResult<
	TRoles extends readonly (keyof TRoleSchemas & string)[]
		? EntityForRolesObject<TRoleSchemas, TRoles, TEntityName>
		: object,
	TResult
>

// ============================================================================
// Factory Return Type
// ============================================================================

export interface RoleAwareBindx<TRoleSchemas extends RoleSchemasBase<TRoleSchemas>> {
	/** The role schema registry */
	roleSchemaRegistry: RoleSchemaRegistry<TRoleSchemas>

	/** Provider for hasRole function - wrap at app level */
	RoleAwareProvider: typeof HasRoleProvider

	/** Entity component with optional roles prop */
	Entity: RoleAwareEntityComponent<TRoleSchemas>

	/** HasRole component for conditional rendering and type narrowing */
	HasRole: HasRoleComponent<TRoleSchemas>

	/** Hook for fetching entities with optional roles */
	useEntity: RoleAwareUseEntity<TRoleSchemas>

	/** Hook to access role context */
	useRoleContext: () => RoleContextValue<TRoleSchemas>

	/**
	 * Creates a role-aware component with typed fragments.
	 *
	 * @example
	 * ```typescript
	 * const AdminArticleCard = createComponent({
	 *   roles: ['admin'] as const,
	 * }, (it) => ({
	 *   article: it.fragment('Article').internalNotes().title(),
	 * }), ({ article }) => (
	 *   <div>{article.data?.internalNotes}</div>
	 * ))
	 *
	 * // Using fragment - type error if scope doesn't include 'admin'
	 * <Entity name="Article" id={id} roles={['editor', 'admin']}>
	 *   {article => <AdminArticleCard article={article} />}
	 * </Entity>
	 * ```
	 */
	createComponent: RoleAwareCreateComponent<TRoleSchemas>
}

// ============================================================================
// Factory
// ============================================================================

/**
 * Creates role-aware bindx hooks and components.
 *
 * @example
 * ```typescript
 * interface RoleSchemas {
 *   public: { Article: PublicArticle; Author: PublicAuthor }
 *   editor: { Article: EditorArticle; Author: EditorAuthor }
 *   admin: { Article: AdminArticle; Author: AdminAuthor }
 * }
 *
 * const { RoleAwareProvider, Entity, HasRole } = createRoleAwareBindx<RoleSchemas>({
 *   public: publicSchemaDefinition,
 *   editor: editorSchemaDefinition,
 *   admin: adminSchemaDefinition,
 * })
 *
 * // Usage - provider at app level:
 * <RoleAwareProvider hasRole={(role) => userRoles.has(role)}>
 *   <App />
 * </RoleAwareProvider>
 *
 * // Usage - Entity with roles:
 * <Entity name="Article" id={id} roles={['editor', 'admin']}>
 *   {article => (
 *     <>
 *       <div>{article.data?.title}</div>
 *       <HasRole roles={['admin']} entity={article}>
 *         {adminArticle => <div>{adminArticle.data?.internalNotes}</div>}
 *       </HasRole>
 *     </>
 *   )}
 * </Entity>
 * ```
 */
export function createRoleAwareBindx<TRoleSchemas extends RoleSchemasBase<TRoleSchemas>>(
	schemas: RoleSchemaDefinitions<TRoleSchemas>,
): RoleAwareBindx<TRoleSchemas> {
	// Create the role schema registry
	const roleSchemaRegistry = new RoleSchemaRegistry(schemas)

	// Create the role context
	const RoleContextInstance = createRoleContext<TRoleSchemas>()
	const useRoleContext = createUseRoleContext(RoleContextInstance)

	// Create SchemaRegistry instances for each role (cached)
	const schemaRegistries = new Map<keyof TRoleSchemas, SchemaRegistry>()
	for (const role of roleSchemaRegistry.getRoleNames()) {
		schemaRegistries.set(role, roleSchemaRegistry.getSchemaForRole(role))
	}

	/**
	 * Role-aware useEntity hook.
	 */
	function useEntityHook<
		TEntityName extends string,
		TResult extends object,
		const TRoles extends readonly (keyof TRoleSchemas & string)[] | undefined = undefined,
	>(
		entityType: TEntityName,
		options: UseEntityOptions & { roles?: TRoles },
		definer: SelectionInput<object, TResult>,
	): EntityAccessorResult<object, TResult> {
		const { store, dispatcher } = useBindxContext()
		const { roles } = options

		// Get schema for first role (or use first available)
		const primaryRole = roles?.[0] ?? roleSchemaRegistry.getRoleNames()[0]
		const primarySchema = primaryRole ? schemaRegistries.get(primaryRole) : undefined

		if (!primarySchema) {
			throw new Error('No schema available for roles')
		}

		const selectionMeta = useMemo(
			() => resolveSelectionMeta(definer),
			// eslint-disable-next-line react-hooks/exhaustive-deps
			[entityType],
		)

		// Use core hook for data loading
		const coreResult = useEntityCore({
			entityType,
			id: options.id,
			selectionMeta,
			cache: options.cache,
		})

		// Create stable handle
		const handle = useMemo(
			() => new EntityHandle<object, TResult>(
				options.id,
				entityType,
				store,
				dispatcher,
				primarySchema as SchemaRegistry<Record<string, object>>,
			),
			// eslint-disable-next-line react-hooks/exhaustive-deps
			[options.id, entityType],
		)

		// Build accessor from core result
		return useMemo((): EntityAccessorResult<object, TResult> => {
			if (coreResult.status === 'loading') {
				return {
					status: 'loading',
					isLoading: true,
					isError: false,
					isPersisting: false,
					isDirty: false,
					id: options.id,
					get fields(): never { throw new Error('Cannot access fields while loading') },
					get data(): never { throw new Error('Cannot access data while loading') },
					async persist() {},
					reset() {},
				}
			}

			if (coreResult.status === 'error' || coreResult.status === 'not_found') {
				return {
					status: 'error',
					isLoading: false,
					isError: true,
					error: coreResult.error ?? new Error('Entity not found'),
					isPersisting: false,
					isDirty: false,
					id: options.id,
					get fields(): never { throw new Error('Cannot access fields after error') },
					get data(): never { throw new Error('Cannot access data after error') },
					async persist() {},
					reset() {},
				}
			}

			// Ready state
			const snapshot = coreResult.snapshot!

			return {
				status: 'ready',
				isLoading: false,
				isError: false,
				isPersisting: coreResult.isPersisting,
				get isDirty() { return handle.isDirty },
				id: options.id,
				fields: handle.fields as SelectedEntityFields<object, TResult>,
				data: snapshot.data as TResult,
				async persist() {},
				reset() { handle.reset() },
			}
		}, [coreResult, options.id, handle])
	}

	/**
	 * Entity component with optional roles prop.
	 */
	function EntityComponent<
		TEntityName extends string,
		const TRoles extends readonly (keyof TRoleSchemas & string)[] | undefined = undefined,
	>({
		name,
		id,
		roles,
		children: renderFn,
	}: RoleAwareEntityProps<TRoleSchemas, TEntityName, TRoles>): ReactElement | null {
		const { store, dispatcher } = useBindxContext()

		// Get schema for first role
		const primaryRole = roles?.[0] ?? roleSchemaRegistry.getRoleNames()[0]
		const primarySchema = primaryRole ? schemaRegistries.get(primaryRole) : undefined

		if (!primarySchema) {
			throw new Error('No schema available for roles')
		}

		// For POC, just use a simple identity selection
		const result = useEntityHook(
			name,
			{ id, roles },
			(e: any) => e.id(),
		)

		if (result.status === 'loading' || result.status === 'error') {
			return null
		}

		// Create EntityRef with available roles
		const entityRef: EntityRef<object, object, AnyBrand, TEntityName, TRoles extends readonly string[] ? TRoles : readonly string[]> = {
			id: result.id,
			fields: result.fields as SelectedEntityFields<object, object>,
			data: result.data,
			isDirty: result.isDirty,
			__entityType: undefined as unknown as object,
			__entityName: name,
			__availableRoles: (roles ?? []) as TRoles extends readonly string[] ? TRoles : readonly string[],
		}

		// Provide entity context for HasRole
		const entityContext: EntityContextValue = {
			entityType: name,
			entityId: id,
			storeKey: `${name}:${id}`,
		}

		return (
			<EntityContext.Provider value={entityContext}>
				{(renderFn as (entity: typeof entityRef) => ReactNode)(entityRef)}
			</EntityContext.Provider>
		)
	}

	/**
	 * HasRole component - conditionally renders with narrowed role scope.
	 * Reads hasRole function from context (HasRoleProvider).
	 */
	function HasRoleComponent<
		TEntityRef extends EntityRef<any, any, any, any, any>,
		const TNewRoles extends readonly (ExtractAvailableRoles<TEntityRef>[number] & string)[],
	>({
		roles: requestedRoles,
		entity,
		children: renderFn,
	}: HasRoleProps<TRoleSchemas, TEntityRef, TNewRoles>): ReactElement | null {
		const hasRoleContext = useHasRoleContext()

		if (!hasRoleContext) {
			throw new Error('HasRole requires RoleAwareProvider (HasRoleProvider) to be present in the component tree')
		}

		const { hasRole } = hasRoleContext

		// Validate: requested roles must be subset of available roles
		const availableRoles = entity.__availableRoles
		if (availableRoles.length > 0) {
			const invalidRoles = requestedRoles.filter(
				role => !availableRoles.includes(role),
			)
			if (invalidRoles.length > 0) {
				throw new Error(
					`HasRole: roles [${invalidRoles.map(String).join(', ')}] are not available. ` +
					`Available roles: [${availableRoles.map(String).join(', ')}]`,
				)
			}
		}

		// Runtime check - does user have ALL requested roles?
		const missingRoles = requestedRoles.filter(role => !hasRole(role))
		if (missingRoles.length > 0) {
			return null // User doesn't have all required roles
		}

		// Create new entity ref with narrowed available roles
		const narrowedEntityRef = {
			...entity,
			__availableRoles: requestedRoles,
		}

		return <>{renderFn(narrowedEntityRef as any)}</>
	}

	/**
	 * Role-aware createComponent implementation.
	 */
	function createComponentImpl<
		const TRoles extends readonly (keyof TRoleSchemas & string)[],
		TScalarProps extends object,
		TConfig extends Record<string, SelectionBuilder<object, object, object>>,
	>(
		optionsOrNothing?: RoleAwareCreateComponentOptions<TRoles>,
	): unknown {
		// Signature 2: createComponent<ScalarProps>() - returns builder
		if (optionsOrNothing === undefined) {
			return <
				const TRoles2 extends readonly (keyof TRoleSchemas & string)[],
				TConfig2 extends Record<string, SelectionBuilder<object, object, object>>,
			>(
				options: RoleAwareCreateComponentOptions<TRoles2>,
				definer: (factory: RoleAwareFragmentFactory<TRoleSchemas, TRoles2>) => TConfig2,
				render: (props: RoleAwareCombinedPropsWithFragments<TRoleSchemas, TScalarProps, TConfig2, TRoles2>) => ReactNode,
			) => {
				return createRoleAwareComponent<TRoles2, TScalarProps, TConfig2>(options, definer, render)
			}
		}

		// Will be called with definer and render in the actual implementation
		// This function returns a builder for the two-arg case
		return (
			definer: (factory: RoleAwareFragmentFactory<TRoleSchemas, TRoles>) => TConfig,
			render: (props: RoleAwareCombinedPropsWithFragments<TRoleSchemas, TScalarProps, TConfig, TRoles>) => ReactNode,
		) => {
			return createRoleAwareComponent<TRoles, TScalarProps, TConfig>(
				optionsOrNothing as RoleAwareCreateComponentOptions<TRoles>,
				definer,
				render,
			)
		}
	}

	/**
	 * Creates a role-aware component with explicit fragment definitions.
	 */
	function createRoleAwareComponent<
		const TRoles extends readonly (keyof TRoleSchemas & string)[],
		TScalarProps extends object,
		TConfig extends Record<string, SelectionBuilder<object, object, object>>,
	>(
		options: RoleAwareCreateComponentOptions<TRoles>,
		definer: (factory: RoleAwareFragmentFactory<TRoleSchemas, TRoles>) => TConfig,
		render: (props: RoleAwareCombinedPropsWithFragments<TRoleSchemas, TScalarProps, TConfig, TRoles>) => ReactNode,
	): RoleAwareExplicitFragmentComponent<TRoleSchemas, TScalarProps, TConfig, TRoles> {
		const { roles } = options
		const selectionsMap = new Map<string, SelectionPropMeta>()

		// Generate unique brand for this component
		const componentBrand = new ComponentBrand(`role_aware_${roles.join('_')}_${Math.random().toString(36).slice(2)}`)

		// Create the role-aware fragment factory
		// The runtime doesn't actually use the entity name, but the type system uses it for inference
		const fragmentFactory = {
			fragment<E extends EntityNamesForRoles<TRoleSchemas, TRoles>>(_entityName: E) {
				return createSelectionBuilder<EntityForRolesObject<TRoleSchemas, TRoles, E>>()
			},
		} as RoleAwareFragmentFactory<TRoleSchemas, TRoles>

		// Execute definer to get fragment config
		const config = definer(fragmentFactory)

		// Process each fragment in config
		for (const [propName, builder] of Object.entries(config)) {
			// Get SelectionMeta from the builder
			const selection = (builder as SelectionBuilder<object, object, object>)[SELECTION_META]

			const fragment: FluentFragment<unknown, object, typeof componentBrand, TRoles> = {
				__meta: selection,
				__resultType: {} as object,
				__modelType: undefined as unknown,
				__isFragment: true,
				__brand: componentBrand,
				__brands: new Set([componentBrand.brandSymbol]),
				__availableRoles: roles,
				__roles: roles,
			}

			selectionsMap.set(propName, { selection, fragment })
		}

		// Create React component
		function ComponentImpl(props: RoleAwareCombinedPropsWithFragments<TRoleSchemas, TScalarProps, TConfig, TRoles>): ReactNode {
			return render(props)
		}

		const MemoizedComponent = memo(ComponentImpl) as unknown as
			RoleAwareBindxComponentBase<RoleAwareCombinedPropsWithFragments<TRoleSchemas, TScalarProps, TConfig, TRoles>, TRoles>

		// SelectionProvider for JSX analysis
		MemoizedComponent.getSelection = (_props, _collectNested) => {
			const fields: { fieldName: string; alias: string; path: string[]; isRelation: boolean; isArray: boolean; nested?: SelectionMeta }[] = []
			for (const [_propName, meta] of selectionsMap) {
				for (const [_key, field] of meta.selection.fields) {
					fields.push({ ...field })
				}
			}
			return fields.length > 0 ? fields : null
		}

		// Add markers
		const comp = MemoizedComponent as unknown as Record<symbol, unknown>
		comp[COMPONENT_MARKER] = true
		comp[COMPONENT_SELECTIONS] = selectionsMap
		;(MemoizedComponent as unknown as { __componentRoles: TRoles }).__componentRoles = roles

		// Add $propName properties with role info
		const result = MemoizedComponent as unknown as Record<string, unknown>
		for (const [propName, meta] of selectionsMap) {
			result[`$${propName}`] = meta.fragment
		}

		return result as RoleAwareExplicitFragmentComponent<TRoleSchemas, TScalarProps, TConfig, TRoles>
	}

	// Wrapper function to match the overloaded signature
	function roleAwareCreateComponent<
		const TRoles extends readonly (keyof TRoleSchemas & string)[],
		TConfig extends Record<string, SelectionBuilder<object, object, object>>,
	>(
		options: RoleAwareCreateComponentOptions<TRoles>,
		definer: (factory: RoleAwareFragmentFactory<TRoleSchemas, TRoles>) => TConfig,
		render: (props: RoleAwareCombinedPropsWithFragments<TRoleSchemas, object, TConfig, TRoles>) => ReactNode,
	): RoleAwareExplicitFragmentComponent<TRoleSchemas, object, TConfig, TRoles>
	function roleAwareCreateComponent<TScalarProps extends object>(): <
		const TRoles extends readonly (keyof TRoleSchemas & string)[],
		TConfig extends Record<string, SelectionBuilder<object, object, object>>,
	>(
		options: RoleAwareCreateComponentOptions<TRoles>,
		definer: (factory: RoleAwareFragmentFactory<TRoleSchemas, TRoles>) => TConfig,
		render: (props: RoleAwareCombinedPropsWithFragments<TRoleSchemas, TScalarProps, TConfig, TRoles>) => ReactNode,
	) => RoleAwareExplicitFragmentComponent<TRoleSchemas, TScalarProps, TConfig, TRoles>
	function roleAwareCreateComponent<
		const TRoles extends readonly (keyof TRoleSchemas & string)[],
		TScalarProps extends object = object,
		TConfig extends Record<string, SelectionBuilder<object, object, object>> = Record<string, SelectionBuilder<object, object, object>>,
	>(
		options?: RoleAwareCreateComponentOptions<TRoles>,
		definer?: (factory: RoleAwareFragmentFactory<TRoleSchemas, TRoles>) => TConfig,
		render?: (props: RoleAwareCombinedPropsWithFragments<TRoleSchemas, TScalarProps, TConfig, TRoles>) => ReactNode,
	): unknown {
		// Signature 2: createComponent<ScalarProps>() - returns builder function
		if (options === undefined) {
			return <
				const TRoles2 extends readonly (keyof TRoleSchemas & string)[],
				TConfig2 extends Record<string, SelectionBuilder<object, object, object>>,
			>(
				innerOptions: RoleAwareCreateComponentOptions<TRoles2>,
				innerDefiner: (factory: RoleAwareFragmentFactory<TRoleSchemas, TRoles2>) => TConfig2,
				innerRender: (props: RoleAwareCombinedPropsWithFragments<TRoleSchemas, TScalarProps, TConfig2, TRoles2>) => ReactNode,
			) => {
				return createRoleAwareComponent<TRoles2, TScalarProps, TConfig2>(innerOptions, innerDefiner, innerRender)
			}
		}

		// Signature 1: createComponent(options, definer, render)
		if (definer && render) {
			return createRoleAwareComponent<TRoles, TScalarProps, TConfig>(options, definer, render)
		}

		throw new Error('Invalid createComponent arguments')
	}

	return {
		roleSchemaRegistry,
		RoleAwareProvider: HasRoleProvider,
		Entity: EntityComponent as RoleAwareEntityComponent<TRoleSchemas>,
		HasRole: HasRoleComponent as HasRoleComponent<TRoleSchemas>,
		useEntity: useEntityHook as RoleAwareUseEntity<TRoleSchemas>,
		useRoleContext,
		createComponent: roleAwareCreateComponent as RoleAwareCreateComponent<TRoleSchemas>,
	}
}

// Re-export for backwards compatibility
export { HasRoleProvider as RoleAwareProvider } from './RoleContext.js'
