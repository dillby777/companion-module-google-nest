import { type SomeCompanionConfigField } from '@companion-module/base'

export type ModuleConfig = {
	clientId: string
	projectId: string
	pollIntervalSec: number
}

export type ModuleSecrets = {
	clientSecret: string
	refreshToken: string
}

export function GetConfigFields(): SomeCompanionConfigField[] {
	return [
		{
			type: 'static-text',
			id: 'instructions',
			label: 'Information',
			value: `To use this module:<br/> 
				1. Create a Google Cloud project and enable the "Smart Device Management API". <a href="https://console.cloud.google.com/" target="_blank">https://console.cloud.google.com/</a> <br/>
				2. Create OAuth 2.0 credentials and enter the Client ID and Client Secret below. <br/>
				3. Create a Nest Device Access project and link it to your Google Cloud project. <a href="https://developers.google.com/nest/device-access" target="_blank">https://developers.google.com/nest/device-access</a> <br/>
				4. Get OAuth refresh tokens <a href="https://developers.google.com/nest/device-access/authorize" target="_blank">https://developers.google.com/nest/device-access/authorize</a> <br/>
				5. In the Google Cloud console, set the OAuth consent screen's publishing status to "In production". If it stays on "Testing", Google expires the refresh token after 7 days and the module will stop connecting. If that happens, generate a new refresh token and save it in the connection settings.
				`,
			width: 8,
		},
		{
			type: 'textinput',
			id: 'clientId',
			label: 'Client ID',
			width: 8,
		},
		{
			type: 'secret-text',
			id: 'clientSecret',
			label: 'Client Secret',
			width: 8,
		},
		{
			type: 'textinput',
			id: 'projectId',
			label: 'Device Access Project ID',
			default: '',
			width: 12,
			tooltip: 'From console.nest.google.com/device-access',
		},
		{
			type: 'static-text',
			id: 'instructions-refreshtoken',
			label: 'Google Refresh token',
			value:
				'Follow these google instructions to obtain the refresh token <a href="https://developers.google.com/nest/device-access/authorize" target="_blank">Google OAuth flow</a>',
			width: 8,
		},
		{
			type: 'secret-text',
			id: 'refreshToken',
			label: 'OAuth Refresh Token',
			default: '',
			width: 12,
			tooltip: 'Obtained from the Google OAuth flow — see above "Google OAuth flow" link for instructions',
		},
		{
			type: 'number',
			id: 'pollIntervalSec',
			label: 'Poll Interval (seconds)',
			default: 30,
			min: 15,
			max: 300,
			width: 4,
			tooltip:
				'How often to refresh device state from the SDM API, the SDM sandbox has a rate limit of 5 queries per minute. set the poll rate appropriately',
		},
	]
}
