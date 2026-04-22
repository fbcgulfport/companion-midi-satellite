/* eslint-disable n/no-process-exit */
import { fs, usePowerShell, argv } from 'zx'
import electronBuilder from 'electron-builder'

if (process.platform === 'win32') {
	usePowerShell()
}

const platform = argv._[0] || `${process.platform}-${process.arch}`

let platformInfo: { platform: string; arch: electronBuilder.Arch }

console.log(`Building for platform: ${platform}`)

if (platform === 'mac-x64' || platform === 'darwin-x64') {
	platformInfo = { platform: 'mac', arch: electronBuilder.Arch.x64 }
} else if (platform === 'mac-arm64' || platform === 'darwin-arm64') {
	platformInfo = { platform: 'mac', arch: electronBuilder.Arch.arm64 }
} else if (platform === 'win-x64' || platform === 'win32-x64') {
	platformInfo = { platform: 'win', arch: electronBuilder.Arch.x64 }
} else if (platform === 'linux-x64') {
	platformInfo = { platform: 'linux', arch: electronBuilder.Arch.x64 }
} else if (platform === 'linux-arm7') {
	platformInfo = { platform: 'linux', arch: electronBuilder.Arch.armv7l }
} else if (platform === 'linux-arm64') {
	platformInfo = { platform: 'linux', arch: electronBuilder.Arch.arm64 }
} else {
	console.error('Unknown platform')
	process.exit(1)
}

await fs.remove('./electron-output')

const options: electronBuilder.Configuration = {
	publish: [
		{
			provider: 'github',
			owner: 'fbcgulfport',
			repo: 'companion-midi-satellite',
		},
	],
	productName: 'Companion MIDI Satellite',
	appId: 'io.github.fbcgulfport.companion-midi-satellite',
	npmRebuild: false,
	directories: {
		buildResources: 'assets/',
		output: '../electron-output/',
	},
	mac: {
		category: 'public.app-category.utilities',
		target: 'dmg',
		extendInfo: {
			LSBackgroundOnly: 1,
			LSUIElement: 1,
		},
		hardenedRuntime: true,
		gatekeeperAssess: false,
		entitlements: 'satellite/entitlements.mac.plist',
		entitlementsInherit: 'satellite/entitlements.mac.plist',
		icon: 'icon-macos-glass.icon',
		identity: process.env.CSC_LINK ? undefined : null,
	},
	dmg: {
		artifactName: 'companion-midi-satellite-${arch}.dmg',
	},
	win: {
		target: 'nsis',
		verifyUpdateCodeSignature: false,
		signtoolOptions: {
			signingHashAlgorithms: ['sha256'],
			sign: async function sign(config, packager) {
				if (!config.cscInfo) return
				if (!packager) throw new Error('Packager is required')

				const targetPath = config.path
				if (targetPath.endsWith('elevate.exe')) return
				if (!process.env.BF_CODECERT_KEY) throw new Error('BF_CODECERT_KEY variable is not set')

				const vm = await packager.vm.value
				await vm.exec(
					'powershell.exe',
					['c:\\actions-runner-bitfocus\\sign.ps1', targetPath, `-Description`, 'Companion MIDI Satellite'],
					{
						timeout: 10 * 60 * 1000,
						env: process.env,
					},
				)
			},
		},
	},
	nsis: {
		createStartMenuShortcut: true,
		perMachine: true,
		oneClick: false,
		allowElevation: true,
		artifactName: 'companion-midi-satellite-x64.exe',
	},
	linux: {
		target: 'tar.gz',
		artifactName: 'companion-midi-satellite-${arch}.tar.gz',
		extraFiles: [
			{
				from: 'assets/linux',
				to: '.',
			},
		],
	},
	files: ['**/*', 'assets/*', '!.nvmrc', '!.node_version', '!docs', '!samples', '!src', '!tools', '!pi-image'],
	extraResources: [
		{
			from: '../webui/dist',
			to: 'webui',
		},
	],
	electronFuses: {
		runAsNode: false,
		enableCookieEncryption: false,
		enableNodeOptionsEnvironmentVariable: false,
		enableNodeCliInspectArguments: false,
		enableEmbeddedAsarIntegrityValidation: true,
		onlyLoadAppFromAsar: true,
		loadBrowserProcessSpecificV8Snapshot: false,
		grantFileProtocolExtraPrivileges: true,
	},
}

const satellitePkgJsonPath = new URL('../satellite/package.json', import.meta.url)
const satellitePkgJsonStr = await fs.readFile(satellitePkgJsonPath)

const satellitePkgJson = JSON.parse(satellitePkgJsonStr.toString())
satellitePkgJson.updateChannel = process.env.EB_UPDATE_CHANNEL
console.log('Injecting update channel: ' + satellitePkgJson.updateChannel)

if (process.env.BUILD_VERSION) satellitePkgJson.version = process.env.BUILD_VERSION

await fs.writeFile(satellitePkgJsonPath, JSON.stringify(satellitePkgJson))

try {
	await electronBuilder.build({
		targets: electronBuilder.Platform.fromString(platformInfo.platform).createTarget(null, platformInfo.arch),
		config: options,
		projectDir: 'satellite',
	})
} finally {
	await fs.writeFile(satellitePkgJsonPath, satellitePkgJsonStr)
}
