import { describe, expect, test } from 'bun:test'
import { isHotkey } from '@contember/bindx-editor'

const createKeyboardEvent = (overrides: Partial<KeyboardEvent>): KeyboardEvent => {
	return {
		key: '',
		ctrlKey: false,
		metaKey: false,
		shiftKey: false,
		altKey: false,
		...overrides,
	} as KeyboardEvent
}

describe('isHotkey', () => {
	test('matches simple key', () => {
		const matcher = isHotkey('b')
		expect(matcher(createKeyboardEvent({ key: 'b' }))).toBe(true)
		expect(matcher(createKeyboardEvent({ key: 'a' }))).toBe(false)
	})

	test('matches case insensitively', () => {
		const matcher = isHotkey('b')
		expect(matcher(createKeyboardEvent({ key: 'B' }))).toBe(true)
	})

	test('matches ctrl+key', () => {
		const matcher = isHotkey('ctrl+b')
		expect(matcher(createKeyboardEvent({ key: 'b', ctrlKey: true }))).toBe(true)
		expect(matcher(createKeyboardEvent({ key: 'b', ctrlKey: false }))).toBe(false)
		expect(matcher(createKeyboardEvent({ key: 'b', ctrlKey: true, metaKey: true }))).toBe(false)
	})

	test('matches shift+key', () => {
		const matcher = isHotkey('shift+enter')
		expect(matcher(createKeyboardEvent({ key: 'Enter', shiftKey: true }))).toBe(true)
		expect(matcher(createKeyboardEvent({ key: 'Enter', shiftKey: false }))).toBe(false)
	})

	test('matches alt/opt/option modifiers', () => {
		const matcherAlt = isHotkey('alt+a')
		const matcherOpt = isHotkey('opt+a')
		const matcherOption = isHotkey('option+a')

		const event = createKeyboardEvent({ key: 'a', altKey: true })
		expect(matcherAlt(event)).toBe(true)
		expect(matcherOpt(event)).toBe(true)
		expect(matcherOption(event)).toBe(true)
	})

	test('matches multiple modifiers', () => {
		const matcher = isHotkey('ctrl+shift+s')
		expect(matcher(createKeyboardEvent({ key: 's', ctrlKey: true, shiftKey: true }))).toBe(true)
		expect(matcher(createKeyboardEvent({ key: 's', ctrlKey: true, shiftKey: false }))).toBe(false)
		expect(matcher(createKeyboardEvent({ key: 's', ctrlKey: false, shiftKey: true }))).toBe(false)
	})

	test('rejects extra modifiers', () => {
		const matcher = isHotkey('ctrl+b')
		expect(matcher(createKeyboardEvent({ key: 'b', ctrlKey: true, shiftKey: true }))).toBe(false)
	})

	test('mod maps to ctrl on non-Mac', () => {
		// In test environment (non-Mac), mod should map to ctrl
		const matcher = isHotkey('mod+b')
		expect(matcher(createKeyboardEvent({ key: 'b', ctrlKey: true }))).toBe(true)
	})
})
