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
  repairPeriod: 54,
  targetStart: 0.38,
  targetEnd: 0.69,
  echoSeconds: 4,
  // Hull breach
  impactDamage: 8,
  breachDamagePerSecond: 1,
  slipDamage: 3,
  patchLength: 4,
  // Customs
  suspicionLimit: 3,
  deepSearch: 2,
  declarationPoints: 1,
  ambiguousPoints: 1,
  unmatchedPoints: 2,
  anomalyPoints: 2,
  falseClaimPoints: 1,
  holdSeconds: 8,
  scanSeconds: 0.9,
  officerSpeed: 85,
  dutyFine: 15,
  impoundFee: 30,
  wreckFee: 100,
  startingCash: 40,
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
  overlapGap: [1, 4],
  /** Otherwise hazards are at least this far apart, leaving time to recover. */
  minGap: 16,
} as const

export const ship = {
  min: 88,
  max: 460,
  ladder: 239,
  station: { x: 138, floor: 1 } as Point,
  start: { x: 213, floor: 0 } as Point,
}
export const rooms = {
  engineering: { name: 'Engineering', short: 'ENGINE', post: { x: 156, floor: 1 } },
  airlock: { name: 'Airlock', short: 'AIRLOCK', post: { x: 411, floor: 1 } },
  freight: { name: 'Freight Hold', short: 'FREIGHT', post: { x: 188, floor: 0 } },
  containment: { name: 'Containment', short: 'CONTAIN', post: { x: 367, floor: 0 } },
} as const
export type RoomId = keyof typeof rooms
export const roomIds = Object.keys(rooms) as RoomId[]
export function roomAt(p: Point): RoomId {
  if (p.floor === 1) return p.x < ship.ladder ? 'engineering' : 'airlock'
  return p.x < ship.ladder ? 'freight' : 'containment'
}

export const slots = {
  front: { name: 'Front rack', x: 125, floor: 0, room: 'freight' },
  rear: { name: 'Rear rack', x: 163, floor: 0, room: 'freight' },
  berth: { name: 'Open berth', x: 213, floor: 0, room: 'freight' },
  cradle: { name: 'Powered cradle', x: 403, floor: 0, room: 'containment' },
} as const
export type SlotId = keyof typeof slots
export const slotIds = Object.keys(slots) as SlotId[]

/** Hull sections an impact can open. Each is a walkable patch point. */
export const breachSites = {
  aft: { name: 'Aft plating', x: 104, floor: 0 },
  keel: { name: 'Keel seam', x: 292, floor: 0 },
  bow: { name: 'Bow plating', x: 430, floor: 1 },
} as const
export type SiteId = keyof typeof breachSites
export const siteIds = Object.keys(breachSites) as SiteId[]
export type Dir = 'up' | 'down' | 'left' | 'right'
export const dirs: Dir[] = ['up', 'right', 'down', 'left']

type CargoDefinition = {
  name: string
  value: number
  category: 'legal' | 'gray' | 'forbidden'
  signature: 'heat' | 'acoustic' | null
  declaration: string | null
  start: Point | SlotId
  color: string
  detail: string
}

export const cargo = {
  drums: {
    name: 'Heated Bearing Drums', value: 20, category: 'legal', signature: 'heat',
    declaration: 'Heated lubricant', start: { x: 91, floor: 0 }, color: '#d8af6c',
    detail: 'Put in the front rack to explain heat from behind it.',
  },
  bales: {
    name: 'Gasket Bales', value: 15, category: 'legal', signature: null,
    declaration: 'Gasket stock', start: 'berth', color: '#bdcabc',
    detail: 'Declared freight. Keep visible in the open berth.',
  },
  relays: {
    name: 'Unlicensed Relay Bank', value: 40, category: 'gray', signature: 'heat',
    declaration: null, start: { x: 193, floor: 0 }, color: '#7eb9b2',
    detail: 'Warm and missing its duty plate. Hide in the rear rack.',
  },
  cask: {
    name: 'Choir Cask', value: 90, category: 'forbidden', signature: 'acoustic',
    declaration: null, start: 'cradle', color: '#d58cae',
    detail: 'Keep in the powered cradle. It remembers a power cut.',
  },
} as const satisfies Record<string, CargoDefinition>
export type CargoId = keyof typeof cargo
export const cargoIds = Object.keys(cargo) as CargoId[]
export function accepts(slot: SlotId, id: CargoId) {
  return slot === 'cradle' ? id === 'cask' : slot !== 'front' || cargo[id].category === 'legal'
}
export const deckName = (floor: Floor) => floor === 1 ? 'Upper deck' : 'Lower deck'
