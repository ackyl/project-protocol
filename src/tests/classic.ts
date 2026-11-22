// The original one-surge, two-cargo scenario, pinned explicitly so the first
// slice's rules stay covered now that runs carry a seeded schedule and a
// third cargo item.
import { rules } from '../game/content'
import type { Game } from '../game/simulation'

export const SURGE = 35 * rules.hz

export function classic(g: Game): Game {
  return {
    ...g,
    schedule: [{ kind: 'surge', at: SURGE }],
    items: { ...g.items, specimen: { ...g.items.specimen, location: { kind: 'surrendered' } } },
  }
}
