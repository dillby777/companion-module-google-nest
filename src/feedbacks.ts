import type ModuleInstance from './main.js'
import type { DeviceState } from './types.js'

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

export function UpdateFeedbacks(self: ModuleInstance, devices: DeviceState[]): void {
	const deviceChoices = devices.map((d) => ({ id: d.id, label: d.displayName }))

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
				return self.devices.get(options.deviceId)?.online ?? false
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
					default: deviceChoices[0]?.id ?? '',
					choices: deviceChoices,
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
				return self.devices.get(options.deviceId)?.thermostatMode === options.mode
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
					default: deviceChoices[0]?.id ?? '',
					choices: deviceChoices,
				},
			],
			callback: ({ options }) => {
				const status = self.devices.get(options.deviceId)?.hvacStatus
				return status === 'HEATING' || status === 'COOLING'
			},
		},
	})
}
