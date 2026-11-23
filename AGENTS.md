# Project Protocol — Agent Instructions

Read `docs/HIGH_LEVEL_GAME_DESIGN_DOCUMENT.md`, `docs/MECHANICS.md`, `docs/ARCHITECTURE.md`, `docs/IMPLEMENTATION_PLAN.md`, and `docs/DEVELOPMENT_STATUS.md` before implementation. Resolve differences by treating HIGH_LEVEL_GAME_DESIGN_DOCUMENT as product intent, MECHANICS as the authoritative initial prototype rules, and IMPLEMENTATION_PLAN as delivery order. Never silently change a confirmed design decision.

## Working principles
- Build a genuinely playable browser game, not a mockup or a series of disconnected menus.
- Prefer the simplest maintainable implementation that proves the intended player experience. No backend, auth, router, multiplayer, unnecessary state library, or heavyweight physics engine.
- Keep deterministic, framework-agnostic game rules in `src/game/`; React, DOM, Canvas, Web Audio and input adapters belong in the presentation layer.
- The game layer must validate commands; invalid commands cause no gameplay state change. Centralize balancing values and typed content definitions.
- Run the playable game after each significant milestone, not only at the end. Do not claim a check passed unless actually run.
- Keep docs accurate as behavior is implemented. Document deviations, assumptions and bugs in `docs/DEVELOPMENT_STATUS.md`.
- Avoid overbuilding the five-day campaign. The initial deliverable is **one full playable delivery**.

## Verification required
`npm run typecheck`, `npm run test`, `npm run build`, and a locally served production build via `npm run preview`. Inspect browser layout and input at narrow portrait, short phone, and desktop sizes, using available browser tools. If a browser-based check cannot be performed, record it explicitly as unverified; do not invent results.

## Definition of done
A player can start a delivery, move between two floors, pick up/place/drop dangerous cargo, manage a station minigame during a highway emergency, prepare for customs, interact during a customs search, finish or fail a delivery, and see money consequences and restart. All critical state transitions are covered by automated tests.
