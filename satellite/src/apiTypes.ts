import type Conf from 'conf'
import type { SatelliteConfig, SatelliteConfigInstance } from './config.js'
import type { MidiButtonPusher } from './midi-button-pusher.js'

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
export type ApiConfigDataUpdateElectron = ApiConfigDataUpdate

export interface SatelliteUiApi {
	includeApiEnable: boolean
	getConfig: () => Promise<ApiConfigData>
	saveConfig: (newConfig: ApiConfigDataUpdate) => Promise<ApiConfigData>
	getStatus: () => Promise<ApiStatusResponse>
	getMidiPorts: () => Promise<string[]>
}

export function compileStatus(appConfig: Conf<SatelliteConfig>, midiPusher: MidiButtonPusher): ApiStatusResponse {
	const midiStatus = midiPusher.getStatus()
	return {
		midiAvailable: midiStatus.midiAvailable,
		midiEnabled: midiStatus.midiEnabled,
		midiPortOpen: midiStatus.midiPortOpen,
		midiPortType: midiStatus.midiPortType,
		midiPortName: midiStatus.midiPortName,
		companionHost: appConfig.get('companionHost'),
		companionPort: appConfig.get('companionPort'),
		lastError: midiStatus.lastError,
	}
}

export function compileConfig(appConfig: Conf<SatelliteConfig>): ApiConfigData {
	return {
		companionHost: appConfig.get('companionHost'),
		companionPort: appConfig.get('companionPort'),
		midiEnabled: appConfig.get('midiEnabled'),
		midiPortType: appConfig.get('midiPortType'),
		midiPortName: appConfig.get('midiPortName'),
		runAtStartup: appConfig.get('runAtStartup'),
		httpEnabled: appConfig.get('restEnabled'),
		httpPort: appConfig.get('restPort'),
	}
}

export function updateConfig(appConfig: SatelliteConfigInstance, newConfig: ApiConfigDataUpdateElectron): void {
	if (newConfig.companionHost !== undefined) appConfig.set('companionHost', newConfig.companionHost)
	if (newConfig.companionPort !== undefined) appConfig.set('companionPort', newConfig.companionPort)
	if (newConfig.midiEnabled !== undefined) appConfig.set('midiEnabled', newConfig.midiEnabled)
	if (newConfig.midiPortType !== undefined) appConfig.set('midiPortType', newConfig.midiPortType)
	if (newConfig.midiPortName !== undefined) appConfig.set('midiPortName', newConfig.midiPortName)
	if (newConfig.runAtStartup !== undefined) appConfig.set('runAtStartup', newConfig.runAtStartup)
	if (newConfig.httpEnabled !== undefined) appConfig.set('restEnabled', newConfig.httpEnabled)
	if (newConfig.httpPort !== undefined) appConfig.set('restPort', newConfig.httpPort)
}
