/**
 * Hotkey descriptor for matching keyboard events.
 * Format: "mod+b", "shift+enter", "mod+shift+s", etc.
 * "mod" = Cmd on Mac, Ctrl on other platforms.
 */
export type HotkeyDescriptor = string

const isMac = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform)

interface ParsedHotkey {
	key: string
	ctrl: boolean
	meta: boolean
	shift: boolean
	alt: boolean
}

function parseHotkey(descriptor: HotkeyDescriptor): ParsedHotkey {
	const parts = descriptor.toLowerCase().split('+')
	const key = parts[parts.length - 1] ?? ''
	const modifiers = new Set(parts.slice(0, -1))

	const hasMod = modifiers.has('mod')

	return {
		key,
		ctrl: modifiers.has('ctrl') || (hasMod && !isMac),
		meta: modifiers.has('meta') || (hasMod && isMac),
		shift: modifiers.has('shift'),
		alt: modifiers.has('alt') || modifiers.has('opt') || modifiers.has('option'),
	}
}

/**
 * Creates a hotkey matcher function that checks if a KeyboardEvent matches the given descriptor.
 * Replaces the `is-hotkey` dependency with native KeyboardEvent matching.
 *
 * @example
 * ```ts
 * const isBold = isHotkey('mod+b')
 * editor.registerMark({ type: 'isBold', isHotKey: isBold, render: ... })
 * ```
 */
export function isHotkey(descriptor: HotkeyDescriptor): (event: KeyboardEvent) => boolean {
	const parsed = parseHotkey(descriptor)

	return (event: KeyboardEvent): boolean => {
		const eventKey = event.key.toLowerCase()

		if (eventKey !== parsed.key) return false
		if (event.ctrlKey !== parsed.ctrl) return false
		if (event.metaKey !== parsed.meta) return false
		if (event.shiftKey !== parsed.shift) return false
		if (event.altKey !== parsed.alt) return false

		return true
	}
}
