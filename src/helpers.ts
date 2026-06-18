import type { SdmDevice } from './types.js'

export function getDisplayName(device: SdmDevice): string {
	const customName = device.traits['sdm.devices.traits.Info']?.customName as string | undefined
	const roomName = device.parentRelations?.[0]?.displayName
	const home = device.structureName
	return home || customName || roomName || device.name.split('/').pop()!
}

export function roundToNearestHalf(num: number): number {
	return Math.round(num * 2) / 2
}

export function sanitizeId(value: string): string {
	return value.toLowerCase().replace(/[^a-z0-9_-]/g, '_')
}

export function buildVariableId(displayName: string, traitName: string, attrKey: string): string {
	const prefix = sanitizeId(displayName)
	const segment = traitName.split('.').pop()!.toLowerCase()
	return `${prefix}_${segment}_${attrKey.toLowerCase()}`
}
