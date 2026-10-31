import type { ModuleSchema } from './main.js'
import type ModuleInstance from './main.js'
import type { CompanionPresetDefinitions, CompanionPresetSection } from '@companion-module/base'
import { buildDevicePrefixes, buildVariableId, getDisplayName } from './helpers.js'

const WHITE = 0xffffff
const BLACK = 0x000000
const GREEN = 0x00aa00

export function UpdatePresets(self: ModuleInstance): void {
	const structure: CompanionPresetSection[] = []
	const presets: CompanionPresetDefinitions<ModuleSchema> = {}

	const prefixes = buildDevicePrefixes(self.devices.values())
	const thermostats = Array.from(self.devices.entries()).filter(([, d]) => d.type === 'sdm.devices.types.THERMOSTAT')

	for (const [deviceId, device] of thermostats) {
		const name = getDisplayName(device)
		const prefix = prefixes.get(deviceId)!
		const key = `${deviceId}`
		const tempVar = buildVariableId(prefix, 'sdm.devices.traits.Temperature', 'ambientTemperatureCelsius')

		const ids = {
			current: `${key}_current`,
			up: `${key}_up`,
			down: `${key}_down`,
			upRange: `${key}_up_range`,
			downRange: `${key}_down_range`,
			heat: `${key}_mode_heat`,
			cool: `${key}_mode_cool`,
			heatcool: `${key}_mode_heatcool`,
			off: `${key}_mode_off`,
			hvac: `${key}_hvac`,
			online: `${key}_online`,
		}

		const modePreset = (mode: 'HEAT' | 'COOL' | 'HEATCOOL' | 'OFF', label: string) => ({
			type: 'simple' as const,
			name: `${name} mode ${label}`,
			style: { text: label, size: 'auto' as const, color: WHITE, bgcolor: BLACK },
			steps: [
				{
					down: [{ actionId: 'set_mode' as const, options: { deviceId, mode } }],
					up: [],
				},
			],
			feedbacks: [
				{
					feedbackId: 'thermostat_mode' as const,
					options: { deviceId, mode },
					style: { bgcolor: GREEN, color: WHITE },
				},
			],
		})

		presets[ids.current] = {
			type: 'simple',
			name: `${name} current temperature`,
			style: { text: `${name}\\n$(${self.label}:${tempVar})°C`, size: 'auto', color: WHITE, bgcolor: BLACK },
			steps: [],
			feedbacks: [
				{
					feedbackId: 'device_online',
					options: { deviceId },
					style: { bgcolor: BLACK, color: WHITE },
				},
			],
		}

		presets[ids.up] = {
			type: 'simple',
			name: `${name} setpoint up`,
			style: { text: 'TEMP\\n▲', size: 'auto', color: WHITE, bgcolor: BLACK },
			steps: [
				{
					down: [{ actionId: 'adjust_temperature', options: { deviceId, direction: 'increase' } }],
					up: [],
				},
			],
			feedbacks: [],
		}

		presets[ids.down] = {
			type: 'simple',
			name: `${name} setpoint down`,
			style: { text: 'TEMP\\n▼', size: 'auto', color: WHITE, bgcolor: BLACK },
			steps: [
				{
					down: [{ actionId: 'adjust_temperature', options: { deviceId, direction: 'decrease' } }],
					up: [],
				},
			],
			feedbacks: [],
		}

		presets[ids.upRange] = {
			type: 'simple',
			name: `${name} heat/cool setpoints up`,
			style: { text: 'H/C\\n▲', size: 'auto', color: WHITE, bgcolor: BLACK },
			steps: [
				{
					down: [{ actionId: 'adjust_temperature_heatcool', options: { deviceId, direction: 'increase' } }],
					up: [],
				},
			],
			feedbacks: [],
		}

		presets[ids.downRange] = {
			type: 'simple',
			name: `${name} heat/cool setpoints down`,
			style: { text: 'H/C\\n▼', size: 'auto', color: WHITE, bgcolor: BLACK },
			steps: [
				{
					down: [{ actionId: 'adjust_temperature_heatcool', options: { deviceId, direction: 'decrease' } }],
					up: [],
				},
			],
			feedbacks: [],
		}

		presets[ids.heat] = modePreset('HEAT', 'Heat')
		presets[ids.cool] = modePreset('COOL', 'Cool')
		presets[ids.heatcool] = modePreset('HEATCOOL', 'Heat/Cool')
		presets[ids.off] = modePreset('OFF', 'Off')

		presets[ids.hvac] = {
			type: 'simple',
			name: `${name} HVAC running`,
			style: { text: 'HVAC', size: 'auto', color: WHITE, bgcolor: BLACK },
			steps: [],
			feedbacks: [
				{
					feedbackId: 'hvac_active',
					options: { deviceId },
					style: { bgcolor: GREEN, color: WHITE },
				},
			],
		}

		structure.push({
			id: `thermostat_${key}`,
			name: `${device.structureName} / ${name}`,
			definitions: [
				{
					id: `${key}_status`,
					name: 'Status',
					type: 'simple',
					presets: [ids.current, ids.hvac],
				},
				{
					id: `${key}_setpoint`,
					name: 'Setpoint',
					description: 'Up/down buttons for Heat or Cool mode, and for Heat/Cool mode',
					type: 'simple',
					presets: [ids.up, ids.down, ids.upRange, ids.downRange],
				},
				{
					id: `${key}_modes`,
					name: 'Modes',
					type: 'simple',
					presets: [ids.heat, ids.cool, ids.heatcool, ids.off],
				},
			],
		})
	}

	self.setPresetDefinitions(structure, presets)
}
