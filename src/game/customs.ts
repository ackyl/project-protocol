import {
  cargo,
  cargoIds,
  rules,
  searchStops,
  slots,
  type CargoId,
} from './content'
import type { Command, Game } from './simulation'

export type Outcome = 'delivered' | 'arrest' | 'death'
export function atStop(g: Game, id: CargoId) {
  const location = g.items[id].location
  const stop = searchStops[g.stop]?.id
  if (location.kind === 'slot') return location.slot === stop
  if (location.kind === 'surrendered') return false
  const floor = location.kind === 'held' ? g.player.floor : location.floor
  return stop === (floor ? 'top' : 'lower')
}
export function detection(g: Game, id: CargoId) {
  const loc = g.items[id].location
  if (!atStop(g, id)) return 0
  if (loc.kind !== 'slot') return 1
  if (slots[loc.slot].shielded) return 0
  return cargo[id].kind === 'signal'
    ? rules.signalRackChance
    : cargo[id].kind === 'bio'
      ? rules.bioRackChance
      : 0
}
export function itemPayout(g: Game, id: CargoId) {
  return Math.round((cargo[id].value * g.items[id].condition) / 100)
}
export function ledger(g: Game) {
  const income = (id: CargoId) =>
    g.outcome === 'delivered' && g.items[id].location.kind !== 'surrendered'
      ? itemPayout(g, id)
      : 0
  const earnings = Object.fromEntries(cargoIds.map((id) => [id, income(id)])) as Record<CargoId, number>
  const repairs =
    g.outcome === 'death' ? 0 : (rules.hull - g.hull) * rules.repairCostPerHull
  const penalty =
    g.outcome === 'arrest'
      ? rules.impoundFee
      : g.outcome === 'death'
        ? rules.wreckFee
        : 0
  const balance = g.cash + cargoIds.reduce((n, id) => n + earnings[id], 0) - repairs - penalty
  return {
    earnings,
    repairs,
    penalty,
    bribes: rules.startingCash - g.cash,
    balance,
    shortfall: Math.max(0, rules.debtTarget - balance),
  }
}
export function finish(g: Game, outcome: Outcome, note: string): Game {
  return {
    ...g,
    phase: 'result',
    outcome,
    climb: null,
    repairTicks: null,
    patch: null,
    note,
  }
}
function clearStop(g: Game, note: string): Game {
  if (g.stop + 1 === searchStops.length)
    return finish(g, 'delivered', 'Cinder Gate cleared. Contract settled.')
  return { ...g, stop: g.stop + 1, note }
}
export function search(g: Game, cmd: Command): Game {
  if (g.phase !== 'search') return g
  const name = searchStops[g.stop].name
  if (cmd.type === 'surrender' && atStop(g, cmd.id)) {
    return {
      ...g,
      items: {
        ...g.items,
        [cmd.id]: { ...g.items[cmd.id], location: { kind: 'surrendered' } },
      },
      note:
        cargo[cmd.id].name +
        ' surrendered. Allow inspection to clear this location.',
    }
  }
  if (cmd.type === 'bribe' && g.cash >= rules.bribe)
    return clearStop(
      { ...g, cash: g.cash - rules.bribe },
      name + ' skipped. Bribe accepted.',
    )
  if (cmd.type !== 'inspect') return g
  let rng = g.rng
  for (const id of cargoIds) {
    const chance = detection(g, id)
    if (chance === 0) continue
    rng = (Math.imul(rng, 1664525) + 1013904223) >>> 0
    if (rng / 4294967296 < chance)
      return finish(
        { ...g, rng },
        'arrest',
        cargo[id].name +
          ' detected during ' +
          name.toLowerCase() +
          '. All remaining cargo impounded.',
      )
  }
  return clearStop({ ...g, rng }, name + ' cleared.')
}
/**
 * Detection chance an item would face where it currently sits, using the same
 * rules as the search. Used to preview risk during customs preparation.
 */
export function exposure(g: Game, id: CargoId) {
  const stop = searchStops.findIndex((_, i) => atStop({ ...g, stop: i }, id))
  return stop < 0 ? 0 : detection({ ...g, stop }, id)
}
