// Seeded highway hazard director. Pure: the same seed always yields the same
// schedule, and the schedule lives in the game state so replays are exact.
import { director, dirs, rules, siteIds, type Dir, type SiteId } from './content'

export interface Hazard {
  kind: 'surge' | 'impact'
  /** Highway tick at which the hazard fires. */
  at: number
  site?: SiteId
  seq?: Dir[]
}

/** Small deterministic generator, independent of the customs RNG. */
export function stream(seed: number) {
  let s = (seed ^ 0x5bd1e995) >>> 0
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0
    return s / 4294967296
  }
}
const between = (rand: () => number, [lo, hi]: readonly [number, number]) =>
  lo + Math.floor(rand() * (hi - lo + 1))

export function patchSequence(rand: () => number): Dir[] {
  return Array.from({ length: rules.patchLength }, () => dirs[Math.floor(rand() * dirs.length)])
}

export function plan(seed: number): Hazard[] {
  const rand = stream(seed)
  const surge = between(rand, director.surge)
  const [lo, hi] = director.impactWindow
  let impact: number
  if (rand() < director.overlapChance) impact = surge + between(rand, director.overlapGap)
  else {
    const before = surge - director.minGap >= lo
    const after = surge + director.minGap <= hi
    const early = before && (!after || rand() < 0.5)
    impact = early
      ? between(rand, [lo, surge - director.minGap])
      : between(rand, [surge + director.minGap, hi])
  }
  const site = siteIds[Math.floor(rand() * siteIds.length)]
  const hazards: Hazard[] = [
    { kind: 'surge', at: surge * rules.hz },
    { kind: 'impact', at: impact * rules.hz, site, seq: patchSequence(rand) },
  ]
  return hazards.sort((a, b) => a.at - b.at)
}

/** Seed for the next contract after this one. */
export const nextSeed = (seed: number) => (Math.imul(seed >>> 0, 1103515245) + 12345) >>> 0 || 1
