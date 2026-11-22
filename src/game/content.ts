export type Floor = 0 | 1
export type Point = { x: number; floor: Floor }
export const rules = {
  hz: 30,
  maxFrameMs: 150,
  speed: 90,
  reach: 13,
  ladderReach: 12,
  climbTicks: 15,
  highway: 90,
  prep: 20,
  hull: 100,
  // Power surge
  surgeDamagePerSecond: 2,
  surgeHeat: 70,
  repairPeriod: 54,
  targetStart: 0.38,
  targetEnd: 0.69,
  // Volatile Cell
  heatLimit: 100,
  heatPerSecond: 2.5,
  coolingPerSecond: 10,
  blastDamage: 16,
  conditionLoss: 20,
  // Biological Specimen
  agitationLimit: 100,
  agitationPerSecond: 4,
  agitationReliefPerSecond: 8,
  agitationFaultPerSecond: 3,
  pulseReset: 35,
  pulseConditionLoss: 20,
  // Hull breach
  impactDamage: 8,
  breachDamagePerSecond: 1,
  slipDamage: 3,
  patchLength: 4,
  // Customs
  signalRackChance: 0.8,
  bioRackChance: 0.5,
  impoundFee: 30,
  wreckFee: 100,
  startingCash: 40,
  bribe: 25,
  repairCostPerHull: 1,
  debtTarget: 60,
  seed: 7402,
  // Training run: highway seconds left once the guided emergencies are done
  trainingRemaining: 12,
} as const

/**
 * Highway hazard director. Every run schedules one power surge and one hull
 * impact from the run seed. Times are highway seconds.
 */
export const director = {
  surge: [28, 46],
  impactWindow: [16, 74],
  /** Chance the impact lands shortly after the surge, forcing a choice. */
  overlapChance: 0.35,
  overlapGap: [2, 5],
  /** Otherwise hazards are at least this far apart, leaving time to recover. */
  minGap: 16,
} as const

export const ship = {
  min: 88,
  max: 386,
  ladder: 239,
  station: { x: 138, floor: 1 } as Point,
  start: { x: 213, floor: 0 } as Point,
}
export const slots = {
  aft: { name: 'Aft rack', x: 128, floor: 0, shielded: false },
  upper: { name: 'Upper rack', x: 306, floor: 1, shielded: false },
  vault: { name: 'Shield bay', x: 345, floor: 0, shielded: true },
} as const
export type SlotId = keyof typeof slots
export const slotIds = Object.keys(slots) as SlotId[]

/** Hull sections an impact can open. Each is a walkable patch point. */
export const breachSites = {
  aft: { name: 'Aft plating', x: 104, floor: 0 },
  keel: { name: 'Keel seam', x: 292, floor: 0 },
  bow: { name: 'Bow plating', x: 372, floor: 1 },
} as const
export type SiteId = keyof typeof breachSites
export const siteIds = Object.keys(breachSites) as SiteId[]
export type Dir = 'up' | 'down' | 'left' | 'right'
export const dirs: Dir[] = ['up', 'right', 'down', 'left']

export const cargo = {
  cell: {
    name: 'Volatile Cell',
    value: 70,
    kind: 'thermal',
    start: { x: 195, floor: 0 },
    color: '#ffa961',
  },
  crate: {
    name: 'Signal Crate',
    value: 50,
    kind: 'signal',
    start: { x: 330, floor: 1 },
    color: '#6ddacc',
  },
  specimen: {
    name: 'Bio Specimen',
    value: 90,
    kind: 'bio',
    start: { x: 268, floor: 1 },
    color: '#9dff6a',
  },
} as const
export type CargoId = keyof typeof cargo
export const cargoIds = Object.keys(cargo) as CargoId[]
export const deckName = (floor: Floor) =>
  floor === 1 ? 'Upper deck' : 'Lower deck'
export const searchStops = [
  { id: 'lower', name: 'Lower deck sweep' },
  { id: 'top', name: 'Upper deck sweep' },
  ...slotIds.map((id) => ({ id, name: slots[id].name })),
] as const
