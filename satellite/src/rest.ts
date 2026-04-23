import Koa from 'koa'
import Router from '@koa/router'
import { koaBody } from 'koa-body'
import serve from 'koa-static'
import http from 'http'
import type Conf from 'conf'
import type { SatelliteConfig } from './config.js'
import { ApiConfigData, ApiConfigDataUpdate, compileConfig, compileStatus, updateConfig } from './apiTypes.js'
import { createLogger } from './logging.js'
import type { JsonValue } from 'type-fest'
import type { MidiButtonPusher } from './midi-button-pusher.js'
import { getMidiPusherConfig } from './config.js'

export class RestServer {
	readonly #logger = createLogger('RestServer')

	private readonly appConfig: Conf<SatelliteConfig>
	private readonly midiPusher: MidiButtonPusher
	private readonly app: Koa
	private readonly router: Router
	private server: http.Server | undefined

	constructor(webRoot: string, appConfig: Conf<SatelliteConfig>, midiPusher: MidiButtonPusher) {
		this.appConfig = appConfig
		this.midiPusher = midiPusher

		this.appConfig.onDidChange('restEnabled', this.open.bind(this))
		this.appConfig.onDidChange('restPort', this.open.bind(this))

		this.app = new Koa()
		this.app.use(serve(webRoot))

		this.router = new Router()

		this.router.get('/api/config', (ctx) => {
			ctx.body = compileConfig(this.appConfig)
		})
		this.router.get('/api/status', (ctx) => {
			ctx.body = compileStatus(this.appConfig, this.midiPusher)
		})
		this.router.get('/api/midi/ports', (ctx) => {
			ctx.body = this.midiPusher.listPorts()
		})

		this.router.get('/api/host', (ctx) => {
			ctx.body = this.appConfig.get('companionHost')
		})
		this.router.get('/api/port', (ctx) => {
			ctx.body = this.appConfig.get('companionPort')
		})

		this.router.post('/api/config', koaBody(), (ctx) => {
			if (ctx.request.type !== 'application/json' || !bodyIsObject(ctx.request.body)) {
				ctx.status = 400
				ctx.body = 'Invalid request'
				return
			}

			const body = ctx.request.body as Partial<ApiConfigData>
			const partialConfig: ApiConfigDataUpdate = {}

			if (body.companionHost !== undefined) {
				if (typeof body.companionHost === 'string') {
					partialConfig.companionHost = body.companionHost
				} else {
					ctx.status = 400
					ctx.body = 'Invalid companionHost'
					return
				}
			}

			if (body.companionPort !== undefined) {
				const port = Number(body.companionPort)
				if (isNaN(port) || port < 1 || port > 65535) {
					ctx.status = 400
					ctx.body = 'Invalid companionPort'
					return
				}
				partialConfig.companionPort = port
			}

			if (body.midiPortType !== undefined) {
				if (body.midiPortType !== 'virtual' && body.midiPortType !== 'named') {
					ctx.status = 400
					ctx.body = 'Invalid midiPortType'
					return
				}
				partialConfig.midiPortType = body.midiPortType
			}

			if (body.midiPortName !== undefined) {
				if (typeof body.midiPortName !== 'string') {
					ctx.status = 400
					ctx.body = 'Invalid midiPortName'
					return
				}
				partialConfig.midiPortName = body.midiPortName
			}

			if (body.runAtStartup !== undefined) {
				if (typeof body.runAtStartup !== 'boolean') {
					ctx.status = 400
					ctx.body = 'Invalid runAtStartup'
					return
				}
				partialConfig.runAtStartup = body.runAtStartup
			}

			if (body.httpEnabled !== undefined) {
				if (typeof body.httpEnabled !== 'boolean') {
					ctx.status = 400
					ctx.body = 'Invalid httpEnabled'
					return
				}
				partialConfig.httpEnabled = body.httpEnabled
			}

			if (body.httpPort !== undefined) {
				const port = Number(body.httpPort)
				if (isNaN(port) || port < 1 || port > 65535) {
					ctx.status = 400
					ctx.body = 'Invalid httpPort'
					return
				}
				partialConfig.httpPort = port
			}

			updateConfig(this.appConfig, partialConfig)
			this.midiPusher.applyConfig(getMidiPusherConfig(this.appConfig))
			ctx.body = compileConfig(this.appConfig)
		})

		this.app.use(this.router.routes()).use(this.router.allowedMethods())
	}

	public open(): void {
		this.close()

		const enabled = this.appConfig.get('restEnabled')
		const port = this.appConfig.get('restPort')

		if (enabled && port) {
			let usedFallback = false

			const listen = (listenPort: number): void => {
				try {
					const server = this.app.listen(listenPort)
					server.once('listening', () => {
						this.server = server
						this.#logger.info(`REST server starting: port: ${listenPort}`)
					})
					server.once('error', (error) => {
						const isTaken = (error as NodeJS.ErrnoException)?.code === 'EADDRINUSE'
						if (isTaken && !usedFallback && listenPort > 1) {
							usedFallback = true
							const fallbackPort = listenPort - 1
							this.#logger.warn(`REST port ${listenPort} is in use. Retrying on ${fallbackPort}`)
							listen(fallbackPort)
							return
						}
						this.#logger.error(`Error starting REST server on port ${listenPort}: ${error}`)
					})
				} catch (error) {
					this.#logger.error(`Error starting REST server on port ${listenPort}: ${error}`)
				}
			}

			listen(port)
		} else {
			this.#logger.info('REST server not starting: disabled')
		}
	}

	public close(): void {
		if (this.server && this.server.listening) {
			this.server.close()
			this.server.closeAllConnections()
			delete this.server
			this.#logger.info('REST server closed')
		}
	}
}

function bodyIsObject(body: JsonValue | undefined): body is Record<string, JsonValue> {
	return typeof body === 'object' && body !== null && !Array.isArray(body)
}
