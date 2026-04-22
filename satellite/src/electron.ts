import '@julusian/segfault-raub'

import { app, Tray, Menu, MenuItem, dialog, nativeImage, BrowserWindow, ipcMain, shell } from 'electron'
import * as path from 'path'
import electronStore from 'electron-store'
import { RestServer } from './rest.js'
import { flushLogger, createLogger } from './logging.js'
import { SatelliteConfig, ensureFieldsPopulated, listenToMidiConfigChanges, getMidiPusherConfig } from './config.js'
import {
	ApiConfigData,
	ApiConfigDataUpdateElectron,
	ApiStatusResponse,
	compileConfig,
	compileStatus,
	updateConfig,
} from './apiTypes.js'
import { fileURLToPath } from 'url'
import { ElectronUpdater } from './electronUpdater.js'
import { setMaxListeners } from 'events'
import { MidiButtonPusher } from './midi-button-pusher.js'

const lock = app.requestSingleInstanceLock()
if (!lock) {
	dialog.showErrorBox(
		'Multiple instances',
		'Another instance is already running. Please close the other instance first.',
	)
	app.quit()
	// eslint-disable-next-line n/no-process-exit
	process.exit(0)
}

const appConfig = new electronStore<SatelliteConfig>({})
setMaxListeners(0, appConfig.events)
ensureFieldsPopulated(appConfig)

const electronUpdater = new ElectronUpdater()
const midiLogger = createLogger('MidiButtonPusher')
const midiPusher = new MidiButtonPusher(midiLogger)

let tray: Tray | undefined
let configWindow: BrowserWindow | undefined
let aboutWindow: BrowserWindow | undefined

app.on('window-all-closed', () => {
	// Block default behaviour of exit on close
})

const webRoot = fileURLToPath(new URL(app.isPackaged ? '../../webui' : '../../webui/dist', import.meta.url))
const server = new RestServer(webRoot, appConfig, midiPusher)

const applyMidiConfig = () => {
	midiPusher.applyConfig(getMidiPusherConfig(appConfig))
}

listenToMidiConfigChanges(appConfig, applyMidiConfig)
appConfig.onDidChange('runAtStartup', (enabled) => {
	app.setLoginItemSettings({
		openAtLogin: !!enabled,
	})
})

const trayMenu = new Menu()
trayMenu.append(
	new MenuItem({
		label: 'Configure',
		click: () => {
			if (configWindow?.isVisible()) return

			const isProduction = app.isPackaged

			configWindow = new BrowserWindow({
				show: false,
				width: 720,
				minWidth: 500,
				height: 900,
				minHeight: 500,
				autoHideMenuBar: isProduction,
				webPreferences: {
					preload: fileURLToPath(new URL('../dist/electronPreload.cjs', import.meta.url)),
				},
			})
			configWindow.on('close', () => {
				configWindow = undefined
			})
			if (isProduction) {
				configWindow.removeMenu()
				configWindow
					.loadFile(path.join(webRoot, 'electron.html'))
					.then(() => {
						configWindow?.show()
					})
					.catch((e) => {
						console.error('Failed to load file', e)
					})
			} else {
				configWindow
					.loadURL('http://localhost:5173/electron.html')
					.then(() => {
						configWindow?.show()
					})
					.catch((e) => {
						console.error('Failed to load file', e)
					})
			}
		},
	}),
)
trayMenu.append(
	new MenuItem({
		label: 'Run at startup',
		type: 'checkbox',
		checked: appConfig.get('runAtStartup'),
		click: (item) => {
			appConfig.set('runAtStartup', item.checked)
		},
	}),
)
trayMenu.append(electronUpdater.menuItem)
trayMenu.append(
	new MenuItem({
		label: 'About',
		click: trayAbout,
	}),
)
trayMenu.append(
	new MenuItem({
		label: 'Quit',
		click: trayQuit,
	}),
)

app.on('before-quit', (e) => {
	e.preventDefault()
	Promise.allSettled([(async () => midiPusher.close())(), (async () => server.close())()])
		.then(async () => {
			await flushLogger()
		})
		.catch((err) => {
			console.error('Failed to do quit', err)
		})
		.finally(() => {
			app.exit(0)
		})
})

