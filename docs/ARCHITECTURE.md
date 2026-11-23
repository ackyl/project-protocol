# Project Protocol — Implementation architecture

The game is a self-contained React, TypeScript, and Vite build with a Canvas ship cutaway, local fonts, and original Web Audio cues. There is no backend.

## Simulation

| File | Responsibility |
| --- | --- |
| [content.ts](../src/game/content.ts) | Typed cargo declarations, signatures, compatible fixtures, rooms, and tuning |
| [simulation.ts](../src/game/simulation.ts) | Immutable snapshots, validated commands, physical movement, cargo location, repair, exposure, and phase changes |
| [hazards.ts](../src/game/hazards.ts) | Seeded schedule, impact site, rivet order, and next route seed |
| [customs.ts](../src/game/customs.ts) | Room evidence, briefing, search route and timing, proximity-validated responses, and the settlement ledger |

`initial(seed)` creates a contract. `command` applies a discrete action and returns the same snapshot when the action is ineligible. `tick` advances the simulation at 30 Hz. Cargo has one location: loose, held, stowed, surrendered, or confiscated. The echo belongs to a room and survives changes to cargo location or power. Inspection records the route, stop, stage, carried suspicion, and any pending response. Officer travel, holds, and scan resolution are deterministic. The same evidence function powers the briefing and the actual search.

## Input and presentation

[runner.ts](../src/app/runner.ts) banks frame time, processes held input and click-to-walk targets, and publishes snapshots to React. [autopilot.ts](../src/app/autopilot.ts) chooses movement and a single arrival action. It still goes through the normal commands. [events.ts](../src/app/events.ts) derives sound and visual cues from snapshot changes. [tutorial.ts](../src/app/tutorial.ts) uses normal commands and training hooks and pauses the runner while a lesson panel is open.

[renderer.ts](../src/render/renderer.ts) draws a cached ship and live sprites on a low-resolution world canvas. A separate overlay draws crisp labels, prompts, repair gauges, and the response marker. Active play uses a clamped horizontal camera with a short dead zone. Rendering, overlay placement, and pointer input share the same transform. The officer’s animation is visual; gameplay resolves by fixed ticks. The renderer caps drawing around 30 fps and React updates at most 10 times per second between discrete events. Reduced motion disables camera look-ahead and strobing.

React owns the job ticket, telemetry and room strip, customs panel, receipt, and touch controls. Overlay measurements reserve screen space for the camera. The receipt appears after a presentation delay, independent of settlement.

## Verification

Simulation and presentation suites cover cargo constraints, both live repairs, echo persistence, room search, physical responses, settlement, replay, and the guided route. The fairness test drives the real movement and repair commands over 150 seeded runs. Development builds expose the runner and renderer via `window.__pp` for controlled browser checks. Production builds omit that hook. See [Development status](DEVELOPMENT_STATUS.md) for browser and build results.
