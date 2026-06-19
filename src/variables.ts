import type ModuleInstance from './main.js'
import { buildVariableId, getDisplayName, sanitizeId } from './helpers.js'
import type {
	CompanionVariableDefinition,
	CompanionVariableValue,
	CompanionVariableValues,
} from '@companion-module/base'

export type VariablesSchema = Record<string, CompanionVariableValue | undefined>

export function UpdateVariableDefinitions(self: ModuleInstance): void {
	self.log('debug', 'Updating variable definitions')
	const definitions: Record<string, CompanionVariableDefinition> = {}

	for (const device of self.devices.values()) {
		const displayName = getDisplayName(device)
		const home = device.structureName
		console.log('debug', `Building variable definitions for device: ${displayName} (Home: ${home})`)
		const variableName = home + ' ' + displayName
		const prefix = sanitizeId(variableName)
		const label = (suffix: string) => `[${displayName}] ${suffix}`

		definitions[`${prefix}_name`] = { name: label('Display Name') }

		for (const [traitName, traitData] of Object.entries(device.traits)) {
			if (!traitData) continue
			const segment = traitName.split('.').pop()!.toLowerCase()

			for (const [attrKey, attrValue] of Object.entries(traitData)) {
				if (Array.isArray(attrValue)) continue
				const variableId = buildVariableId(home, displayName, traitName, attrKey)
				definitions[variableId] = { name: label(`${segment}: ${attrKey}`) }
			}
		}
	}

	self.setVariableDefinitions(definitions)

	const values: CompanionVariableValues = {}

	for (const device of self.devices.values()) {
		const displayName = getDisplayName(device)
		const home = device.structureName
		const variableName = home + ' ' + displayName
		const prefix = sanitizeId(variableName)

		values[`${prefix}_name`] = displayName

		for (const [traitName, traitData] of Object.entries(device.traits)) {
			if (!traitData) continue
			//const segment = traitName.split('.').pop()!.toLowerCase()

			for (const [attrKey, attrValue] of Object.entries(traitData)) {
				if (Array.isArray(attrValue)) continue
				const variableId = buildVariableId(home, displayName, traitName, attrKey)
				values[variableId] = attrValue as string | number | boolean
			}
		}
	}

	self.setVariableValues(values)
}

// function deviceVariableDefinitions(displayName: string): CompanionVariableDefinitions {
// 	const label = (suffix: string) => `[${displayName}] ${suffix}`
// 	return {
// 		[`${displayName}_name`]: { name: label('Display name') },
// 		[`${displayName}_id`]: { name: label('Device ID') },
// 		[`${displayName}_type`]: { name: label('Device type') },
// 		[`${displayName}_online`]: { name: label('Online status') },
// 		[`${displayName}_temperature`]: { name: label('Temperature') },
// 		[`${displayName}_temp_c`]: { name: label('Temperature (°C)') },
// 		[`${displayName}_temp_f`]: { name: label('Temperature (°F)') },
// 		[`${displayName}_humidity`]: { name: label('Humidity (%)') },
// 		[`${displayName}_mode`]: { name: label('Thermostat mode') },
// 		[`${displayName}_hvac`]: { name: label('HVAC status') },
// 	}
// }

// export function buildVariableDefinitions(devices: DeviceState[]): CompanionVariableDefinitions {
// 	const defs: CompanionVariableDefinitions = {
// 		device_count: { name: 'Number of devices found' },
// 	}
// 	for (const device of devices) {
// 		Object.assign(defs, deviceVariableDefinitions(device.displayName))
// 	}
// 	return defs
// }

// export function buildVariableValues(devices: DeviceState[]): CompanionVariableValues {
// 	const values: CompanionVariableValues = {
// 		device_count: devices.length,
// 	}

// 	for (const device of devices) {
// 		const { displayName } = device
// 		values[`${displayName}_name`] = device.displayName
// 		values[`${displayName}_id`] = device.id
// 		values[`${displayName}_type`] = device.type
// 		values[`${displayName}_online`] = String(device.online)
// 		values[`${displayName}_temperature`] = device.temperature ?? ''
// 		values[`${displayName}_temp_c`] = device.tempCelsius ?? ''
// 		values[`${displayName}_temp_f`] = device.tempCelsius !== undefined ? celsiusToFahrenheit(device.tempCelsius) : ''
// 		values[`${displayName}_humidity`] = device.humidity ?? ''
// 		values[`${displayName}_mode`] = device.thermostatMode ?? ''
// 		values[`${displayName}_hvac`] = device.hvacStatus ?? ''
// 	}

// 	return values
// }