app.whenReady()
	.then(async () => {
		electronUpdater.check()
		server.open()
		applyMidiConfig()

		app.setLoginItemSettings({
			openAtLogin: appConfig.get('runAtStartup'),
		})

		let trayImagePath = new URL('../assets/tray.png', import.meta.url)
		let trayImageOfflinePath = new URL('../assets/tray-offline.png', import.meta.url)
		switch (process.platform) {
			case 'darwin':
				trayImagePath = new URL('../assets/trayTemplate.png', import.meta.url)
				trayImageOfflinePath = new URL('../assets/trayOfflineTemplate.png', import.meta.url)
				break
			case 'win32':
				trayImagePath = new URL('../assets/tray.ico', import.meta.url)
				trayImageOfflinePath = new URL('../assets/tray-offline.ico', import.meta.url)
				break
		}
		const trayImage = nativeImage.createFromPath(fileURLToPath(trayImagePath))
		const trayImageOffline = nativeImage.createFromPath(fileURLToPath(trayImageOfflinePath))

		tray = new Tray(trayImageOffline)
		tray.setContextMenu(trayMenu)

		const setTrayStatus = () => {
			const status = midiPusher.getStatus()
			tray?.setImage(status.midiPortOpen ? trayImage : trayImageOffline)
			tray?.setToolTip(
				status.midiPortOpen
					? `Companion MIDI Satellite (${status.midiPortType}: ${status.midiPortName})`
					: 'Companion MIDI Satellite (MIDI disconnected)',
			)
		}

		midiPusher.on('status', () => {
			setTrayStatus()
		})
		setTrayStatus()
	})
	.catch((e) => {
		dialog.showErrorBox(`Startup error`, `Failed to launch: ${e}`)
	})

function trayQuit() {
	dialog
		.showMessageBox({
			title: 'Companion MIDI Satellite',
			message: 'Are you sure you want to quit Companion MIDI Satellite?',
			buttons: ['Quit', 'Cancel'],
		})
		.then(async (v) => {
			if (v.response === 0) {
				app.quit()
			}
		})
		.catch((e) => {
			console.error('Failed to do quit', e)
		})
}

function trayAbout() {
	if (aboutWindow?.isVisible()) return

	const isProduction = app.isPackaged

	aboutWindow = new BrowserWindow({
		show: false,
		width: 400,
		height: 400,
		autoHideMenuBar: isProduction,
		icon: fileURLToPath(new URL('../assets/icon.png', import.meta.url)),
		resizable: !isProduction,
		webPreferences: {
			preload: fileURLToPath(new URL('../dist/aboutPreload.cjs', import.meta.url)),
		},
	})
	aboutWindow.on('close', () => {
		aboutWindow = undefined
	})
	if (isProduction) {
		aboutWindow.removeMenu()
		aboutWindow
			.loadFile(path.join(webRoot, 'about.html'))
			.then(() => {
				if (!aboutWindow) return

				aboutWindow.show()
				aboutWindow.focus()

				aboutWindow.webContents.send('about-version', app.getVersion())
			})
			.catch((e) => {
				console.error('Failed to load file', e)
			})
	} else {
		aboutWindow
			.loadURL('http://localhost:5173/about.html')
			.then(() => {
				if (!aboutWindow) return

				aboutWindow.show()
				aboutWindow.focus()

				aboutWindow.webContents.send('about-version', app.getVersion())
			})
			.catch((e) => {
				console.error('Failed to load file', e)
			})
	}
}

ipcMain.handle('getStatus', async (): Promise<ApiStatusResponse> => {
	return compileStatus(appConfig, midiPusher)
})
ipcMain.handle('getConfig', async (): Promise<ApiConfigData> => {
	return compileConfig(appConfig)
})
ipcMain.handle('saveConfig', async (_e, newConfig: ApiConfigDataUpdateElectron): Promise<ApiConfigData> => {
	updateConfig(appConfig, newConfig)
	if (newConfig.runAtStartup !== undefined) {
		app.setLoginItemSettings({
			openAtLogin: newConfig.runAtStartup,
		})
	}
	applyMidiConfig()
	return compileConfig(appConfig)
})
ipcMain.handle('getMidiPorts', async (): Promise<string[]> => {
	return midiPusher.listPorts()
})

ipcMain.handle('openShell', async (_e, url: string): Promise<void> => {
	shell.openExternal(url).catch((e) => {
		console.error('Failed to open shell', e)
	})
})
ipcMain.handle('getVersion', async (): Promise<string> => {
	return app.getVersion()
})
