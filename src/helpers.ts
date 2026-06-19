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

export function buildVariableId(home: string, displayName: string, traitName: string, attrKey: string): string {
	const variableName = home + ' ' + displayName
	const prefix = sanitizeId(variableName)
	const segment = traitName.split('.').pop()!.toLowerCase()
	return `${prefix}_${segment}_${attrKey.toLowerCase()}`
}
