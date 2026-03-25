export {
	BindxProvider,
	useBackendAdapter,
	useSnapshotStore,
	useDispatcher,
	useBatchPersister,
	useBindxContext,
	useSchemaRegistry,
	type BindxProviderProps,
	type BindxContextValue,
	type BindxGraphQlClient,
} from './BackendAdapterContext.js'

export {
	usePersist,
	usePersistEntity,
	type PersistApi,
	type EntityPersistApi,
	type AnyRefWithMeta,
} from './usePersist.js'

export {
	useEntity,
	type UseEntityOptions,
	type LoadingEntityResult,
	type ErrorEntityResult,
	type NotFoundEntityResult,
	type ReadyEntityResult,
	type UseEntityResult,
} from './useEntity.js'

export {
	useEntityList,
	type UseEntityListOptions,
	type LoadingEntityListResult,
	type ErrorEntityListResult,
	type ReadyEntityListResult,
	type UseEntityListResult,
} from './useEntityList.js'

export {
	ContemberBindxProvider,
	schemaNamesToDef,
} from './ContemberBindxProvider.js'

export { useUndo, type UndoHookResult } from './useUndo.js'

export {
	useOnEvent,
	useOnEntityEvent,
	useOnFieldEvent,
	useIntercept,
	useInterceptEntity,
	useInterceptField,
} from './useBindxEvents.js'

export { useEntityBeforePersist } from './useEntityBeforePersist.js'

export {
	useEntityErrors,
	type EntityErrorsState,
} from './useErrors.js'
