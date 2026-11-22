# Project Protocol — Implementation architecture

The slice uses React 19, strict TypeScript, Vite 8 with the official React plugin, Vitest 5 and plain CSS. The npm lockfile pins dependencies. Vite bundles the Canvas renderer and local font files into a self-contained static build. There is no game engine or extra runtime dependency.

## Authoritative simulation (`src/game/`)

| File | Responsibility |
| --- | --- |
| `content.ts` | Typed cargo definitions, physical locations, slots, search order and balance values |
| `simulation.ts` | Game state, command union, navigation, cargo ownership, phase transitions, fixed-tick highway systems and repair timing |
| `hazards.ts` | Seeded hazard director: surge and impact times, breach site and rivet order, next-run seed |
| `customs.ts` | Matching items to search stops, detection probabilities, risk preview (`exposure`), seeded rolls, surrender, bribes, terminal outcomes and ledger derivation |

`initial(seed)` creates a contract snapshot. `command(state, command)` applies a discrete action. `tick(state, direction)` advances one fixed step. These functions have no browser dependencies. They produce new snapshots for accepted changes and return the same snapshot for an ineligible action.

The phases run from contract through highway, prep, search and result. Hull loss can end highway travel. Detection can end a search early. Repair is a highway substate, so opening its interface keeps the clock and hazards running. Each item has exactly one location: loose coordinates, held, stowed in a named slot or surrendered.

The current RNG word belongs to the snapshot. Customs advances a 32-bit linear congruential generator for positive detection probabilities. Tick counts, command order and the seed are sufficient for a deterministic replay. The ledger derives earnings and charges from the terminal snapshot.

The game-first redesign did not change any rule in this layer apart from adding `exposure(g, id)`, which reuses `atStop` and `detection` to preview the odds an item will face where it currently sits.

Chunk 2 extended the state rather than special-casing it:

- `schedule` (pending hazards from the director), `breach`, `patch` (rivet progress) and `ticks` (departure-relative clock for once-per-second drains).
- `training` (`clock` held, `dormant` cargo) and an `agitation` meter per item.
- New commands, all validated like the rest: `patch`, `rivet`, `newRun`, and the training-only `trigger` and `train`.

## Application layer (`src/app/`)

Framework-agnostic glue between input, simulation and presentation.

| File | Responsibility |
| --- | --- |
| `runner.ts` | Owns the live snapshot, the 30 Hz fixed-step accumulator (frame delta capped at `rules.maxFrameMs`, hidden frames add no time), held keyboard/pointer directions, hold-to-climb, the click-to-move target and keyboard mapping per phase. Publishes a `UiState` for React via `useSyncExternalStore` and notifies the renderer each frame. |
| `autopilot.ts` | Pure `steer(game, target)`: walks toward a target, lines up with the ladder before climbing and issues one command on arrival. The game still validates every command it emits. |
| `events.ts` | Pure `diff(prev, next)`: derives presentation events (pick, stow, ejected, vent, surge, repairMiss, stopCleared, outcome…) by comparing snapshots, so effects and sound never live in the simulation. |
| `interact.ts` | Context actions sorted nearest-first, with a verb for prompts and the touch USE button. |
| `tutorial.ts` | Guided first delivery. Each step has a ready condition, a done condition, optional training commands to send (wake cargo, trigger a drill, release the clock) and a focus target. Opening a panel calls `runner.pause(true)`, which banks no time. Completion lives in `localStorage`. |

Two presentation-only timings live in the runner: an inspection resolves only after the officer has reached the stop and scanned for 0.9 s, and the result receipt appears 1.3–2.4 s after the outcome so the arrest or wreck plays out in the world first. Neither affects the outcome, the RNG or the ledger.

## Presentation (`src/render/`, `src/components/`, `src/audio/`)

The canvas fills the viewport; the ship is the play surface.

- `render/world.ts` maps ship units to a larger pixel-art space (1.25 art px per unit, 58 px decks) and defines the camera bounds. Landscape and desktop frame the whole hull; portrait frames the full walkable interior (every deck, slot and station) and crops only the engine plumes and the cockpit tip.
- The renderer also draws the specimen jar and agitation gauge, pulse shockwaves, the breach hole with inflowing air, welded patch plates, the rivet panel (with clickable arrows), cyan breach and magenta specimen markers, and the tutorial's focus brackets.
- `render/renderer.ts` draws the world into a small low-resolution canvas (about 650×490 on a laptop) that CSS scales up with `image-rendering: pixelated`. A second transparent canvas, capped at 1.5× device pixels, carries the crisp world-anchored UI: action prompts, ladder hints, emergency markers, the phase-lock gauge, risk tags, floating callouts and banners. It redraws at most 30 times a second (the simulation rate). It animates the courier and the customs officer and owns lighting (an interior dimming pass, blinking red beacons during a fault, a cold tint at the gate), hull damage decals, and hit-tests pointer input for tap/click-to-move.
- `render/ship.ts` holds the static hull (drawn once into a cached canvas) and animated machinery, cargo cradles and the shield bay. `render/sprites.ts` holds the courier, officer, cell, crate, signal rings and heat gauge. `render/space.ts` draws the parallax highway, dock, Cinder Gate approach and arch. `render/fx.ts` owns particles, callouts, flashes and screen shake. `render/icons.ts` renders the same sprites to images for DOM screens.
- **Performance budget.** There are no radial or additive glow gradients, no full-screen vignette, flash or screen shake, no ambient smoke or steam emitters, and no looping CSS animations. Particles appear only on discrete events and are capped at 160. React receives state immediately after discrete events and otherwise at most 10 times a second.
- `audio/sfx.ts` synthesises original cues with Web Audio (no files): steps, pickup, stow clunk, surge, sparks, alarm loop during the fault, heat beeps that speed up, vent blast, repair chime, scanner, coin, busted siren and wreck boom. Mute with M or the HUD button; the choice is stored in `localStorage` when available.
- `components/` contains React overlays only: `Hud` (hull segments, cargo status strip, route/clock or customs pips, wallet, one-line objective or training objective, desktop key legend), `TutorialPanel` (large paused lesson panels with CSS illustrations), `Title` (job ticket with training entry), `Customs` (officer comm box), `Ledger` (receipt), `TouchControls`, and `reserve.ts`, which measures overlay panels so the camera frames the ship in the space they leave.
- `styles/main.css` handles safe areas, portrait/landscape/short layouts, focus outlines and reduced motion. Reduced motion also disables screen shake, flashes and beacon strobing in the renderer.

## Verification and build

`classic.ts` pins the original one-surge, two-cargo scenario so the first slice's tests keep their exact meaning. `hazards.test.ts` covers the director, breach, specimen and training hooks. `tutorial.test.ts` plays the whole guided delivery through the real runner with synthetic frames, including pausing, skipping and early demonstration. `fairness.test.ts` runs a scripted competent courier across 150 seeds.

The suites under `src/tests/` cover ship navigation, cargo and station rules, complete command-driven journeys, seeded detection, settlement and replay, plus the presentation logic: autopilot pathing and ladder alignment, event derivation for every critical transition, nearest-action ordering and that the risk preview matches the search odds.

`npm run typecheck` invokes TypeScript without emitting files. `npm run test` runs Vitest once. `npm run build` typechecks and bundles `dist/`. `npm run preview` serves that directory for browser checks. In development builds only, `window.__pp` exposes the runner and renderer; `runner.advance(seconds)` steps the clock through the same input path as live play, which makes late phases reachable during manual checks.
