import { finish, search, type Outcome } from './customs'
import {
  breachSites,
  cargo,
  cargoIds,
  rules,
  ship,
  slotIds,
  slots,
  type CargoId,
  type Dir,
  type Floor,
  type Point,
  type SiteId,
  type SlotId,
} from './content'
import { nextSeed, patchSequence, plan, stream, type Hazard } from './hazards'

export type Location =
  | ({ kind: 'loose' } & Point)
  | { kind: 'held' }
  | { kind: 'slot'; slot: SlotId }
  | { kind: 'surrendered' }
export interface Item {
  location: Location
  /** Volatile Cell heat, 0–100. */
  heat: number
  /** Bio Specimen agitation, 0–100. */
  agitation: number
  condition: number
}
export interface Breach {
  site: SiteId
  seq: Dir[]
  /** Wrong rivets so far. */
  slips: number
}
/**
 * Guided first delivery. While `clock` is held, the highway clock and the
 * hazard schedule stand still; `dormant` cargo does not escalate yet.
 */
export interface Training {
  clock: boolean
  dormant: CargoId[]
}
export interface Game {
  phase: 'contract' | 'highway' | 'prep' | 'search' | 'result'
  player: Point
  climb: { to: Floor; ticks: number } | null
  items: Record<CargoId, Item>
  hull: number
  /** Phase clock: highway time, then prep time. */
  elapsed: number
  /** Ticks since departure; drives once-per-second effects. */
  ticks: number
  seed: number
  rng: number
  cash: number
  stop: number
  outcome: Outcome | null
  fault: boolean
  repairTicks: number | null
  schedule: Hazard[]
  breach: Breach | null
  /** Rivets driven while the patch panel is open, or null when closed. */
  patch: number | null
  training: Training | null
  note: string
}
export type Command =
  | { type: 'accept'; training?: boolean }
  | { type: 'climb'; to: Floor }
  | { type: 'pick'; id: CargoId }
  | { type: 'drop' }
  | { type: 'stow'; slot: SlotId }
  | { type: 'repair' | 'stop' | 'leave' | 'inspect' | 'bribe' | 'restart' | 'newRun' | 'patch' }
  | { type: 'rivet'; dir: Dir }
  | { type: 'surrender'; id: CargoId }
  | { type: 'trigger'; hazard: 'surge' | 'impact' }
  | { type: 'train'; clock?: boolean; wake?: CargoId; remaining?: number }
export type Direction = -1 | 0 | 1

export function initial(seed: number = rules.seed): Game {
  const item = (id: CargoId): Item => ({
    location: { kind: 'loose', ...cargo[id].start },
    heat: 0,
    agitation: 0,
    condition: 100,
  })
  return {
    phase: 'contract',
    player: { ...ship.start },
    climb: null,
    items: { cell: item('cell'), crate: item('crate'), specimen: item('specimen') },
    hull: rules.hull,
    elapsed: 0,
    ticks: 0,
    seed,
    rng: seed >>> 0,
    cash: rules.startingCash,
    stop: 0,
    outcome: null,
    fault: false,
    repairTicks: null,
    schedule: plan(seed),
    breach: null,
    patch: null,
    training: null,
    note: 'Contract awaiting signature.',
  }
}
export function position(g: Game, id: CargoId): Point | undefined {
  const loc = g.items[id].location
  if (loc.kind === 'slot') return slots[loc.slot]
  if (loc.kind === 'loose') return loc
  if (loc.kind === 'held') return g.player
}
export function near(g: Game, point: Point) {
  return g.player.floor === point.floor && Math.abs(g.player.x - point.x) <= rules.reach
}
export const mobile = (g: Game) => g.phase === 'highway' || g.phase === 'prep'
/** The courier is busy at a station (console or breach patch). */
export const working = (g: Game) => g.repairTicks !== null || g.patch !== null
export function canClimb(g: Game, to: Floor) {
  return (
    mobile(g) &&
    !working(g) &&
    !g.climb &&
    to !== g.player.floor &&
    Math.abs(g.player.x - ship.ladder) <= rules.ladderReach
  )
}
export const heldItem = (g: Game) => cargoIds.find((id) => g.items[id].location.kind === 'held')
export const occupant = (g: Game, slot: SlotId) =>
  cargoIds.find((id) => {
    const loc = g.items[id].location
    return loc.kind === 'slot' && loc.slot === slot
  })
