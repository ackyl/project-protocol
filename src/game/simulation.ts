import { finish, search, type Outcome } from './customs'
import {
  cargo,
  cargoIds,
  rules,
  ship,
  slotIds,
  slots,
  type CargoId,
  type Floor,
  type Point,
  type SlotId,
} from './content'

export type Location =
  | ({ kind: 'loose' } & Point)
  | { kind: 'held' }
  | { kind: 'slot'; slot: SlotId }
  | { kind: 'surrendered' }
export interface Item {
  location: Location
  heat: number
  condition: number
}
export interface Game {
  phase: 'contract' | 'highway' | 'prep' | 'search' | 'result'
  player: Point
  climb: { to: Floor; ticks: number } | null
  items: Record<CargoId, Item>
  hull: number
  elapsed: number
  seed: number
  rng: number
  cash: number
  stop: number
  outcome: Outcome | null
  fault: boolean
  repairTicks: number | null
  note: string
}
export type Command =
  | { type: 'accept' }
  | { type: 'climb'; to: Floor }
  | { type: 'pick'; id: CargoId }
  | { type: 'drop' }
  | { type: 'stow'; slot: SlotId }
  | { type: 'repair' | 'stop' | 'leave' | 'inspect' | 'bribe' | 'restart' }
  | { type: 'surrender'; id: CargoId }
