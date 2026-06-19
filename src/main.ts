import { InstanceBase, InstanceStatus, type SomeCompanionConfigField } from '@companion-module/base'
import { GetConfigFields, type ModuleConfig } from './config.js'
import { UpdateVariableDefinitions, type VariablesSchema } from './variables.js'
import { UpgradeScripts } from './upgrades.js'
import { UpdateActions, type ActionsSchema } from './actions.js'
import { UpdateFeedbacks, type FeedbacksSchema } from './feedbacks.js'
import { UpdatePresets } from './presets.js'
import { SdmClient } from './sdm-client.js'
import type { SdmDevice, SdmStructure } from './types.js'

export type ModuleSchema = {
	config: ModuleConfig
	secrets: undefined
	actions: ActionsSchema
	feedbacks: FeedbacksSchema
	variables: VariablesSchema
}

export { UpgradeScripts }

export default class ModuleInstance extends InstanceBase<ModuleSchema> {
	config!: ModuleConfig // Setup in init()
	devices = new Map<string, SdmDevice>()
	structures = new Map<string, SdmStructure>()

	public client: SdmClient | null = null
	private pollTimer: NodeJS.Timeout | null = null

	constructor(internal: unknown) {
		super(internal)
	}

	async init(config: ModuleConfig): Promise<void> {
		this.config = config
		//this.log('info', 'Config: ' + JSON.stringify(this.config))
		this.client = new SdmClient(config)

		this.updateStatus(InstanceStatus.Ok)

		await this.getGoogleNestDevices()
		this.startPolling(config.pollIntervalSec ?? 30) // get devices immediately on startup
		this.updateActions() // export actions
		this.updateFeedbacks() // export feedbacks
		this.updatePresets() // export Presets
		this.updateVariableDefinitions() // export variable definitions
	}
	// When module gets deleted
	async destroy(): Promise<void> {
		this.log('debug', 'I am DEAD!')
		this.stopPolling()
	}

	async configUpdated(config: ModuleConfig): Promise<void> {
		this.config = config
		this.log('info', 'Config updated')
		this.client = new SdmClient(config)

		await this.getGoogleNestDevices()
		this.startPolling(config.pollIntervalSec ?? 30)
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
		//const defs = buildVariableDefinitions(Array.from(this.devices.values()))
		//const vals = buildVariableValues(Array.from(this.devices.values()))
		//this.setVariableDefinitions(defs)
		//this.etVariableValues(vals)
		UpdateVariableDefinitions(this)
	}

	private startPolling(intervalSec: number): void {
		this.pollTimer = setInterval(() => {
			void this.getGoogleNestDevices()
		}, intervalSec * 1000)
	}

	private stopPolling(): void {
		if (this.pollTimer) {
			clearInterval(this.pollTimer)
			this.pollTimer = null
		}
	}

	async getGoogleNestDevices(): Promise<void> {
		if (!this.client) return

		try {
			const [rawDevices, rawStructures] = await Promise.all([this.client.listDevices(), this.client.listStructures()])

			this.structures.clear()
			for (const structure of rawStructures) {
				const id = structure.name.split('/').pop()!
				this.structures.set(id, structure)
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
			this.updateVariableDefinitions()
			this.updateStatus(InstanceStatus.Ok)
		} catch (err) {
			const message = err instanceof Error ? err.message : String(err)
			this.log('error', `Poll failed: ${message}`)
			this.updateStatus(InstanceStatus.UnknownError, message)
		}
	}
}
