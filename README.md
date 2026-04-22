# Companion MIDI Satellite

A menubar/tray app that listens for MIDI messages and pushes Companion buttons over the local HTTP API.

Designed for ProPresenter macro workflows where ProPresenter sends Note-On messages to a local virtual MIDI port.

## Mapping (cloned from the ProPresenter module behavior)

For each received MIDI message:

- `page = channel + 1`
- `row = note`
- `column = velocity`
- if message is not detected as Note-On, velocity is forced to `0`

Then the app sends:

`POST http://<companionHost>:<companionPort>/api/location/<page>/<row>/<column>/press`

Default Companion host/port: `127.0.0.1:8000`

## Features

- macOS/Windows/Linux Electron tray/menubar app
- Config UI (host/port, MIDI enable, port mode/name, run at startup)
- Virtual MIDI port or named MIDI input port
- Optional local REST UI/API server (default port `9999`)
- Headless entrypoint support

## Development

Node 24 is required.

```bash
yarn install
yarn dev:webui
# in another terminal
yarn dev:electron
```

## Packaging

```bash
yarn install
yarn dist
```

Artifacts are created under `electron-output/`.
