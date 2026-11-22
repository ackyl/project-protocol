import { describe, expect, it } from 'vitest'
import {
  cargo,
  rules,
  searchStops,
  ship,
  slots,
  type Floor,
} from '../game/content'
import { atStop, detection, ledger } from '../game/customs'
import { classic, SURGE } from './classic'
import {
  command,
  initial,
  tick,
  type Command,
  type Direction,
  type Game,
} from '../game/simulation'

function flight(seed: number = rules.seed) {
  let g = classic(initial(seed))
  const log: (Command | Direction)[] = []
  const send = (cmd: Command) => {
    log.push(cmd)
    g = command(g, cmd)
  }
  const step = (dir: Direction = 0) => {
    log.push(dir)
    g = tick(g, dir)
  }
  const walk = (x: number) => {
    for (let i = 0; Math.abs(x - g.player.x) > 2 && i < 150; i++)
      step(x > g.player.x ? 1 : -1)
    expect(Math.abs(x - g.player.x)).toBeLessThanOrEqual(2)
  }
  const climb = (to: Floor) => {
    walk(ship.ladder)
    send({ type: 'climb', to })
    for (let i = 0; i < rules.climbTicks; i++) step()
  }
  const until = (t: number) => {
    while (g.elapsed < t && g.phase === 'highway') step()
  }
  send({ type: 'accept' })
  walk(cargo.cell.start.x)
  send({ type: 'pick', id: 'cell' })
  walk(slots.aft.x)
  send({ type: 'stow', slot: 'aft' })
  climb(1)
  walk(cargo.crate.start.x)
  send({ type: 'pick', id: 'crate' })
  climb(0)
  walk(slots.vault.x)
  send({ type: 'stow', slot: 'vault' })
  walk(slots.aft.x)
  until(SURGE)
  send({ type: 'pick', id: 'cell' })
  send({ type: 'stow', slot: 'aft' })
  climb(1)
  walk(ship.station.x)
  send({ type: 'repair' })
  for (let i = 0; i < 14; i++) step()
  send({ type: 'stop' })
  until(rules.highway * rules.hz)
  return {
    get state() {
      return g
    },
    send,
    step,
    walk,
    climb,
    log,
  }
}
function boarding() {
  const run = flight()
  expect(run.state.phase).toBe('prep')
  for (let i = 0; i < rules.prep * rules.hz; i++) run.step()
  expect(run.state.phase).toBe('search')
  return run.state
}
function clear(g: Game) {
  while (g.phase === 'search') g = command(g, { type: 'inspect' })
  return g
}
describe('one-day delivery', () => {
  it('completes both clocks, clears all five searches in order and settles cargo and repairs', () => {
    const run = flight()
    expect(run.state.phase).toBe('prep')
    expect(run.state.elapsed).toBe(0)
    for (let i = 0; i < rules.prep * rules.hz - 1; i++) run.step()
    expect(run.state.phase).toBe('prep')
    run.step()
    for (let i = 0; i < searchStops.length; i++) {
      expect(run.state.phase).toBe('search')
      expect(run.state.stop).toBe(i)
      run.send({ type: 'inspect' })
    }
    const g = run.state,
      book = ledger(g)
    expect(g.outcome).toBe('delivered')
    expect(book.earnings).toEqual({ cell: 70, crate: 50, specimen: 0 })
    expect(book.repairs).toBeGreaterThan(0)
    expect(book.balance).toBe(160 - book.repairs)
    expect(command(g, { type: 'restart' })).toEqual(initial())
  })
  it('replays a fixed command and tick log exactly', () => {
    const run = flight(912)
    const replay = () =>
      run.log.reduce<Game>(
        (g, input) =>
          typeof input === 'number' ? tick(g, input) : command(g, input),
        classic(initial(912)),
      )
    expect(replay()).toEqual(run.state)
    expect(replay()).toEqual(replay())
  })
  it('permits cargo relocation in prep and freezes position during search', () => {
    const run = flight()
    run.walk(306)
    run.climb(0)
    run.walk(128)
    run.send({ type: 'pick', id: 'cell' })
    run.send({ type: 'drop' })
    while (run.state.phase === 'prep') run.step()
    const g = run.state
    expect(atStop(g, 'cell')).toBe(true)
    expect(detection(g, 'cell')).toBe(1)
    expect(tick(g, 1)).toBe(g)
    for (const cmd of [
      { type: 'pick', id: 'cell' },
      { type: 'climb', to: 1 },
      { type: 'restart' },
      { type: 'drop' },
    ] as const)
      expect(command(g, cmd)).toBe(g)
    const arrested = command(g, { type: 'inspect' })
    expect(arrested.outcome).toBe('arrest')
    expect(ledger(arrested).earnings).toEqual({ cell: 0, crate: 0, specimen: 0 })
    expect(ledger(arrested).penalty).toBe(rules.impoundFee)
  })
  it('skips exactly one location per paid bribe and refuses an unaffordable bribe', () => {
    const g = command(boarding(), { type: 'bribe' })
    expect(g.cash).toBe(15)
    expect(g.stop).toBe(1)
    expect(command(g, { type: 'bribe' })).toBe(g)
    const book = ledger(clear(g))
    expect(book.bribes).toBe(25)
    expect(book.balance).toBe(135 - book.repairs)
  })
  it('limits surrender to the current search and removes its income once', () => {
    let g = boarding()
    expect(command(g, { type: 'surrender', id: 'cell' })).toBe(g)
    g = command(command(g, { type: 'inspect' }), { type: 'inspect' })
    g = command(g, { type: 'surrender', id: 'cell' })
    expect(g.stop).toBe(2)
    expect(g.items.cell.location.kind).toBe('surrendered')
    expect(command(g, { type: 'surrender', id: 'cell' })).toBe(g)
    expect(ledger(clear(g)).earnings).toEqual({ cell: 0, crate: 50, specimen: 0 })
  })
  it('uses seeded signal detection in an ordinary rack, including both outcomes', () => {
    const base = boarding()
    const rack: Game = {
      ...base,
      stop: 3,
      items: {
        ...base.items,
        crate: {
          ...base.items.crate,
          location: { kind: 'slot', slot: 'upper' },
        },
      },
    }
    expect(detection(rack, 'crate')).toBe(rules.signalRackChance)
    const caught = command({ ...rack, rng: 1 }, { type: 'inspect' })
    expect(caught.outcome).toBe('arrest')
    expect(command({ ...rack, rng: 1 }, { type: 'inspect' })).toEqual(caught)
    expect(command({ ...rack, rng: 1500 }, { type: 'inspect' }).stop).toBe(4)
    expect(detection({ ...base, stop: 4 }, 'crate')).toBe(0)
  })
  it('attributes held items to the courier deck and resolves only one item per surrender', () => {
    const base = boarding()
    const g: Game = {
      ...base,
      stop: 1,
      player: ship.station,
      items: {
        ...base.items,
        cell: { ...base.items.cell, location: { kind: 'held' } },
        crate: {
          ...base.items.crate,
          location: { kind: 'loose', ...ship.station },
        },
      },
    }
    expect(atStop(g, 'cell')).toBe(true)
    const next = command(g, { type: 'surrender', id: 'cell' })
    expect(detection(next, 'crate')).toBe(1)
    expect(command(next, { type: 'inspect' }).outcome).toBe('arrest')
    expect(command(next, { type: 'bribe' }).stop).toBe(2)
  })
  it('books vented cargo at condition-adjusted value, flags a shortfall on a surviving run', () => {
    const base = boarding()
    const damaged: Game = {
      ...base,
      hull: 18,
      items: { ...base.items, cell: { ...base.items.cell, condition: 60 } },
    }
    const g = clear(damaged),
      book = ledger(g)
    expect(g.outcome).toBe('delivered')
    expect(book.earnings.cell).toBe(42)
    expect(book.balance).toBe(50)
    expect(book.shortfall).toBe(10)
  })
  it('settles death with a wreck charge and resets the original seed and all state', () => {
    let g = command(initial(42), { type: 'accept' })
    while (g.phase === 'highway') g = tick(g)
    expect(g.outcome).toBe('death')
    expect(ledger(g).balance).toBe(-60)
    expect(command(g, { type: 'restart' })).toEqual(initial(42))
  })
})
