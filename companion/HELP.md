## Google Nest

1. Create a Google Cloud project and enable the "Smart Device Management API". <a href="https://console.cloud.google.com/" target="_blank">https://console.cloud.google.com/</a> <br/>
2. Create OAuth 2.0 credentials. You will enter the Client ID and Client Secret in the connection settings. <br/>
3. Create a Nest Device Access project and link it to your Google Cloud project. <a href="https://developers.google.com/nest/device-access" target="_blank">https://developers.google.com/nest/device-access</a> <br/>
4. Get an OAuth refresh token by following <a href="https://developers.google.com/nest/device-access/authorize" target="_blank">Google's authorization guide</a> <br/>
5. In the Google Cloud console, set the OAuth consent screen's publishing status to "In production". If it stays on "Testing", Google expires the refresh token after 7 days and the module will stop connecting. If that happens, generate a new refresh token and save it in the connection settings.

### Connection settings

- **Device Access Project ID:** shown at https://console.nest.google.com/device-access
- **Poll Interval:** how often device state is refreshed (15-300 s). The SDM sandbox allows about 5 requests per minute, so keep the default of 30 s unless you have a reason to change it.

### Actions

- **Adjust Temperature / Set Temperature:** for Heat or Cool mode.
- **Adjust Temperature (Heat/Cool) / Set Temperature (Heat/Cool):** for Heat/Cool mode.
- **Set Mode:** Heat, Cool, Heat/Cool or Off.
- **Set ECO Mode:** turn ECO on or off. While ECO is on, Google rejects all setpoint changes, so turn it off first.
- **Fan Timer:** run the fan for a set time, or turn it off.

All temperatures are in °C, because the Google API only accepts Celsius.

### Feedbacks

- **Device: Online**
- **Thermostat: Mode active**
- **Thermostat: HVAC running**
- **Thermostat: ECO active**

### Presets

Each thermostat gets presets for current temperature, HVAC status, setpoint up/down (including Heat/Cool) and the four modes and ECO.

### Variables

Variable ids look like `dev_<last 8 characters of the device id>_<trait>_<attribute>`, for example `dev_ab12cd34_temperature_ambienttemperaturecelsius`. They are built from Google's device id, so renaming a device or home doesn't change them. The variable list shows which id belongs to which thermostat.
