import type { SatelliteUiApi, ApiConfigData, ApiStatusResponse, ApiConfigDataUpdate } from './types'

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
	const response = await fetch(`/api${path}`, init)
	if (!response.ok) {
		throw new Error(await response.text())
	}
	return (await response.json()) as T
}

export const SatelliteRestApi: SatelliteUiApi = {
	includeApiEnable: false,
	getStatus: async function (): Promise<ApiStatusResponse> {
		return requestJson<ApiStatusResponse>('/status')
	},
	getConfig: async function (): Promise<ApiConfigData> {
		return requestJson<ApiConfigData>('/config')
	},
	saveConfig: async function (newConfig: ApiConfigDataUpdate): Promise<ApiConfigData> {
		return requestJson<ApiConfigData>('/config', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify(newConfig),
		})
	},
	getMidiPorts: async function (): Promise<string[]> {
		return requestJson<string[]>('/midi/ports')
	},
}
