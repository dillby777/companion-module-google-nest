// ─── SDM API Responses ───────────────────────────────────────────────────────

/** Raw device object returned from SDM API */
export interface SdmDevice {
  name: string
  type: string
  assignee?: string
  traits: SdmTraits
 parentRelations?: Array<{ parent: string; displayName: string }>
}

/** Union of all traits the SDM API may return */
export interface SdmTraits {
  'sdm.devices.traits.Info'?: { customName: string }
  'sdm.devices.traits.Connectivity'?: { status: 'ONLINE' | 'OFFLINE' }
  'sdm.devices.traits.Temperature'?: { ambientTemperatureCelsius: number }
  'sdm.devices.traits.Humidity'?: { ambientHumidityPercent: number }
  'sdm.devices.traits.ThermostatMode'?: {
    mode: ThermostatMode
    availableModes: ThermostatMode[]
  }
  'sdm.devices.traits.ThermostatHvac'?: { status: HvacStatus }
  'sdm.devices.traits.ThermostatEco'?: {
    mode: 'MANUAL_ECO' | 'OFF'
    availableModes: string[]
    heatCelsius: number
    coolCelsius: number
  }
  'sdm.devices.traits.ThermostatTemperatureSetpoint'?: {
    heatCelsius?: number
    coolCelsius?: number
  }
}

export type ThermostatMode = 'HEAT' | 'COOL' | 'HEATCOOL' | 'OFF'
export type HvacStatus = 'HEATING' | 'COOLING' | 'IDLE'

/** Normalised device state we keep in memory */
export interface DeviceState {
  id: string          // short ID extracted from the full resource name
  fullName: string    // full SDM resource path
  displayName: string
  type: string
  online: boolean
  tempCelsius?: number
  humidity?: number
  thermostatMode?: ThermostatMode
  hvacStatus?: HvacStatus
}

/** OAuth token response from Google */
export interface TokenResponse {
  access_token: string
  expires_in: number
  token_type: string
}
