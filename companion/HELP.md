## Google Nest

1. Create a Google Cloud project and enable the "Smart Device Management API". <a href="https://console.cloud.google.com/" target="_blank">https://console.cloud.google.com/</a> <br/>
2. Create OAuth 2.0 credentials and enter the Client ID and Client Secret below. <br/>
3. Create a Nest Device Access project and link it to your Google Cloud project. <a href="https://developers.google.com/nest/device-access" target="_blank">https://developers.google.com/nest/device-access</a> <br/>
4. Get OAuth tokens https://developers.google.com/nest/device-access/authorize
5. In the Google Cloud console, set the OAuth consent screen's publishing status to "In production". If it stays on "Testing", Google expires the refresh token after 7 days and the module will stop connecting. If that happens, generate a new refresh token and save it in the connection settings.
