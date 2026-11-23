# Project Protocol — Implemented prototype mechanics

The Cinder Run is one playable delivery. The [high-level GDD](HIGH_LEVEL_GAME_DESIGN_DOCUMENT.md) sets the design intent. The values below describe current tuning and are defined in [content.ts](../src/game/content.ts).

## Ship and controls

Mule–07 has two walkable decks, four compartments, and one ladder at x=239. Engineering and the Airlock occupy the upper deck. The Freight Hold and Containment occupy the lower deck. The walkable span is x=88–460. The courier walks at 90 units/s and a climb takes 0.5 s. The camera follows the courier horizontally in active play and the HUD names each room, with markers for the courier, the officer’s destination, active emergencies, and the residual echo.

One item can be carried between decks. Pick up, drop, and stow must be local to the courier’s deck and within 13 units. Stowing requires a vacant compatible fixture. Clicking or tapping walks to the target and applies the same validated commands as keyboard or touch controls. Repairs require empty hands.

| Fixture | Room | Rules |
| --- | --- | --- |
| Front rack (x125) | Freight Hold | Accepts legal cargo. Its occupant blocks a surface view of the rear rack. |
| Rear rack (x163) | Freight Hold | Accepts any item. An uncovered rear occupant is visible. |
| Open berth (x213) | Freight Hold | Accepts any item. Its occupant is visible. |
| Powered cradle (x403) | Containment | Accepts only the Choir Cask. Suppresses its live reply while powered. |

## Manifest and containment

| Cargo | Status | Starting location | Full payout | Behavior |
| --- | --- | --- | ---: | --- |
| Heated Bearing Drums | Declared legal freight | Loose, Freight Hold | 20 CR | A legal load in either visible fixture. Explains a rear heat return only when in the front rack. |
| Gasket Bales | Declared legal freight | Open berth | 15 CR | Counts toward the manifest when in a visible fixture. Can hide the rear contents by sight. |
| Unlicensed Relay Bank | Gray-market freight | Loose, Freight Hold | 40 CR | Exposed in the open. In the rear rack it leaves a heat return whose meaning depends on the front load. |
| Choir Cask | Forbidden anomaly | Powered cradle | 90 CR | Four continuous seconds outside powered containment during transit leave one echo in the compartment it occupies at that moment. |

The cask remains physically latched during a power outage. Resealing it resets exposure before an echo forms. An existing echo stays in its original room through repairs, cargo moves, docking, and surrender. At the checkpoint, shore power stabilizes the cradle and transit damage stops. An unsealed cask still answers customs scans.

## Highway emergencies

A run lasts 90 s. The route code seeds one surge and one impact, including impact site and rivet order. The surge occurs at 28–46 s. The director schedules an overlap on 35% of routes by placing the impact 1–4 s after the surge. Otherwise it separates them by at least 16 s within the 16–74 s impact window.

- **Surge.** The power fault removes 2 hull/s and shuts off the cradle. At Engineering, lock the cursor inside the 38–69% band. The sweep repeats every 1.8 s. A miss restarts the sweep. A successful lock restores power and stops that hull drain.
- **Impact.** The impact removes 8 hull and opens a breach that removes 1 hull/s. At the breach, drive four rivets in the order shown. A wrong rivet removes 3 hull and resets the sequence.
- **Hull failure.** Drains stack and zero hull ends the run. Damage incurred before the checkpoint counts against settlement.

## Customs

Preparation lasts 20 s. Cargo labels preview whether goods are declared, exposed, plausibly covered, or leaving a reply. Loose cargo is part of the scan, and carried cargo is set down where the courier stands at boarding. Rearrangement then locks. Movement and climbing remain available.

The Airlock and Freight Hold are always checked. Its starting route also includes any other room with loose cargo or a residual echo. If suspicion reaches 3, customs adds Containment if it was absent from the route.

| Evidence in the current room | Suspicion |
| --- | ---: |
| One or more declared items missing from visible fixtures | +1, once in the Freight Hold |
| Heat from rear relays with verified front drums | +1 |
| Heat from rear relays without matching front cover | +2 |
| Residual echo or live anomalous reply | +2 each |
| Unsupported citation | +1 |

Suspicion carries between stops and is capped at 3. At 0–1, customs checks exposed goods. At 2, it opens the fixture implicated by the strongest local clue. An anomaly wins ties. At 3, it opens all local fixtures. A sealed cradle prevents a live reply and can still be opened. The inspection has no random detection rolls.

Review is untimed. Choosing to cite the manifest or surrender a local illicit item grants one eight-second hold per stop. Reach the marked docket or freight and press E, tap the marker, or use **Walk to docket/freight** (F on keyboard). A valid citation dismisses the heat clue. Surrender removes the selected item, taking its live signature with it. Ending the hold or letting it expire proceeds with the evidence still on file. The scan takes 0.9 s. Officer travel and response time use the same fixed clock as courier movement.

## Money and outcomes

The courier starts with 40 CR. Delivery pays for the surviving cargo. Voluntary surrender forfeits its payout. Discovery of the relays confiscates them and adds a 15 CR duty fine. Either can result in a partial delivery. Discovery of the cask impounds the remaining cargo and adds a 30 CR fee. Hull damage costs 1 CR per missing point unless the ship was wrecked, which costs 100 CR instead. A balance below 60 CR shows the syndicate reserve shortfall.

Replay restores the starting state and retains the route seed. **Next run** uses a new seed. The guided first delivery holds the highway clock through the cargo drills and scripted emergencies, then releases it with 12 s to the gate. Preparation, inspection, settlement, and recovery work as in the unguided run. Training can be skipped or replayed.
