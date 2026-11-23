# GAME DESIGN DOCUMENT

**Game Title:** Project Protocol (working title); The Cinder Run is the playable delivery.

**Game Concept:**
A single-player survival game about an underpaid courier hauling mundane freight and forbidden anomalies through a hostile intergalactic highway. Keep the ship running, assemble a believable mixed manifest, and survive customs when the impossible leaves evidence. The playable scope is one delivery.

**X, But Y:**
*Barotrauma* meets *Papers, Please*, but you’re a desperate space courier surviving one illegal delivery at a time. One courier must cross the ship to fix emergencies, arrange a believable load, and respond when an inspector finds something the paperwork cannot explain.

---

# 1. VISION

## 1.1 Core Experience & Value

- **Core Experience:** Frantic survival through improvisation and prioritization. Two problems demand attention at once, forcing the player to decide which risk can wait.
- **Player Value:** Narrow escapes, mastery of interconnected cargo and ship systems, and financially painful choices whose consequences are visible at settlement.

## 1.2 Core Mechanics & Loop

**Core Mechanics:**
- **Handle:** Pick up, carry, drop, and stow dangerous freight; choose which cargo deserves scarce protection.
- **Repair:** Walk to emergencies and complete short station minigames while transit and other threats continue.
- **Evade:** Build a credible cover load before customs, then permit a search, cite the manifest, or surrender freight during inspection.
- **Manage:** Weigh cargo income against damage, forfeiture, and penalties; longer-term, balance supplies against syndicate debt.

**Core Loop:**

Accept contract → Secure cargo and survive highway travel → Prepare for customs → Make inspection decisions → Deliver or fail → Settle income and penalties → Repeat

Cargo placement shapes both survival and inspection risk. Repairs consume time that could protect freight; a persuasive manifest preserves earnings and surrender can salvage a compromised delivery. The settlement makes those tradeoffs explicit. Shopping between deliveries belongs to the future campaign loop.

**Progression:**
The first delivery teaches one system at a time, then asks players to combine them under pressure. Replaying routes builds mastery; new route seeds vary emergency timing, order, and location. The longer-term arc is five increasingly dangerous days, one significant delivery per day, culminating in a weekly quota. Campaign escalation and upgrades remain future scope.

## 1.3 Scope

**Must Have:**
- One complete browser-playable delivery: contract, highway emergencies, timed customs preparation, interactive search, settlement, and restart.
- A side-view ship with two walkable decks, four compartments, one ladder, and a camera that follows the courier. The courier walks and climbs.
- A four-item manifest with legal, gray-market, and anomalous freight. A paired rack gives legal freight a purpose as cover, and a powered cradle suppresses the anomaly.
- Two distinct emergencies and short repair minigames that create competing demands during real-time transit.
- A skippable, replayable guided first delivery, followed by reproducible routes.
- Distinct consequences for arrest, ship damage, death, and financial shortfall, with readable money accounting.
- Keyboard, mouse, and touch interaction, clear warnings, and readable desktop and phone layouts.

**Not Included:**
- Multiplayer, manual piloting, combat, jumping, elaborate physics simulation, crafting, crew simulation, procedural worlds, or branching story campaigns, forged documents, bribes, or diversion systems in this slice.
- Five-day progression, shops, upgrades, campaign saves, or an enforced weekly quota in the initial delivery. These remain future work; their detailed design is TBD.

---

# 2. IMPLEMENTATION

## 2.1 Gameplay

**Player Interactions:**
The courier walks horizontally and climbs between decks. Cargo must be physically reached, carried one item at a time, and placed in a slot or dropped; it can be retrieved from any slot. Repairs require empty hands and presence at the station or breach. Players use keyboard movement and contextual actions, click or tap destinations and objects, or use touch controls. Customs choices show the evidence and the impending search. The courier can walk to a local docket or freight position during a procedural hold.