export type Direction = -1 | 0 | 1
export function initial(seed: number = rules.seed): Game {
  const item = (id: CargoId): Item => ({
    location: { kind: 'loose', ...cargo[id].start },
    heat: 0,
    condition: 100,
  })
  return {
    phase: 'contract',
    player: { ...ship.start },
    climb: null,
    items: { cell: item('cell'), crate: item('crate') },
    hull: rules.hull,
    elapsed: 0,
    seed,
    rng: seed >>> 0,
    cash: rules.startingCash,
    stop: 0,
    outcome: null,
    fault: false,
    repairTicks: null,
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
  return (
    g.player.floor === point.floor &&
    Math.abs(g.player.x - point.x) <= rules.reach
  )
}
export const mobile = (g: Game) => g.phase === 'highway' || g.phase === 'prep'
export function canClimb(g: Game, to: Floor) {
  return (
    mobile(g) &&
    g.repairTicks === null &&
    !g.climb &&
    to !== g.player.floor &&
    Math.abs(g.player.x - ship.ladder) <= rules.ladderReach
  )
}
export const heldItem = (g: Game) =>
  cargoIds.find((id) => g.items[id].location.kind === 'held')
export const occupant = (g: Game, slot: SlotId) =>
  cargoIds.find((id) => {
    const loc = g.items[id].location
    return loc.kind === 'slot' && loc.slot === slot
  })
export const shielded = (item: Item) =>
  item.location.kind === 'slot' && slots[item.location.slot].shielded
export function contextActions(g: Game): { label: string; cmd: Command }[] {
  if (!mobile(g) || g.climb || g.repairTicks !== null) return []
  const held = heldItem(g)
  if (held)
    return slotIds
      .filter((id) => near(g, slots[id]) && !occupant(g, id))
      .map((slot) => ({
        label: 'Stow in ' + slots[slot].name,
        cmd: { type: 'stow', slot },
      }))
  const actions: { label: string; cmd: Command }[] = []
  if (g.fault && g.phase === 'highway' && near(g, ship.station))
    actions.push({ label: 'Open power console', cmd: { type: 'repair' } })
  for (const id of cargoIds) {
    const p = position(g, id)
    if (p && near(g, p))
      actions.push({
        label: 'Pick up ' + cargo[id].name,
        cmd: { type: 'pick', id },
      })
  }
  return actions
}
export function cursor(g: Game) {
  return (
    1 -
    Math.abs(
      (2 * ((g.repairTicks ?? 0) % rules.repairPeriod)) / rules.repairPeriod -
        1,
    )
  )
}
function relocate(
  g: Game,
  id: CargoId,
  location: Location,
  note: string,
): Game {
  return {
    ...g,
    items: { ...g.items, [id]: { ...g.items[id], location } },
    note,
  }
}
export function command(g: Game, cmd: Command): Game {
  if (cmd.type === 'restart' && g.phase === 'result') return initial(g.seed)
  if (g.phase === 'search') return search(g, cmd)
  if (cmd.type === 'accept' && g.phase === 'contract')
    return { ...g, phase: 'highway', note: 'Underway. Secure the loose cargo.' }
  if (cmd.type === 'climb' && canClimb(g, cmd.to))
    return {
      ...g,
      player: { ...g.player, x: ship.ladder },
      climb: { to: cmd.to, ticks: 0 },
      note: 'Climbing the center ladder.',
    }
  if (!mobile(g) || g.climb) return g
  if (g.repairTicks !== null) {
    if (cmd.type === 'leave')
      return {
        ...g,
        repairTicks: null,
        note: 'Console closed. Power fault active.',
      }
    if (cmd.type !== 'stop') return g
    const hit = cursor(g) >= rules.targetStart && cursor(g) <= rules.targetEnd
    return hit
      ? {
          ...g,
          fault: false,
          repairTicks: null,
          note: 'Power restored. Hull drain stopped.',
        }
      : { ...g, repairTicks: 0, note: 'Missed the band. Try the next sweep.' }
  }
  const held = heldItem(g)
  if (cmd.type === 'pick' && !held) {
    const p = position(g, cmd.id)
    if (p && near(g, p))
      return relocate(
        g,
        cmd.id,
        { kind: 'held' },
        'Carrying ' + cargo[cmd.id].name + '.',
      )
  }
  if (cmd.type === 'drop' && held)
    return relocate(
      g,
      held,
      { kind: 'loose', ...g.player },
      'Dropped ' + cargo[held].name + '.',
    )
  if (
    cmd.type === 'stow' &&
    held &&
    near(g, slots[cmd.slot]) &&
    !occupant(g, cmd.slot)
  )
    return relocate(
      g,
      held,
      { kind: 'slot', slot: cmd.slot },
      cargo[held].name + ' secured in ' + slots[cmd.slot].name + '.',
    )
  if (
    cmd.type === 'repair' &&
    !held &&
    g.fault &&
    g.phase === 'highway' &&
    near(g, ship.station)
  )
    return {
      ...g,
      repairTicks: 0,
      note: 'Stop the cursor inside the marked band.',
    }
  return g
}
export function tick(g: Game, direction: Direction = 0): Game {
  if (!mobile(g)) return g
  const next = { ...g, elapsed: g.elapsed + 1 }
  if (g.climb) {
    const ticks = g.climb.ticks + 1
    if (ticks >= rules.climbTicks) {
      next.player = { x: ship.ladder, floor: g.climb.to }
      next.climb = null
    } else next.climb = { ...g.climb, ticks }
  } else if (direction && g.repairTicks === null) {
    next.player = {
      ...g.player,
      x: Math.min(
        ship.max,
        Math.max(ship.min, g.player.x + (direction * rules.speed) / rules.hz),
      ),
    }
  }
  if (next.phase === 'prep') {
    if (next.elapsed >= rules.prep * rules.hz)
      return {
        ...next,
        phase: 'search',
        climb: null,
        note: 'Customs has boarded.',
      }
    return next
  }
  if (next.repairTicks !== null) next.repairTicks++
  return transit(next)
}
function transit(g: Game): Game {
  const surge = g.elapsed === rules.surge * rules.hz
  if (surge)
    g = {
      ...g,
      fault: true,
      note: 'Surge! Unshielded cell heated. Check its latch and the upper-left console.',
    }
  for (const id of cargoIds) {
    if (cargo[id].kind !== 'thermal') continue
    let item = g.items[id]
    if (surge && !shielded(item)) {
      const p = position(g, id)!
      const location: Location =
        item.location.kind === 'slot'
          ? { kind: 'loose', x: p.x, floor: p.floor }
          : item.location
      item = { ...item, location, heat: Math.max(item.heat, rules.surgeHeat) }
    }
    let heat =
      item.location.kind === 'slot'
        ? Math.max(0, item.heat - rules.coolingPerSecond / rules.hz)
        : item.heat + rules.heatPerSecond / rules.hz
    let condition = item.condition
    if (heat >= rules.heatLimit - 1e-6) {
      heat = 0
      condition = Math.max(0, condition - rules.conditionLoss)
      g = {
        ...g,
        hull: Math.max(0, g.hull - rules.blastDamage),
        note: 'Cell vented! Hull and cargo damaged.',
      }
    }
    if (heat !== item.heat || item !== g.items[id])
      g = { ...g, items: { ...g.items, [id]: { ...item, heat, condition } } }
  }
  if (g.fault && !surge && g.elapsed % rules.hz === 0)
    g = { ...g, hull: Math.max(0, g.hull - rules.surgeDamagePerSecond) }
  if (g.hull === 0)
    return finish(
      g,
      'death',
      'Hull breach on the Ash Belt highway. Courier and cargo lost.',
    )
  if (g.elapsed >= rules.highway * rules.hz)
    return {
      ...g,
      phase: 'prep',
      elapsed: 0,
      repairTicks: null,
      note: 'Checkpoint ahead. Secure the cell and shield the crate.',
    }
  return g
}
