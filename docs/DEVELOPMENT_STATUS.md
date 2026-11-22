# Project Protocol — Development status

## Playable slice

The Cinder Run is complete from contract acceptance to final settlement and restart. Since chunk 2 the player handles three physical cargo items, survives two seeded emergency types, and first-time players are guided through it by an interactive tutorial. The original slice handled two physical cargo items, crosses two decks, repairs a live highway fault, prepares for customs, and makes a separate decision at each search location. The ledger distinguishes cargo income, surrender, arrest, hull damage, death and debt.

## Game-first presentation redesign

The first slice presented the ship as a 480×216 thumbnail inside a dashboard: cards for telemetry, manifest, objectives and controls, with the courier about 20 screen pixels tall. The redesign keeps every rule in `src/game/` and rebuilds the presentation around the ship.

- **The ship is the screen.** A full-viewport canvas with a camera frames Mule-07. The interior was redrawn at a larger scale with distinct rooms: engineering with the power console, crew deck, forward hold, machine room, cargo hold and shield bay, plus engines, cockpit and armour.
- **Readable objects.** Mustard cradles with clamp jaws and status lamps mark the ordinary racks. A teal arch with a shield field marks the shield bay. The cell glows hotter, steams and shakes as it heats and shows cracks after venting. The crate blinks and emits broadcast rings unless shielded. The courier has walk, carry-overhead, ladder-climb and console poses.
- **Emergencies in the world.** The surge flashes the screen, shakes the camera, cuts the lights to red rotating beacons, sparks the bus and console, blows the rack latch and starts an alarm. Hull drain reddens the vignette and adds smoke, scorch marks and fire to the hull. A successful repair flickers the lights back on.
- **Contextual interaction.** Nearest-action prompts float above targets (`E Grab`, `E Stow`, `E Shield`, `E Repair`). Empty slots pulse while you carry cargo. Ladder arrows appear in range. During prep, every item shows a `HIDDEN` / `80% SEEN` / `100% SEEN` tag. Click or tap anywhere on the ship to walk there; click cargo, a slot or the console to walk there and act.
- **Compact HUD.** The HUD shows segmented hull, route progress with the clock (or the customs countdown, or the search pips), the wallet, mute and one short objective line. A faint key legend appears on desktop.
- **Game screens.** The contract is a paper job ticket over the docked ship. The repair is an in-world phase-lock gauge above the console. Customs happens on the ship: the officer boards through the airlock, walks to each stop and scans it with a red beam, while a comm box carries the choice. The result is a printed receipt with a stamp beside the ship as it ended (cleared at the gate, impounded under red and blue lights, or wrecked and listing).
- **Sound.** Original Web Audio cues cover actions, alarms, heat, scans and outcomes. The M key mutes.

### Design decisions and deviations

- **Portrait framing.** A complete side-on hull is too wide for a portrait phone, so portrait frames the entire walkable interior: both decks, every slot, the ladder and the console. Only the engine plumes and the cockpit tip are cropped. Landscape and desktop show the whole hull. This interprets the confirmed decision "entire ship visible on one screen" as every playable space being visible without scrolling.
- **Inspection pacing.** Inspect resolves 0.9 s after the officer reaches the stop, so the scan is visible before the roll. The result receipt appears 1.3–2.4 s after the outcome so the consequence plays out first. Both delays are presentation-only and do not change odds, RNG order or settlement.
- **Ladder input.** Holding W/S while walking into range starts the climb automatically. Click-to-move lines up with the rungs before climbing, so the climb never starts with a visible snap.
- **Movement during repair.** Walking or clicking elsewhere while the console is open leaves the console, using the existing `leave` command.
- **Shop and upgrades** stay out of scope, as in the GDD's first milestone. No new mechanics were added.

## Performance pass

The first redesign was heavy on Mac browsers. CPU time per frame was low (about 1.3 ms), but on a Retina display every frame drew a 2048×1536 display canvas and a 1953×1467 upscale buffer, filled a full-screen radial vignette, stacked dozens of additive glow gradients, and re-rendered React 30 times a second. The pass made these changes:

- **Canvas:** the world draws into a small canvas (649×487 at a 1024×768 window) that CSS scales up with pixelated rendering. The intermediate upscale buffer is gone. The overlay canvas is capped at 1.5× device pixels.
- **Frame rate:** rendering is capped at 30 fps, which matches the simulation, and the camera snaps instead of easing.
- **Visuals removed:** glows and halos, lamp light cones, vignette, screen flashes, screen shake, light flicker, ambient hull smoke, bus sparks and steam, nebulas, ash streaks, drifting rocks, lane buoys, the wreck tilt, and looping CSS animations (hull blink, pips, USE button pulse). Event particles are capped at 160.
- **Kept:** all gameplay feedback (prompts, markers, slot highlights, risk tags, heat gauge, signal rings, the beacon blink, the officer scan) and all sound.
- **React:** state is published immediately after discrete events and otherwise at most 10 times a second.

