import { board, finish, responsePoint, search, tickSearch, type Inspection, type Outcome, type Response } from './customs'
import {
  accepts,
  breachSites,
  cargo,
  cargoIds,
  roomAt,
  rules,
  ship,
  slotIds,
  slots,
  type CargoId,
  type Dir,
  type Floor,
  type Point,
  type RoomId,
  type SiteId,
  type SlotId,
} from './content'
import { nextSeed, patchSequence, plan, stream, type Hazard } from './hazards'

export type Location =
  | ({ kind: 'loose' } & Point)
  | { kind: 'held' }
  | { kind: 'slot'; slot: SlotId }
  | { kind: 'surrendered' | 'confiscated' }
export interface Item {
  location: Location
}
export interface Breach {
  site: SiteId
  seq: Dir[]
  /** Wrong rivets so far. */
  slips: number
}
/**
 * Guided first delivery. While `clock` is held, the highway clock and the
 * hazard schedule stand still.
 */
export interface Training {
  clock: boolean
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
  cash: number
  inspection: Inspection | null
  echo: RoomId | null
  exposedTicks: number
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
  | { type: 'repair' | 'stop' | 'leave' | 'inspect' | 'respond' | 'restart' | 'newRun' | 'patch' }
  | { type: 'rivet'; dir: Dir }
  | { type: 'hold'; response: Response }
  | { type: 'trigger'; hazard: 'surge' | 'impact' }
  | { type: 'train'; clock?: boolean; remaining?: number }
export type Direction = -1 | 0 | 1

export function initial(seed: number = rules.seed): Game {
  const items = Object.fromEntries(cargoIds.map((id) => {
    const start = cargo[id].start
    const location: Location = typeof start === 'string'
      ? { kind: 'slot', slot: start }
      : { kind: 'loose', ...start }
    return [id, { location }]
  })) as Record<CargoId, Item>
  return {
    phase: 'contract',
    player: { ...ship.start },
    climb: null,
    items,
    hull: rules.hull,
    elapsed: 0,
    ticks: 0,
    seed,
    cash: rules.startingCash,
    inspection: null,
    echo: null,
    exposedTicks: 0,
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
export const mobile = (g: Game) => g.phase === 'highway' || g.phase === 'prep' || g.phase === 'search'
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
export function caskSealed(g: Game) {
  const location = g.items.cask.location
  return location.kind === 'slot' && location.slot === 'cradle' && (g.phase !== 'highway' || !g.fault)
}
/** First tick of a scheduled hazard of this kind, if one is still pending. */
export const hazardAt = (g: Game, kind: Hazard['kind']) => g.schedule.find((h) => h.kind === kind)?.at

export function contextActions(g: Game): { label: string; cmd: Command }[] {
  if (!mobile(g) || g.climb || working(g)) return []
  if (g.phase === 'search') {
    const p = responsePoint(g)
    return p && near(g, p) ? [{ label: 'File response', cmd: { type: 'respond' } }] : []
  }
  const held = heldItem(g)
  if (held)
    return slotIds
      .filter((id) => near(g, slots[id]) && !occupant(g, id) && accepts(id, held))
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
  return { ...g, fault: true, note: 'Power bus down. The cradle is losing containment.' }
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
  if (g.phase === 'search' && cmd.type !== 'climb') return search(g, cmd)
  if (cmd.type === 'accept' && g.phase === 'contract')
    return cmd.training
      ? {
          ...g,
          phase: 'highway',
          schedule: [],
          training: { clock: true },
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
  if (cmd.type === 'stow' && held && near(g, slots[cmd.slot]) && !occupant(g, cmd.slot) && accepts(cmd.slot, held))
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
      return board(next)
    return next
  }
  if (next.phase === 'search') return tickSearch(next)
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
  if (!g.echo) {
    const exposedTicks = caskSealed(g) ? 0 : g.exposedTicks + 1
    g = { ...g, exposedTicks }
    if (exposedTicks >= rules.echoSeconds * rules.hz) {
      const echo = roomAt(position(g, 'cask')!)
      g = { ...g, echo, note: 'Containment failed. A residual echo remains in the compartment.' }
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
      note: 'Checkpoint ahead. Verify the manifest and containment.',
    }
  return g
}
