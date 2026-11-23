import { describe, expect, it } from 'vitest'
import { breachSites, cargo, rooms, rules, ship, slots } from '../game/content'
import { briefing, cargoStatus, currentRoom, ledger, responsePoint } from '../game/customs'
import { command, cursor, initial, position, tick, type Game } from '../game/simulation'
import { advance, allow, drive, launch, review } from './drive'

function load(g: Game) {
  for (const [id, slot] of [['relays', 'rear'], ['drums', 'front']] as const) {
    g = drive(g, { ...position(g, id)!, act: { type: 'pick', id } })
    g = drive(g, { ...slots[slot], act: { type: 'stow', slot } })
  }
  return g
}
function readyForBoard() {
  return { ...load({ ...launch(), schedule: [] }), phase: 'prep' as const, elapsed: 0 }
}
const depart = (g: Game) => advance(g, rules.prep * rules.hz)
const freight = (g: Game) => allow(depart(g))

describe('one complete delivery', () => {
  it('packs legal cover, repairs both live hazards, clears customs and replays the same route', () => {
    let g = load(launch(7402))
    while (g.phase === 'highway') {
      if (g.fault) {
        g = drive(g, { ...ship.station, act: { type: 'repair' } })
        while (cursor(g) < rules.targetStart && g.repairTicks !== null) g = tick(g)
        g = command(g, { type: 'stop' })
      } else if (g.breach) {
        g = drive(g, { ...breachSites[g.breach.site], act: { type: 'patch' } })
        for (const dir of g.breach!.seq) g = command(g, { type: 'rivet', dir })
      } else g = tick(g)
    }
    expect(g.phase).toBe('prep')
    expect(g.echo).toBeNull()
    expect(g.fault).toBe(false)
    expect(g.breach).toBeNull()
    expect(g.hull).toBeLessThan(rules.hull)
    expect(cargoStatus(g, 'relays')).toMatch(/COVERED/)
    g = freight(g)
    expect(currentRoom(g)).toBe('freight')
    expect(briefing(g)).toMatchObject({ suspicion: 1, depth: 'surface', found: [] })
    g = allow(g)
    expect(g.outcome).toBe('delivered')
    expect(ledger(g)).toMatchObject({ earnings: { drums: 20, bales: 15, relays: 40, cask: 90 }, penalty: 0, duty: 0 })
    expect(command(g, { type: 'restart' })).toEqual(initial(7402))
  })
})

