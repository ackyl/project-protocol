import { describe, expect, it } from 'vitest'
import { breachSites, director, rules, ship, siteIds, slots } from '../game/content'
import { caskSealed, cursor } from '../game/simulation'
import { advance, drive, launch } from './drive'
import { nextSeed, plan } from '../game/hazards'
import { command, initial, tick, type Game } from '../game/simulation'

const hz = rules.hz
const accept = launch
const run = advance
const scenario = (schedule: Game['schedule']): Game => ({ ...accept(), schedule })

describe('hazard director', () => {
  it('is deterministic per seed and varies between seeds', () => {
    expect(plan(1234)).toEqual(plan(1234))
    const distinct = new Set(Array.from({ length: 40 }, (_, i) => JSON.stringify(plan(i + 1))))
    expect(distinct.size).toBeGreaterThan(30)
  })

  it('keeps every schedule fair across many seeds', () => {
    let overlaps = 0,
      impactFirst = 0
    const sites = new Set<string>()
    for (let seed = 1; seed <= 2000; seed++) {
      const h = plan(seed)
      expect(h).toHaveLength(2)
      const surge = h.find((x) => x.kind === 'surge')!.at / hz
      const imp = h.find((x) => x.kind === 'impact')!
      const impact = imp.at / hz
      expect(surge).toBeGreaterThanOrEqual(director.surge[0])
      expect(surge).toBeLessThanOrEqual(director.surge[1])
      expect(impact).toBeGreaterThanOrEqual(director.impactWindow[0])
      expect(impact).toBeLessThanOrEqual(director.impactWindow[1])
      const gap = impact - surge
      const overlap = gap >= director.overlapGap[0] && gap <= director.overlapGap[1]
      expect(overlap || Math.abs(gap) >= director.minGap).toBe(true)
      if (overlap) overlaps++
      if (gap < 0) impactFirst++
      expect(imp.seq).toHaveLength(rules.patchLength)
      sites.add(imp.site!)
    }
    expect(overlaps / 2000).toBeGreaterThan(0.25)
    expect(overlaps / 2000).toBeLessThan(0.45)
    expect(impactFirst).toBeGreaterThan(100)
    expect([...sites].sort()).toEqual([...siteIds].sort())
  })

  it('fires both scheduled hazards during an ordinary run', () => {
    let g = accept()
    let faulted = false,
      breached = false
    while (g.phase === 'highway') {
      g = tick(g)
      faulted ||= g.fault
      breached ||= !!g.breach
    }
    expect(faulted).toBe(true)
    expect(breached).toBe(true)
  })

  it('restart replays the same route; a new run moves to the next seed', () => {
    const done = { ...accept(), phase: 'result' as const, outcome: 'delivered' as const }
    expect(command(done, { type: 'restart' })).toEqual(initial())
    const next = command(done, { type: 'newRun' })
    expect(next.seed).toBe(nextSeed(rules.seed))
    expect(next.schedule).toEqual(plan(nextSeed(rules.seed)))
    expect(command(accept(), { type: 'newRun' }).phase).toBe('highway')
  })
})

describe('hull breach', () => {
  const site = breachSites.keel
  const seq = ['up', 'left', 'left', 'down'] as const
  const breached = () => run(scenario([{ kind: 'impact', at: 30, site: 'keel', seq: [...seq] }]), 30)

  it('opens on impact and bleeds hull every second until sealed', () => {
    const g = breached()
    expect(g.breach?.site).toBe('keel')
    expect(g.hull).toBe(rules.hull - rules.impactDamage)
    expect(run(g, 3 * hz).hull).toBe(rules.hull - rules.impactDamage - 3 * rules.breachDamagePerSecond)
  })

  it('only opens the patch next to the breach with empty hands', () => {
    let g = breached()
    expect(command(g, { type: 'patch' })).toBe(g)
    g = { ...g, player: { ...site } }
    const open = command(g, { type: 'patch' })
    expect(open.patch).toBe(0)
    expect(tick(open, 1).player).toEqual(open.player)
    expect(command(open, { type: 'climb', to: 1 })).toBe(open)
    const holding: Game = { ...g, items: { ...g.items, relays: { ...g.items.relays, location: { kind: 'held' } } } }
    expect(command(holding, { type: 'patch' })).toBe(holding)
  })

  it('punishes a wrong rivet, then seals on the full sequence', () => {
    let g = command({ ...breached(), player: { ...site } }, { type: 'patch' })
    g = command(g, { type: 'rivet', dir: 'up' })
    expect(g.patch).toBe(1)
    const hull = g.hull
    g = command(g, { type: 'rivet', dir: 'right' })
    expect(g.patch).toBe(0)
    expect(g.hull).toBe(hull - rules.slipDamage)
    expect(g.breach).not.toBeNull()
    for (const dir of seq) g = command(g, { type: 'rivet', dir })
    expect(g.breach).toBeNull()
    expect(g.patch).toBeNull()
    expect(run(g, 3 * hz).hull).toBe(g.hull)
  })

  it('leaves the breach open when the courier walks away, and stops bleeding at the checkpoint', () => {
    let g = command({ ...breached(), player: { ...site } }, { type: 'patch' })
    g = command(g, { type: 'leave' })
    expect(g.patch).toBeNull()
    expect(g.breach).not.toBeNull()
    while (g.phase === 'highway') g = tick(g)
    const hull = g.hull
    expect(g.phase).toBe('prep')
    expect(run(g, 5 * hz).hull).toBe(hull)
  })

  it('stacks with a power fault when the director overlaps them', () => {
    let g = scenario([
      { kind: 'surge', at: 30 },
      { kind: 'impact', at: 60, site: 'bow', seq: ['up', 'up', 'up', 'up'] },
    ])
    g = run(g, 60)
    expect(g.fault).toBe(true)
    expect(g.breach?.site).toBe('bow')
    const before = g.hull
    expect(run(g, 2 * hz).hull).toBe(before - 2 * (rules.surgeDamagePerSecond + rules.breachDamagePerSecond))
  })
})