Measured in the dev build during a power fault: 29.5 world renders a second and 9 React updates a second. Typecheck, 32 tests and the build pass. Click-to-walk, the repair console and the gauge were rechecked in the browser after the change.

## Chunk 2: FTUE and gameplay depth

**Built.**

- **Guided first delivery.** Nine large lessons, each pausing the game:
  - movement and the ladder;
  - the cell;
  - the crate and shield bay;
  - the specimen;
  - the power surge;
  - the hull breach;
  - customs prep;
  - the search;
  - payday.

  One extra objective-only step asks you to re-rack the cell the surge knocked loose. Each lesson ends in a real objective with focus brackets and a "TRAINING n/10" HUD line. Lessons already demonstrated are skipped. There is skip and replay, completion is remembered in `localStorage`, and keyboard, mouse and touch all work.
- **Bio Specimen** (containment, pulses, latch interference, 90 CR, 50% rack odds).
- **Hull breach** with an ordered-rivet repair.
- **Seeded hazard director.** Next run and replay route options, and a route code on the ticket.
- **Feedback.** A HUD cargo status strip, distinct emergency colours (red electrical, cyan vacuum, magenta biological), new sound cues (impact, rivet, breach hiss, specimen chirps and pulse) and callouts that stack instead of overlapping.

**Design decisions and deviations.**

- **Tests.** The original tests assumed a surge at exactly 35 s and two cargo items, which this chunk deliberately changed. They now run on a pinned "classic" scenario (`src/tests/classic.ts`) and keep their original assertions. New suites cover the new rules.
- **Overlap gap.** Tightened from 6–9 s to 2–5 s after the fairness bot showed the wider gap almost never produced two simultaneous emergencies.
- **Training pressure.** The training run holds the clock instead of using the seeded schedule, so lessons cannot be cut short by a timed hazard and dormant cargo cannot spoil while the player reads. Each drill fires when its lesson closes.
- **Hull failure.** Hull death is now labelled "hull failure" so it is not confused with the breach hazard.

**Commands run.**

| Command | Result |
| --- | --- |
| `npm run typecheck` | Exit 0. Also clean with `--noUnusedLocals --noUnusedParameters`. |
| `npm run test` | Exit 0. 54 tests in 7 files passed. |
| `npm run build` | Exit 0. JS bundle 323 kB (104 kB gzip). |
| `npm run preview` (port 4179) | First-time training panel opened from E and Skip training returned to a normal contract, with no console errors. |

**Browser checks.** These ran in the dev build at 1024×768 and 390×844. The pane was hidden for most of it (about 1.5 fps), so waits used `runner.advance`; every action was a real click, key or button press.

- **Guided run, first panel to payday:**
  - climbed by clicking;
  - racked the cell;
  - shielded the crate;
  - contained the specimen;
  - surge: one miss, then a lock with E;
  - breach: one wrong arrow (−3 hull), then sealed with the arrow keys;
  - prep and search: bribe at the specimen's rack;
  - delivered at 160¢, then the payday panel docked beside the receipt;
  - R gave a new contract, shown as a returning player.
- **Training death path:** the run jumped straight to the payday lesson.
- **Unguided run on a random route:** the impact hit at about 22 s, then the loose specimen pulsed and blew the upper rack latch holding the cell.
- **Phones (390×844, touch emulation):** the lesson panel fits and shows touch instructions. The rivet touch pad replaced the walk controls during the patch and sealed the breach.

**Not verified.**

- No full real-time human playthrough of an unguided run with the pane visible.
- Sound was not listened to.
- No physical devices or Safari.
- The production preview check covered training start and skip only.

## Final command results (redesign)

Checked on macOS with Node 24.14.1.

| Command | Result |
| --- | --- |
| `npm run typecheck` | Exit 0, zero diagnostics. Also clean with `--noUnusedLocals --noUnusedParameters`. |
| `npm run test` | Exit 0. 32 tests in 4 files passed. That is the 20 original tests plus 12 new presentation tests. |
| `npm run build` | Exit 0. Static build is about 300 kB JS (97 kB gzip) plus local fonts. |
| `npm run preview -- --port 4179 --strictPort` | Served `dist/` and was played in the Claude desktop app's built-in Chromium browser pane. |

