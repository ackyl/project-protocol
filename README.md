# Project Protocol

**The Cinder Run** is a playable one-day smuggling contract. Walk through the two-deck freighter Mule–07, secure its cargo, repair the power bus and talk your way through Cinder Gate. The settlement records what the ship, the cargo and the bribe actually cost you.

## Run locally

Tested with Node **24.14.1** and npm **11.11.0**. The toolchain supports Node 22.12+ within 22.x, 24.x or 26+. Use Node 24.x to match the tested runtime.

```sh
npm install
npm run dev
```

Open the local address Vite prints. Accept **The Cinder Run** to start the 90-second clock.

| Action | Keyboard | Touch or mouse |
| --- | --- | --- |
| Walk | Hold A/D or left/right arrow | Hold a direction button |
| Climb | W/up or S/down at the center ladder | Tap Climb at the ladder |
| Pick up, stow or open the console | E for the first available action | Select the named action |
| Drop carried cargo | Q | Drop |
| Time a repair or leave the console | E to lock, Escape to leave | Lock phase or Leave |
| Choose at customs, accept or restart | Tab or Shift+Tab, then Enter or Space | Select a button |

The orange cell starts on the lower deck. Bring it to a rack before its heat reaches 100%. The turquoise crate starts upstairs. The shield bay is on the lower right. A surge opens an ordinary latch holding the cell. At the upper-left console, use empty hands and lock the cursor inside the striped band. The highway clock keeps running.

Use the 20 seconds before boarding to choose your final cargo locations. Customs displays each location's detection risk before you decide. Inspect to proceed, pay 25 credits to skip a location, or surrender an item there. After settlement, **Restart delivery** opens a fresh contract.

## Verification and deployment

```sh
npm run typecheck
npm run test
npm run build
npm run preview
```

The build writes the static game to `dist/`. Vercel can use the **Vite** preset, Node 24.x, `npm ci` for installation, `npm run build` for the build command and `dist` as the output directory. Assets and fonts ship with the build. The game uses no environment variables, server or external runtime services.

The implemented rules, code structure and browser verification results are recorded in [Mechanics](docs/MECHANICS.md), [Architecture](docs/ARCHITECTURE.md) and [Development status](docs/DEVELOPMENT_STATUS.md).
