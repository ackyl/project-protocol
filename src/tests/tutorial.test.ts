import { describe, expect, it } from 'vitest'
import { Runner } from '../app/runner'
import { Tutorial, steps } from '../app/tutorial'
import { breachSites, rules, ship, slots } from '../game/content'
import { cursor, position, type Command, type Game } from '../game/simulation'

/** Drive the real runner and tutorial controller with synthetic frame times. */
function rig() {
  const runner = new Runner(4242)
  const tut = new Tutorial(runner)
  let now = performance.now() + 10_000
  const frames = (n: number, ms = 1000 / 30) => {
    for (let i = 0; i < n; i++) runner.frame((now += ms))
  }
  const go = (x: number, floor: 0 | 1, act?: Command) => {
    runner.goTo({ x, floor, act })
    for (let i = 0; i < 400 && runner.target; i++) frames(1)
  }
  const panel = () => tut.state.panel?.id ?? null
  return { runner, tut, frames, go, panel, g: () => runner.game as Game }
}

describe('guided first delivery', () => {
  it('pauses the simulation while a panel is open and resumes on dismiss', () => {
    const { runner, tut, frames, panel, g } = rig()
    tut.start()
    frames(1)
    expect(panel()).toBe('welcome')
    expect(runner.paused).toBe(true)
    const before = g()
    frames(60)
    expect(g().ticks).toBe(before.ticks)
    tut.dismiss()
    expect(runner.paused).toBe(false)
    expect(tut.state.objective).toMatch(/upper deck/)
    frames(30)
    expect(g().ticks).toBeGreaterThan(before.ticks)
    // The training clock holds until both drills are complete.
    expect(g().elapsed).toBe(0)
    expect(g().exposedTicks).toBe(0)
  })

  it('teaches every system in order through real play, then settles and remembers', () => {
    const { runner, tut, frames, go, panel, g } = rig()
    tut.start()
    frames(1)
    const seen: string[] = []
    const next = () => {
      frames(2)
      const id = panel()
      if (id) seen.push(id)
      tut.dismiss()
      return id
    }
    expect(next()).toBe('welcome')
    go(ship.ladder, 1)
    expect(next()).toBe('relays')
    go(position(g(), 'relays')!.x, 0, { type: 'pick', id: 'relays' })
    go(slots.rear.x, 0, { type: 'stow', slot: 'rear' })
    expect(next()).toBe('cover')
    go(position(g(), 'drums')!.x, 0, { type: 'pick', id: 'drums' })
    go(slots.front.x, 0, { type: 'stow', slot: 'front' })
    expect(next()).toBe('surge')
    expect(g().fault).toBe(true)
    go(ship.station.x, 1, { type: 'repair' })
    expect(g().repairTicks).not.toBeNull()
    for (let i = 0; i < 200 && g().fault; i++) {
      const c = cursor(g())
      if (c >= 0.45 && c <= 0.6) runner.send({ type: 'stop' })
      else frames(1)
    }
    expect(g().fault).toBe(false)
    expect(g().echo).toBeNull()
    expect(next()).toBe('breach')
    const breach = g().breach!
    expect(breach).not.toBeNull()
    go(breachSites[breach.site].x, breachSites[breach.site].floor, { type: 'patch' })
    for (const dir of breach.seq) runner.send({ type: 'rivet', dir })
    expect(g().breach).toBeNull()
    frames(2)
    expect(g().training?.clock).toBe(false)
    expect(g().elapsed).toBeGreaterThanOrEqual((rules.highway - rules.trainingRemaining) * rules.hz)
    frames(rules.trainingRemaining * 30 + 10)
    expect(g().phase).toBe('prep')
    expect(next()).toBe('prep')
    frames(rules.prep * 30 + 10)
    expect(g().phase).toBe('search')
    expect(next()).toBe('search')
    for (let i = 0; i < 400 && g().phase === 'search'; i++) {
      runner.send({ type: 'inspect' })
      frames(40)
    }
    expect(g().outcome).toBe('delivered')
    frames(90)
    expect(next()).toBe('payday')
    expect(tut.state.active).toBe(false)
    expect(seen).toEqual(steps.filter((s) => !s.silent).map((s) => s.id))
  })

  it('skips a lesson the player already demonstrated', () => {
    const { tut, frames, go, panel, g } = rig()
    tut.start()
    frames(1)
    tut.dismiss()
    go(ship.ladder, 1)
    frames(2)
    expect(panel()).toBe('relays')
    tut.dismiss()
    go(position(g(), 'drums')!.x, 0, { type: 'pick', id: 'drums' })
    go(slots.front.x, 0, { type: 'stow', slot: 'front' })
    go(position(g(), 'relays')!.x, 0, { type: 'pick', id: 'relays' })
    go(slots.rear.x, 0, { type: 'stow', slot: 'rear' })
    frames(4)
    expect(panel()).toBe('surge')
    expect(g().items.drums.location).toEqual({ kind: 'slot', slot: 'front' })
  })

  it('skipping leaves training and opens a fresh contract', () => {
    const { runner, tut, frames, g } = rig()
    tut.start()
    frames(1)
    const seed = g().seed
    tut.skip()
    expect(tut.state.active).toBe(false)
    expect(runner.paused).toBe(false)
    expect(g().phase).toBe('contract')
    expect(g().seed).not.toBe(seed)
    expect(g().training).toBeNull()
  })

  it('jumps to the payday lesson if the training run ends badly', () => {
    const { runner, tut, frames, panel, g } = rig()
    tut.start()
    frames(1)
    tut.dismiss()
    runner.send({ type: 'trigger', hazard: 'surge' })
    runner.send({ type: 'trigger', hazard: 'impact' })
    frames(80 * 30)
    expect(g().outcome).toBe('death')
    frames(100)
    expect(panel()).toBe('payday')
  })
})