describe('containment', () => {
  const faultAt = (at: number) => scenario([{ kind: 'surge', at }])

  it('records an echo after four continuous seconds and keeps it through a console repair', () => {
    let g = drive(faultAt(5 * hz), ship.station)
    while (!g.fault) g = tick(g)
    expect(caskSealed(g)).toBe(false)
    g = run(g, rules.echoSeconds * hz - 2)
    expect(g.echo).toBeNull()
    g = tick(g)
    expect(g.echo).toBe('containment')
    expect(g.items.cask.location).toEqual({ kind: 'slot', slot: 'cradle' })
    g = command(g, { type: 'repair' })
    while (cursor(g) < rules.targetStart) g = tick(g)
    g = command(g, { type: 'stop' })
    expect(caskSealed(g)).toBe(true)
    expect(g.echo).toBe('containment')
  })

  it('resets exposure on resealing and records the room where an uncontained cask is carried', () => {
    let g = drive(scenario([]), { ...slots.cradle, act: { type: 'pick', id: 'cask' } })
    g = run(g, hz)
    g = command(g, { type: 'stow', slot: 'cradle' })
    g = tick(g)
    expect(g.exposedTicks).toBe(0)
    g = command(g, { type: 'pick', id: 'cask' })
    g = drive(g, { x: ship.ladder - 8, floor: 0 })
    g = run(g, rules.echoSeconds * hz)
    expect(g.echo).toBe('freight')
  })

  it('kills the courier when both emergencies are neglected', () => {
    const dead = run(scenario([
      { kind: 'surge', at: 30 },
      { kind: 'impact', at: 60, site: 'keel', seq: ['up', 'up', 'up', 'up'] },
    ]), rules.highway * hz)
    expect(dead.hull).toBe(0)
    expect(dead.outcome).toBe('death')
    expect(tick(dead)).toBe(dead)
  })
})

describe('training run hooks', () => {
  const training = () => command(initial(), { type: 'accept', training: true })

  it('holds the clock and keeps the drafted cask sealed', () => {
    const g = run(training(), 10 * hz)
    expect(g.schedule).toEqual([])
    expect(g.elapsed).toBe(0)
    expect(g.ticks).toBe(10 * hz)
    expect(caskSealed(g)).toBe(true)
    expect(g.echo).toBeNull()
    expect(g.fault).toBe(false)
  })

  it('triggers drills on demand and releases the clock near the gate', () => {
    let g = command(training(), { type: 'trigger', hazard: 'surge' })
    expect(g.fault).toBe(true)
    g = command(g, { type: 'trigger', hazard: 'impact' })
    expect(g.breach).not.toBeNull()
    expect(run(g, hz).hull).toBe(rules.hull - rules.impactDamage - rules.surgeDamagePerSecond - rules.breachDamagePerSecond)
    g = command(g, { type: 'train', clock: false, remaining: rules.trainingRemaining })
    expect(g.training).toEqual({ clock: false })
    expect(g.elapsed).toBe((rules.highway - rules.trainingRemaining) * hz)
    g = run(g, rules.trainingRemaining * hz)
    expect(g.phase).toBe('prep')
    expect(g.training).toBeNull()
  })

  it('ignores training commands outside a training run', () => {
    const g = accept()
    expect(command(g, { type: 'trigger', hazard: 'surge' })).toBe(g)
    expect(command(g, { type: 'train', clock: false, remaining: 1 })).toBe(g)
  })
})