export const shielded = (item: Item) => item.location.kind === 'slot' && slots[item.location.slot].shielded
export const dormant = (g: Game, id: CargoId) => !!g.training?.dormant.includes(id)
/** First tick of a scheduled hazard of this kind, if one is still pending. */
export const hazardAt = (g: Game, kind: Hazard['kind']) => g.schedule.find((h) => h.kind === kind)?.at

export function contextActions(g: Game): { label: string; cmd: Command }[] {
  if (!mobile(g) || g.climb || working(g)) return []
  const held = heldItem(g)
  if (held)
    return slotIds
      .filter((id) => near(g, slots[id]) && !occupant(g, id))
      .map((slot) => ({ label: 'Stow in ' + slots[slot].name, cmd: { type: 'stow', slot } }))
  const actions: { label: string; cmd: Command }[] = []
  if (g.fault && g.phase === 'highway' && near(g, ship.station))
    actions.push({ label: 'Open power console', cmd: { type: 'repair' } })
  if (g.breach && g.phase === 'highway' && near(g, breachSites[g.breach.site]))
    actions.push({ label: 'Patch ' + breachSites[g.breach.site].name, cmd: { type: 'patch' } })
  for (const id of cargoIds) {
    const p = position(g, id)
    if (p && near(g, p)) actions.push({ label: 'Pick up ' + cargo[id].name, cmd: { type: 'pick', id } })
  }
  return actions
}
export function cursor(g: Game) {
  return 1 - Math.abs((2 * ((g.repairTicks ?? 0) % rules.repairPeriod)) / rules.repairPeriod - 1)
}
function relocate(g: Game, id: CargoId, location: Location, note: string): Game {
  return { ...g, items: { ...g.items, [id]: { ...g.items[id], location } }, note }
}

// ── Hazards ──────────────────────────────────────────────────────────────
function surge(g: Game): Game {
  if (g.fault) return g
  g = { ...g, fault: true, note: 'Surge! Power bus down and the hull is draining. Ordinary rack latches failed.' }
  for (const id of cargoIds) {
    if (cargo[id].kind !== 'thermal') continue
    let item = g.items[id]
    if (shielded(item) || item.location.kind === 'surrendered') continue
    const p = position(g, id)!
    const location: Location = item.location.kind === 'slot' ? { kind: 'loose', x: p.x, floor: p.floor } : item.location
    item = { ...item, location, heat: Math.max(item.heat, rules.surgeHeat) }
    g = { ...g, items: { ...g.items, [id]: item } }
  }
  return g
}
function impact(g: Game, site: SiteId, seq: Dir[]): Game {
  if (g.breach) return g
  return {
    ...g,
    breach: { site, seq, slips: 0 },
    hull: Math.max(0, g.hull - rules.impactDamage),
    note: `Impact! ${breachSites[site].name} breached. Patch it before the hull bleeds out.`,
  }
}

