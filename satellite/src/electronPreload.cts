/* eslint-disable @typescript-eslint/no-require-imports */
const { contextBridge, ipcRenderer } = require('electron')
import type {
	ApiConfigData,
	ApiConfigDataUpdateElectron,
	ApiStatusResponse,
	SatelliteUiApi,
} from './apiTypes.js'

const electronApi: SatelliteUiApi = {
	includeApiEnable: true,
	getStatus: async (): Promise<ApiStatusResponse> => ipcRenderer.invoke('getStatus'),
	getConfig: async (): Promise<ApiConfigData> => ipcRenderer.invoke('getConfig'),
	saveConfig: async (newConfig: ApiConfigDataUpdateElectron): Promise<ApiConfigData> =>
		ipcRenderer.invoke('saveConfig', newConfig),
	getMidiPorts: async (): Promise<string[]> => ipcRenderer.invoke('getMidiPorts'),
}

contextBridge.exposeInMainWorld('electronApi', electronApi)

export type { electronApi }