describe('evidence and recovery', () => {
  it('uses a physical citation to keep the rear rack closed despite a missing declaration', () => {
    let g: Game = readyForBoard()
    g = drive(g, { ...slots.berth, act: { type: 'pick', id: 'bales' } })
    g = command(g, { type: 'drop' })
    g = drive(g, rooms.airlock.post)
    g = freight(g)
    expect(briefing(g)).toMatchObject({ suspicion: 2, depth: 'rack', found: ['relays'] })
    expect(command(g, { type: 'pick', id: 'bales' })).toBe(g)
    g = command(g, { type: 'hold', response: { kind: 'cite' } })
    expect(command(g, { type: 'respond' })).toBe(g)
    expect(command(g, { type: 'hold', response: { kind: 'surrender', id: 'relays' } })).toBe(g)
    g = drive(g, { ...responsePoint(g)!, act: { type: 'respond' } })
    expect(briefing(g)).toMatchObject({ suspicion: 1, depth: 'surface' })
    expect(g.note).toMatch(/accepted/)
    g = review(g)
    expect(g.outcome).toBe('delivered')
    expect(ledger(g).earnings.relays).toBe(cargo.relays.value)
  })

  it('opens behind the wrong cover, assesses one duty fine for discovery, and still delivers', () => {
    let g: Game = readyForBoard()
    // Swap the two declared items. The manifest count is credible but the thermal return is not.
    g = { ...g, items: { ...g.items, drums: { ...g.items.drums, location: { kind: 'slot', slot: 'berth' } }, bales: { ...g.items.bales, location: { kind: 'slot', slot: 'front' } } } }
    expect(cargoStatus(g, 'relays')).toBe('UNEXPLAINED HEAT')
    g = freight(g)
    expect(briefing(g)).toMatchObject({ suspicion: 2, depth: 'rack', found: ['relays'] })
    g = allow(g)
    expect(g.outcome).toBe('delivered')
    expect(g.items.relays.location.kind).toBe('confiscated')
    expect(ledger(g)).toMatchObject({ duty: rules.dutyFine, earnings: { relays: 0, cask: 90 } })
  })

  it('recovers by surrendering exposed freight without a fine', () => {
    let g = freight({ ...readyForBoard(), items: launch().items })
    expect(briefing(g).found).toContain('relays')
    expect(command(g, { type: 'hold', response: { kind: 'surrender', id: 'drums' } })).toBe(g)
    g = command(g, { type: 'hold', response: { kind: 'surrender', id: 'relays' } })
    g = drive(g, { ...responsePoint(g)!, act: { type: 'respond' } })
    g = review(g)
    expect(g.outcome).toBe('delivered')
    expect(g.items.relays.location.kind).toBe('surrendered')
    expect(ledger(g)).toMatchObject({ duty: 0, earnings: { relays: 0, cask: 90 } })
  })

  it('lets the hold expire into a deterministic search and charges discovery once', () => {
    let g = freight({ ...readyForBoard(), items: launch().items })
    g = command(g, { type: 'hold', response: { kind: 'surrender', id: 'relays' } })
    g = advance(g, rules.holdSeconds * rules.hz)
    expect(g.inspection?.stage).toBe('scan')
    expect(command(g, { type: 'respond' })).toBe(g)
    expect(review(g).items.relays.location.kind).toBe('confiscated')
    expect(ledger(review(g)).duty).toBe(rules.dutyFine)
  })

  it('follows a recorded echo to the cradle and impounds forbidden freight', () => {
    let g = freight({ ...readyForBoard(), echo: 'containment' })
    g = allow(g)
    expect(currentRoom(g)).toBe('containment')
    expect(briefing(g).evidence.map((e) => e.text)).toContain('Residual echo answered before the scanner')
    expect(briefing(g).found).toEqual(['cask'])
    g = allow(g)
    expect(g.outcome).toBe('arrest')
    expect(ledger(g)).toMatchObject({ penalty: rules.impoundFee, earnings: { cask: 0, relays: 0 } })
  })

  it('keeps the echo after surrendering the cask and clears the empty fixture', () => {
    let g = allow(freight({ ...readyForBoard(), echo: 'containment' }))
    g = command(g, { type: 'hold', response: { kind: 'surrender', id: 'cask' } })
    g = drive(g, { ...responsePoint(g)!, act: { type: 'respond' } })
    expect(briefing(g).suspicion).toBe(3)
    expect(g.echo).toBe('containment')
    g = review(g)
    expect(g.outcome).toBe('delivered')
    expect(ledger(g).earnings.cask).toBe(0)
  })

  it('checks loose cargo in a utility room and pins held freight at boarding', () => {
    let g: Game = readyForBoard()
    g = drive(g, { ...slots.cradle, act: { type: 'pick', id: 'cask' } })
    g = drive(g, rooms.engineering.post)
    g = depart(g)
    expect(g.inspection?.route).toContain('engineering')
    expect(position(g, 'cask')).toEqual({ kind: 'loose', ...g.player })
    g = drive(g, rooms.airlock.post)
    g = allow(allow(g))
    expect(currentRoom(g)).toBe('engineering')
    expect(briefing(g).found).toEqual(['cask'])
  })
})

it('turns an unsupported citation into a containment audit even without an echo', () => {
  let g: Game = readyForBoard()
  g = { ...g, items: { ...g.items, drums: { ...g.items.drums, location: { kind: 'slot', slot: 'berth' } }, bales: { ...g.items.bales, location: { kind: 'slot', slot: 'front' } } } }
  g = freight(g)
  g = command(g, { type: 'hold', response: { kind: 'cite' } })
  g = drive(g, { ...responsePoint(g)!, act: { type: 'respond' } })
  expect(g.note).toMatch(/rejected/)
  expect(briefing(g).suspicion).toBe(3)
  g = review(g)
  expect(currentRoom(g)).toBe('containment')
  expect(g.items.relays.location.kind).toBe('confiscated')
  expect(g.echo).toBeNull()
  expect(allow(g).outcome).toBe('arrest')
})
