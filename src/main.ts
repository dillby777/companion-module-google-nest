import { InstanceBase, InstanceStatus, type SomeCompanionConfigField } from '@companion-module/base'
import { GetConfigFields, type ModuleConfig, type ModuleSecrets } from './config.js'
import { UpdateVariableDefinitions, type VariablesSchema } from './variables.js'
import { UpgradeScripts } from './upgrades.js'
import { UpdateActions, type ActionsSchema } from './actions.js'
import { UpdateFeedbacks, type FeedbacksSchema } from './feedbacks.js'
import { UpdatePresets } from './presets.js'
import { SdmClient } from './sdm-client.js'
import { getDisplayName } from './helpers.js'
import type { SdmDevice, SdmStructure } from './types.js'

export type ModuleSchema = {
	config: ModuleConfig
	secrets: ModuleSecrets
	actions: ActionsSchema
	feedbacks: FeedbacksSchema
	variables: VariablesSchema
}

export { UpgradeScripts }

export default class ModuleInstance extends InstanceBase<ModuleSchema> {
	config!: ModuleConfig // Setup in init()
	secrets!: ModuleSecrets // Setup in init()
	devices = new Map<string, SdmDevice>()
	structures = new Map<string, SdmStructure>()

	public client: SdmClient | null = null
	private pollTimer: NodeJS.Timeout | null = null
	private polling = false
	/** Fingerprint of everything the action/feedback dropdowns are built from. null = never built from a successful poll */
	private deviceSignature: string | null = null
	private structuresFetchedAt = 0
	private static readonly STRUCTURE_REFRESH_MS = 10 * 60 * 1000
	constructor(internal: unknown) {
		super(internal)
	}

	async init(config: ModuleConfig, _isFirstInit: boolean, secrets: ModuleSecrets): Promise<void> {
		this.config = config
		this.secrets = secrets

		// Register definitions straight away so Companion always has something,
		// even when the config is blank or the first poll fails.
		this.refreshDefinitions()
		this.updateVariableDefinitions()

		await this.restart()
	}

	// When module gets deleted
	async destroy(): Promise<void> {
		this.log('debug', 'Module destroyed')
		this.stopPolling()
	}

	async configUpdated(config: ModuleConfig, secrets: ModuleSecrets): Promise<void> {
		this.config = config
		this.secrets = secrets
		this.log('info', 'Config updated')

		await this.restart()
	}

	// Return config fields for web config
	getConfigFields(): SomeCompanionConfigField[] {
		return GetConfigFields()
	}

	updateActions(): void {
		UpdateActions(this)
	}

	updateFeedbacks(): void {
		UpdateFeedbacks(this)
	}

	updatePresets(): void {
		UpdatePresets(this)
	}

	updateVariableDefinitions(): void {
		UpdateVariableDefinitions(this)
	}

	/** Rebuild everything whose dropdown choices come from the device list */
	private refreshDefinitions(): void {
		this.updateActions()
		this.updateFeedbacks()
		this.updatePresets()
	}

	private hasCredentials(): boolean {
		return !!(this.config.clientId && this.config.projectId && this.secrets.clientSecret && this.secrets.refreshToken)
	}

	/** (Re)create the client and start polling. Safe to call repeatedly. */
	private async restart(): Promise<void> {
		this.stopPolling()
		this.structures.clear()
		this.structuresFetchedAt = 0

		if (!this.hasCredentials()) {
			this.client = null
			this.updateStatus(InstanceStatus.BadConfig, 'Enter Client ID, Client Secret, Project ID and Refresh Token')
			return
		}

		this.client = new SdmClient(this.config, this.secrets)
		this.updateStatus(InstanceStatus.Connecting)

		await this.getGoogleNestDevices()
		this.startPolling(this.config.pollIntervalSec ?? 30)
	}

	private startPolling(intervalSec: number): void {
		this.stopPolling() // never leave an older timer running
		this.pollTimer = setInterval(() => {
			void this.getGoogleNestDevices()
		}, intervalSec * 1000)
	}

	private stopPolling(): void {
		if (this.pollTimer) {
			clearInterval(this.pollTimer)
			this.pollTimer = null
		}
		if (this.refreshTimer) {
			clearTimeout(this.refreshTimer)
			this.refreshTimer = null
		}
	}

	private refreshTimer: NodeJS.Timeout | null = null

	/** Poll once shortly after a mode change, to pick up setpoints Google only returns for the current mode */
	public requestRefresh(delayMs = 3000): void {
		if (this.refreshTimer) return
		this.refreshTimer = setTimeout(() => {
			this.refreshTimer = null
			void this.getGoogleNestDevices()
		}, delayMs)
	}

	/**
	 * Fingerprint of the things the action/feedback choices depend on.
	 * The thermostat actions currently filter on mode and setpoint presence,
	 * so those are included until the actions are reworked.
	 */
	private buildDeviceSignature(): string {
		return Array.from(this.devices.entries())
			.sort(([a], [b]) => a.localeCompare(b))
			.map(([id, d]) => [id, d.type, d.structureName, getDisplayName(d)].join('|'))
			.join(';')
	}

	async getGoogleNestDevices(): Promise<void> {
		if (!this.client || this.polling) return
		this.polling = true

		try {
			const rawDevices = await this.client.listDevices()

			// Structures (home names) rarely change, so don't fetch them on every poll.
			// Refetch when: nothing cached yet, a device points at an unknown structure,
			// or the cache is older than STRUCTURE_REFRESH_MS (picks up home renames).
			const structureIdOf = (d: SdmDevice) => d.parentRelations?.[0]?.parent?.match(/structures\/([^/]+)/)?.[1]
			const needStructures =
				this.structures.size === 0 ||
				Date.now() - this.structuresFetchedAt > ModuleInstance.STRUCTURE_REFRESH_MS ||
				rawDevices.some((d) => {
					const id = structureIdOf(d)
					return id !== undefined && !this.structures.has(id)
				})

			if (needStructures) {
				const rawStructures = await this.client.listStructures()
				this.structures.clear()
				for (const structure of rawStructures) {
					const id = structure.name.split('/').pop()!
					this.structures.set(id, structure)
				}
				this.structuresFetchedAt = Date.now()
			}

			this.devices.clear()
			for (const device of rawDevices) {
				const id = device.name.split('/').pop()!
				const parentPath = device.parentRelations?.[0]?.parent ?? ''
				const structureId = parentPath.match(/structures\/([^/]+)/)?.[1]
				const structure = structureId ? this.structures.get(structureId) : undefined
				device.structureName = structure?.traits['sdm.structures.traits.Info']?.customName ?? 'Unknown'

				this.devices.set(id, device)
			}

			// Rebuild dropdown choices only when the device list actually changed
			const signature = this.buildDeviceSignature()
			if (signature !== this.deviceSignature) {
				this.deviceSignature = signature
				this.refreshDefinitions()
			}

			this.updateVariableDefinitions()
			this.checkFeedbacks('device_online', 'thermostat_mode', 'hvac_active')
			this.updateStatus(InstanceStatus.Ok)
		} catch (err) {
			const message = err instanceof Error ? err.message : String(err)
			this.log('error', `Poll failed: ${message}`)

			if (message.includes('invalid_grant')) {
				// A dead refresh token won't recover on its own, so stop hammering Google until the user fixes it
				this.stopPolling()
				this.updateStatus(
					InstanceStatus.AuthenticationFailure,
					'Google rejected the refresh token. Generate a new one and save the connection settings',
				)
			} else {
				this.updateStatus(InstanceStatus.UnknownError, message)
			}
		} finally {
			this.polling = false
		}
	}
}
