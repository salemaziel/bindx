import { createContext, useContext, type ReactNode } from 'react'
import type { BackendAdapter } from '../adapter/types.js'
import { IdentityMap } from '../store/IdentityMap.js'

/**
 * Context value containing adapter and identity map
 */
interface BindxContextValue {
	adapter: BackendAdapter
	identityMap: IdentityMap
}

const BindxContext = createContext<BindxContextValue | null>(null)

/**
 * Props for BindxProvider
 */
export interface BindxProviderProps {
	/** The backend adapter to use for data fetching/persistence */
	adapter: BackendAdapter
	/** Optional custom identity map (useful for testing) */
	identityMap?: IdentityMap
	children: ReactNode
}

/**
 * Provider component that supplies the backend adapter and identity map
 * to all child components using bindx hooks.
 *
 * @example
 * ```tsx
 * const adapter = new MockAdapter(initialData)
 *
 * function App() {
 *   return (
 *     <BindxProvider adapter={adapter}>
 *       <ArticleEditor id="123" />
 *     </BindxProvider>
 *   )
 * }
 * ```
 */
export function BindxProvider({ adapter, identityMap, children }: BindxProviderProps) {
	// Create or use provided identity map
	const map = identityMap ?? new IdentityMap()

	return <BindxContext.Provider value={{ adapter, identityMap: map }}>{children}</BindxContext.Provider>
}

/**
 * Hook to access the backend adapter.
 * Must be used within a BindxProvider.
 */
export function useBackendAdapter(): BackendAdapter {
	const context = useContext(BindxContext)
	if (!context) {
		throw new Error('useBackendAdapter must be used within a BindxProvider')
	}
	return context.adapter
}

/**
 * Hook to access the identity map.
 * Must be used within a BindxProvider.
 */
export function useIdentityMap(): IdentityMap {
	const context = useContext(BindxContext)
	if (!context) {
		throw new Error('useIdentityMap must be used within a BindxProvider')
	}
	return context.identityMap
}

/**
 * Hook to access both adapter and identity map.
 * Must be used within a BindxProvider.
 */
export function useBindxContext(): BindxContextValue {
	const context = useContext(BindxContext)
	if (!context) {
		throw new Error('useBindxContext must be used within a BindxProvider')
	}
	return context
}
