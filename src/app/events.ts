// Presentation events derived by diffing consecutive authoritative snapshots.
// The simulation stays free of effects; the renderer and audio react to these.
import { cargoIds, slots, type CargoId, type SiteId, type SlotId } from '../game/content'
import type { Game } from '../game/simulation'

export type GameEvent =
  | { type: 'accepted' }
  | { type: 'restart' }
  | { type: 'pick'; id: CargoId }
  | { type: 'drop'; id: CargoId }
  | { type: 'stow'; id: CargoId; slot: SlotId }
  | { type: 'ejected'; id: CargoId }
  | { type: 'surrender'; id: CargoId }
  | { type: 'vent'; id: CargoId }
  | { type: 'hullLoss'; amount: number }
  | { type: 'climbStart'; fromX: number }
  | { type: 'climbEnd' }
  | { type: 'surge' }
  | { type: 'repaired' }
  | { type: 'consoleOpen' }
  | { type: 'consoleClose' }
  | { type: 'repairMiss' }
  | { type: 'prep' }
  | { type: 'boarded' }
  | { type: 'stopCleared'; stop: number; bribed: boolean }
  | { type: 'outcome'; outcome: 'delivered' | 'arrest' | 'death' }
  | { type: 'impact'; site: SiteId }
  | { type: 'sealed'; site: SiteId }
  | { type: 'patchOpen' }
  | { type: 'patchClose' }
  | { type: 'rivet'; progress: number }
  | { type: 'slip' }
  | { type: 'pulse'; id: CargoId }

export function diff(a: Game, b: Game): GameEvent[] {
  if (a === b) return []
  const out: GameEvent[] = []
  if (a.phase === 'result' && b.phase === 'contract') return [{ type: 'restart' }]
  if (a.phase === 'contract' && b.phase === 'highway') out.push({ type: 'accepted' })
  for (const id of cargoIds) {
    const from = a.items[id].location,
      to = b.items[id].location
    if (from.kind !== to.kind || (from.kind === 'slot' && to.kind === 'slot' && from.slot !== to.slot)) {
      if (to.kind === 'held') out.push({ type: 'pick', id })
      else if (to.kind === 'surrendered') out.push({ type: 'surrender', id })
      else if (to.kind === 'slot') out.push({ type: 'stow', id, slot: to.slot })
      else if (from.kind === 'held') out.push({ type: 'drop', id })
      else if (from.kind === 'slot') out.push({ type: 'ejected', id })
    }
    if (b.items[id].condition < a.items[id].condition)
      out.push(b.items[id].agitation < a.items[id].agitation ? { type: 'pulse', id } : { type: 'vent', id })
  }
  if (b.hull < a.hull) out.push({ type: 'hullLoss', amount: a.hull - b.hull })
  if (!a.climb && b.climb) out.push({ type: 'climbStart', fromX: a.player.x })
  if (a.climb && !b.climb && b.phase !== 'search' && b.phase !== 'result') out.push({ type: 'climbEnd' })
  if (!a.fault && b.fault) out.push({ type: 'surge' })
  if (a.fault && !b.fault) out.push({ type: 'repaired' })
  if (a.repairTicks === null && b.repairTicks !== null) out.push({ type: 'consoleOpen' })
  else if (a.repairTicks !== null && b.repairTicks === null && b.fault && b.phase === 'highway')
    out.push({ type: 'consoleClose' })
  else if (a.repairTicks !== null && b.repairTicks === 0 && a.repairTicks > 0) out.push({ type: 'repairMiss' })
  if (!a.breach && b.breach) out.push({ type: 'impact', site: b.breach.site })
  if (a.breach && !b.breach && b.phase === 'highway') out.push({ type: 'sealed', site: a.breach.site })
  if (a.patch === null && b.patch !== null) out.push({ type: 'patchOpen' })
  else if (a.patch !== null && b.patch === null && b.breach) out.push({ type: 'patchClose' })
  else if (a.patch !== null && b.patch !== null && b.patch > a.patch) out.push({ type: 'rivet', progress: b.patch })
  if (a.breach && b.breach && b.breach.slips > a.breach.slips) out.push({ type: 'slip' })
  if (a.patch !== null && !b.breach && b.phase === 'highway') out.push({ type: 'rivet', progress: a.breach!.seq.length })
  if (a.phase === 'highway' && b.phase === 'prep') out.push({ type: 'prep' })
  if (a.phase === 'prep' && b.phase === 'search') out.push({ type: 'boarded' })
  if (a.phase === 'search' && (b.stop > a.stop || (b.phase === 'result' && b.outcome === 'delivered')))
    out.push({ type: 'stopCleared', stop: a.stop, bribed: b.cash < a.cash })
  if (a.phase !== 'result' && b.phase === 'result' && b.outcome) out.push({ type: 'outcome', outcome: b.outcome })
  return out
}

export const slotName = (s: SlotId) => slots[s].name
