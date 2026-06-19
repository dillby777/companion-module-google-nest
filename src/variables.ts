import type ModuleInstance from './main.js'
import { buildVariableId, getDisplayName, roundToNearestHalf, sanitizeId } from './helpers.js'
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

			for (const [attrKey, attrValue] of Object.entries(traitData)) {
				if (Array.isArray(attrValue)) continue
				const variableId = buildVariableId(home, displayName, traitName, attrKey)
				//values[variableId] = attrValue as string | number | boolean

				let finalValue: string | number | boolean = attrValue as string | number | boolean

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

	self.setVariableValues(values)
}
