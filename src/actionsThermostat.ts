import type { CompanionActionEvent, CompanionActionDefinitions } from '@companion-module/base'
import { getDisplayName } from './helpers.js'
import type ModuleInstance from './main.js'
import type { ActionsSchema } from './actions.js'

const roundToHalf = (val: number) => Math.round(val * 2) / 2

export function ThermostatActions(self: ModuleInstance): CompanionActionDefinitions<ActionsSchema> {
	const deviceThermostatChoices = Array.from(self.devices.values())
		.filter((d) => {
			if (d.type !== 'sdm.devices.types.THERMOSTAT') return false
			const mode = d.traits['sdm.devices.traits.ThermostatMode']?.mode
			const setpoint = d.traits['sdm.devices.traits.ThermostatTemperatureSetpoint']
			if (mode === 'HEAT') return setpoint?.heatCelsius !== undefined
			if (mode === 'COOL') return setpoint?.coolCelsius !== undefined
			if (mode === 'HEATCOOL') return setpoint?.heatCelsius !== undefined && setpoint?.coolCelsius !== undefined
			return false
		})
		.map((d) => ({
			id: d.name.split('/').pop()!,
			label: '[' + d.structureName + '] ' + getDisplayName(d),
		}))

	return {
		adjust_temperature: {
			name: 'Adjust Temperature',
			options: [
				{
					type: 'dropdown' as const,
					id: 'deviceId',
					label: 'Device',
					default: deviceThermostatChoices[0]?.id ?? '',
					choices: deviceThermostatChoices,
				},
				{
					type: 'dropdown' as const,
					id: 'direction',
					label: 'Direction',
					default: 'increase',
					choices: [
						{ id: 'increase', label: 'Increase' },
						{ id: 'decrease', label: 'Decrease' },
					],
				},
			],
			callback: async (event: CompanionActionEvent<{ deviceId: string; direction: 'increase' | 'decrease' }>) => {
				const device = self.devices.get(event.options.deviceId)
				const mode = device?.traits['sdm.devices.traits.ThermostatMode']?.mode
				const setpoint = device?.traits['sdm.devices.traits.ThermostatTemperatureSetpoint']

				if (!device || !mode || !setpoint || !self.client) return

				const INCREMENT = event.options.direction === 'increase' ? 0.5 : -0.5
				const newCool = roundToHalf(setpoint.coolCelsius! + INCREMENT)
				const newHeat = roundToHalf(setpoint.heatCelsius! + INCREMENT)

				switch (mode) {
					case 'COOL':
						await self.client.executeCommand(
							device.name,
							'sdm.devices.commands.ThermostatTemperatureSetpoint.SetCool',
							{
								coolCelsius: newCool,
							},
						)
						device.traits['sdm.devices.traits.ThermostatTemperatureSetpoint'] = {
							...setpoint,
							coolCelsius: newCool,
						}
						self.log('info', `Set ${getDisplayName(device)} cool setpoint to ${newCool}°C`)
						break
					case 'HEAT':
						await self.client.executeCommand(
							device.name,
							'sdm.devices.commands.ThermostatTemperatureSetpoint.SetHeat',
							{
								heatCelsius: newHeat,
							},
						)
						self.log('info', `Set ${getDisplayName(device)} heat setpoint to ${newHeat}°C`)
						device.traits['sdm.devices.traits.ThermostatTemperatureSetpoint'] = {
							...setpoint,
							heatCelsius: newHeat,
						}
						break
				}
			},
		},
		adjust_temperature_heatcool: {
			name: 'Adjust Temperature (Heat/Cool)',
			options: [
				{
					type: 'dropdown' as const,
					id: 'deviceId',
					label: 'Device',
					default: deviceThermostatChoices[0]?.id ?? '',
					choices: deviceThermostatChoices,
				},
				{
					type: 'dropdown' as const,
					id: 'direction',
					label: 'Direction',
					default: 'increase',
					choices: [
						{ id: 'increase', label: 'Increase' },
						{ id: 'decrease', label: 'Decrease' },
					],
				},
			],
			callback: async (event: CompanionActionEvent<{ deviceId: string; direction: 'increase' | 'decrease' }>) => {
				const device = self.devices.get(event.options.deviceId)
				const mode = device?.traits['sdm.devices.traits.ThermostatMode']?.mode
				const setpoint = device?.traits['sdm.devices.traits.ThermostatTemperatureSetpoint']

				if (!device || !mode || !setpoint || !self.client) return

				const INCREMENT = event.options.direction === 'increase' ? 0.5 : -0.5
				const newCool = roundToHalf(setpoint.coolCelsius! + INCREMENT)
				const newHeat = roundToHalf(setpoint.heatCelsius! + INCREMENT)
				switch (mode) {
					case 'HEATCOOL':
						await self.client.executeCommand(
							device.name,
							'sdm.devices.commands.ThermostatTemperatureSetpoint.SetRange',
							{
								coolCelsius: newCool,
								heatCelsius: newHeat,
							},
						)
						self.log('info', `Set ${getDisplayName(device)} heat/cool setpoints to ${newHeat}/${newCool}°C`)
						device.traits['sdm.devices.traits.ThermostatTemperatureSetpoint'] = {
							...setpoint,
							heatCelsius: newHeat,
							coolCelsius: newCool,
						}
						break
				}
			},
		},
		set_temperature: {
			name: 'Set Temperature',
			options: [
				{
					type: 'dropdown' as const,
					id: 'deviceId',
					label: 'Device',
					default: deviceThermostatChoices[0]?.id ?? '',
					choices: deviceThermostatChoices,
				},
				{
					type: 'dropdown' as const,
					id: 'mode',
					label: 'Mode',
					default: 'COOL',
					choices: [
						{ id: 'COOL', label: 'Cool' },
						{ id: 'HEAT', label: 'Heat' },
					],
				},
				{
					type: 'number' as const,
					id: 'temperature',
					label: 'Temperature (°C)',
					default: 20,
					min: 5,
					max: 35,
					step: 0.5,
				},
			],
			callback: async (
				event: CompanionActionEvent<{ deviceId: string; mode: 'HEAT' | 'COOL'; temperature: number }>,
			) => {
				const device = self.devices.get(event.options.deviceId)
				const mode = device?.traits['sdm.devices.traits.ThermostatMode']?.mode
				const setpoint = device?.traits['sdm.devices.traits.ThermostatTemperatureSetpoint']

				if (!device || !mode || !setpoint || !self.client) return

				switch (mode) {
					case 'COOL':
						await self.client.executeCommand(
							device.name,
							'sdm.devices.commands.ThermostatTemperatureSetpoint.SetCool',
							{
								coolCelsius: event.options.temperature,
							},
						)
						device.traits['sdm.devices.traits.ThermostatTemperatureSetpoint'] = {
							...setpoint,
							coolCelsius: event.options.temperature,
						}
						self.log('info', `Set ${getDisplayName(device)} cool setpoint to ${event.options.temperature}°C`)
						break
					case 'HEAT':
						await self.client.executeCommand(
							device.name,
							'sdm.devices.commands.ThermostatTemperatureSetpoint.SetHeat',
							{
								heatCelsius: event.options.temperature,
							},
						)
						self.log('info', `Set ${getDisplayName(device)} heat setpoint to ${event.options.temperature}°C`)
						device.traits['sdm.devices.traits.ThermostatTemperatureSetpoint'] = {
							...setpoint,
							heatCelsius: event.options.temperature,
						}
						break
				}
			},
		},
		set_temperature_heatcool: {
			name: 'Set Temperature (Heat/Cool)',
			options: [
				{
					type: 'dropdown' as const,
					id: 'deviceId',
					label: 'Device',
					default: deviceThermostatChoices[0]?.id ?? '',
					choices: deviceThermostatChoices,
				},
				{
					type: 'number' as const,
					id: 'temperatureCool',
					label: 'Cool Temperature (°C)',
					default: 20,
					min: 5,
					max: 35,
					step: 0.5,
				},
				{
					type: 'number' as const,
					id: 'temperatureHeat',
					label: 'Heat Temperature (°C)',
					default: 23,
					min: 5,
					max: 35,
					step: 0.5,
				},
			],
			callback: async (
				event: CompanionActionEvent<{
					deviceId: string
					temperatureCool: number
					temperatureHeat: number
				}>,
			) => {
				const device = self.devices.get(event.options.deviceId)
				const mode = device?.traits['sdm.devices.traits.ThermostatMode']?.mode
				const setpoint = device?.traits['sdm.devices.traits.ThermostatTemperatureSetpoint']

				if (!device || !mode || !setpoint || !self.client) return

				switch (mode) {
					case 'HEATCOOL':
						await self.client.executeCommand(
							device.name,
							'sdm.devices.commands.ThermostatTemperatureSetpoint.SetRange',
							{
								coolCelsius: event.options.temperatureCool,
								heatCelsius: event.options.temperatureHeat,
							},
						)
						device.traits['sdm.devices.traits.ThermostatTemperatureSetpoint'] = {
							...setpoint,
							coolCelsius: event.options.temperatureCool,
							heatCelsius: event.options.temperatureHeat,
						}
						self.log(
							'info',
							`Set ${getDisplayName(device)} heat/cool setpoints to ${event.options.temperatureCool}/${event.options.temperatureHeat}°C`,
						)
						break
				}
			},
		},
		set_mode: {
			name: 'Set mode',
			options: [
				{
					type: 'dropdown' as const,
					id: 'deviceId',
					label: 'Device',
					default: deviceThermostatChoices[0]?.id ?? '',
					choices: deviceThermostatChoices,
				},
				{
					type: 'dropdown' as const,
					id: 'mode',
					label: 'Mode',
					default: 'COOL',
					choices: [
						{ id: 'COOL', label: 'Cool' },
						{ id: 'HEAT', label: 'Heat' },
						{ id: 'HEATCOOL', label: 'Heat/Cool' },
					],
				},
			],
			callback: async (event: CompanionActionEvent<{ deviceId: string; mode: string }>) => {
				const device = self.devices.get(event.options.deviceId)
				const mode = device?.traits['sdm.devices.traits.ThermostatMode']?.mode

				if (!device || !mode || !self.client) return

				await self.client.executeCommand(device.name, 'sdm.devices.commands.ThermostatMode.SetMode', {
					mode: event.options.mode,
				})
				self.log('info', `Set ${getDisplayName(device)} mode to ${event.options.mode}`)
			},
		},
		set_mode_eco: {
			name: 'Set ECO mode',
			options: [
				{
					type: 'dropdown' as const,
					id: 'deviceId',
					label: 'Device',
					default: deviceThermostatChoices[0]?.id ?? '',
					choices: deviceThermostatChoices,
				},
				{
					type: 'dropdown' as const,
					id: 'mode',
					label: 'Mode',
					default: 'OFF',
					choices: [
						{ id: 'OFF', label: 'Off' },
						{ id: 'MANUAL_ECO', label: 'ECO' },
					],
				},
			],
			callback: async (event: CompanionActionEvent<{ deviceId: string; mode: string }>) => {
				const device = self.devices.get(event.options.deviceId)
				const mode = device?.traits['sdm.devices.traits.ThermostatMode']?.mode

				if (!device || !mode || !self.client) return

				await self.client.executeCommand(device.name, 'sdm.devices.commands.ThermostatEco.SetMode', {
					mode: event.options.mode,
				})
				self.log('info', `Set ${getDisplayName(device)} ECO mode to ${event.options.mode}`)
			},
		},
		fan_timer: {
			name: 'Fan Timer',
			options: [
				{
					type: 'dropdown' as const,
					id: 'deviceId',
					label: 'Device',
					default: deviceThermostatChoices[0]?.id ?? '',
					choices: deviceThermostatChoices,
				},
				{
					type: 'dropdown' as const,
					id: 'fanMode',
					label: 'Mode',
					default: 'OFF',
					choices: [
						{ id: 'OFF', label: 'Off' },
						{ id: 'ON', label: 'On' },
					],
				},
				{
					type: 'number' as const,
					id: 'timer',
					label: 'Run Time (seconds)',
					default: 900,
					min: 1,
					max: 43200,
					step: 1,
				},
			],
			callback: async (event: CompanionActionEvent<{ deviceId: string; fanMode: string; timer: number }>) => {
				const device = self.devices.get(event.options.deviceId)
				const mode = device?.traits['sdm.devices.traits.ThermostatMode']?.mode

				if (!device || !mode || !self.client) return

				await self.client.executeCommand(device.name, 'sdm.devices.commands.Fan.SetTimer', {
					timerMode: event.options.fanMode,
					duration: event.options.timer,
				})
				self.log('info', `Set ${getDisplayName(device)} Fan Timer to ${event.options.timer} seconds`)
			},
		},
	}
}
