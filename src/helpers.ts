import type { SdmDevice } from './types.js'

export function getDisplayName(device: SdmDevice): string {
	const deviceName = device.name.split('/').pop()!
	const customName = device.traits['sdm.devices.traits.Info']?.customName as string | undefined
	const roomName = device.parentRelations?.[0]?.displayName

	return customName || roomName || deviceName
}

export function roundToNearestHalf(num: number): number {
	return Math.round(num * 2) / 2
}

export function sanitizeId(value: string): string {
	return value.toLowerCase().replace(/[^a-z0-9_-]/g, '_')
}

/**
 * Build a stable variable-id prefix for each device from its Google device id
 * (the last path segment of device.name), so renaming a device or home never
 * changes its variable ids. The full id is long and ugly, so the last 8
 * characters are used; if two devices ever share those, both fall back to the
 * full sanitized id.
 *
 * Returns a map of full device id -> prefix.
 */
export function buildDevicePrefixes(devices: Iterable<SdmDevice>): Map<string, string> {
	const ids = Array.from(devices, (d) => d.name.split('/').pop()!)

	const shortCounts = new Map<string, number>()
	for (const id of ids) {
		const short = sanitizeId(id.slice(-8))
		shortCounts.set(short, (shortCounts.get(short) ?? 0) + 1)
	}

	const prefixes = new Map<string, string>()
	for (const id of ids) {
		const short = sanitizeId(id.slice(-8))
		prefixes.set(id, `dev_${(shortCounts.get(short) ?? 0) > 1 ? sanitizeId(id) : short}`)
	}
	return prefixes
}

export function buildVariableId(prefix: string, traitName: string, attrKey: string): string {
	const segment = traitName.split('.').pop()!.toLowerCase()
	return `${prefix}_${segment}_${attrKey.toLowerCase()}`
}
