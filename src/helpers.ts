import type { SdmDevice } from './types.js'

export function getDisplayName(device: SdmDevice): string {
	const customName = device.traits['sdm.devices.traits.Info']?.customName as string | undefined
	const roomName = device.parentRelations?.[0]?.displayName
	return customName || roomName || device.name.split('/').pop()!
}

export function roundToNearestHalf(num: number): number {
	return Math.round(num * 2) / 2
}