export function command(g: Game, cmd: Command): Game {
  if (cmd.type === 'restart' && g.phase === 'result') return initial(g.seed)
  if (cmd.type === 'newRun' && g.phase === 'result') return initial(nextSeed(g.seed))
  if (g.phase === 'search') return search(g, cmd)
  if (cmd.type === 'accept' && g.phase === 'contract')
    return cmd.training
      ? {
          ...g,
          phase: 'highway',
          schedule: [],
          training: { clock: true, dormant: ['cell', 'specimen'] },
          note: 'Training run. The clock holds until the drills are done.',
        }
      : { ...g, phase: 'highway', note: 'Underway. Secure the loose cargo.' }
  if (g.training && g.phase === 'highway') {
    if (cmd.type === 'trigger')
      return cmd.hazard === 'surge'
        ? surge(g)
        : impact(g, 'keel', patchSequence(stream(g.seed + 77)))
    if (cmd.type === 'train') {
      const training: Training = {
        clock: cmd.clock ?? g.training.clock,
        dormant: g.training.dormant.filter((id) => id !== cmd.wake && cmd.clock !== false),
      }
      const elapsed =
        cmd.remaining !== undefined
          ? Math.max(g.elapsed, (rules.highway - cmd.remaining) * rules.hz)
          : g.elapsed
      return { ...g, training, elapsed }
    }
  }
  if (cmd.type === 'climb' && canClimb(g, cmd.to))
    return {
      ...g,
      player: { ...g.player, x: ship.ladder },
      climb: { to: cmd.to, ticks: 0 },
      note: 'Climbing the center ladder.',
    }
  if (!mobile(g) || g.climb) return g
  if (g.repairTicks !== null) {
    if (cmd.type === 'leave') return { ...g, repairTicks: null, note: 'Console closed. Power fault active.' }
    if (cmd.type !== 'stop') return g
    const hit = cursor(g) >= rules.targetStart && cursor(g) <= rules.targetEnd
    return hit
      ? { ...g, fault: false, repairTicks: null, note: 'Power restored. Hull drain stopped.' }
      : { ...g, repairTicks: 0, note: 'Missed the band. Try the next sweep.' }
  }
  if (g.patch !== null && g.breach) {
    if (cmd.type === 'leave') return { ...g, patch: null, note: 'Patch abandoned. The breach is still open.' }
    if (cmd.type !== 'rivet') return g
    if (cmd.dir !== g.breach.seq[g.patch])
      return {
        ...g,
        patch: 0,
        breach: { ...g.breach, slips: g.breach.slips + 1 },
        hull: Math.max(0, g.hull - rules.slipDamage),
        note: 'The plate slipped! Start the rivets again.',
      }
    const patch = g.patch + 1
    if (patch < g.breach.seq.length) return { ...g, patch, note: 'Rivet set.' }
    return { ...g, patch: null, breach: null, note: 'Breach sealed. Hull holding.' }
  }
  const held = heldItem(g)
  if (cmd.type === 'pick' && !held) {
    const p = position(g, cmd.id)
    if (p && near(g, p)) return relocate(g, cmd.id, { kind: 'held' }, 'Carrying ' + cargo[cmd.id].name + '.')
  }
  if (cmd.type === 'drop' && held)
    return relocate(g, held, { kind: 'loose', ...g.player }, 'Dropped ' + cargo[held].name + '.')
  if (cmd.type === 'stow' && held && near(g, slots[cmd.slot]) && !occupant(g, cmd.slot))
    return relocate(
      g,
      held,
      { kind: 'slot', slot: cmd.slot },
      cargo[held].name + ' secured in ' + slots[cmd.slot].name + '.',
    )
  if (cmd.type === 'repair' && !held && g.fault && g.phase === 'highway' && near(g, ship.station))
    return { ...g, repairTicks: 0, note: 'Stop the cursor inside the marked band.' }
  if (cmd.type === 'patch' && !held && g.breach && g.phase === 'highway' && near(g, breachSites[g.breach.site]))
    return { ...g, patch: 0, note: 'Drive the rivets in the order shown.' }
  return g
}

export function tick(g: Game, direction: Direction = 0): Game {
  if (!mobile(g)) return g
  const held = g.phase === 'highway' && g.training?.clock
  const next = { ...g, elapsed: g.elapsed + (held ? 0 : 1), ticks: g.ticks + 1 }
  if (g.climb) {
    const ticks = g.climb.ticks + 1
    if (ticks >= rules.climbTicks) {
      next.player = { x: ship.ladder, floor: g.climb.to }
      next.climb = null
    } else next.climb = { ...g.climb, ticks }
  } else if (direction && !working(g)) {
    next.player = {
      ...g.player,
      x: Math.min(ship.max, Math.max(ship.min, g.player.x + (direction * rules.speed) / rules.hz)),
    }
  }
  if (next.phase === 'prep') {
    if (next.elapsed >= rules.prep * rules.hz)
      return { ...next, phase: 'search', climb: null, note: 'Customs has boarded.' }
    return next
  }
  if (next.repairTicks !== null) next.repairTicks++
  return transit(next)
}

