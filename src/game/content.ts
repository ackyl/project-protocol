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
  surge: 35,
  hull: 100,
  surgeDamagePerSecond: 2,
  surgeHeat: 70,
  heatLimit: 100,
  heatPerSecond: 2.5,
  coolingPerSecond: 10,
  blastDamage: 16,
  conditionLoss: 20,
  repairPeriod: 54,
  targetStart: 0.38,
  targetEnd: 0.69,
  signalRackChance: 0.8,
  impoundFee: 30,
  wreckFee: 100,
  startingCash: 40,
  bribe: 25,
  repairCostPerHull: 1,
  debtTarget: 60,
  seed: 7402,
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
