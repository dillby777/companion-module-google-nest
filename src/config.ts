import { type SomeCompanionConfigField } from '@companion-module/base'

export type ModuleConfig = {
	clientId: string
	clientSecret: string
	projectId: string
	refreshToken: string
	pollIntervalSec: number
}

export function GetConfigFields(): SomeCompanionConfigField[] {
	return [
		{
			type: 'static-text',
			id: 'info',
			label: 'Information',
			value: `To use this module:<br/> 
				1, Create a Google Cloud project and enable the "Smart Device Management API". <a href="https://console.cloud.google.com/" target="_blank">https://console.cloud.google.com/</a> <br/> 
				2, Create OAuth 2.0 credentials and enter the Client ID and Client Secret below.
				3, Create a Nest Device Access project and link it to your Google Cloud project. <a href="https://console.nest.google.com/" target="_blank">https://console.nest.google.com/</a> <br/>

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
			type: 'textinput',
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
			type: 'textinput',
			id: 'refreshToken',
			label: 'OAuth Refresh Token',
			default: '',
			width: 12,
			tooltip: 'Obtained from the Google OAuth flow — see HELP.md for instructions',
		},
		{
			type: 'number',
			id: 'pollIntervalSec',
			label: 'Poll Interval (seconds)',
			default: 30,
			min: 10,
			max: 300,
			width: 4,
			tooltip: 'How often to refresh device state from the SDM API',
		},
	]
}
