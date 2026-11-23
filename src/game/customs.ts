import { cargo, cargoIds, roomAt, roomIds, rooms, rules, ship, type CargoId, type Point, type RoomId, type SlotId } from './content'
import { caskSealed, heldItem, near, occupant, position, type Command, type Game } from './simulation'

export type Outcome = 'delivered' | 'arrest' | 'death'
export type Response = { kind: 'cite' } | { kind: 'surrender'; id: CargoId }
export interface Inspection {
  route: RoomId[]
  index: number
  stage: 'approach' | 'review' | 'hold' | 'scan'
  remaining: number
  carried: number
  response: Response | null
  dismissed: boolean
}
type Fixture = 'rack' | 'cradle' | 'room'
type Clue = { text: string; points: number; focus: Fixture; kind: 'heat' | 'echo' | 'other' }

export function itemRoom(g: Game, id: CargoId) {
  const p = position(g, id)
  return p ? roomAt(p) : undefined
}
export const currentRoom = (g: Game) => g.inspection?.route[g.inspection.index] ?? 'airlock'

function registered(g: Game, id: CargoId) {
  const loc = g.items[id].location
  return loc.kind === 'slot' && (loc.slot === 'front' || loc.slot === 'berth')
}
function inSlot(g: Game, id: CargoId, slot: SlotId) {
  const loc = g.items[id].location
  return loc.kind === 'slot' && loc.slot === slot
}
function hasCover(g: Game) {
  return occupant(g, 'front') !== undefined
}
function matchesHeat(g: Game) {
  const front = occupant(g, 'front')
  return !!front && registered(g, front) && cargo[front].declaration !== null && cargo[front].signature === cargo.relays.signature
}
function clues(g: Game, room: RoomId, dismissed = false): Clue[] {
  const evidence: Clue[] = []
  if (room === 'freight' && cargoIds.some((id) => cargo[id].declaration && !registered(g, id)))
    evidence.push({ text: 'Declared freight missing from a visible berth', points: rules.declarationPoints, focus: 'rack', kind: 'other' })
  if (room === 'freight' && inSlot(g, 'relays', 'rear') && !dismissed) {
    evidence.push({
      text: matchesHeat(g) ? 'Secondary heat return matches a manifest line' : 'Heat return has no matching front load',
      points: matchesHeat(g) ? rules.ambiguousPoints : rules.unmatchedPoints,
      focus: 'rack', kind: 'heat',
    })
  }
  const focus: Fixture = room === 'containment' ? 'cradle' : room === 'freight' ? 'rack' : 'room'
  if (g.echo === room) evidence.push({ text: 'Residual echo answered before the scanner', points: rules.anomalyPoints, focus, kind: 'echo' })
  if (itemRoom(g, 'cask') === room && !caskSealed(g))
    evidence.push({ text: 'Live reply from an undeclared source', points: rules.anomalyPoints, focus, kind: 'echo' })
  return evidence
}
function inspectRoom(g: Game, room: RoomId, carried = 0, dismissed = false) {
  const evidence = clues(g, room, dismissed)
  const local = evidence.reduce((sum, e) => sum + e.points, 0)
  const suspicion = Math.min(rules.suspicionLimit, carried + local)
  const strongest = [...evidence].sort((a, b) => b.points - a.points || Number(b.kind === 'echo') - Number(a.kind === 'echo'))[0]
  const depth: Fixture | 'surface' = suspicion >= rules.suspicionLimit ? 'room'
    : suspicion >= rules.deepSearch && strongest ? strongest.focus : 'surface'
  const found = cargoIds.filter((id) => {
    if (cargo[id].category === 'legal' || itemRoom(g, id) !== room) return false
    const loc = g.items[id].location
    if (loc.kind !== 'slot' || (loc.slot !== 'rear' && loc.slot !== 'cradle')) return true
    if (loc.slot === 'rear' && !hasCover(g)) return true
    return depth === 'room' || (depth === 'rack' && loc.slot === 'rear') || (depth === 'cradle' && loc.slot === 'cradle')
  })
  return { evidence, suspicion, depth, found }
}
export const briefing = (g: Game) => inspectRoom(g, currentRoom(g), g.inspection?.carried, g.inspection?.dismissed)

export function cargoStatus(g: Game, id: CargoId) {
  if (cargo[id].category === 'legal') return registered(g, id) ? 'DECLARED' : 'OFF MANIFEST'
  if (id === 'cask') return caskSealed(g) ? (g.echo ? 'SEALED / TRACE' : 'SEALED') : 'LIVE REPLY'
  if (!inSlot(g, id, 'rear') || !hasCover(g)) return 'EXPOSED'
  return matchesHeat(g) ? 'COVERED / HEAT' : 'UNEXPLAINED HEAT'
}

export function surrenderable(g: Game) {
  return cargoIds.filter((id) => cargo[id].category !== 'legal' && itemRoom(g, id) === currentRoom(g))
}
export function responsePoint(g: Game): Point | undefined {
  const response = g.inspection?.response
  if (g.inspection?.stage !== 'hold' || !response) return
  return response.kind === 'cite' ? rooms[currentRoom(g)].post : position(g, response.id)
}

