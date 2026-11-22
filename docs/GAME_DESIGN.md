# Project Protocol — Game Design

## Concept
A fast-paced, single-player sci-fi survival game about a disposable smuggler transporting dangerous contraband through a hostile intergalactic highway. Keep the ship operational, protect and conceal cargo, evade customs, and earn enough to satisfy a criminal syndicate's weekly quota.

**X, but Y:** *Barotrauma* meets *Papers, Please*, but you're a desperate space courier surviving one illegal delivery at a time.

## Vision
- **Core experience:** Frantic, chaotic survival through improvisation and prioritization.
- **Player value:** Narrow escapes, mastery of a few interconnected systems, and financially painful choices.
- **Core loop:** Accept contract → Survive automatic highway travel → Prepare for customs → Interactive inspection → Deliver → Get paid / pay penalties → Shop → Repeat.
- **Longer-term arc:** Five increasingly dangerous days, one major delivery per day; pay the weekly quota or face the syndicate. **Not required for the first prototype.**

## Confirmed gameplay decisions
- 2D side-view ship, multiple floors, entire ship visible on one screen.
- Character walks horizontally and climbs ladders; **no jumping**.
- Cargo is physically picked up, carried, dropped, and inserted into dedicated ship slots.
- Ship maintenance takes place at dedicated stations with **short minigames**, not hold-to-repair interactions.
- Highway advances in real time through a countdown; hazards occur while traveling.
- Customs has a **timed preparation phase** followed by an **interactive search**.
- One significant delivery constitutes one day.
- Different failures have different consequences: arrest, ship damage, debt, and death. Do not collapse everything into a generic game-over screen.
- First milestone: **one complete vertical slice**, from contract acceptance through highway hazard, customs inspection, delivery outcome, payout, and restart.

## Gameplay pillars
1. **Handle:** Transport and stabilize dangerous contraband in the ship's physical space.
2. **Survive:** Decide between protecting cargo and responding to urgent ship problems.
3. **Evade:** Conceal, bargain, or surrender contraband under inspection pressure.
4. **Manage:** Trade immediate safety and supplies against eventual debt payment.

## Visual and audio direction
- Cartoonish, colorful retro-futuristic science fiction with grimy industrial machinery and dark comedy.
- Playful chunky silhouettes, legible rooms and walkable paths, vibrant cargo, exaggerated emergencies.
- Compact persistent HUD; one-screen ship; concise contextual actions and readable warnings.
- Musical direction: energetic breakbeats and synths. Prototype may use original procedural sound cues only; do not import copyrighted tracks.
- Do **not** copy Project Dungeon's monochrome aesthetic blindly. Retain its usability and technical discipline, but follow this game's colorful industrial art direction.

## Explicit exclusions
No multiplayer, manual piloting, combat, jumping, elaborate physics simulation, crafting, crew simulation, procedural worlds, branching story campaigns or five-day progression in the first milestone.

## Slice-first principle
Design around the central tension: **two problems demand attention, but the courier can physically be in only one place at a time.** If a mechanic does not create, communicate or resolve that tension, it is a lower priority for this vertical slice.
