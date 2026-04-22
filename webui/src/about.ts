declare const aboutApi: {
	getVersion: () => Promise<string>
	openShell: (url: string) => Promise<void>
}

const bug_report = document.querySelector('.bug-report-link') as HTMLDivElement
bug_report.addEventListener('click', (event: MouseEvent) => {
	event.preventDefault()
	aboutApi.openShell('https://github.com/fbcgulfport/companion-midi-satellite/issues').catch((error: unknown) => {
		console.error('failed to open bug report url', error)
	})
})

const open_home = () => {
	aboutApi.openShell('https://github.com/fbcgulfport/companion-midi-satellite').catch((error: unknown) => {
		console.error('failed to open homepage url', error)
	})
}

const title_elem = document.querySelector('.title') as HTMLHeadingElement

title_elem.addEventListener('click', open_home)
title_elem.classList.add('clickable')
const logo_elem = document.querySelector('.logo') as HTMLHeadingElement
logo_elem.addEventListener('click', open_home)
logo_elem.classList.add('clickable')

const yearElm = document.querySelector('#year') as HTMLSpanElement
yearElm.innerText = new Date().getFullYear().toString()

aboutApi
	.getVersion()
	.then((version: string) => {
		title_elem.innerText += ` ${version}`
	})
	.catch((error: unknown) => {
		console.error('failed to get version', error)
	})
