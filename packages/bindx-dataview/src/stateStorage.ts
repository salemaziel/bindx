/**
 * State storage abstraction for DataView state persistence.
 *
 * Supports URL params, sessionStorage, localStorage, or custom backends.
 *
 * Usage:
 * ```tsx
 * const [value, setValue] = useStoredState('url', ['myGrid', 'sorting'], initialValue)
 * ```
 */

import { useState, useCallback, useMemo } from 'react'

// ============================================================================
// Storage Interface
// ============================================================================

export interface StateStorage {
	get<T>(key: string): T | undefined
	set<T>(key: string, value: T): void
	remove(key: string): void
}

export type StateStorageOrName = 'url' | 'session' | 'local' | 'null' | StateStorage

// ============================================================================
// Built-in Storage Backends
// ============================================================================

const nullStorage: StateStorage = {
	get: () => undefined,
	set: () => {},
	remove: () => {},
}

function createWebStorage(storage: Storage): StateStorage {
	return {
		get<T>(key: string): T | undefined {
			try {
				const raw = storage.getItem(key)
				return raw ? JSON.parse(raw) : undefined
			} catch {
				return undefined
			}
		},
		set<T>(key: string, value: T): void {
			try {
				storage.setItem(key, JSON.stringify(value))
			} catch {
				// Storage full or unavailable
			}
		},
		remove(key: string): void {
			try {
				storage.removeItem(key)
			} catch {
				// Ignore
			}
		},
	}
}

function createUrlStorage(): StateStorage {
	return {
		get<T>(key: string): T | undefined {
			if (typeof window === 'undefined') return undefined
			try {
				const params = new URLSearchParams(window.location.search)
				const raw = params.get(key)
				return raw ? JSON.parse(raw) : undefined
			} catch {
				return undefined
			}
		},
		set<T>(key: string, value: T): void {
			if (typeof window === 'undefined') return
			try {
				const params = new URLSearchParams(window.location.search)
				const serialized = JSON.stringify(value)
				params.set(key, serialized)
				const url = `${window.location.pathname}?${params.toString()}`
				window.history.replaceState(null, '', url)
			} catch {
				// Ignore
			}
		},
		remove(key: string): void {
			if (typeof window === 'undefined') return
			try {
				const params = new URLSearchParams(window.location.search)
				params.delete(key)
				const search = params.toString()
				const url = search ? `${window.location.pathname}?${search}` : window.location.pathname
				window.history.replaceState(null, '', url)
			} catch {
				// Ignore
			}
		},
	}
}

function resolveStorage(storageOrName: StateStorageOrName): StateStorage {
	if (typeof storageOrName === 'object') return storageOrName

	switch (storageOrName) {
		case 'null':
			return nullStorage
		case 'url':
			return createUrlStorage()
		case 'session':
			if (typeof sessionStorage !== 'undefined') {
				return createWebStorage(sessionStorage)
			}
			return nullStorage
		case 'local':
			if (typeof localStorage !== 'undefined') {
				return createWebStorage(localStorage)
			}
			return nullStorage
	}
}

function createFallbackStorage(storages: StateStorage[]): StateStorage {
	return {
		get<T>(key: string): T | undefined {
			for (const storage of storages) {
				const value = storage.get<T>(key)
				if (value !== undefined) return value
			}
			return undefined
		},
		set<T>(key: string, value: T): void {
			for (const storage of storages) {
				storage.set(key, value)
			}
		},
		remove(key: string): void {
			for (const storage of storages) {
				storage.remove(key)
			}
		},
	}
}

function resolveStorageOrFallback(storageOrName: StateStorageOrName | StateStorageOrName[]): StateStorage {
	if (Array.isArray(storageOrName)) {
		return createFallbackStorage(storageOrName.map(resolveStorage))
	}
	return resolveStorage(storageOrName)
}

// ============================================================================
// useStoredState Hook
// ============================================================================

export type SetStoredState<T> = (value: T | ((current: T) => T)) => void

export function useStoredState<T>(
	storageOrName: StateStorageOrName | StateStorageOrName[],
	key: readonly string[],
	initializer: (storedValue: T | undefined) => T,
): [T, SetStoredState<T>] {
	const storage = useMemo(() => resolveStorageOrFallback(storageOrName), [storageOrName])
	const storageKey = key.join(':')

	const [value, setValueInternal] = useState<T>(() => {
		const stored = storage.get<T>(storageKey)
		return initializer(stored)
	})

	const setValue = useCallback((update: T | ((current: T) => T)): void => {
		setValueInternal(current => {
			const newValue = typeof update === 'function' ? (update as (current: T) => T)(current) : update
			storage.set(storageKey, newValue)
			return newValue
		})
	}, [storage, storageKey])

	return [value, setValue]
}

// ============================================================================
// DataView Key
// ============================================================================

export function buildDataViewKey(parts: readonly string[]): string {
	return parts.join(':')
}
