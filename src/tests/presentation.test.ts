import { describe, expect, it } from 'vitest'
import { steer, type Target } from '../app/autopilot'
import { diff } from '../app/events'
import { actions } from '../app/interact'
import { rules, ship, slots } from '../game/content'
import { exposure, detection } from '../game/customs'
import { command, initial, position, tick, type Game } from '../game/simulation'
import { classic, SURGE } from './classic'

const launch = () => command(classic(initial()), { type: 'accept' })

/** Drive the courier with the autopilot exactly as the live loop does. */
function drive(g: Game, t: Target, limit = 600) {
  const events: string[] = []
  for (let i = 0; i < limit; i++) {
    const s = steer(g, t)
    if (s.cmd) {
      const next = command(g, s.cmd)
      events.push(...diff(g, next).map((e) => e.type))
      g = next
    }
    if (s.done) return { g, events, done: true }
    const next = tick(g, s.dir)
    events.push(...diff(g, next).map((e) => e.type))
    g = next
  }
  return { g, events, done: false }
}

describe('click-to-move autopilot', () => {
  it('walks to a target on the same deck and stops within half a step', () => {
    const { g, done } = drive(launch(), { x: 300, floor: 0 })
    expect(done).toBe(true)
    expect(Math.abs(g.player.x - 300)).toBeLessThanOrEqual(rules.speed / rules.hz / 2)
  })

  it('crosses decks via the ladder and picks up cargo on arrival', () => {
    const { g, events, done } = drive(launch(), { x: 330, floor: 1, act: { type: 'pick', id: 'crate' } })
    expect(done).toBe(true)
    expect(g.player.floor).toBe(1)
    expect(g.items.crate.location.kind).toBe('held')
    expect(events).toEqual(expect.arrayContaining(['climbStart', 'climbEnd', 'pick']))
  })

  it('lines up with the rungs before climbing so the start never snaps', () => {
    let g = launch()
    let climbedFrom: number | null = null
    for (let i = 0; i < 200 && climbedFrom === null; i++) {
      const s = steer(g, { x: 300, floor: 1 })
      if (s.cmd?.type === 'climb') climbedFrom = g.player.x
      g = s.cmd ? command(g, s.cmd) : tick(g, s.dir)
    }
    expect(climbedFrom).not.toBeNull()
    expect(Math.abs(climbedFrom! - ship.ladder)).toBeLessThanOrEqual(rules.speed / rules.hz)
  })

  it('carries the cell to the shield bay and stows it', () => {
    let { g } = drive(launch(), { x: 195, floor: 0, act: { type: 'pick', id: 'cell' } })
    ;({ g } = drive(g, { x: slots.vault.x, floor: 0, act: { type: 'stow', slot: 'vault' } }))
    expect(g.items.cell.location).toEqual({ kind: 'slot', slot: 'vault' })
  })

  it('gives up without commands when the courier cannot move', () => {
    const g = initial()
    expect(steer(g, { x: 300, floor: 0 })).toEqual({ dir: 0, done: true })
    const repairing: Game = { ...launch(), fault: true, repairTicks: 3 }
    expect(steer(repairing, { x: 300, floor: 0 }).done).toBe(true)
  })

  it('produces commands the game rejects when they are invalid', () => {
    // Asking to stow with empty hands: arrival command is a no-op in the game.
    const { g } = drive(launch(), { x: slots.aft.x, floor: 0, act: { type: 'stow', slot: 'aft' } })
    expect(g.items.cell.location.kind).toBe('loose')
  })
})

describe('presentation events', () => {
  it('reports surge, ejection, repair and console transitions', () => {
    let g = launch()
    g = { ...g, player: position(g, 'cell')! }
    g = command(g, { type: 'pick', id: 'cell' })
    g = { ...g, player: { ...slots.aft } }
    const stowed = command(g, { type: 'stow', slot: 'aft' })
    expect(diff(g, stowed)).toEqual([{ type: 'stow', id: 'cell', slot: 'aft' }])
    g = stowed
    while (g.elapsed < SURGE - 1) g = tick(g)
    const surged = tick(g)
    const types = diff(g, surged).map((e) => e.type)
    expect(types).toContain('surge')
    expect(types).toContain('ejected')
    g = { ...surged, player: { ...ship.station } }
    const open = command(g, { type: 'repair' })
    expect(diff(g, open).map((e) => e.type)).toEqual(['consoleOpen'])
    const ticked = tick(open)
    const missed = command(ticked, { type: 'stop' })
    expect(diff(ticked, missed).map((e) => e.type)).toEqual(['repairMiss'])
    const closed = command(missed, { type: 'leave' })
    expect(diff(missed, closed).map((e) => e.type)).toEqual(['consoleClose'])
  })

  it('reports vents with hull loss and the death outcome', () => {
    let g = launch()
    const seen = new Set<string>()
    while (g.phase === 'highway') {
      const next = tick(g)
      diff(g, next).forEach((e) => seen.add(e.type))
      g = next
    }
    expect([...seen]).toEqual(expect.arrayContaining(['vent', 'hullLoss', 'surge', 'outcome']))
    expect(g.outcome).toBe('death')
    expect(diff(g, command(g, { type: 'restart' }))).toEqual([{ type: 'restart' }])
  })

  it('distinguishes bribed and inspected checkpoints', () => {
    const base = launch()
    const g: Game = {
      ...base,
      phase: 'search',
      stop: 0,
      items: {
        ...base.items,
        cell: { ...base.items.cell, location: { kind: 'slot', slot: 'aft' } },
        crate: { ...base.items.crate, location: { kind: 'slot', slot: 'vault' } },
      },
    }
    const bribed = command(g, { type: 'bribe' })
    expect(diff(g, bribed)).toEqual([{ type: 'stopCleared', stop: 0, bribed: true }])
    const inspected = command(bribed, { type: 'inspect' })
    expect(diff(bribed, inspected)).toEqual([{ type: 'stopCleared', stop: 1, bribed: false }])
  })

  it('returns nothing for an unchanged snapshot', () => {
    const g = launch()
    expect(diff(g, command(g, { type: 'drop' }))).toEqual([])
  })
})

describe('context actions and customs risk preview', () => {
  it('lists the nearest action first', () => {
    const g: Game = {
      ...launch(),
      player: { x: 200, floor: 0 },
      items: {
        ...launch().items,
        crate: { ...launch().items.crate, location: { kind: 'loose', x: 190, floor: 0 } },
      },
    }
    const list = actions(g)
    expect(list.map((a) => a.cmd)).toEqual([
      { type: 'pick', id: 'cell' },
      { type: 'pick', id: 'crate' },
    ])
  })

  it('previews exactly the detection odds the search will apply', () => {
    const base = launch()
    const at = (location: Game['items']['crate']['location']): Game => ({
      ...base,
      phase: 'prep',
      items: { ...base.items, crate: { ...base.items.crate, location } },
    })
    expect(exposure(at({ kind: 'loose', x: 200, floor: 0 }), 'crate')).toBe(1)
    expect(exposure(at({ kind: 'slot', slot: 'upper' }), 'crate')).toBe(rules.signalRackChance)
    expect(exposure(at({ kind: 'slot', slot: 'vault' }), 'crate')).toBe(0)
    expect(exposure(at({ kind: 'surrendered' }), 'crate')).toBe(0)
    const racked = at({ kind: 'slot', slot: 'upper' })
    expect(exposure(racked, 'crate')).toBe(detection({ ...racked, phase: 'search', stop: 3 }, 'crate'))
    expect(exposure(at({ kind: 'slot', slot: 'aft' }), 'cell')).toBe(1)
  })
})
