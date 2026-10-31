# companion-module-google-home

For controlling Google Nest products, primarily Google Nest thermostats.

## Requirements:

1. Google Cloud project with the "Smart Device Management API" enabled
2. Create OAuth credentials in the Google Cloud project
3. Create a Nest Device Access project and link it to your Google Cloud project. https://developers.google.com/nest/device-access
4. Get OAuth tokens https://developers.google.com/nest/device-access/authorize
5. In the Google Cloud console, set the OAuth consent screen's publishing status to "In production". If it stays on "Testing", Google expires the refresh token after 7 days and the module will stop connecting. If that happens, generate a new refresh token and save it in the connection settings.
