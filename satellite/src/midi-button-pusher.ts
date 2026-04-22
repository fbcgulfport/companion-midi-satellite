import { EventEmitter } from 'node:events'
import { Input } from '@julusian/midi'
import type { Logger } from './logging.js'

export interface MidiPusherConfig {
	companionHost: string
	companionPort: number
	midiEnabled: boolean
	midiPortType: 'virtual' | 'named'
	midiPortName: string
}

export interface MidiPusherStatus {
	midiAvailable: boolean
	midiEnabled: boolean
	midiPortOpen: boolean
	midiPortType: 'virtual' | 'named'
	midiPortName: string
	lastError: string | null
}

type MidiPusherEvents = {
	status: [MidiPusherStatus]
}

export class MidiButtonPusher extends EventEmitter<MidiPusherEvents> {
	readonly #logger: Logger
	#input: Input | undefined
	#config: MidiPusherConfig = {
		companionHost: '127.0.0.1',
		companionPort: 8000,
		midiEnabled: false,
		midiPortType: 'virtual',
		midiPortName: 'CompanionMidiSatellite',
	}
	#midiAvailable = true
	#lastError: string | null = null

	constructor(logger: Logger) {
		super()
		this.#logger = logger

		try {
			this.#input = new Input()
			this.#input.on('message', (deltaTime, message) => {
				this.#handleMessage(deltaTime, message)
			})
		} catch (error) {
			this.#midiAvailable = false
			this.#lastError = `Error creating midi input: ${error}`
			this.#logger.error(this.#lastError)
		}
	}

	public applyConfig(config: MidiPusherConfig): void {
		this.#config = config
		this.#lastError = null

		if (!this.#midiAvailable || !this.#input) {
			this.#emitStatus()
			return
		}

		if (this.#input.isPortOpen()) {
			try {
				this.#input.closePort()
			} catch (error) {
				this.#logger.warn(`Error closing midi port: ${error}`)
			}
		}

		if (!config.midiEnabled) {
			this.#emitStatus()
			return
		}

		try {
			if (config.midiPortType === 'virtual') {
				this.#logger.info(`Opening virtual midi port: ${config.midiPortName}`)
				this.#input.openVirtualPort(config.midiPortName)
			} else {
				this.#logger.info(`Opening midi port by name: ${config.midiPortName}`)
				this.#input.openPortByName(config.midiPortName)
			}
		} catch (error) {
			this.#lastError = `Error opening midi port: ${error}`
			this.#logger.error(this.#lastError)
		}

		this.#emitStatus()
	}

	public listPorts(): string[] {
		if (!this.#midiAvailable || !this.#input) return []

		try {
			const ports: string[] = []
			const count = this.#input.getPortCount()
			for (let i = 0; i < count; i++) {
				ports.push(this.#input.getPortName(i))
			}
			return ports
		} catch (error) {
			this.#logger.error(`Error listing midi ports: ${error}`)
			return []
		}
	}

	public getStatus(): MidiPusherStatus {
		return {
			midiAvailable: this.#midiAvailable,
			midiEnabled: this.#config.midiEnabled,
			midiPortOpen: this.#input?.isPortOpen() ?? false,
			midiPortType: this.#config.midiPortType,
			midiPortName: this.#config.midiPortName,
			lastError: this.#lastError,
		}
	}

	public close(): void {
		if (!this.#input?.isPortOpen()) return

		try {
			this.#input.closePort()
		} catch (error) {
			this.#logger.warn(`Error closing midi port: ${error}`)
		}

		this.#emitStatus()
	}

	#emitStatus(): void {
		this.emit('status', this.getStatus())
	}

	#handleMessage(deltaTime: number, message: number[]): void {
		if (!this.#config.midiEnabled) return
		if (message.length < 3) return

		const midiMessageChannel = message[0] & 0x0f
		const midiMessageIsNoteon = (message[0] & 0x90) == 0x90
		const midiMessageNote = message[1]
		let midiMessageVelocity = message[2]

		this.#logger.debug(
			`MIDI Message: Midi Channel: ${midiMessageChannel}, Is Note On?: ${midiMessageIsNoteon}, Note: ${midiMessageNote}, Velocity: ${midiMessageVelocity}, Delta Time: ${deltaTime}`,
		)

		if (!midiMessageIsNoteon) midiMessageVelocity = 0

		const buttonPressURL = `http://${this.#config.companionHost}:${this.#config.companionPort}/api/location/${
			midiMessageChannel + 1
		}/${midiMessageNote}/${midiMessageVelocity}/press`
		this.#logger.debug(`Sending button press HTTP request to: ${buttonPressURL}`)

		fetch(buttonPressURL, {
			signal: AbortSignal.timeout(2000),
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
		})
			.then((response) => {
				this.#logger.debug(`Button press response: ${response.status}: ${response.statusText}`)
			})
			.catch((error) => {
				this.#logger.error(`Error fetching ${buttonPressURL}. ${error}`)
			})
	}
}
