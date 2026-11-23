import { breachSites, cargo, ship, slots, type Point } from '../game/content'
import { responsePoint } from '../game/customs'
import { contextActions, position, type Command, type Game } from '../game/simulation'

export interface Action {
  cmd: Command
  verb: string
  noun: string
  at: Point
}

function describe(g: Game, cmd: Command): Action | undefined {
  if (cmd.type === 'respond') {
    const at = responsePoint(g)
    return at && { cmd, verb: 'File', noun: 'Customs response', at }
  }
  if (cmd.type === 'stow')
    return { cmd, verb: 'Stow', noun: slots[cmd.slot].name, at: slots[cmd.slot] }
  if (cmd.type === 'repair') return { cmd, verb: 'Repair', noun: 'Power console', at: ship.station }
  if (cmd.type === 'patch' && g.breach)
    return { cmd, verb: 'Patch', noun: breachSites[g.breach.site].name, at: breachSites[g.breach.site] }
  if (cmd.type === 'pick') {
    const at = position(g, cmd.id)
    return at && { cmd, verb: g.items[cmd.id].location.kind === 'slot' ? 'Take' : 'Grab', noun: cargo[cmd.id].name, at }
  }
}

/** Every available context action, nearest first. */
export function actions(g: Game): Action[] {
  return contextActions(g)
    .map((a) => describe(g, a.cmd))
    .filter((a): a is Action => !!a)
    .sort((a, b) => Math.abs(a.at.x - g.player.x) - Math.abs(b.at.x - g.player.x))
}

export const nearest = (g: Game) => actions(g)[0]
