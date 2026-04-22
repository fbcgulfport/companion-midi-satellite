import Conf, { Schema } from 'conf'
import path from 'path'
import debounceFn from 'debounce-fn'
import { setMaxListeners } from 'events'
import type { MidiPusherConfig } from './midi-button-pusher.js'

export type SatelliteConfigInstance = Conf<SatelliteConfig>

export interface SatelliteConfig {
	companionHost: string
	companionPort: number

	midiEnabled: boolean
	midiPortType: 'virtual' | 'named'
	midiPortName: string

	runAtStartup: boolean

	restEnabled: boolean
	restPort: number
}

export const satelliteConfigSchema: Schema<SatelliteConfig> = {
	companionHost: {
		type: 'string',
		description: 'Address of Companion installation',
		default: '127.0.0.1',
	},
	companionPort: {
		type: 'integer',
		description: 'HTTP port number of Companion installation',
		minimum: 1,
		maximum: 65535,
		default: 8000,
	},
	midiEnabled: {
		type: 'boolean',
		description: 'Enable MIDI button pusher',
		default: false,
	},
	midiPortType: {
		type: 'string',
		enum: ['virtual', 'named'],
		description: 'How MIDI input port is selected',
		default: 'virtual',
	},
	midiPortName: {
		type: 'string',
		description: 'Virtual port name or named MIDI input port',
		default: 'CompanionMidiSatellite',
	},
	runAtStartup: {
		type: 'boolean',
		description: 'Run at OS login/startup',
		default: false,
	},
	restEnabled: {
		type: 'boolean',
		description: 'Enable HTTP api',
		default: true,
	},
	restPort: {
		type: 'integer',
		description: 'Port number to run HTTP server on',
		minimum: 1,
		maximum: 65535,
		default: 9999,
	},
}

export function ensureFieldsPopulated(store: Conf<SatelliteConfig>): void {
	for (const [key, schema] of Object.entries<any>(satelliteConfigSchema)) {
		if (store.get(key) === undefined && schema.default !== undefined) {
			store.set(key, schema.default)
		}
	}

	const legacyHost = store.get('remoteIp' as never)
	if (store.get('companionHost') === undefined && typeof legacyHost === 'string') {
		store.set('companionHost', legacyHost)
	}

	const legacyPort = store.get('remotePort' as never)
	if (store.get('companionPort') === undefined && typeof legacyPort === 'number') {
		store.set('companionPort', legacyPort)
	}

	// Ensure defaults are written to disk
	// eslint-disable-next-line no-self-assign
	store.store = store.store
}

export function openHeadlessConfig(rawConfigPath: string): Conf<SatelliteConfig> {
	const absoluteConfigPath = path.isAbsolute(rawConfigPath) ? rawConfigPath : path.join(process.cwd(), rawConfigPath)

	const appConfig = new Conf<SatelliteConfig>({
		schema: satelliteConfigSchema,
		configName: path.parse(absoluteConfigPath).name,
		projectName: 'companion-midi-satellite',
		cwd: path.dirname(absoluteConfigPath),
	})
	setMaxListeners(0, appConfig.events)

	ensureFieldsPopulated(appConfig)
	return appConfig
}

export function getMidiPusherConfig(config: SatelliteConfigInstance): MidiPusherConfig {
	return {
		companionHost: config.get('companionHost') || '127.0.0.1',
		companionPort: config.get('companionPort') || 8000,
		midiEnabled: config.get('midiEnabled') || false,
		midiPortType: config.get('midiPortType') || 'virtual',
		midiPortName: config.get('midiPortName') || 'CompanionMidiSatellite',
	}
}

export function listenToMidiConfigChanges(config: SatelliteConfigInstance, reload: () => void): void {
	const debouncedReload = debounceFn(reload, { wait: 50, after: true, before: false })

	config.onDidChange('companionHost', debouncedReload)
	config.onDidChange('companionPort', debouncedReload)
	config.onDidChange('midiEnabled', debouncedReload)
	config.onDidChange('midiPortType', debouncedReload)
	config.onDidChange('midiPortName', debouncedReload)
}
