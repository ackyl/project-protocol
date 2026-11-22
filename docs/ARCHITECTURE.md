# Project Protocol — Implementation architecture

The slice uses React 19, strict TypeScript, Vite 8 with the official React plugin, Vitest 5 and plain CSS. The npm lockfile pins dependencies. Vite bundles the Canvas renderer and local font files into a self-contained static build.

## Authoritative simulation

| File | Responsibility |
| --- | --- |
| `src/game/content.ts` | Typed cargo definitions, physical locations, slots, search order and balance values |
| `src/game/simulation.ts` | Game state, command union, navigation, cargo ownership, phase transitions, fixed-tick highway systems and repair timing |
| `src/game/customs.ts` | Matching items to search stops, detection probabilities, seeded rolls, surrender, bribes, terminal outcomes and ledger derivation |

`initial(seed)` creates a contract snapshot. `command(state, command)` applies a discrete action. `tick(state, direction)` advances one fixed step. These functions have no browser dependencies. They produce new snapshots for accepted changes and return the same snapshot for an ineligible action. The renderer and tests use the same position, proximity, shielding, action-availability and economy functions.

The phases run from contract through highway, prep, search and result. Hull loss can end highway travel. Detection can end a search early. Repair is a highway substate, so opening its interface keeps the clock and hazards running. Each item has exactly one location, represented as loose coordinates, held, stowed in a named slot or surrendered. Slot occupancy and carried cargo are derived from those locations.

The current RNG word belongs to the snapshot. Customs advances a 32-bit linear congruential generator for positive detection probabilities. Tick counts, command order and the seed are sufficient for a deterministic replay. The ledger derives earnings and charges from the terminal snapshot, so displaying it repeatedly cannot charge a fee twice.

## Presentation and input

- `src/input/useFlight.ts` holds the current snapshot in a ref, sends typed commands and publishes changes to React. A requestAnimationFrame accumulator runs the simulation at 30 Hz. It caps each frame delta at 150 ms. Hidden frames add no simulation time. Blur and visibility changes clear movement and reset the time accumulator.
- Keyboard and pointer movement are held separately from discrete actions. Pointer capture releases on up, cancellation or loss of capture. The most recently inserted held direction takes precedence. Buttons support native focus and activation. A ladder command validates which deck the courier can reach.
- `src/render/ShipCanvas.tsx` and `src/render/draw.ts` draw a 480×216 pixel-art cutaway, cargo, courier, power fault and current inspection location. Cargo and the courier share game coordinates. Ladder progress interpolates the display between decks.
- `src/components/` contains the HUD, contract, cargo manifest, context controls, timing strip, customs choices and financial ledger. Available actions carry their actual typed commands. The game validates each command again when it is submitted. State transitions and command feedback supply the status text.
- `src/styles/main.css` handles safe areas, portrait controls, scrollable short-screen panels, keyboard focus and reduced motion. The repair cursor and ladder motion communicate simulation state. All art is drawn locally and the slice is silent.

## Verification and build

The three suites under `src/tests/` cover ship navigation, cargo and station rules, complete command-driven journeys, seeded detection, settlement and replay. Targeted branch tests also construct specific preconditions, such as two items under inspection at one location.

`npm run typecheck` invokes TypeScript without emitting files. `npm run test` runs Vitest once. `npm run build` typechecks and bundles `dist/`. `npm run preview` serves that directory for browser checks. Vercel deployment settings and supported runtimes are in the [README](../README.md).
