import type { CompanionActionDefinitions } from '@companion-module/base'
import { getDisplayName, roundToNearestHalf } from './helpers.js'
import type ModuleInstance from './main.js'
import type { ActionsSchema } from './actions.js'
import { TRAIT, type SdmDevice } from './types.js'

const CMD = {
	SET_COOL: 'sdm.devices.commands.ThermostatTemperatureSetpoint.SetCool',
	SET_HEAT: 'sdm.devices.commands.ThermostatTemperatureSetpoint.SetHeat',
	SET_RANGE: 'sdm.devices.commands.ThermostatTemperatureSetpoint.SetRange',
	SET_MODE: 'sdm.devices.commands.ThermostatMode.SetMode',
	SET_ECO: 'sdm.devices.commands.ThermostatEco.SetMode',
	SET_FAN: 'sdm.devices.commands.Fan.SetTimer',
} as const

/** Look up the selected device, logging why when the action can't run */
function getThermostat(self: ModuleInstance, deviceId: string): SdmDevice | undefined {
	if (!self.client) {
		self.log('warn', 'Not connected to Google; check the connection settings')
		return undefined
	}
	const device = self.devices.get(deviceId)
	if (!device) {
		self.log('warn', `Device "${deviceId || '(none selected)'}" not found; it may have been removed or not loaded yet`)
		return undefined
	}
	return device
}
/** Google rejects all setpoint commands in MANUAL_ECO and stops returning setpoints */
function blockedByEco(self: ModuleInstance, device: SdmDevice): boolean {
	if (device.traits[TRAIT.ECO]?.mode !== 'MANUAL_ECO') return false
	self.log(
		'warn',
		`${getDisplayName(device)} is in ECO mode; Google rejects setpoint changes. Turn ECO off first ("Set ECO Mode")`,
	)
	return true
}

/**
 * Send a command, log the outcome, and on success update the cached state
 * so variables and feedbacks reflect the change before the next poll.
 */
async function sendCommand(
	self: ModuleInstance,
	device: SdmDevice,
	command: string,
	params: Record<string, unknown>,
	description: string,
	applyCache?: () => void,
	refresh = false,
): Promise<void> {
	if (!self.client) return

	try {
		await self.client.executeCommand(device.name, command, params)
	} catch (err) {
		self.log('error', `${description} failed: ${err instanceof Error ? err.message : String(err)}`)
		return
	}

	applyCache?.()
	self.log('info', description)
	self.updateVariableDefinitions()
	self.checkFeedbacks('thermostat_mode', 'hvac_active', 'eco_active')
	if (refresh) self.requestRefresh()
}