function transit(g: Game): Game {
  const fired = new Set<string>()
  if (!g.training?.clock)
    for (const h of g.schedule)
      if (h.at === g.elapsed) {
        fired.add(h.kind)
        g = h.kind === 'surge' ? surge(g) : impact(g, h.site!, h.seq!)
      }
  if (fired.size) g = { ...g, schedule: g.schedule.filter((h) => h.at !== g.elapsed) }
  // Volatile Cell: heats while loose or carried, cools in any slot, vents at the limit.
  for (const id of cargoIds) {
    if (cargo[id].kind !== 'thermal') continue
    const item = g.items[id]
    if (item.location.kind === 'surrendered') continue
    let heat =
      item.location.kind === 'slot'
        ? Math.max(0, item.heat - rules.coolingPerSecond / rules.hz)
        : dormant(g, id)
          ? item.heat
          : item.heat + rules.heatPerSecond / rules.hz
    let condition = item.condition
    if (heat >= rules.heatLimit - 1e-6) {
      heat = 0
      condition = Math.max(0, condition - rules.conditionLoss)
      g = { ...g, hull: Math.max(0, g.hull - rules.blastDamage), note: 'Cell vented! Hull and cargo damaged.' }
    }
    if (heat !== item.heat) g = { ...g, items: { ...g.items, [id]: { ...item, heat, condition } } }
  }
  // Bio Specimen: agitated outside containment and when a rack loses power.
  for (const id of cargoIds) {
    if (cargo[id].kind !== 'bio') continue
    const item = g.items[id]
    const loc = item.location
    if (loc.kind === 'surrendered') continue
    const rate =
      loc.kind === 'slot'
        ? slots[loc.slot].shielded || !g.fault
          ? -rules.agitationReliefPerSecond
          : rules.agitationFaultPerSecond
        : dormant(g, id)
          ? 0
          : rules.agitationPerSecond
    let agitation = Math.min(rules.agitationLimit, Math.max(0, item.agitation + rate / rules.hz))
    if (agitation !== item.agitation) g = { ...g, items: { ...g.items, [id]: { ...item, agitation } } }
    if (agitation >= rules.agitationLimit - 1e-6) {
      agitation = rules.pulseReset
      g = pulse(g, id, agitation)
    }
  }
  if (g.ticks % rules.hz === 0) {
    let drain = 0
    if (g.fault && !fired.has('surge')) drain += rules.surgeDamagePerSecond
    if (g.breach && !fired.has('impact')) drain += rules.breachDamagePerSecond
    if (drain) g = { ...g, hull: Math.max(0, g.hull - drain) }
  }
  if (g.hull === 0) return finish(g, 'death', 'Hull failure on the Ash Belt highway. Courier and cargo lost.')
  if (!g.training?.clock && g.elapsed >= rules.highway * rules.hz)
    return {
      ...g,
      phase: 'prep',
      elapsed: 0,
      repairTicks: null,
      patch: null,
      training: null,
      note: 'Checkpoint ahead. Hide what you can.',
    }
  return g
}

/**
 * The specimen lashes out: it loses condition, blows the ordinary rack latches
 * on its deck and scrambles any station being worked on that deck.
 */
function pulse(g: Game, id: CargoId, agitation: number): Game {
  const deck = position(g, id)!.floor
  const items = { ...g.items, [id]: { ...g.items[id], agitation, condition: Math.max(0, g.items[id].condition - rules.pulseConditionLoss) } }
  for (const other of cargoIds) {
    const loc = items[other].location
    if (loc.kind === 'slot' && !slots[loc.slot].shielded && slots[loc.slot].floor === deck)
      items[other] = { ...items[other], location: { kind: 'loose', x: slots[loc.slot].x, floor: deck } }
  }
  const onDeck = g.player.floor === deck
  return {
    ...g,
    items,
    repairTicks: onDeck ? null : g.repairTicks,
    patch: onDeck ? null : g.patch,
    note: 'Specimen pulse! Rack latches on that deck blew open.',
  }
}