**Gameplay Systems:**
- **Ship and cargo:** The rear rack can be hidden behind legal freight, and the front load must explain what the scanner reads. The Choir Cask needs powered containment. Prolonged exposure leaves a persistent echo in a compartment.
- **Highway emergencies:** Travel advances on a real-time countdown. A seeded power fault and hull breach can overlap. Repair uses a timing lock at the console and an ordered rivet sequence at the breach. A power fault also puts the cask’s containment on a clock.
- **Customs:** The courier rearranges freight during timed prep. The officer reviews declarations, traces, and exposed freight, then opens fixtures or adds stops when suspicion escalates. A physical citation or surrender can change the evidence before the scan. Gray-market discovery costs one item and a fine. Forbidden discovery causes arrest.
- **Settlement:** The receipt distinguishes delivered, surrendered, confiscated, and impounded cargo, and lists repairs, duties, and other charges. The slice reports a reserve shortfall as a warning. Players can replay the same route or start a new one.
- **Guided first delivery:** Paused lessons teach loading, cover, and repairs through play. The highway clock holds through the drills. Customs and settlement use normal rules. Training can be skipped or replayed.

**Progression:**
Within one delivery, handling develops into emergency prioritization, then concealment and financial decisions. Across retries, seeded variations test the same capabilities without adding new systems. Future days are intended to increase danger through escalating hazards and customs pressure, with shopping and upgrades between days. Exact escalation, shop contents, and missed-quota consequences are TBD. Detailed prototype rules and tuning live in [Mechanics](MECHANICS.md); delivery order and implemented status live in [Implementation plan](IMPLEMENTATION_PLAN.md) and [Development status](DEVELOPMENT_STATUS.md).

**References:**
- **Barotrauma:** Shipboard survival through local repairs, physical movement, and competing emergencies; adapted to a single courier and compact ship.
- **Papers, Please:** Bureaucratic pressure and costly decisions under authority; here the player is the smuggler facing inspection.

## 2.2 Visuals

**Art Direction:**
Industrial retro-futurist pixel art, scuffed freight stencils, heavy containment hardware, and understated cosmic horror. The inspector records impossible readings in the same dry language used for a missing bale.

**Visual References:**
Project Dungeon informs usability and technical discipline only; its monochrome aesthetic is not the target. Specific external visual references are TBD.

**UI/UX Direction:**
The ship is the main play surface. The compact HUD names compartments and highlights offscreen threats, the courier, and the officer’s next stop. Context prompts show nearby actions. Preparation labels explain cargo exposure and the inspection panel shows suspicion and its causes. The receipt separates delivered cargo and charges.

**Visual Characteristics:**
Keep deck edges, the ladder, and the courier silhouette readable under emergency lighting. Distinguish sealed legal freight, the scraped relay case, and the cask’s narrow acoustic slit. Use restrained warm scanner light, local emergency cues, and a marked echo. Use text and shapes alongside color.

## 2.3 Narrative

**Setting & World:**
A hostile intergalactic highway where dangerous contraband passes through customs checkpoints. The slice follows the freighter Mule–07 on the Cinder Run toward Cinder Gate. Broader geography, history, and era are TBD.

**Narrative Premise:**
The courier is a replaceable contractor under a criminal syndicate’s financial demands. Survive the trip and pass a freight inspection while transporting something that can answer a sound before it happens. The intended campaign ends with the weekly quota coming due; the slice expresses these stakes through a single delivery’s costs and reserve warning.

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
Mechanical footsteps, cargo clunks, containment warnings, electrical alarms, breach hiss, rivet strikes, the anomalous echo, and customs scans identify actions and threats. Repair, payment, arrest, and wreck cues distinguish outcomes. Sound reinforces readable visual feedback and supports muting.

**Audio References:**
Specific game, artist, and track references are TBD. The established direction is breakbeat energy, synthesized instrumentation, and distinct industrial and cargo warning cues.