function moveTo(g: Game, inspection: Inspection, route: RoomId[], index: number, carried: number): Game {
  const previous = inspection.route[inspection.index]
  const from = rooms[previous].post
  const to = rooms[route[index]].post
  const sameDeck = from.floor === to.floor
  const distance = sameDeck ? Math.abs(to.x - from.x) : Math.abs(from.x - ship.ladder) + Math.abs(to.x - ship.ladder)
  const remaining = Math.ceil(distance * rules.hz / rules.officerSpeed) + (sameDeck ? 0 : rules.climbTicks)
  return {
    ...g, note: 'Officer en route to ' + rooms[route[index]].name + '.',
    inspection: { route, index, stage: 'approach', remaining, carried, dismissed: false, response: null },
  }
}

export function board(g: Game): Game {
  // Boarding fixes evidence to a place. A held load is set down for the sweep.
  const held = heldItem(g)
  if (held) g = { ...g, items: { ...g.items, [held]: { ...g.items[held], location: { kind: 'loose', ...g.player } } } }
  const route: RoomId[] = ['airlock', 'freight']
  for (const room of roomIds) {
    if (route.includes(room)) continue
    if (g.echo === room || cargoIds.some((id) => itemRoom(g, id) === room && g.items[id].location.kind === 'loose'))
      route.push(room)
  }
  return {
    ...g, phase: 'search', climb: null, note: 'Customs has boarded.',
    inspection: { route, index: 0, stage: 'review', remaining: 0, carried: 0, dismissed: false, response: null },
  }
}

function remove(g: Game, id: CargoId, kind: 'surrendered' | 'confiscated'): Game {
  return { ...g, items: { ...g.items, [id]: { ...g.items[id], location: { kind } } } }
}
export function ledger(g: Game) {
  const earnings = Object.fromEntries(cargoIds.map((id) => [
    id, g.outcome === 'delivered' && position(g, id) ? cargo[id].value : 0,
  ])) as Record<CargoId, number>
  const repairs = g.outcome === 'death' ? 0 : (rules.hull - g.hull) * rules.repairCostPerHull
  const penalty = g.outcome === 'arrest' ? rules.impoundFee : g.outcome === 'death' ? rules.wreckFee : 0
  const duty = cargoIds.filter((id) => g.items[id].location.kind === 'confiscated').length * rules.dutyFine
  const balance = g.cash + cargoIds.reduce((sum, id) => sum + earnings[id], 0) - repairs - penalty - duty
  return { earnings, repairs, penalty, duty, balance, shortfall: Math.max(0, rules.debtTarget - balance) }
}
export function finish(g: Game, outcome: Outcome, note: string): Game {
  return { ...g, phase: 'result', outcome, climb: null, repairTicks: null, patch: null, note }
}

function scan(g: Game, inspection: Inspection): Game {
  return { ...g, inspection: { ...inspection, stage: 'scan', remaining: Math.ceil(rules.scanSeconds * rules.hz), response: null } }
}
function resolve(g: Game, i: Inspection): Game {
  const check = briefing(g)
  if (check.found.includes('cask'))
    return finish(g, 'arrest', 'Forbidden cargo found. Remaining freight impounded.')
  for (const id of check.found) g = remove(g, id, 'confiscated')
  const route = [...i.route]
  if (check.suspicion >= rules.suspicionLimit && !route.includes('containment')) route.push('containment')
  if (i.index + 1 === route.length) return finish(g, 'delivered', 'Cinder Gate cleared. Contract settled.')
  return moveTo(g, i, route, i.index + 1, check.suspicion)
}
export function tickSearch(g: Game): Game {
  const i = g.inspection
  if (!i || i.stage === 'review') return g
  if (i.remaining > 1) return { ...g, inspection: { ...i, remaining: i.remaining - 1 } }
  if (i.stage === 'hold') return scan({ ...g, note: 'Procedural hold expired.' }, i)
  if (i.stage === 'scan') return resolve(g, i)
  return { ...g, inspection: { ...i, stage: 'review', remaining: 0 }, note: 'Officer ready to inspect ' + rooms[currentRoom(g)].name + '.' }
}
export function search(g: Game, cmd: Command): Game {
  const i = g.inspection
  if (g.phase !== 'search' || !i) return g
  if (cmd.type === 'inspect' && (i.stage === 'review' || i.stage === 'hold')) return scan(g, i)
  if (cmd.type === 'hold' && i.stage === 'review') {
    const r = cmd.response
    const allowed = r.kind === 'cite' ? briefing(g).evidence.some((e) => e.kind === 'heat') : surrenderable(g).includes(r.id)
    if (!allowed) return g
    return { ...g, inspection: { ...i, stage: 'hold', remaining: rules.holdSeconds * rules.hz, response: r }, note: 'Procedural hold granted.' }
  }
  if (cmd.type !== 'respond' || !i.response || g.climb) return g
  const p = responsePoint(g)
  if (!p || !near(g, p)) return g
  const r = i.response
  if (r.kind === 'surrender')
    return scan({ ...remove(g, r.id, 'surrendered'), note: cargo[r.id].name + ' surrendered.' }, i)
  const valid = matchesHeat(g)
  return scan(
    { ...g, note: valid ? 'Manifest explanation accepted.' : 'Manifest explanation rejected.' },
    { ...i, dismissed: valid, carried: i.carried + (valid ? 0 : rules.falseClaimPoints) },
  )
}
