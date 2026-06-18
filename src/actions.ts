import type ModuleInstance from './main.js'
import { ThermostatActions } from './actionsThermostat.js'

export type ActionsSchema = {
	adjust_temperature: { options: { deviceId: string; direction: 'increase' | 'decrease' } }
	adjust_temperature_heatcool: { options: { deviceId: string; direction: 'increase' | 'decrease' } }
	set_temperature: { options: { deviceId: string; mode: 'HEAT' | 'COOL'; temperature: number } }
	set_temperature_heatcool: {
		options: { deviceId: string; temperatureHeat: number; temperatureCool: number }
	}
	set_mode: { options: { deviceId: string; mode: string } }
	set_mode_eco: { options: { deviceId: string; mode: 'OFF' | 'MANUAL_ECO' } }
}

export function UpdateActions(self: ModuleInstance): void {
	self.setActionDefinitions({
		...ThermostatActions(self),
	})
}