## Browser verification (redesign)

**Production preview, desktop 1280×800, real time at 61 fps:** one full run used real keys and mouse clicks.

1. Accept with E.
2. Walk with held A, grab with E, walk to the aft rack and stow with E.
3. Click the crate and click the shield bay. Autopilot crossed the ladder both ways.
4. The surge hit at 0:55. Opened the console and made repeated E lock attempts. Several misses happened while the ejected cell vented, then the repair landed.
5. Re-racked the cell by click and E.
6. In prep, both items showed `HIDDEN`.
7. Cleared all five checks with the on-screen buttons.
8. The settlement read 40 + 56 (cell at 80%) + 50 − 52 repairs = **94¢**. R restarted, and the console showed no errors.

**Development build, 1440×900:** these checks used real clicks and keys. The browser pane was hidden for part of the session, which throttles frames to about 1.5 fps, so long waits were covered with `runner.advance`. Covered:

- Click-to-grab and click-to-stow, the ladder crossing with cargo, the surge effects and repair lock with the E key, and venting.
- Prep risk tags (`HIDDEN` and `80% SEEN`).
- Scanning with a mouse click on Let them search, then E for the next checks, the B bribe and delivery (**123¢**).
- R restart.
- Hull death (**−60¢**, reserve warning) and arrest by an upper-deck sweep of the loose crate (**4¢**).

**Phones (Chromium viewport emulation):**

| Viewport | Checked |
| --- | --- |
| 390×844 portrait | Title, gameplay with touch controls, hold-to-walk, climb, drop and grab buttons, and the customs dialog |
| 375×667 portrait | Title, tap-to-move grab and stow, and the worst-case customs dialog: two items at one stop with four choices. Also surrender of one item, a refused second bribe, a delivered receipt (**25¢**) and an arrest receipt (**−53¢**, six rows, button visible). |
| 844×390 landscape | Title and gameplay with corner touch controls |

Automation taps arrive as mouse events, so touch mode and touch holds were driven with dispatched `pointerType: 'touch'` events.

Layout defects found and fixed during these checks:

- Touch bar overflow at 390 px
- Clipped receipt button on short screens
- Risk tags colliding with prompts
- Emergency marker hidden under its prompt
- Oversized banners on short screens
- Shield field drawn over the courier
- HUD wallet disagreeing with the receipt
- Dark box behind the wreck

### Not verified

- Sound was not listened to. The cues run without errors, but their mix and volume are unchecked.
- No physical phone or tablet was used, and Safari and Firefox were not tested.
- Reduced-motion behaviour was implemented but not exercised in the browser during the redesign.

## Earlier milestones (first slice)

| Milestone | Summary |
| --- | --- |
| M1 | Ship, HUD, contract, movement and ladder |
| M2 | Cargo handling, heat, shielding, the 90-second highway, surge, timed console and hull loss |
| M3 | Prep, location-based search, seeded detection, bribes, surrender, ledger and restart |
| M4 | Labels, room machinery, feedback, short-screen panels and focus |

The game-first redesign above replaced M4's presentation work.

## Where things stand (handoff for design ideation)

- **Built:** one complete delivery, the Cinder Run, with a guided first-time version.
  - Three cargo types: heat, signal and bio.
  - Three slots: two racks and one shield bay.
  - Two seeded emergencies: a power surge with a timing lock, and a hull breach with a rivet sequence.
  - A five-stop customs search with inspect, bribe and surrender.
  - Three distinct failures (arrest, hull death, debt warning) and a ledger.
- **Fixed by the GDD:** side view, two decks, the whole playable ship on one screen, walking and ladders with no jumping, physically carried cargo, station minigames rather than hold-to-repair, a real-time highway countdown, timed prep then an interactive search, one delivery per day, and different consequences for different failures.
- **Core tension to design around:** two problems at once while the courier can be in only one place.
- **Not built yet (GDD future scope, chunk 3):** five-day campaign and weekly syndicate quota, shop and upgrades between days, escalating director settings, music, and save.
- **Open questions worth ideating:**
  - What does the shop sell?
  - How do days escalate (new hazards, ship layouts, customs behaviour)?
  - What happens when the quota is missed?
  - How should cargo variety interact with slots and hazards?
- **Tuning knobs** live in `src/game/content.ts` (see [Mechanics](MECHANICS.md)).

## Limits

- No known blocking gameplay bugs from the checks above.
- Later days, shops, upgrades and an enforced weekly quota remain future design. There is no campaign save; refreshing starts a new route (training completion is the only thing remembered).
