// Click/tap-to-move: walks the courier to a target (via the ladder when needed)
// and optionally issues one command on arrival. Pure: the game still validates
// every command it produces.
import { rules, ship, type Floor } from '../game/content'
import { canClimb, mobile, type Command, type Direction, type Game } from '../game/simulation'

export interface Target {
  x: number
  floor: Floor
  act?: Command
}
export interface Steer {
  dir: Direction
  cmd?: Command
  done: boolean
}

const step = rules.speed / rules.hz
const sign = (n: number): Direction => (n > 0 ? 1 : n < 0 ? -1 : 0)

export function steer(g: Game, t: Target): Steer {
  if (!mobile(g) || g.repairTicks !== null) return { dir: 0, done: true }
  if (g.climb) return { dir: 0, done: false }
  if (g.player.floor !== t.floor) {
    const dx = ship.ladder - g.player.x
    // Line up with the rungs first so the climb starts without a visible snap.
    if (Math.abs(dx) > step) return { dir: sign(dx), done: false }
    return canClimb(g, t.floor)
      ? { dir: 0, cmd: { type: 'climb', to: t.floor }, done: false }
      : { dir: 0, done: true }
  }
  const tolerance = t.act ? rules.reach - 3 : step / 2
  const x = Math.min(ship.max, Math.max(ship.min, t.x))
  const dx = x - g.player.x
  if (Math.abs(dx) <= tolerance) return { dir: 0, cmd: t.act, done: true }
  return { dir: sign(dx), done: false }
}
