# Project Protocol — Implemented prototype mechanics

These values describe the playable Cinder Run contract. They are adjustable prototype tuning. The eight confirmed design decisions remain in [Game design](GAME_DESIGN.md). The simulation reads its balance, cargo and ship definitions from [content.ts](../src/game/content.ts).

## Ship and handling

Mule–07 has a fixed side view with three structural bays on each of two walkable decks. The courier starts downstairs at x=213. Each fixed simulation step advances 1/30 second. Walking covers 90 ship units per second within x=88–386. A climb starts within 12 units of x=239, aligns the courier with the ladder and takes 15 ticks. During a climb, horizontal movement and cargo actions are locked. A climb still underway when inspection begins leaves the courier on the departure deck.

Cargo interactions require the same floor and a horizontal distance of at most 13 units. A free hand can pick up loose or stowed cargo. A held item follows the courier between decks. Drop puts it at the courier's feet. Stow inserts it into one vacant slot. Cargo can be retrieved from every slot.

| Location | Deck | x | Use |
| --- | --- | ---: | --- |
| Aft rack | Lower | 128 | Ordinary cargo slot |
| Power console | Upper | 138 | Repair a highway power fault |
| Upper rack | Upper | 306 | Ordinary cargo slot |
| Shield bay | Lower | 345 | Cargo slot with signal shielding and a surge-resistant latch |

## Freight and highway

The ship departs with 100 hull. Both items start at 100% condition.

| Freight | Starting location | Full payout | Behavior |
| --- | --- | ---: | --- |
| Volatile Cell | Lower deck, x=195 | 70 CR | Gains 2.5 heat/s loose or carried. Any slot cools it by 10 heat/s, down to zero. At 100 heat it vents, resets to zero, removes 16 hull and loses 20 condition points. |
| Signal Crate | Upper deck, x=330 | 50 CR | Broadcasts outside the shield bay. Stowing it in an ordinary rack still leaves a signal for customs. |

Travel lasts 90 seconds. At exactly 35 seconds the power bus faults. An unshielded cell heats to at least 70. If stowed in an ordinary rack, it falls loose at that rack's coordinates. The shield bay protects its occupant. This latch failure creates a choice between re-securing the cell and stopping the hull drain. The surge always reaches the power bus.

The fault removes 2 hull on each subsequent whole highway second. At zero hull, the courier dies immediately. A nearby empty-handed courier can open the power console. Its cursor travels from one end to the other and back over 54 ticks (1.8 seconds). Lock within the inclusive 38–69% target band to clear the fault. A miss resets the sweep for a retry. Leaving closes the console. Time and cargo risk continue while it is open. Repairs stop further drain and preserve existing hull damage.

## Customs

Surviving transit starts a fresh 20-second preparation clock. Highway heating, cooling and damage end at the checkpoint. The courier can still walk, climb, pick up, drop and stow. The console closes. After prep, movement and cargo handling lock for the entire search.

The officer visits the lower deck, upper deck, aft rack, upper rack and shield bay in that order. Floor sweeps cover loose cargo and the courier's hand on that deck. Slot searches cover only their occupant. The panel shows the actual contents and detection odds. The cutaway highlights the current location.

| Cargo position | Volatile Cell | Signal Crate |
| --- | ---: | ---: |
| Loose or in hand on the searched deck | 100% detected | 100% detected |
| Ordinary rack | 0% | 80% |
| Shield bay | 0% | 0% |

- **Allow inspection** resolves this location. Detection immediately causes arrest and forfeiture of all remaining freight.
- **Skip for 25 CR** guarantees clearance for this location. It requires at least 25 CR and deducts the amount once.
- **Surrender** removes one named item at the current location and forfeits its income. The officer stays until the player clears that location. This matters when two items share a deck.
- Clearing the fifth location completes delivery. Decisions have no timeout. A fixed seed of 7402 drives detection, and replaying identical inputs reproduces the result.

## Money and consequences

Start with 40 CR. Each delivered item earns its listed value multiplied by its remaining condition, rounded to the nearest credit. Lost, surrendered and impounded items earn zero. The closing balance adds delivery income to cash remaining after bribes, then subtracts repairs and applicable fees.

| Event | Accounting |
| --- | --- |
| Survive with hull damage | Pay 1 CR per missing hull point. This also applies after arrest. |
| Arrest | Forfeit remaining cargo and pay a 30 CR impound fee. |
| Hull death | Lose the cargo and pay a flat 100 CR wreck charge. Wreck recovery replaces hull repairs. |
| Balance below 60 CR | Show the shortfall against the syndicate reserve. This is a financial warning on the ledger. |

Only settlement can take the balance below zero. The 60 CR reserve gives the one-day ledger context. The weekly quota, shops and later days remain future design. Restart returns to the contract with the original seed, starting funds, cargo positions, condition, hull and timers.