export function ThermostatActions(self: ModuleInstance): CompanionActionDefinitions<ActionsSchema> {
	// Every thermostat is selectable; each action checks the mode itself and tells the user if it can't run
	const thermostatChoices = Array.from(self.devices.values())
		.filter((d) => d.type === 'sdm.devices.types.THERMOSTAT')
		.map((d) => ({
			id: d.name.split('/').pop()!,
			label: `[${d.structureName}] ${getDisplayName(d)}`,
		}))

	const deviceOption = () => ({
		type: 'dropdown' as const,
		id: 'deviceId' as const,
		label: 'Device',
		default: thermostatChoices[0]?.id ?? '',
		choices: thermostatChoices,
	})

	const directionOption = () => ({
		type: 'dropdown' as const,
		id: 'direction' as const,
		label: 'Direction',
		default: 'increase',
		disableAutoExpression: true,
		choices: [
			{ id: 'increase', label: 'Increase' },
			{ id: 'decrease', label: 'Decrease' },
		],
	})

	return {
		adjust_temperature: {
			name: 'Adjust Temperature',
			description: 'Raise or lower the setpoint by 0.5°C. Works when the thermostat is in Heat or Cool mode.',
			options: [deviceOption(), directionOption()],
			callback: async (event) => {
				const device = getThermostat(self, event.options.deviceId)
				if (!device) return
				if (blockedByEco(self, device)) return

				const name = getDisplayName(device)
				const mode = device.traits[TRAIT.THERMOSTAT_MODE]?.mode
				const setpoint = device.traits[TRAIT.SETPOINT]
				const step = event.options.direction === 'increase' ? 0.5 : -0.5

				if (mode === 'COOL' && setpoint?.coolCelsius !== undefined) {
					const newCool = roundToNearestHalf(setpoint.coolCelsius + step)
					await sendCommand(
						self,
						device,
						CMD.SET_COOL,
						{ coolCelsius: newCool },
						`Set ${name} cool setpoint to ${newCool}°C`,
						() => {
							device.traits[TRAIT.SETPOINT] = { ...setpoint, coolCelsius: newCool }
						},
					)
				} else if (mode === 'HEAT' && setpoint?.heatCelsius !== undefined) {
					const newHeat = roundToNearestHalf(setpoint.heatCelsius + step)
					await sendCommand(
						self,
						device,
						CMD.SET_HEAT,
						{ heatCelsius: newHeat },
						`Set ${name} heat setpoint to ${newHeat}°C`,
						() => {
							device.traits[TRAIT.SETPOINT] = { ...setpoint, heatCelsius: newHeat }
						},
					)
				} else if (mode === 'HEAT' || mode === 'COOL') {
					// Right mode, but Google only returns the current mode's setpoint, so it arrives with the next poll
					self.log(
						'warn',
						`${name}: ${mode.toLowerCase()} setpoint not loaded yet after the mode change; try again in a few seconds`,
					)
				} else {
					self.log(
						'warn',
						`${name} is in ${mode ?? 'unknown'} mode; "Adjust Temperature" needs Heat or Cool mode (use "Adjust Temperature (Heat/Cool)" for Heat/Cool mode)`,
					)
				}
			},
		},

		adjust_temperature_heatcool: {
			name: 'Adjust Temperature (Heat/Cool)',
			description: 'Raise or lower both setpoints by 0.5°C. Works when the thermostat is in Heat/Cool mode.',
			options: [deviceOption(), directionOption()],
			callback: async (event) => {
				const device = getThermostat(self, event.options.deviceId)
				if (!device) return
				if (blockedByEco(self, device)) return
				const name = getDisplayName(device)
				const mode = device.traits[TRAIT.THERMOSTAT_MODE]?.mode
				const setpoint = device.traits[TRAIT.SETPOINT]
				const step = event.options.direction === 'increase' ? 0.5 : -0.5

				if (mode === 'HEATCOOL' && setpoint?.heatCelsius !== undefined && setpoint.coolCelsius !== undefined) {
					const newHeat = roundToNearestHalf(setpoint.heatCelsius + step)
					const newCool = roundToNearestHalf(setpoint.coolCelsius + step)
					await sendCommand(
						self,
						device,
						CMD.SET_RANGE,
						{ heatCelsius: newHeat, coolCelsius: newCool },
						`Set ${name} heat/cool setpoints to ${newHeat}/${newCool}°C`,
						() => {
							device.traits[TRAIT.SETPOINT] = { ...setpoint, heatCelsius: newHeat, coolCelsius: newCool }
						},
					)
				} else if (mode === 'HEATCOOL') {
					self.log(
						'warn',
						`${name}: heat/cool setpoints not loaded yet after the mode change; try again in a few seconds`,
					)
				} else {
					self.log(
						'warn',
						`${name} is in ${mode ?? 'unknown'} mode; "Adjust Temperature (Heat/Cool)" needs Heat/Cool mode (use "Adjust Temperature" for Heat or Cool mode)`,
					)
				}
			},
		},

		set_temperature: {
			name: 'Set Temperature',
			description: 'Set the heat or cool setpoint. The thermostat must already be in the selected mode.',
			options: [
				deviceOption(),
				{
					type: 'dropdown' as const,
					id: 'mode',
					label: 'Mode',
					default: 'COOL',
					disableAutoExpression: true,
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
			callback: async (event) => {
				const device = getThermostat(self, event.options.deviceId)
				if (!device) return
				if (blockedByEco(self, device)) return
				const name = getDisplayName(device)
				const currentMode = device.traits[TRAIT.THERMOSTAT_MODE]?.mode
				const setpoint = device.traits[TRAIT.SETPOINT]
				const temperature = event.options.temperature

				if (currentMode !== event.options.mode) {
					self.log(
						'warn',
						`${name} is in ${currentMode ?? 'unknown'} mode; cannot set a ${event.options.mode.toLowerCase()} setpoint. Use "Set Mode" first`,
					)
					return
				}

				if (event.options.mode === 'COOL') {
					await sendCommand(
						self,
						device,
						CMD.SET_COOL,
						{ coolCelsius: temperature },
						`Set ${name} cool setpoint to ${temperature}°C`,
						() => {
							device.traits[TRAIT.SETPOINT] = { ...setpoint, coolCelsius: temperature }
						},
					)
				} else {
					await sendCommand(
						self,
						device,
						CMD.SET_HEAT,
						{ heatCelsius: temperature },
						`Set ${name} heat setpoint to ${temperature}°C`,
						() => {
							device.traits[TRAIT.SETPOINT] = { ...setpoint, heatCelsius: temperature }
						},
					)
				}
			},
		},

		set_temperature_heatcool: {
			name: 'Set Temperature (Heat/Cool)',
			description: 'Set both setpoints. The thermostat must already be in Heat/Cool mode.',
			options: [
				deviceOption(),
				{
					type: 'number' as const,
					id: 'temperatureCool',
					label: 'Cool Temperature (°C)',
					default: 23,
					min: 5,
					max: 35,
					step: 0.5,
				},
				{
					type: 'number' as const,
					id: 'temperatureHeat',
					label: 'Heat Temperature (°C)',
					default: 20,
					min: 5,
					max: 35,
					step: 0.5,
				},
			],
			callback: async (event) => {
				const device = getThermostat(self, event.options.deviceId)
				if (!device) return
				if (blockedByEco(self, device)) return

				const name = getDisplayName(device)
				const mode = device.traits[TRAIT.THERMOSTAT_MODE]?.mode
				const setpoint = device.traits[TRAIT.SETPOINT]
				const { temperatureCool, temperatureHeat } = event.options

				if (mode !== 'HEATCOOL') {
					self.log(
						'warn',
						`${name} is in ${mode ?? 'unknown'} mode; "Set Temperature (Heat/Cool)" needs Heat/Cool mode (use "Set Temperature" for Heat or Cool mode)`,
					)
					return
				}

				if (temperatureHeat >= temperatureCool) {
					self.log('warn', `${name}: heat (${temperatureHeat}°C) must be lower than cool (${temperatureCool}°C)`)
					return
				}

				await sendCommand(
					self,
					device,
					CMD.SET_RANGE,
					{ coolCelsius: temperatureCool, heatCelsius: temperatureHeat },
					`Set ${name} heat/cool setpoints to ${temperatureHeat}/${temperatureCool}°C`,
					() => {
						device.traits[TRAIT.SETPOINT] = { ...setpoint, coolCelsius: temperatureCool, heatCelsius: temperatureHeat }
					},
				)
			},
		},

		set_mode: {
			name: 'Set mode',
			description: 'Set the thermostat mode: Heat, Cool, Heat/Cool or Off.',
			options: [
				deviceOption(),
				{
					type: 'dropdown' as const,
					id: 'mode',
					label: 'Mode',
					default: 'COOL',
					disableAutoExpression: true,
					choices: [
						{ id: 'COOL', label: 'Cool' },
						{ id: 'HEAT', label: 'Heat' },
						{ id: 'HEATCOOL', label: 'Heat/Cool' },
						{ id: 'OFF', label: 'Off' },
					],
				},
			],
			callback: async (event) => {
				const device = getThermostat(self, event.options.deviceId)
				if (!device) return

				await sendCommand(
					self,
					device,
					CMD.SET_MODE,
					{ mode: event.options.mode },
					`Set ${getDisplayName(device)} mode to ${event.options.mode}`,
					() => {
						device.traits[TRAIT.THERMOSTAT_MODE] = { mode: event.options.mode }
					},
					true,
				)
			},
		},

		set_mode_eco: {
			name: 'Set ECO Mode',
			description: 'Turn ECO on or off. While ECO is on, Google rejects setpoint changes.',
			options: [
				deviceOption(),
				{
					type: 'dropdown' as const,
					id: 'mode',
					label: 'Mode',
					default: 'OFF',
					disableAutoExpression: true,
					choices: [
						{ id: 'OFF', label: 'Off' },
						{ id: 'MANUAL_ECO', label: 'ECO' },
					],
				},
			],
			callback: async (event) => {
				const device = getThermostat(self, event.options.deviceId)
				if (!device) return

				await sendCommand(
					self,
					device,
					CMD.SET_ECO,
					{ mode: event.options.mode },
					`Set ${getDisplayName(device)} ECO mode to ${event.options.mode}`,
					() => {
						device.traits['sdm.devices.traits.ThermostatEco'] = {
							...device.traits['sdm.devices.traits.ThermostatEco'],
							mode: event.options.mode,
						}
					},
					true,
				)
			},
		},

		fan_timer: {
			name: 'Fan Timer',
			description: 'Run the fan for a set time, or turn the fan timer off.',
			options: [
				deviceOption(),
				{
					type: 'dropdown' as const,
					id: 'fanMode',
					label: 'Mode',
					default: 'OFF',
					disableAutoExpression: true,
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
					isVisibleExpression: '$(options:fanMode) == "ON"',
				},
			],
			callback: async (event) => {
				const device = getThermostat(self, event.options.deviceId)
				if (!device) return

				const name = getDisplayName(device)

				if (event.options.fanMode === 'ON') {
					const seconds = Math.round(event.options.timer)
					await sendCommand(
						self,
						device,
						CMD.SET_FAN,
						{ timerMode: 'ON', duration: `${seconds}s` },
						`Set ${name} fan timer to ${seconds} seconds`,
					)
				} else {
					await sendCommand(self, device, CMD.SET_FAN, { timerMode: 'OFF' }, `Turned ${name} fan timer off`)
				}
			},
		},
	}
}
