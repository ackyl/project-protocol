// Art-space layout for the Mule-07 cutaway. Game rules use ship units on the
// x axis and a discrete floor; the renderer maps them into a larger pixel-art
// world where decks are tall enough to read characters, cargo and machinery.
import { ship, slots, type Floor } from '../game/content'

/** Art pixels per horizontal ship unit. */
export const SX = 1.25
/** Art x of the inner aft bulkhead (ship unit 81). */
export const AX0 = 132
export const ax = (gx: number) => AX0 + (gx - 81) * SX
export const gx = (x: number) => (x - AX0) / SX + 81

/** Floor surface (where feet stand) per deck. */
export const floorY: Record<Floor, number> = { 0: 196, 1: 124 }
export const DECK_H = 58
export const ceilY = (f: Floor) => floorY[f] - DECK_H

export const INNER_L = Math.round(ax(81)) // 132
export const INNER_R = Math.round(ax(396)) // 526
/** Bay dividers (structural ribs, walkable doorways). */
export const RIBS = [262, 396]
export const LADDER_X = Math.round(ax(ship.ladder))
export const CONSOLE_X = Math.round(ax(ship.station.x))
export const slotX = (id: keyof typeof slots) => Math.round(ax(slots[id].x))
/** Customs airlock on the lower deck at the bow bulkhead. */
export const AIRLOCK_X = INNER_R - 10

/** Region the camera keeps in view. */
export const BOUNDS = { x: 4, y: 26, w: 648, h: 222 }
/** Portrait framing: every deck, station and slot, with the exterior bow and stern cropped. */
export const BOUNDS_TIGHT = { x: 116, y: 40, w: 424, h: 196 }
