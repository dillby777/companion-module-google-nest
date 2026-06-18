import { type SdmDevice, type SdmStructure, type TokenResponse } from './types.js'
import { type ModuleConfig } from './config.js'

const SDM_BASE = 'https://smartdevicemanagement.googleapis.com/v1'
const TOKEN_URL = 'https://www.googleapis.com/oauth2/v4/token'

/**
 * Thin wrapper around the Google Smart Device Management REST API.
 * Handles OAuth token refresh automatically before each request.
 */
export class SdmClient {
	private accessToken: string | null = null
	private tokenExpiresAt = 0

	constructor(private readonly config: ModuleConfig) {}

	// ─── Auth ──────────────────────────────────────────────────────────────────

	/** Refresh the OAuth access token using the stored refresh token */
	private async refreshAccessToken(): Promise<void> {
		const body = new URLSearchParams({
			client_id: this.config.clientId,
			client_secret: this.config.clientSecret,
			refresh_token: this.config.refreshToken,
			grant_type: 'refresh_token',
		})

		const res = await fetch(TOKEN_URL, {
			method: 'POST',
			headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
			body: body.toString(),
		})

		if (!res.ok) {
			const text = await res.text()
			throw new Error(`Token refresh failed (${res.status}): ${text}`)
		}

		const data = (await res.json()) as TokenResponse
		this.accessToken = data.access_token
		// Subtract 60s to refresh slightly before actual expiry
		this.tokenExpiresAt = Date.now() + (data.expires_in - 60) * 1000
	}

	/** Return a valid access token, refreshing if necessary */
	private async getToken(): Promise<string> {
		if (!this.accessToken || Date.now() >= this.tokenExpiresAt) {
			await this.refreshAccessToken()
		}
		return this.accessToken!
	}

	// ─── HTTP helpers ──────────────────────────────────────────────────────────

	private async get<T>(path: string): Promise<T> {
		const token = await this.getToken()
		const res = await fetch(`${SDM_BASE}${path}`, {
			headers: { Authorization: `Bearer ${token}` },
		})

		if (!res.ok) {
			const text = await res.text()
			throw new Error(`SDM GET ${path} failed (${res.status}): ${text}`)
		}

		return res.json() as Promise<T>
	}

	// ─── Public API ────────────────────────────────────────────────────────────

	/** List all devices in the project */
	async listDevices(): Promise<SdmDevice[]> {
		const data = await this.get<{ devices?: SdmDevice[] }>(`/enterprises/${this.config.projectId}/devices`)
		return data.devices ?? []
	}

	/** Fetch a single device by its full resource name */
	async getDevice(fullName: string): Promise<SdmDevice> {
		return this.get<SdmDevice>(`/${fullName}`)
	}

	async executeCommand(deviceName: string, command: string, params: Record<string, unknown>): Promise<void> {
		const token = await this.getToken()
		const res = await fetch(`${SDM_BASE}/${deviceName}:executeCommand`, {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${token}`,
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({ command, params }),
		})

		if (!res.ok) {
			const text = await res.text()
			throw new Error(`SDM executeCommand failed (${res.status}): ${text}`)
		}
	}
	async listStructures(): Promise<SdmStructure[]> {
		const data = await this.get<{ structures?: SdmStructure[] }>(`/enterprises/${this.config.projectId}/structures`)
		return data.structures ?? []
	}
}
