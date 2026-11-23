# Project Protocol

**The Cinder Run** is a playable smuggling contract set aboard the industrial freighter Mule–07. Use legal freight to cover an unlicensed relay bank. Keep the Choir Cask contained through a power cut, then get past the customs officer at Cinder Gate.

## Run locally

Use Node 24.x to match the tested runtime.

```sh
npm ci
npm run dev
```

Open the local address Vite prints. The first delivery offers a guided run that can be skipped or replayed.

| Action | Keyboard | Mouse and touch |
| --- | --- | --- |
| Walk and climb | A/D and W/S, or arrows | Click or tap a deck, or use the touch controls |
| Grab, stow, or use a station | E or Space | Click or tap the object, or press USE |
| Drop | Q | Click the carried freight or press DROP |
| Repair | E to lock the needle. Arrows or WASD for rivets. Esc to leave. | Click or tap the gauge or rivet arrows |
| Customs | E to allow the search or file at the marker. F to walk and file during a hold. | Choose a response, then walk to the marker or use the walk button |
| Next run or replay | R or T | Use the receipt buttons |
| Sound | M | Use the speaker button |

Stow the **relays in the rear rack** and the **heated drums in front**. Keep the bales in the visible berth and the cask in its powered cradle. Four continuous seconds without containment leave an echo for customs. Your layout and the evidence it leaves determine whether the officer accepts a surface check, opens a fixture, or adds another stop.

## Verify and deploy

```sh
npm run typecheck
npm run test
npm run build
npm run preview
```

The build writes a static game to `dist/`. For Vercel use the Vite preset, Node 24.x, `npm ci` for installation, and `npm run build` for the build. Assets and fonts are bundled.

[High-level game design](docs/HIGH_LEVEL_GAME_DESIGN_DOCUMENT.md) · [Mechanics](docs/MECHANICS.md) · [Architecture](docs/ARCHITECTURE.md) · [Development status](docs/DEVELOPMENT_STATUS.md)
