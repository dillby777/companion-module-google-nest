import { type SdmDevice, type DeviceState } from './types.js'

/**
 * Extract the short device ID from the full SDM resource name.
 * e.g. "enterprises/proj-id/devices/AVPHwEv..." → "AVPHwEv..."
 */
export function deviceIdFromName(fullName: string): string {
	return fullName.split('/').pop() ?? fullName
}

/**
 * Resolve a human-readable display name for a device.
 * Prefers the customName trait, then the parent relation display name,
 * and finally falls back to the short device ID.
 */
function resolveDisplayName(device: SdmDevice): string {
	const custom = device.traits['sdm.devices.traits.Info']?.customName
	if (custom) return custom

	const parentName = device.parentRelations?.[0]?.displayName
	if (parentName) return parentName

	return deviceIdFromName(device.name)
}

function roundToNearestHalf(num: number): number {
	return Math.round(num * 2) / 2
}

/**
 * Normalise a raw SdmDevice into a flat DeviceState object.
 * All optional fields are only set when the trait is present.
 */
export function normaliseDevice(device: SdmDevice): DeviceState {
	const traits = device.traits

	const state: DeviceState = {
		id: deviceIdFromName(device.name),
		fullName: device.name,
		displayName: resolveDisplayName(device),
		type: device.type,
		online: traits['sdm.devices.traits.Connectivity']?.status === 'ONLINE',
	}

	switch (device.type) {
		case 'sdm.devices.types.THERMOSTAT': {
			state.type = 'Thermostat'

			const ctemp = traits['sdm.devices.traits.Temperature']?.ambientTemperatureCelsius
			if (ctemp !== undefined) {
				state.tempCelsius = Math.round(ctemp * 100) / 100
			}

			const temp =
				traits['sdm.devices.traits.ThermostatTemperatureSetpoint']?.coolCelsius ??
				traits['sdm.devices.traits.ThermostatTemperatureSetpoint']?.heatCelsius
			if (temp !== undefined) {
				state.temperature = roundToNearestHalf(temp)
			}

			const humidity = traits['sdm.devices.traits.Humidity']?.ambientHumidityPercent
			if (humidity !== undefined) state.humidity = humidity

			const mode = traits['sdm.devices.traits.ThermostatMode']?.mode
			if (mode !== undefined) state.thermostatMode = mode

			const hvac = traits['sdm.devices.traits.ThermostatHvac']?.status
			if (hvac !== undefined) state.hvacStatus = hvac

			return state
		}

		default: {
			state.type = device.type // fallback to full type if split fails
			return state
		}
	}
}

/** Convert Celsius to Fahrenheit, rounded to one decimal place */
export function celsiusToFahrenheit(c: number): number {
	return Math.round((c * 9) / 5 + 32)
}
