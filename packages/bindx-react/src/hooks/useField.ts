import { type FieldRef, type FieldAccessor } from '@contember/bindx'
import { useAccessor } from './useAccessor.js'

/**
 * Subscribes to a field ref and returns a FieldAccessor with live value access.
 *
 * Thin wrapper over useAccessor for ergonomics.
 * Accepts null — returns null without subscribing (useful for conditional fields).
 */
export function useField<T>(ref: FieldRef<T>): FieldAccessor<T>
export function useField<T>(ref: FieldRef<T> | null): FieldAccessor<T> | null
export function useField<T>(ref: FieldRef<T> | null): FieldAccessor<T> | null {
	return useAccessor(ref)
}
