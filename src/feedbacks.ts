import { getDisplayName } from './helpers.js'
import type ModuleInstance from './main.js'
import { TRAIT } from './types.js'

export type FeedbacksSchema = {
	device_online: {
		type: 'boolean'
		options: {
			deviceId: string
		}
	}
	thermostat_mode: {
		type: 'boolean'
		options: {
			deviceId: string
			mode: string
		}
	}
	hvac_active: {
		type: 'boolean'
		options: {
			deviceId: string
		}
	}
}

export function UpdateFeedbacks(self: ModuleInstance): void {
	const deviceChoices = Array.from(self.devices.values()).map((d) => ({
		id: d.name.split('/').pop()!,
		label: getDisplayName(d),
	}))
	const deviceThermostatChoices = Array.from(self.devices.values())
		.filter((d) => d.type === 'sdm.devices.types.THERMOSTAT')
		.map((d) => ({
			id: d.name.split('/').pop()!,
			label: getDisplayName(d),
		}))

	self.setFeedbackDefinitions({
		device_online: {
			type: 'boolean',
			name: 'Device: Online',
			defaultStyle: {
				bgcolor: 0x00ff00,
				color: 0x000000,
			},
			options: [
				{
					id: 'deviceId',
					type: 'dropdown',
					label: 'Device',
					choices: deviceChoices,
					default: deviceChoices[0]?.id,
				},
			],
			callback: ({ options }) => {
				const device = self.devices.get(options.deviceId)
				return device?.traits[TRAIT.CONNECTIVITY]?.status === 'ONLINE'
			},
		},
		thermostat_mode: {
			type: 'boolean',
			name: 'Thermostat: Mode active',
			description: 'Active when a thermostat is in the selected mode',
			defaultStyle: {
				bgcolor: 0x00ff00,
				color: 0x000000,
			},
			options: [
				{
					type: 'dropdown',
					id: 'deviceId',
					label: 'Device',
					default: deviceThermostatChoices[0]?.id ?? '',
					choices: deviceThermostatChoices,
				},
				{
					type: 'dropdown',
					id: 'mode',
					label: 'Mode',
					default: 'HEAT',
					choices: [
						{ id: 'HEAT', label: 'Heat' },
						{ id: 'COOL', label: 'Cool' },
						{ id: 'HEATCOOL', label: 'Heat + Cool' },
						{ id: 'OFF', label: 'Off' },
					],
				},
			],
			callback: ({ options }) => {
				const device = self.devices.get(options.deviceId)
				return device?.traits[TRAIT.THERMOSTAT_MODE]?.mode === options.mode
			},
		},
		hvac_active: {
			type: 'boolean',
			name: 'Thermostat: HVAC running',
			description: 'Active when the HVAC is currently heating or cooling',
			defaultStyle: {
				bgcolor: 0x00ff00,
				color: 0x000000,
			},
			options: [
				{
					type: 'dropdown',
					id: 'deviceId',
					label: 'Device',
					default: deviceThermostatChoices[0]?.id ?? '',
					choices: deviceThermostatChoices,
				},
			],
			callback: ({ options }) => {
				const status = self.devices.get(options.deviceId)?.traits[TRAIT.HVAC]?.status
				return status === 'HEATING' || status === 'COOLING'
			},
		},
	})
}
