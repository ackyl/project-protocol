# Project Protocol

**The Cinder Run** is a playable one-day smuggling contract. Walk through the two-deck freighter Mule–07, secure its cargo, repair the power bus and talk your way through Cinder Gate. The settlement records what the ship, the cargo and the bribe actually cost you.

## Run locally

Tested with Node **24.14.1** and npm **11.11.0**. The toolchain supports Node 22.12+ within 22.x, 24.x or 26+. Use Node 24.x to match the tested runtime.

```sh
npm install
npm run dev
```

Open the local address Vite prints and take the job.

| Action | Keyboard | Mouse | Touch |
| --- | --- | --- | --- |
| Walk | Hold A/D or ←/→ | Click a spot on either deck | Hold ◀ ▶, or tap a spot |
| Ladder | W/↑ or S/↓ at the centre ladder (hold to climb on arrival) | Click the other deck or the ladder | ▲/▼ button, or tap the other deck |
| Grab, stow, repair | E or Space (nearest prompt) | Click the cargo, slot or console | USE button, or tap the target |
| Drop | Q | Click the courier | DROP button |
| Lock repair / leave | E or Space / Esc or walk away | Click the gauge | USE (LOCK) / LEAVE |
| Customs | E search · B bribe · 1/2 hand over | Buttons | Buttons |
| Restart | R or Enter | Button | Button |
| Sound | M | Speaker button | Speaker button |

The orange cell cooks while loose or carried. Rack it in a mustard cradle before it vents. The teal crate broadcasts until it sits in the shield bay (lower deck, bow end). Mid-run, a power surge blacks out the ship, blows ordinary rack latches and drains the hull until you win the phase-lock at the console (upper deck, aft). The clock never stops. When Cinder Gate appears, you have 20 seconds to hide everything. Customs then boards and checks five places. Each check costs you something.

## Verification and deployment

```sh
npm run typecheck
npm run test
npm run build
npm run preview
```

The build writes the static game to `dist/`. Vercel can use the **Vite** preset, Node 24.x, `npm ci` for installation, `npm run build` for the build command and `dist` as the output directory. Assets and fonts ship with the build. The game uses no environment variables, server or external runtime services.

The implemented rules, code structure and browser verification results are recorded in [Mechanics](docs/MECHANICS.md), [Architecture](docs/ARCHITECTURE.md) and [Development status](docs/DEVELOPMENT_STATUS.md).
