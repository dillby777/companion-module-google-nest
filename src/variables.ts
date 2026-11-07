import type ModuleInstance from './main.js'
import { buildDevicePrefixes, buildVariableId, getDisplayName, roundToNearestHalf } from './helpers.js'
import type {
	CompanionVariableDefinition,
	CompanionVariableValue,
	CompanionVariableValues,
} from '@companion-module/base'
import { TRAIT } from './types.js'

export type VariablesSchema = Record<string, CompanionVariableValue | undefined>

/** Friendly names for known trait attributes, keyed by "<TraitName>.<attribute>" */
const VARIABLE_NAMES: Record<string, string> = {
	'Connectivity.status': 'Connectivity status',
	'Fan.timerMode': 'Fan timer mode',
	'Fan.timerTimeout': 'Fan timer ends at',
	'Humidity.ambientHumidityPercent': 'Humidity (%)',
	'Info.customName': 'Custom name',
	'Settings.temperatureScale': 'Display temperature scale',
	'Temperature.ambientTemperatureCelsius': 'Ambient temperature (°C)',
	'ThermostatEco.mode': 'ECO mode',
	'ThermostatEco.heatCelsius': 'ECO heat setpoint (°C)',
	'ThermostatEco.coolCelsius': 'ECO cool setpoint (°C)',
	'ThermostatHvac.status': 'HVAC status',
	'ThermostatMode.mode': 'Mode',
	'ThermostatTemperatureSetpoint.heatCelsius': 'Heat setpoint (°C)',
	'ThermostatTemperatureSetpoint.coolCelsius': 'Cool setpoint (°C)',
}

/** Friendly name when known; unknown traits fall back to the raw "trait: attribute" form */
function variableName(traitName: string, attrKey: string): string {
	const segment = traitName.split('.').pop()!
	return VARIABLE_NAMES[`${segment}.${attrKey}`] ?? `${segment.toLowerCase()}: ${attrKey}`
}

export function UpdateVariableDefinitions(self: ModuleInstance): void {
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
				definitions[id] = { name: label(variableName(TRAIT.SETPOINT, key)) }
				values[id] = ''
			}
		}

		for (const [traitName, traitData] of Object.entries(device.traits)) {
			if (!traitData) continue

			for (const [attrKey, attrValue] of Object.entries(traitData)) {
				if (Array.isArray(attrValue)) continue

				const variableId = buildVariableId(prefix, traitName, attrKey)
				definitions[variableId] = { name: label(variableName(traitName, attrKey)) }

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

	// Only re-send definitions when the set of variables or their names actually changed
	const signature = Object.entries(definitions)
		.map(([id, def]) => `${id}=${def.name}`)
		.sort()
		.join('\n')

	if (signature !== self.variableSignature) {
		self.variableSignature = signature
		self.log('debug', `Updating variable definitions (${Object.keys(definitions).length} variables)`)
		self.setVariableDefinitions(definitions)
	}

	self.setVariableValues(values)
}
