import { getDisplayName } from './helpers.js'
import type ModuleInstance from './main.js'

export type ActionsSchema = {
	increase_temperature: {
		options: {
			deviceId: string
		}
	}
	decrease_temperature: {
		options: {
			deviceId: string
		}
	}
}

export function UpdateActions(self: ModuleInstance): void {
	const deviceThermostatChoices = Array.from(self.devices.values())
		.filter((d) => d.type === 'sdm.devices.types.THERMOSTAT')
		.map((d) => ({
			id: d.name.split('/').pop()!,
			label: getDisplayName(d),
		}))

	self.setActionDefinitions({
		increase_temperature: {
			name: 'Increase Temperature',
			options: [
				{
					type: 'dropdown',
					id: 'deviceId',
					label: 'Device',
					default: deviceThermostatChoices[0]?.id ?? '',
					choices: deviceThermostatChoices,
				},
			],
			callback: async (event) => {
				console.log('Increase temperature for device:', event.options.deviceId)
			},
		},
		decrease_temperature: {
			name: 'Decrease Temperature',
			options: [
				{
					type: 'dropdown',
					id: 'deviceId',
					label: 'Device',
					default: deviceThermostatChoices[0]?.id ?? '',
					choices: deviceThermostatChoices,
				},
			],
			callback: async (event) => {
				console.log('Decrease temperature for device:', event.options.deviceId)
			},
		},
	})
}
