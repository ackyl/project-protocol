import { expect, it } from 'vitest'
import {
  command,
  cursor,
  initial,
  position,
  shielded,
  tick,
  type Game,
} from '../game/simulation'
import { rules, ship, slots } from '../game/content'
const launch = () => command(initial(), { type: 'accept' })
function advance(g: Game, count: number) {
  for (let i = 0; i < count; i++) g = tick(g)
  return g
}
it('validates pickup, occupancy, stow, retrieval and drop on the current deck', () => {
  let g = launch()
  expect(command(g, { type: 'pick', id: 'crate' })).toBe(g)
  g = { ...g, player: { x: 195, floor: 0 } }
  g = command(g, { type: 'pick', id: 'cell' })
  expect(command(g, { type: 'stow', slot: 'vault' })).toBe(g)
  g = { ...g, player: { ...slots.vault } }
  expect(position(g, 'cell')).toEqual(g.player)
  g = command(g, { type: 'stow', slot: 'vault' })
  g = { ...g, player: position(g, 'crate')! }
  g = command(g, { type: 'pick', id: 'crate' })
  g = { ...g, player: { ...slots.vault } }
  expect(command(g, { type: 'pick', id: 'cell' })).toBe(g)
  expect(command(g, { type: 'stow', slot: 'vault' })).toBe(g)
  g = command(g, { type: 'drop' })
  expect(position(g, 'crate')).toMatchObject({ x: slots.vault.x, floor: 0 })
  g = command(g, { type: 'pick', id: 'cell' })
  expect(g.items.cell.location.kind).toBe('held')
})
it('heats loose cargo and damages condition and hull when it vents', () => {
  const g = advance(launch(), 40 * rules.hz)
  expect(g.items.cell.condition).toBe(80)
  expect(g.hull).toBeLessThan(100)
})
it('cools secured cells and ejects an unshielded cell at the scripted surge', () => {
  let g = advance(launch(), 10 * rules.hz)
  g = { ...g, player: position(g, 'cell')! }
  g = command(g, { type: 'pick', id: 'cell' })
  g = { ...g, player: slots.aft }
  g = command(g, { type: 'stow', slot: 'aft' })
  const heat = g.items.cell.heat
  g = tick(g)
  expect(g.items.cell.heat).toBeLessThan(heat)
  g = advance(g, rules.surge * rules.hz - g.elapsed)
  expect(g.fault).toBe(true)
  expect(g.items.cell.location.kind).toBe('loose')
  expect(g.items.cell.heat).toBeGreaterThanOrEqual(rules.surgeHeat)
})
it('allows only nearby empty-handed console work and keeps time through misses and hits', () => {
  let g = advance(launch(), rules.surge * rules.hz)
  expect(command(g, { type: 'repair' })).toBe(g)
  g = { ...g, player: position(g, 'cell')! }
  g = command(g, { type: 'pick', id: 'cell' })
  g = { ...g, player: ship.station }
  expect(command(g, { type: 'repair' })).toBe(g)
  g = command(g, { type: 'drop' })
  g = command(g, { type: 'repair' })
  expect(g.repairTicks).toBe(0)
  g = command(g, { type: 'stop' })
  expect(g.fault).toBe(true)
  expect(g.note).toMatch(/Missed/)
  const before = g.elapsed
  while (cursor(g) < rules.targetStart) g = tick(g, 1)
  expect(g.player.x).toBe(ship.station.x)
  expect(g.elapsed).toBeGreaterThan(before)
  g = command(g, { type: 'stop' })
  expect(g.fault).toBe(false)
  expect(g.repairTicks).toBeNull()
})
it('masks the signal only while in the shield bay', () => {
  let g = launch()
  g = { ...g, player: position(g, 'crate')! }
  g = command(g, { type: 'pick', id: 'crate' })
  expect(shielded(g.items.crate)).toBe(false)
  g = { ...g, player: slots.vault }
  g = command(g, { type: 'stow', slot: 'vault' })
  expect(shielded(g.items.crate)).toBe(true)
})
it('loses the courier to hull breach when both emergencies are ignored', () => {
  const dead = advance(launch(), rules.highway * rules.hz)
  expect(dead.hull).toBe(0)
  expect(dead.phase).toBe('result')
  expect(tick(dead)).toBe(dead)
})

it('preserves the shielded latch during the surge and still faults the power bus', () => {
  let g = launch()
  g = { ...g, player: position(g, 'cell')! }
  g = command(g, { type: 'pick', id: 'cell' })
  g = { ...g, player: slots.vault }
  g = command(g, { type: 'stow', slot: 'vault' })
  g = advance(g, rules.surge * rules.hz)
  expect(g.items.cell.location).toEqual({ kind: 'slot', slot: 'vault' })
  expect(g.items.cell.heat).toBe(0)
  expect(g.fault).toBe(true)
})

it('leaves state and inputs untouched on invalid commands and lets the courier leave a repair', () => {
  const g = launch(),
    before = structuredClone(g)
  for (const cmd of [
    { type: 'inspect' },
    { type: 'bribe' },
    { type: 'surrender', id: 'cell' },
    { type: 'stop' },
    { type: 'restart' },
    { type: 'drop' },
    { type: 'pick', id: 'crate' },
    { type: 'stow', slot: 'aft' },
  ] as const) {
    expect(command(g, cmd)).toBe(g)
    expect(g).toEqual(before)
  }
  const consoleState = command(
    { ...g, fault: true, player: ship.station },
    { type: 'repair' },
  )
  const closed = command(consoleState, { type: 'leave' })
  expect(closed.repairTicks).toBeNull()
  expect(closed.fault).toBe(true)
  expect(command(closed, { type: 'repair' }).repairTicks).toBe(0)
})
