# Project Protocol — Implemented prototype mechanics

These values describe the playable Cinder Run contract. They are adjustable prototype tuning. Money is written CR here and shown as ¢ in the game. The confirmed design decisions remain in [High-level GDD](HIGH_LEVEL_GAME_DESIGN_DOCUMENT.md). The simulation reads its balance, cargo, ship and director definitions from [content.ts](../src/game/content.ts).

## Ship and handling

Mule–07 has a fixed side view with three structural bays on each of two walkable decks. The courier starts downstairs at x=213. Each fixed simulation step advances 1/30 second. Walking covers 90 ship units per second within x=88–386. A climb starts within 12 units of x=239, aligns the courier with the ladder and takes 15 ticks. Holding up or down while walking into range starts the climb on arrival. During a climb, horizontal movement and cargo actions are locked. A climb still underway when inspection begins leaves the courier on the departure deck.

Cargo interactions require the same floor and a horizontal distance of at most 13 units. A free hand can pick up loose or stowed cargo. A held item follows the courier between decks. Drop puts it at the courier's feet. Stow inserts it into one vacant slot. Cargo can be retrieved from every slot. Clicking or tapping a spot, item, slot, console or breach walks the courier there (via the ladder if needed) and performs that one action on arrival. It issues the same commands as the keys, so every rule here still applies.

| Location | Deck | x | Use |
| --- | --- | ---: | --- |
| Aft rack | Lower | 128 | Ordinary cargo slot |
| Power console | Upper | 138 | Repair a power fault |
| Upper rack | Upper | 306 | Ordinary cargo slot |
| Shield bay | Lower | 345 | Cargo slot with signal shielding, a surge-resistant latch and a sealed environment |
| Breach sites | Lower x=104 (aft plating), lower x=292 (keel seam), upper x=372 (bow plating) | | Where an impact can open the hull |

Stations (console, breach patch) need empty hands. While working one, the courier cannot move or climb. Leaving (Esc, the Leave button, walking or clicking elsewhere) closes it.

## Freight

The ship departs with 100 hull. Every item starts at 100% condition, and pays its value multiplied by its remaining condition. Three items and three slots mean the shield bay is always contested.

| Freight | Start | Full payout | Behaviour |
| --- | --- | ---: | --- |
| Volatile Cell | Lower deck, x=195 | 70 CR | Gains 2.5 heat/s loose or carried. Any slot cools it by 10 heat/s, down to zero. At 100 heat it vents, resets to zero, removes 16 hull and 20 condition points. |
| Signal Crate | Upper deck, x=330 | 50 CR | Broadcasts outside the shield bay. An ordinary rack still leaves a signal for customs. |
| Bio Specimen | Upper deck, x=268 | 90 CR | Gains 4 agitation/s loose or carried. In a powered ordinary rack, or in the shield bay at any time, it loses 8/s. In an ordinary rack during a power fault it gains 3/s. At 100 it **pulses**. |

When the specimen pulses:

- Its agitation drops to 35, so it pulses again soon if it stays out.
- It loses 20 condition points.
- Every ordinary rack on its deck releases its occupant, which lands loose at the rack. The shield bay holds.
- A console or patch being worked on that deck is interrupted.

Highway heating, agitation and damage stop at the checkpoint.

## Highway hazards

Travel lasts 90 seconds. Every run schedules one **power surge** and one **hull impact** from the run seed (`src/game/hazards.ts`). The schedule is part of the game state, independent of the customs RNG, so a seed always replays identically.

| Director rule | Value |
| --- | --- |
| Surge time | Seeded within 28–46 s |
| Overlap (35%) | The impact lands 2–5 s after the surge, so both emergencies run at once |
| Otherwise | The impact lands at least 16 s before or after the surge, within 16–74 s |
| Impact site and rivet order | Seeded |

A scripted competent player survived 150 consecutive seeds, ending with 82–88 hull. About one run in six forced both emergencies at once (see `src/tests/fairness.test.ts`).

**Power surge.** The power bus faults:

- An unshielded cell heats to at least 70. If it sits in an ordinary rack, it falls loose at that rack.
- The shield bay protects its occupant.
- The fault removes 2 hull on each whole second until repaired.

At the console, the cursor travels end to end and back over 54 ticks (1.8 s). Lock within the inclusive 38–69% band to clear the fault. A miss resets the sweep. Repairs stop further drain and keep existing damage.

**Hull impact.** The impact removes 8 hull and opens a breach at the site. The breach removes 1 hull on each whole second until it is patched.

At the breach, drive four rivets in the order shown, using the arrow keys or WASD, or by tapping or clicking the arrows. A wrong rivet slips the plate: it removes 3 hull and restarts the sequence. Sealing leaves a welded plate on the wall.

The surge's 2 hull/s and the breach's 1 hull/s stack when both are open. At zero hull the courier dies immediately.

## Customs

Surviving transit starts a fresh 20-second preparation clock. The courier can still walk, climb, pick up, drop and stow. Open stations close. Each item shows the detection chance it would face where it currently sits, using the same table as the search. After prep, movement and cargo handling lock for the entire search.

The officer visits the lower deck, upper deck, aft rack, upper rack and shield bay in that order. Floor sweeps cover loose cargo and the courier's hand on that deck. Slot searches cover only their occupant. The officer walks to each location and scans it. The customs dialog shows what is there and the exact detection odds before you choose.

| Cargo position | Volatile Cell | Signal Crate | Bio Specimen |
| --- | ---: | ---: | ---: |
| Loose or in hand on the searched deck | 100% | 100% | 100% |
| Ordinary rack | 0% | 80% | 50% |
| Shield bay | 0% | 0% | 0% |

- **Allow inspection** resolves this location. Detection immediately causes arrest and forfeiture of all remaining freight.
- **Skip for 25 CR** guarantees clearance for this location. It requires at least 25 CR and deducts the amount once.
- **Surrender** removes one named item at the current location and forfeits its income. The officer stays until the player clears that location.
- Clearing the fifth location completes delivery. Decisions have no timeout. An allowed inspection resolves after the officer reaches the location and scans for 0.9 s; this is presentation only and changes no odds. Each roll uses the snapshot's seeded RNG, so identical inputs reproduce the result.

## Money and consequences

Start with 40 CR. Lost, surrendered and impounded items earn zero. The closing balance adds delivery income to cash remaining after bribes, then subtracts repairs and applicable fees.

| Event | Accounting |
| --- | --- |
| Survive with hull damage | Pay 1 CR per missing hull point. This also applies after arrest. |
| Arrest | Forfeit remaining cargo and pay a 30 CR impound fee. |
| Hull death | Lose the cargo and pay a flat 100 CR wreck charge. Wreck recovery replaces hull repairs. |
| Balance below 60 CR | Show the shortfall against the syndicate reserve. This is a financial warning on the ledger. |

Only settlement can take the balance below zero.

## Runs and the training delivery

- Each page load picks a random route seed, shown on the job ticket as a route code.
- **Next run** (R) starts a contract on the next seed: a new schedule, impact site and rivet order.
- **Replay this route** (T) restarts the same seed with identical hazards. Restart restores starting funds, cargo positions, condition, hull and timers.
- First-time players start with a **training run**: the same rules, with these differences:
  - The highway clock and hazard schedule hold.
  - The cell and specimen stay dormant until their lessons.
  - The surge and impact fire on cue when their lessons begin.
  - After the breach is sealed, the clock resumes with 12 seconds to the gate.
  - Prep, customs and settlement are normal.
- Training completion is remembered in `localStorage`. The weekly quota, shops and later days remain future design.
