/**
 * Role-based schema components for React Bindx.
 *
 * @packageDocumentation
 */

export type {
	RoleContextValue,
	EntityContextValue,
	HasRoleProviderValue,
	HasRoleProviderProps,
} from './RoleContext.js'

export {
	EntityContext,
	useEntityContext,
	createRoleContext,
	createUseRoleContext,
	HasRoleProvider,
	useHasRoleContext,
} from './RoleContext.js'

export type {
	RoleAwareEntityProps,
	RoleAwareEntityComponent,
	HasRoleProps,
	HasRoleComponent,
	RoleAwareUseEntity,
	RoleAwareBindx,
	RoleAwareFragmentFactory,
	RoleAwareFragmentConfigToProps,
	RoleAwareFragmentConfigToFragments,
	RoleAwareExplicitFragmentComponent,
	RoleAwareCreateComponentOptions,
	RoleAwareCreateComponent,
} from './createRoleAwareBindx.js'

export {
	createRoleAwareBindx,
	RoleAwareProvider,
} from './createRoleAwareBindx.js'
