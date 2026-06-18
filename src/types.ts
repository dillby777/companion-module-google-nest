// ─── SDM API Responses ───────────────────────────────────────────────────────

/** Raw device object returned from SDM API */
export interface SdmDevice {
	name: string
	type: string
	assignee?: string
	traits: SdmTraits
	parentRelations?: Array<{ parent: string; displayName: string }>
	structureName?: string
}

export type SdmTraits = {
	'sdm.devices.traits.ThermostatMode'?: {
		mode: ThermostatMode
	}
	'sdm.devices.traits.ThermostatTemperatureSetpoint'?: {
		coolCelsius?: number
		heatCelsius?: number
	}
	'sdm.devices.traits.Connectivity'?: {
		status: 'ONLINE' | 'OFFLINE'
	}
	'sdm.devices.traits.Temperature'?: {
		ambientTemperatureCelsius: number
	}
	'sdm.devices.traits.ThermostatHvac'?: {
		status: HvacStatus
	}
	[key: string]: Record<string, unknown> | undefined // fallback for any other traits
}

export type ThermostatMode = 'HEAT' | 'COOL' | 'HEATCOOL' | 'OFF'
export type HvacStatus = 'HEATING' | 'COOLING' | 'IDLE'

/** Normalised device state we keep in memory */
export interface DeviceState {
	id: string // short ID extracted from the full resource name
	fullName: string // full SDM resource path
	displayName: string
	type: string
	online: boolean
	tempCelsius?: number
	temperature?: number
	humidity?: number
	thermostatMode?: ThermostatMode
	hvacStatus?: HvacStatus
}

export const TRAIT = {
	CONNECTIVITY: 'sdm.devices.traits.Connectivity',
	TEMPERATURE: 'sdm.devices.traits.Temperature',
	THERMOSTAT_MODE: 'sdm.devices.traits.ThermostatMode',
	HVAC: 'sdm.devices.traits.ThermostatHvac',
	// etc
} as const

/** OAuth token response from Google */
export interface TokenResponse {
	access_token: string
	expires_in: number
	token_type: string
}

export interface SdmStructure {
	name: string
	traits: {
		'sdm.structures.traits.Info'?: {
			customName: string
		}
	}
}
