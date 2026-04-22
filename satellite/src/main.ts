/* eslint-disable n/no-process-exit */
import '@julusian/segfault-raub'
import { createLogger, logger, flushLogger } from './logging.js'
import { asyncExitHook } from 'exit-hook'
import { RestServer } from './rest.js'
import { openHeadlessConfig, listenToMidiConfigChanges, getMidiPusherConfig } from './config.js'
import { fileURLToPath } from 'url'
import { MidiButtonPusher } from './midi-button-pusher.js'

const rawConfigPath = process.argv[2]
if (!rawConfigPath) {
	console.log(`
	Usage
	  $ companion-midi-satellite <configuration-path>

	Examples
	  $ companion-midi-satellite config.json
	  $ companion-midi-satellite /home/user/.config/companion-midi-satellite.json
`)

	process.exit(1)
}

const appConfig = openHeadlessConfig(rawConfigPath)
logger.info(`Starting with config: ${appConfig.path}`)

const webRoot = fileURLToPath(new URL('../../webui/dist', import.meta.url))

const midiLogger = createLogger('MidiButtonPusher')
const midiPusher = new MidiButtonPusher(midiLogger)
const server = new RestServer(webRoot, appConfig, midiPusher)

const applyMidiConfig = () => {
	midiPusher.applyConfig(getMidiPusherConfig(appConfig))
}

listenToMidiConfigChanges(appConfig, applyMidiConfig)
applyMidiConfig()
server.open()

asyncExitHook(
	async () => {
		logger.info('Exiting')
		await Promise.allSettled([(async () => midiPusher.close())(), (async () => server.close())()])
		await flushLogger()
		process.exit(0)
	},
	{
		wait: 2000,
	},
)
