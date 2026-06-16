import { type CompanionVariableDefinitions, type CompanionVariableValues, } from '@companion-module/base'
import { type DeviceState } from './types.js'
import { celsiusToFahrenheit } from './device-state.js'

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export type VariablesSchema = {}

function deviceVariableDefinitions(displayName: string): CompanionVariableDefinitions {
	const label = (suffix: string) => `[${displayName}] ${suffix}`
	return {
		[`${displayName}_name`]: { name: label('Display name') },
		[`${displayName}_id`]: { name: label('Device ID') },
		[`${displayName}_online`]: { name: label('Online status') },
		[`${displayName}_temp_c`]: { name: label('Temperature (°C)') },
		[`${displayName}_temp_f`]: { name: label('Temperature (°F)') },
		[`${displayName}_humidity`]: { name: label('Humidity (%)') },
		[`${displayName}_mode`]: { name: label('Thermostat mode') },
		[`${displayName}_hvac`]: { name: label('HVAC status') },
	}
}

export function buildVariableDefinitions(devices: DeviceState[]): CompanionVariableDefinitions {
	const defs: CompanionVariableDefinitions = {
		device_count: { name: 'Number of devices found' },
	}
	for (const device of devices) {
		Object.assign(defs, deviceVariableDefinitions(device.displayName))
	}
	return defs
}

export function buildVariableValues(devices: DeviceState[]): CompanionVariableValues {
	const values: CompanionVariableValues = {
		device_count: devices.length,
	}

	for (const device of devices) {
		const { displayName } = device
		values[`${displayName}_name`] = device.displayName
		values[`${displayName}_id`] = device.id
		values[`${displayName}_online`] = String(device.online)
		values[`${displayName}_temp_c`] = device.tempCelsius ?? ''
		values[`${displayName}_temp_f`] = device.tempCelsius !== undefined ? celsiusToFahrenheit(device.tempCelsius) : ''
		values[`${displayName}_humidity`] = device.humidity ?? ''
		values[`${displayName}_mode`] = device.thermostatMode ?? ''
		values[`${displayName}_hvac`] = device.hvacStatus ?? ''
	}

	return values
}
