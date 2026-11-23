import { expect, it } from 'vitest'
import { rules, ship, slots } from '../game/content'
import { command, cursor, position, tick, type Game } from '../game/simulation'
import { advance, drive, launch } from './drive'

it('validates pickup, occupancy, stow, retrieval and drop on the current deck', () => {
  let g = launch()
  expect(command(g, { type: 'pick', id: 'cask' })).toBe(g)
  g = drive(g, { ...position(g, 'relays')!, act: { type: 'pick', id: 'relays' } })
  expect(command(g, { type: 'pick', id: 'bales' })).toBe(g)
  g = drive(g, slots.front)
  expect(command(g, { type: 'stow', slot: 'front' })).toBe(g)
  g = drive(g, slots.berth)
  expect(command(g, { type: 'stow', slot: 'berth' })).toBe(g)
  g = drive(g, slots.cradle)
  expect(command(g, { type: 'stow', slot: 'cradle' })).toBe(g)
  g = drive(g, { ...slots.rear, act: { type: 'stow', slot: 'rear' } })
  expect(g.items.relays.location).toEqual({ kind: 'slot', slot: 'rear' })
  g = command(g, { type: 'pick', id: 'relays' })
  expect(position(g, 'relays')).toEqual(g.player)
  g = command(g, { type: 'drop' })
  expect(g.items.relays.location).toEqual({ kind: 'loose', ...g.player })
})

it('allows only nearby empty-handed console work and keeps time through misses and hits', () => {
  let g: Game = { ...launch(), schedule: [{ kind: 'surge' as const, at: 30 }] }
  g = advance(g, 30)
  expect(command(g, { type: 'repair' })).toBe(g)
  g = drive(g, { ...position(g, 'relays')!, act: { type: 'pick', id: 'relays' } })
  g = drive(g, ship.station)
  expect(command(g, { type: 'repair' })).toBe(g)
  g = command(g, { type: 'drop' })
  g = command(g, { type: 'repair' })
  expect(g.repairTicks).toBe(0)
  const before = g
  g = tick(g, 1)
  g = command(g, { type: 'stop' })
  expect(g.repairTicks).toBe(0)
  expect(g.note).toMatch(/Missed/)
  while (cursor(g) < rules.targetStart) g = tick(g, 1)
  expect(g.player).toEqual(before.player)
  expect(g.elapsed).toBeGreaterThan(before.elapsed)
  g = command(g, { type: 'stop' })
  expect(g.fault).toBe(false)
  expect(g.repairTicks).toBeNull()
})

it('leaves state and inputs untouched on invalid commands and lets the courier leave a repair', () => {
  const g = launch(), before = structuredClone(g)
  for (const cmd of [
    { type: 'inspect' },
    { type: 'hold', response: { kind: 'cite' } },
    { type: 'respond' },
    { type: 'stop' },
    { type: 'restart' },
    { type: 'drop' },
    { type: 'pick', id: 'cask' },
    { type: 'stow', slot: 'rear' },
  ] as const) {
    expect(command(g, cmd)).toBe(g)
    expect(g).toEqual(before)
  }
  const open = command({ ...g, fault: true, player: ship.station }, { type: 'repair' })
  const closed = command(open, { type: 'leave' })
  expect(closed.repairTicks).toBeNull()
  expect(closed.fault).toBe(true)
  expect(command(closed, { type: 'repair' }).repairTicks).toBe(0)
})
