export interface ApiStatusResponse {
	midiAvailable: boolean
	midiEnabled: boolean
	midiPortOpen: boolean
	midiPortType: 'virtual' | 'named'
	midiPortName: string
	companionHost: string
	companionPort: number
	lastError: string | null
}

export interface ApiConfigData {
	companionHost: string
	companionPort: number
	midiEnabled: boolean
	midiPortType: 'virtual' | 'named'
	midiPortName: string
	runAtStartup: boolean
	httpEnabled: boolean
	httpPort: number
}

export type ApiConfigDataUpdate = Partial<ApiConfigData>

export interface SatelliteUiApi {
	includeApiEnable: boolean
	getConfig: () => Promise<ApiConfigData>
	saveConfig: (newConfig: ApiConfigDataUpdate) => Promise<ApiConfigData>
	getStatus: () => Promise<ApiStatusResponse>
	getMidiPorts: () => Promise<string[]>
}
