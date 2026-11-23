import { expect, it } from 'vitest'
import { steer } from '../app/autopilot'
import { diff } from '../app/events'
import { actions } from '../app/interact'
import { rules, ship, slots } from '../game/content'
import { command, initial, position, tick, type Game } from '../game/simulation'
import { advance, drive, launch } from './drive'

it('stops halfway inside a horizontal step and lines up with the ladder before climbing', () => {
  let g = drive(launch(), { x: 300, floor: 0 })
  expect(Math.abs(g.player.x - 300)).toBeLessThanOrEqual(rules.speed / rules.hz / 2)
  let climbedFrom: number | null = null
  for (let i = 0; i < 200 && climbedFrom === null; i++) {
    const s = steer(g, { x: 300, floor: 1 })
    if (s.cmd?.type === 'climb') climbedFrom = g.player.x
    g = s.cmd ? command(g, s.cmd) : tick(g, s.dir)
  }
  expect(climbedFrom).not.toBeNull()
  expect(Math.abs(climbedFrom! - ship.ladder)).toBeLessThanOrEqual(rules.speed / rules.hz)
})

it('uses the shared ladder to move freight between floors', () => {
  let g = drive(launch(), { ...position(launch(), 'relays')!, act: { type: 'pick', id: 'relays' } })
  g = drive(g, { x: 310, floor: 1 })
  g = command(g, { type: 'drop' })
  expect(position(g, 'relays')).toEqual({ kind: 'loose', ...g.player })
  expect(g.player.floor).toBe(1)
})

it('gives up without commands when the courier cannot move', () => {
  expect(steer(initial(), { x: 300, floor: 0 })).toEqual({ dir: 0, done: true })
  expect(steer({ ...launch(), repairTicks: 3 }, { x: 300, floor: 0 }).done).toBe(true)
})

it('lists the nearest reachable action first', () => {
  const g = { ...launch(), player: { x: 202, floor: 0 as const } }
  expect(actions(g).map((a) => a.cmd)).toEqual([
    { type: 'pick', id: 'relays' },
    { type: 'pick', id: 'bales' },
  ])
})

it('reports the power fault, console transitions and one persistent echo', () => {
  let g: Game = { ...launch(), schedule: [{ kind: 'surge' as const, at: 30 }] }
  g = advance(g, 29)
  const surge = tick(g)
  expect(diff(g, surge)).toEqual([{ type: 'surge' }])
  g = drive(surge, ship.station)
  const open = command(g, { type: 'repair' })
  expect(diff(g, open)).toEqual([{ type: 'consoleOpen' }])
  const ticked = tick(open)
  const missed = command(ticked, { type: 'stop' })
  expect(diff(ticked, missed)).toEqual([{ type: 'repairMiss' }])
  const closed = command(missed, { type: 'leave' })
  expect(diff(missed, closed)).toEqual([{ type: 'consoleClose' }])
  const echo = advance(closed, rules.echoSeconds * rules.hz - closed.exposedTicks - 1)
  expect(diff(echo, tick(echo))).toContainEqual({ type: 'echo', room: 'containment' })
  expect(diff(tick(echo), advance(echo, 2))).not.toContainEqual({ type: 'echo', room: 'containment' })
})

it('reports physical stowing but emits no changes for invalid input', () => {
  let g = drive(launch(), { ...position(launch(), 'relays')!, act: { type: 'pick', id: 'relays' } })
  g = drive(g, slots.rear)
  expect(diff(g, command(g, { type: 'stow', slot: 'rear' }))).toEqual([{ type: 'stow', id: 'relays', slot: 'rear' }])
  expect(diff(g, command(g, { type: 'stow', slot: 'front' }))).toEqual([])
})
