# GAME DESIGN DOCUMENT

**Game Title:** Project Protocol (working title); The Cinder Run is the playable delivery.

**Game Concept:**
A fast-paced, single-player sci-fi survival game about a disposable smuggler transporting dangerous contraband through a hostile intergalactic highway. Physically secure cargo, keep a failing ship operational, and evade customs while protecting the income needed to satisfy a criminal syndicate’s weekly quota. The first deliverable is one complete delivery, with the week-long campaign reserved for later development.

**X, But Y:**
*Barotrauma* meets *Papers, Please*, but you’re a desperate space courier surviving one illegal delivery at a time. Ship emergencies and concealment compete for the same resource: one courier who can physically be in only one place at a time.

---

# 1. VISION

## 1.1 Core Experience & Value

- **Core Experience:** Frantic survival through improvisation and prioritization. Two problems demand attention at once, forcing the player to decide which risk can wait.
- **Player Value:** Narrow escapes, mastery of interconnected cargo and ship systems, and financially painful choices whose consequences are visible at settlement.

## 1.2 Core Mechanics & Loop

**Core Mechanics:**
- **Handle:** Pick up, carry, drop, and stow dangerous freight; choose which cargo deserves scarce protection.
- **Repair:** Walk to emergencies and complete short station minigames while transit and other threats continue.
- **Evade:** Conceal cargo before customs, then allow searches, pay bribes, or surrender freight during inspection.
- **Manage:** Weigh cargo income against damage, bribes, and penalties; longer-term, balance supplies against syndicate debt.

**Core Loop:**

Accept contract → Secure cargo and survive highway travel → Prepare for customs → Make inspection decisions → Deliver or fail → Settle income and penalties → Repeat

Cargo placement shapes both survival and inspection risk. Repairs consume time that could protect freight; concealment and bribes preserve a delivery at the cost of other cargo or earnings. The settlement makes those tradeoffs explicit. Shopping between deliveries belongs to the future campaign loop.

**Progression:**
The first delivery teaches one system at a time, then asks players to combine them under pressure. Replaying routes builds mastery; new route seeds vary emergency timing, order, and location. The longer-term arc is five increasingly dangerous days, one significant delivery per day, culminating in a weekly quota. Campaign escalation and upgrades remain future scope.

## 1.3 Scope

**Must Have:**
- One complete browser-playable delivery: contract, highway emergencies, timed customs preparation, interactive search, settlement, and restart.
- A 2D side-view ship with two walkable decks, ladders, and the entire playable interior visible on one screen; walking and climbing, with no jumping.
- Three physical cargo types, two ordinary racks, and one contested shield bay.
- Two distinct emergencies and short repair minigames that create competing demands during real-time transit.
- A skippable, replayable guided first delivery, followed by reproducible routes.
- Distinct consequences for arrest, ship damage, death, and financial shortfall, with readable money accounting.
- Keyboard, mouse, and touch interaction, clear warnings, and readable desktop and phone layouts.

**Not Included:**
- Multiplayer, manual piloting, combat, jumping, elaborate physics simulation, crafting, crew simulation, procedural worlds, or branching story campaigns.
- Five-day progression, shops, upgrades, campaign saves, or an enforced weekly quota in the initial delivery. These remain future work; their detailed design is TBD.

---

# 2. IMPLEMENTATION

## 2.1 Gameplay

**Player Interactions:**
The courier walks horizontally and climbs between decks. Cargo must be physically reached, carried one item at a time, and placed in a slot or dropped; it can be retrieved from any slot. Repairs require empty hands and presence at the station or breach. Players use keyboard movement and contextual actions, click or tap destinations and objects, or use touch controls. Customs choices use explicit actions with visible detection risk and cost.

**Gameplay Systems:**
- **Ship and cargo:** The Volatile Cell heats outside a slot; the Signal Crate broadcasts unless shielded; the high-paying Bio Specimen needs containment. Its pulses damage its condition, release ordinary rack latches on its deck, and interrupt nearby station work. Power loss destabilizes a specimen in an ordinary rack. Three cargo items compete for three slots, with the shield bay providing the strongest protection.
- **Highway emergencies:** Travel advances automatically on a real-time countdown. Each seeded route includes a power surge and a hull impact, deliberately separated or overlapped. The surge can eject an unshielded cell and drains hull until repaired with a timing lock at the fixed console. An impact opens a breach at a variable site, repaired through an ordered rivet sequence; wrong rivets cost hull. Zero hull causes death. Route codes support reproducible retries.
- **Customs:** A timed preparation phase lets the player rearrange cargo before handling locks for the search. The officer checks decks and slots in sequence. Loose or carried cargo is exposed; ordinary racks conceal some freight better than others; the shield bay hides its occupant. At each stop, the player can permit inspection, buy guaranteed clearance, or surrender an item. Detection causes arrest and forfeiture. Search decisions themselves have no timeout; highway cargo deterioration and damage stop at the checkpoint.
- **Settlement:** Surviving cargo pays according to condition. Bribes, repairs, impound fees, and wreck charges produce different financial outcomes. Surrendered or seized cargo earns nothing. A reserve shortfall is a warning in the slice, rather than an enforced campaign failure. Players can replay the same route or start the next seed.
- **Guided first delivery:** Paused lesson panels introduce systems before real demonstrations. The highway clock holds until drills are complete, cargo hazards wake for their lessons, and already-demonstrated lessons are skipped. The gate, customs, and settlement use normal rules. Training can be skipped and replayed.

