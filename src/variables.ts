import type ModuleInstance from './main.js'
import { buildDevicePrefixes, buildVariableId, getDisplayName, roundToNearestHalf } from './helpers.js'
import type {
	CompanionVariableDefinition,
	CompanionVariableValue,
	CompanionVariableValues,
} from '@companion-module/base'
import { TRAIT } from './types.js'

export type VariablesSchema = Record<string, CompanionVariableValue | undefined>

export function UpdateVariableDefinitions(self: ModuleInstance): void {
	self.log('debug', 'Updating variable definitions')

	const definitions: Record<string, CompanionVariableDefinition> = {}
	const values: CompanionVariableValues = {}
	const prefixes = buildDevicePrefixes(self.devices.values())

	for (const [deviceId, device] of self.devices) {
		const prefix = prefixes.get(deviceId)!
		const displayName = getDisplayName(device)
		const home = device.structureName
		const label = (suffix: string) => `[${home} / ${displayName}] ${suffix}`

		definitions[`${prefix}_name`] = { name: label('Display Name') }
		definitions[`${prefix}_home`] = { name: label('Home Name') }
		values[`${prefix}_name`] = displayName
		values[`${prefix}_home`] = home

		if (device.type === 'sdm.devices.types.THERMOSTAT') {
			for (const key of ['heatCelsius', 'coolCelsius']) {
				const id = buildVariableId(prefix, TRAIT.SETPOINT, key)
				definitions[id] = { name: label(`thermostattemperaturesetpoint: ${key}`) }
				values[id] = ''
			}
		}

		for (const [traitName, traitData] of Object.entries(device.traits)) {
			if (!traitData) continue
			const segment = traitName.split('.').pop()!.toLowerCase()

			for (const [attrKey, attrValue] of Object.entries(traitData)) {
				if (Array.isArray(attrValue)) continue

				const variableId = buildVariableId(prefix, traitName, attrKey)
				definitions[variableId] = { name: label(`${segment}: ${attrKey}`) }

				let finalValue = attrValue as string | number | boolean

				if (typeof finalValue === 'number') {
					if (traitName === 'sdm.devices.traits.Temperature') {
						finalValue = Math.round(finalValue * 100) / 100
					} else if (
						traitName === 'sdm.devices.traits.ThermostatTemperatureSetpoint' ||
						traitName === 'sdm.devices.traits.ThermostatEco'
					) {
						finalValue = roundToNearestHalf(finalValue)
					}
				}

				values[variableId] = finalValue
			}
		}
	}

	self.setVariableDefinitions(definitions)
	self.setVariableValues(values)
}
