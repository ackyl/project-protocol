import { describe, expect, it } from 'vitest'
import { command, initial, near, position, tick } from '../game/simulation'
import { cargoIds, rules, ship, slotIds, slots } from '../game/content'
const launch = () => command(initial(), { type: 'accept' })
describe('ship navigation', () => {
  it('gates departure, walking and ladder access', () => {
    const start = initial()
    expect(tick(start, 1)).toBe(start)
    const g = launch()
    expect(command(g, { type: 'accept' })).toBe(g)
    expect(command(g, { type: 'climb', to: 1 })).toBe(g)
    expect(near(g, { ...g.player, floor: 1 })).toBe(false)
  })
  it('walks to both bulkheads and stops there', () => {
    let g = launch()
    for (let i = 0; i < 200; i++) g = tick(g, -1)
    expect(g.player.x).toBe(ship.min)
    for (let i = 0; i < 200; i++) g = tick(g, 1)
    expect(g.player.x).toBe(ship.max)
  })
  it('reaches every cargo, slot and station via the shared ladder', () => {
    let g = launch()
    const targets = [
      ...cargoIds.map((id) => position(g, id)!),
      ...slotIds.map((id) => slots[id]),
      ship.station,
    ]
    for (const p of targets) {
      if (g.player.floor !== p.floor) {
        while (Math.abs(g.player.x - ship.ladder) > rules.ladderReach)
          g = tick(g, g.player.x < ship.ladder ? 1 : -1)
        g = command(g, { type: 'climb', to: p.floor })
        expect(g.climb).toBeTruthy()
        for (let i = 0; i < rules.climbTicks; i++) g = tick(g, 1)
        expect(g.player.x).toBe(ship.ladder)
        expect(g.player.floor).toBe(p.floor)
      }
      while (!near(g, p)) g = tick(g, g.player.x < p.x ? 1 : -1)
      expect(near(g, p)).toBe(true)
    }
  })
})
