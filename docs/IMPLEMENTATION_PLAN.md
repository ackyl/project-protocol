# Project Protocol — Vertical Slice Implementation Plan

Astra should execute **all** milestones below during the kickoff, not stop at scaffolding or a design document. Prioritize a playable vertical slice over polish. Keep each milestone working before proceeding.

## M1 — Foundation and visible ship
- Initialize strict TypeScript React/Vite/Vitest project with documented npm scripts and lockfile.
- Ship fully visible, two floors, ladder, maintenance console, slots, distinct cargo, responsive HUD and touch/keyboard inputs.
- Character walk and ladder motion; authoritative proximity checking; no jumping.
- Test walk/climb, floor constraints, item reachability.

## M2 — Cargo and concurrent survival pressure
- Implement pickup, carry, drop, slot placement/removal, cargo warning behavior, one shielded slot.
- Start a 90-second highway run. Script a power surge. Add a station timing minigame that runs without pausing transit.
- Demonstrate cargo and ship risk occurring at the same time.
- Test invalid interactions, cargo behavior, hazard timing, and successful/failed repair.

## M3 — Customs, delivery and consequences
- Implement timed 20-second customs preparation, then interactive sequential inspection of ship locations/slots.
- Implement inspection, bribe/surrender choices, seeded detection and arrest consequences.
- Implement delivery payout, damaged-ship adjustment, ledger, death, arrest, debt warning and restart.
- Test one successful full run plus detection, death and invalid bribe branches.

## M4 — Polish and verification
- Clear warnings, contextual cues and concise first-play control guide.
- Minimal original effects/optional Web Audio cues, mute and reduced-motion support.
- Check all states at ~390×844, ~375×667 and desktop viewport sizes using available browser tools; fix interaction and overflow defects.
- Run typecheck, Vitest, build, locally served production preview; record actual results in DEVELOPMENT_STATUS.

## Completion checks
- One full playable journey can be performed in the browser, from contract acceptance to an outcome and restart.
- Cargo and ship emergencies create genuine competing demands.
- All mandatory actions work via touch and mouse; keyboard controls are usable.
- Customs is a player-interactive phase grounded in actual ship/cargo state, not a random post-transit modal.
- No dead buttons, placeholder-only interactions, silently ignored valid commands, or fake test results.
- Out-of-scope five-day economy and additional cargo/hazards are clearly listed as future work, not reported as implemented.
