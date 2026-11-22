// A scripted "competent courier" plays unguided highway runs on many seeds
// through the real autopilot and rules. It proves every seeded schedule is
// survivable while still costing hull, and that overlaps genuinely compete.
import { describe, expect, it } from 'vitest'
import { steer, type Target } from '../app/autopilot'
import { breachSites, rules, ship, type CargoId, type SlotId } from '../game/content'
import { command, cursor, heldItem, initial, tick, type Game } from '../game/simulation'

const home: Record<CargoId, SlotId> = { cell: 'aft', crate: 'vault', specimen: 'upper' }
const slotX: Record<SlotId, [number, 0 | 1]> = { aft: [128, 0], upper: [306, 1], vault: [345, 0] }

/** Pick the most urgent job, like a sensible player would. */
function job(g: Game): Target | null {
  const held = heldItem(g)
  if (held) {
    if (g.fault || g.breach) return { ...g.player, act: { type: 'drop' } }
    const [x, floor] = slotX[home[held]]
    return { x, floor, act: { type: 'stow', slot: home[held] } }
  }
  if (g.fault) return { ...ship.station, act: { type: 'repair' } }
  if (g.breach) {
    const s = breachSites[g.breach.site]
    return { x: s.x, floor: s.floor, act: { type: 'patch' } }
  }
  const order: CargoId[] = ['cell', 'specimen', 'crate']
  for (const id of order) {
    const loc = g.items[id].location
    if (loc.kind === 'loose') return { x: loc.x, floor: loc.floor, act: { type: 'pick', id } }
  }
  return null
}

function play(seed: number) {
  let g = command(initial(seed), { type: 'accept' })
  let vents = 0,
    pulses = 0,
    overlapTicks = 0
  while (g.phase === 'highway') {
    if (g.fault && g.breach) overlapTicks++
    let dir: -1 | 0 | 1 = 0
    if (g.repairTicks !== null) {
      const c = cursor(g)
      if (c >= 0.45 && c <= 0.6) g = command(g, { type: 'stop' })
    } else if (g.patch !== null && g.breach) {
      g = command(g, { type: 'rivet', dir: g.breach.seq[g.patch] })
    } else {
      const t = job(g)
      if (t) {
        if (t.act?.type === 'drop') g = command(g, { type: 'drop' })
        else {
          const s = steer(g, t)
          dir = s.dir
          if (s.cmd) g = command(g, s.cmd)
        }
      }
    }
    const before = g
    g = tick(g, dir)
    if (g.items.cell.condition < before.items.cell.condition) vents++
    if (g.items.specimen.condition < before.items.specimen.condition) pulses++
  }
  return { g, vents, pulses, overlapTicks }
}

describe('seeded hazard fairness', () => {
  it('lets a competent courier reach the gate on every seed, at a real cost', () => {
    const hulls: number[] = []
    let overlapped = 0
    for (let seed = 1; seed <= 150; seed++) {
      const { g, vents, overlapTicks } = play(seed)
      expect(g.phase, `seed ${seed}`).toBe('prep')
      expect(vents, `seed ${seed}`).toBe(0)
      hulls.push(g.hull)
      if (overlapTicks > 0) overlapped++
    }
    const min = Math.min(...hulls),
      max = Math.max(...hulls)
    expect(min).toBeGreaterThan(70)
    expect(max).toBeLessThan(rules.hull)
    expect(overlapped).toBeGreaterThan(20)
  })
})
