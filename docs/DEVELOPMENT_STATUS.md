# Project Protocol — Development status

## Playable slice

The Cinder Run is complete from contract acceptance to final settlement and restart. The player handles two physical cargo items, crosses two decks, repairs a live highway fault, prepares for customs, and makes a separate decision at each search location. The financial ledger distinguishes cargo income, surrender, arrest, hull damage, death and debt.

## Milestones

| Milestone | Implementation and checks performed before advancing |
| --- | --- |
| M1 | Built the ship cutaway, HUD, contract, movement and ladder. Typecheck, 3 navigation tests and production build passed. Launched the development server, accepted the contract in Chrome, walked to the ladder and checked arrival on the upper deck. |
| M2 | Added cargo handling, heat, shielding, the 90-second highway, surge, timed console and hull loss. Typecheck, 9 tests and build passed. In Chrome, picked up and stowed the cell, opened the faulted console, missed a sweep and restored power. |
| M3 | Added 20-second prep, location-based search, seeded detection, bribes, surrender, ledger and restart. Typecheck, 18 tests and build passed. A development-browser run bribed one stop, surrendered the cell, delivered the crate, closed with 41 CR and restarted. |
| M4 | Added spatial labels, distinct room machinery, repair and search feedback, short-screen panels, keyboard focus and touch cancellation checks. Final verification used the locally served production build. |

## Final command results

Tested on macOS with Node 24.14.1, npm 11.11.0 and Google Chrome 157.0.8103.79.

| Command | Result |
| --- | --- |
| `npm install` | Exit 0. Dependencies installed and locked. Final install reported zero vulnerabilities. |
| `npm run typecheck` | Exit 0. Strict TypeScript completed with zero diagnostics. |
| `npm run test` | Exit 0. All 20 tests in 3 files passed. |
| `npm run build` | Exit 0. Vite 8.3.8 transformed 30 modules and emitted a static build with local fonts. |
| `npm run preview -- --host 127.0.0.1 --port 4173 --strictPort` | Served `dist/` on port 4173. Production UI was played in Chrome. |

## Browser verification

The desktop real-time journey used the normal production clock, keyboard movement and context actions, and mouse clicks on the console and customs choices. Both items were physically stowed before the surge. After the surge the cell was re-secured and the power bus repaired. During prep the cell moved from the aft rack to the upper rack. All five inspections cleared. Starting cash of 40 CR plus 120 CR in freight income minus 18 CR of hull repairs left **142 CR**. Restart restored the contract, 100 hull, both starting cargo positions and the 01:30 clock.

Additional Playwright-driven Chrome runs used a controlled browser clock to exercise more branches. They sent keyboard, mouse or Chrome touch input through the production UI, read the visible state and captured each phase. They did not inject game snapshots or invoke simulation commands directly.

| Viewport | Verified on the production preview |
| --- | --- |
| 390×844 portrait | Held touch movement, climb while carrying, pickup, drop, both slots, surge, repair miss and hit, prep, bribe, unaffordable second bribe, surrender, 51 CR reduced settlement, restart and hull death. |
| 375×667 short portrait | Same movement, cargo and repair inputs. Dropped the cell during prep. The lower-deck sweep showed 100% detection. Inspection caused arrest and a −4 CR settlement. Restart and a separate −60 CR hull-loss run reached their ledgers. |
| 1280×860 desktop | Real-time keyboard/mouse full payout and restart. Separate mouse-button run covered reduced delivery, debt and death. |
| 844×390 landscape | Additional check confirmed the whole ship fit the active viewport. |

Reviewed contract, transit, surge, repair, prep, search, settlement and hull-loss captures. The portrait game keeps the ship and movement buttons in the viewport. Short panels can scroll internally for longer choices or receipts. Browser checks also covered a keyboard-focused contract acceptance, release of held movement on blur and touch cancellation, operation with reduced motion enabled, and a simulated 60-second frame gap with at most one displayed countdown-second change. Final multi-viewport runs reported no JavaScript page errors.

## Design choices and limits

- The surge heats an unshielded cell and releases its ordinary rack latch. The shielded bay resists it, giving the player a competing use for that slot.
- Ordinary racks conceal the cell. A crate in an ordinary rack still has an 80% detection chance. A paid bribe guarantees one skipped location. These odds and the current price are visible before the choice.
- The 60 CR reserve triggers a debt warning. Repairs, impound and wreck recovery have separate charges. The full tuning and ledger formula are in [Mechanics](MECHANICS.md).
- No known blocking gameplay bugs from the listed checks. Mobile verification used Chrome touch emulation. Physical-device ergonomics and Safari remain unverified.
- The slice has original geometric art and visual feedback. Audio, later days, shops, upgrades, an enforced weekly quota and additional hazards are deferred. There is no campaign save. Refreshing starts a new session.
- The supplied folder had no Git metadata. A local repository was initialized to include the requested committed lockfile.