**Progression:**
Within one delivery, handling develops into emergency prioritization, then concealment and financial decisions. Across retries, seeded variations test the same capabilities without adding new systems. Future days are intended to increase danger through escalating hazards and customs pressure, with shopping and upgrades between days. Exact escalation, shop contents, and missed-quota consequences are TBD. Detailed prototype rules and tuning live in [Mechanics](MECHANICS.md); delivery order and implemented status live in [Implementation plan](IMPLEMENTATION_PLAN.md) and [Development status](DEVELOPMENT_STATUS.md).

**References:**
- **Barotrauma:** Shipboard survival through local repairs, physical movement, and competing emergencies; adapted to a single courier and compact ship.
- **Papers, Please:** Bureaucratic pressure and costly decisions under authority; here the player is the smuggler facing inspection.

## 2.2 Visuals

**Art Direction:**
Cartoonish, colorful retro-futuristic science fiction with grimy industrial machinery and dark comedy. Chunky pixel-art presentation makes rooms, freight, and danger readable at a glance.

**Visual References:**
Project Dungeon informs usability and technical discipline only; its monochrome aesthetic is not the target. Specific external visual references are TBD.

**UI/UX Direction:**
The ship is the main play surface, with a compact persistent HUD for hull, time, cargo status, money, and the current objective. Contextual prompts identify reachable actions; cargo warnings and customs risk previews explain consequences before commitment. Every playable deck, slot, and station stays visible without scrolling. Desktop and landscape show the full hull; portrait may crop only non-playable extremities. Training panels pause for reading, while normal repairs retain live pressure. Settlement clearly separates income and charges.

**Visual Characteristics:**
Chunky silhouettes, legible walkways, industrial racks, a distinct shield bay, vibrant cargo, and visible damage distinguish function. Courier carrying and climbing poses communicate action. Red electrical, cyan vacuum, and magenta biological warnings distinguish emergencies; gauges, markers, and labels reinforce color cues. Repair feedback, cargo pulses, and the officer’s scan communicate events without obscuring the ship. Use restrained effects consistent with the documented performance pass.

## 2.3 Narrative

**Setting & World:**
A hostile intergalactic highway where dangerous contraband passes through customs checkpoints. The slice follows the freighter Mule–07 on the Cinder Run toward Cinder Gate. Broader geography, history, and era are TBD.

**Narrative Premise:**
The player is a disposable courier working under a criminal syndicate’s financial demands. Survive the trip and preserve enough illegal cargo income to keep debt manageable. The intended campaign ends with the weekly quota coming due; the slice expresses these stakes through a single delivery’s costs and reserve warning.

**Characters:**
- **Courier:** The player’s vulnerable, physically present smuggler, responsible for every urgent task aboard.
- **Customs officer:** The inspecting authority whose search forces costly choices about freight and money.
- **Criminal syndicate:** The source of the weekly financial pressure. Individual members and characterization are TBD.

**Narrative Integration:**
Contracts establish the job; cargo behavior and ship damage create the journey’s incidents. The officer’s movement and inspection choices stage the confrontation aboard the ship. Arrest, a wreck, or clearance plays out before a settlement receipt records the consequences. Environmental machinery and darkly comic framing support the premise without requiring a branching story campaign.

## 2.4 Audio

**Soundtrack:**
Energetic breakbeats and synths support frantic highway survival. Music is future work; the prototype may rely on original procedural sound cues. Specific tracks and phase-dependent arrangement are TBD; do not import copyrighted tracks.

**Sound Effects:**
Mechanical footsteps, cargo clunks, accelerating heat warnings, electrical alarms, breach hiss, rivet strikes, specimen chirps and pulses, and customs scans identify actions and threats. Repair, payment, arrest, and wreck cues distinguish outcomes. Sound reinforces readable visual feedback and supports muting.

**Audio References:**
Specific game, artist, and track references are TBD. The established direction is breakbeat energy, synthesized instrumentation, and distinct industrial and cargo warning cues.
