import { steer, type Target } from '../app/autopilot'
import { rules } from '../game/content'
import { command, initial, tick, type Game } from '../game/simulation'

export const launch = (seed?: number) => command(initial(seed), { type: 'accept' })
export function advance(g: Game, ticks: number) {
  for (let i = 0; i < ticks; i++) g = tick(g)
  return g
}
export function drive(g: Game, target: Target) {
  for (let i = 0; i < rules.hz * 10; i++) {
    const step = steer(g, target)
    if (step.cmd) g = command(g, step.cmd)
    if (step.done) return g
    g = tick(g, step.dir)
  }
  throw Error('Courier did not reach the target')
}
export function review(g: Game) {
  for (let i = 0; i < rules.hz * 10; i++) {
    if (g.phase !== 'search' || g.inspection?.stage === 'review') return g
    g = tick(g)
  }
  throw Error('Inspector did not reach the next stop')
}
export const allow = (g: Game) => review(command(g, { type: 'inspect' }))
