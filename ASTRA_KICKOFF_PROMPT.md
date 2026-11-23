# Astra Kickoff Prompt — Project Protocol

You are the lead gameplay engineer, systems designer and UI implementer for **Project Protocol**, a mobile-first, single-player browser game. You are working from a new repository containing design and agent instruction documents but no application implementation.

**First, read these files completely and reconcile their responsibilities:**
- `AGENTS.md`
- `docs/HIGH_LEVEL_GAME_DESIGN_DOCUMENT.md`
- `docs/MECHANICS.md`
- `docs/ARCHITECTURE.md`
- `docs/IMPLEMENTATION_PLAN.md`
- `docs/DEVELOPMENT_STATUS.md`
- `README.md`

Treat the [high-level GDD](docs/HIGH_LEVEL_GAME_DESIGN_DOCUMENT.md)'s confirmed decisions as immutable design constraints. Treat the concrete numbers and prototype behaviors in MECHANICS as adjustable **initial defaults**, not new promises about the final game. Do not ask for additional design clarification where the docs already give a viable implementation. Make sensible, scoped choices and record them.

## Mission
Build and verify **a complete playable one-delivery vertical slice** in this folder, not just architecture, a proposal, UI mockups or code scaffolding. The experience is a desperate courier physically moving through a two-floor ship while dangerous cargo and a highway emergency compete for attention, followed by timed customs concealment, an interactive search, and a financial result.

The slice must contain:
1. A start/contract screen and a responsive, entirely visible, two-floor side-view ship.
2. Walk and ladder movement, with touch and keyboard controls; no jumping.
3. Physically located cargo that can be picked up, carried, dropped, moved and stowed. Two distinctive items: unstable Volatile Cell and detectable Signal Crate; three cargo slots, one shielded.
4. Ninety seconds of continuous highway travel, with clear HUD warnings and an unavoidable scripted power surge. A nearby station initiates a short timing minigame to repair the fault; the world clock continues while doing it.
5. Twenty seconds of customs preparation to relocate/conceal cargo, then an **interactive sequential inspection** grounded in actual ship cargo locations. Give the player understandable choices to inspect, bribe or surrender, and make their outcomes authoritative and testable.
6. Successful or reduced delivery payout, financial ledger, and distinguishable death/arrest/damage/debt consequences. A restart returns to a clean state without refreshing the page.
7. Real useable responsive controls and feedback, not decorative or inert buttons.

## Implementation rules
- Stack: React, React DOM, strict TypeScript, Vite official React plugin, Vitest, plain CSS, npm + committed package-lock. Static `dist/` suitable for Vercel. Choose currently compatible versions and document required Node version.
- Use a **Canvas 2D ship renderer** with React for panels/HUD/menus. Keep all authoritative gameplay logic free from React, DOM, Canvas and browser APIs. Do not introduce a game engine or physics library for this small slice.
- Model phases explicitly and perform validated state transitions through typed commands. Invalid commands must not mutate authoritative state. Separate held movement inputs from discrete context commands.
- Use a fixed simulation step, cap accumulated elapsed time after inactive tabs, and seed randomness. A fixed seed and a fixed sequence of inputs/ticks must reproduce the same result.
- Keep all timings, economy, cargo properties, hazard damage and movement speeds centralized. Use data-driven cargo/slot definitions and accessible feedback. Render consistent states across UI and Canvas.
- Give player actions immediate visible feedback; use original geometric/cartoon sci-fi placeholder art with a **colorful, grimy retro-futuristic** treatment. Do not force Project Dungeon's monochrome palette onto this game. No dependence on remote assets.
- Make the ship legible in portrait view, with thumb-reachable buttons, safe-area support, short-screen handling and no accidental page scroll during movement input. Add keyboard focus states and respect reduced motion.
- If adding sound, use simple Web Audio cues only, initialized after user gesture, and a mute toggle. Do not use unlicensed music.
- Do not implement the full five-day loop, upgrades, accounts, multiplayer, combat, jumping, procedural generation, pathfinding customs officers, or other scope creep. The weekly debt quota is thematic context, not a finished campaign system.

## Execution sequence
Follow `docs/IMPLEMENTATION_PLAN.md` from M1 through M4. Implement actual functionality and tests at each milestone. Ensure the project runs after each milestone. Fix failures before moving forward.

Build tests for:
- Phase transitions and a complete successful delivery.
- Walk/ladders and action proximity, including invalid commands.
- Cargo pickup/drop/stow, slot occupancy, volatile risk, shielded detection.
- Highway progression, scripted hazard, station minigame success/miss and hull death.
- Customs prep countdown, inspection order, bribe affordability, surrender, detection and arrest.
- Payout/ledger accounting, loss consequences and clean restart.
- Reproducibility with a fixed seed and deterministic timestep inputs.

## Required verification
After implementation run **all of**:
- `npm install`
- `npm run typecheck`
- `npm run test`
- `npm run build`
- `npm run preview` and inspect the served production build.

Also manually play the complete journey in the actual browser, checking at least narrow portrait (~390×844), short portrait (~375×667), and desktop layouts if browser tools are available. Exercise touch/mouse and keyboard flows where tooling supports them. Verify that the game is not simply visually functional but that actions mutate the proper authoritative state. If browser tooling isn't available, explicitly say so and do not present browser checks as passed.

## Documentation and completion report
Update README with **real** setup, tested Node version, controls and deployment instructions. Update MECHANICS with final implemented tuning and rules; ARCHITECTURE with actual implementation choices; DEVELOPMENT_STATUS with finished milestones, commands actually run, browser checks actually done, known issues and remaining work. Preserve the user's high-level GDD intent.

Finish with a concise report covering:
- What's playable and how to play.
- Any design assumptions or deviations.
- Exact typecheck/test/build results and whether the production preview was verified.
- Remaining bugs and intentionally deferred features.

**Do the implementation now. Do not stop after planning.**
