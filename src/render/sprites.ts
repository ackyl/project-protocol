import type { CargoId } from '../game/content'
import { disc, glow, pal, r, type Ctx } from './pixel'

export type Pose = 'idle' | 'walk' | 'climb' | 'work' | 'frozen'

export interface CourierLook {
  x: number
  y: number
  face: 1 | -1
  pose: Pose
  /** Walk phase in steps (distance-driven). */
  step: number
  t: number
  carrying: boolean
  panic: boolean
}

/** The courier: orange patched pressure suit, oversized bubble helmet. */
export function courier(c: Ctx, k: CourierLook) {
  c.save()
  c.translate(Math.round(k.x), Math.round(k.y))
  if (k.face < 0) c.scale(-1, 1)
  const frame = Math.floor(k.step) % 4
  const bob = k.pose === 'walk' ? (frame % 2 ? -1 : 0) : k.pose === 'idle' ? (Math.floor(k.t * 2) % 2 ? 0 : 0) : 0
  // Shadow
  r(c, 'rgba(0,0,0,0.35)', -7, -1, 14, 2)
  if (k.pose === 'climb') {
    climbing(c, k)
    c.restore()
    return
  }
  // Legs
  const legA = k.pose === 'walk' ? [0, 2, 0, -2][frame] : 0
  const leg = (x: number, dx: number, col: string) => {
    r(c, pal.ink, x + dx - 1, -7, 5, 7)
    r(c, col, x + dx, -7, 3, 5)
    r(c, '#2a2638', x + dx - 1 + (dx > 0 ? 1 : 0), -2, 5, 2)
  }
  leg(-4, -legA, '#36324a')
  leg(1, legA, '#4a4562')
  c.translate(0, bob)
  // Backpack
  r(c, pal.ink, -9, -18, 5, 11)
  r(c, '#6d6c85', -8, -17, 3, 9)
  r(c, Math.floor(k.t * 2) % 2 ? '#ff6a3a' : '#7a2a1a', -8, -16, 2, 1)
  // Torso
  r(c, pal.ink, -5, -18, 11, 12)
  r(c, '#f0893c', -4, -17, 9, 10)
  r(c, '#ffb468', -4, -17, 9, 1)
  r(c, '#b9562b', -4, -10, 9, 2)
  r(c, '#3a3346', -4, -14, 9, 1)
  r(c, '#d8d0e0', 2, -13, 2, 2) // badge
  // Arms
  if (k.carrying) {
    r(c, pal.ink, -5, -30, 3, 14)
    r(c, pal.ink, 3, -30, 3, 14)
    r(c, '#d9742f', -4, -29, 1, 12)
    r(c, '#d9742f', 4, -29, 1, 12)
  } else if (k.pose === 'work') {
    const reach = Math.floor(k.t * 8) % 2
    r(c, pal.ink, 3, -16, 7 + reach, 3)
    r(c, '#d9742f', 4, -15, 5 + reach, 1)
  } else {
    const sw = k.pose === 'walk' ? [1, 0, -1, 0][frame] : 0
    r(c, pal.ink, -1 + sw, -17, 3, 9)
    r(c, '#d9742f', 0 + sw, -16, 1, 7)
  }
  // Helmet bubble with a face inside
  disc(c, pal.ink, 1, -24, 7)
  disc(c, '#8fd3e6', 1, -24, 6)
  r(c, '#5ba9c4', -4, -21, 11, 3)
  r(c, '#f4c7a1', -1, -27, 6, 6)
  r(c, '#5a3a2a', -1, -28, 6, 2)
  r(c, pal.ink, 3, -25, 1, 2)
  r(c, pal.ink, 1, -25, 1, 2)
  r(c, k.panic ? pal.ink : '#c0705a', 2, -22, k.panic ? 2 : 2, 1)
  if (k.panic && Math.floor(k.t * 3) % 2) r(c, '#9fe8ff', -2, -27, 1, 2)
  r(c, '#ffffff', -3, -28, 2, 2)
  r(c, '#d8f6ff', -4, -26, 1, 1)
  // Collar ring
  r(c, pal.ink, -4, -19, 10, 2)
  r(c, '#b8b2c8', -3, -19, 8, 1)
  c.restore()
}

function climbing(c: Ctx, k: CourierLook) {
  const f = Math.floor(k.step) % 2
  // Back view: legs, backpack, helmet back
  r(c, pal.ink, -5, -7 - f * 2, 4, 7)
  r(c, pal.ink, 1, -7 - (1 - f) * 2, 4, 7)
  r(c, '#36324a', -4, -6 - f * 2, 2, 5)
  r(c, '#36324a', 2, -6 - (1 - f) * 2, 2, 5)
  r(c, pal.ink, -6, -19, 12, 13)
  r(c, '#d9742f', -5, -18, 10, 11)
  r(c, pal.ink, -4, -18, 8, 9)
  r(c, '#6d6c85', -3, -17, 6, 7)
  // Arms up on rungs
  r(c, pal.ink, -7, -24 + f * 3, 3, 8)
  r(c, pal.ink, 4, -24 + (1 - f) * 3, 3, 8)
  disc(c, pal.ink, 0, -24, 7)
  disc(c, '#8fd3e6', 0, -24, 6)
  r(c, '#5a3a2a', -3, -27, 6, 5)
  r(c, '#ffffff', -4, -28, 2, 2)
  if (k.carrying) void 0
}

export interface OfficerLook {
  x: number
  y: number
  face: 1 | -1
  step: number
  walking: boolean
  scanning: boolean
  t: number
}

/** Cinder Gate customs officer: navy greatcoat, peaked cap, red goggles, scanner wand. */
export function officer(c: Ctx, k: OfficerLook) {
  c.save()
  c.translate(Math.round(k.x), Math.round(k.y))
  if (k.face < 0) c.scale(-1, 1)
  const frame = Math.floor(k.step) % 4
  const legA = k.walking ? [0, 2, 0, -2][frame] : 0
  r(c, 'rgba(0,0,0,0.35)', -8, -1, 16, 2)
  for (const [x, dx] of [[-4, -legA], [1, legA]]) {
    r(c, pal.ink, x + dx - 1, -8, 5, 8)
    r(c, '#1a1e34', x + dx, -8, 3, 6)
    r(c, '#0c0c14', x + dx - 1, -2, 5, 2)
  }
  // Greatcoat
  r(c, pal.ink, -7, -24, 14, 18)
  r(c, '#2a3566', -6, -23, 12, 16)
  r(c, '#3e4c8a', -6, -23, 12, 1)
  r(c, '#ffd25a', -1, -20, 1, 1)
  r(c, '#ffd25a', -1, -16, 1, 1)
  r(c, '#ffd25a', -1, -12, 1, 1)
  r(c, '#1c2244', -6, -10, 12, 3)
  r(c, '#c8a040', 2, -21, 3, 2) // badge
  // Arm + scanner wand
  r(c, pal.ink, 2, -20, 9, 3)
  r(c, '#2a3566', 3, -19, 7, 1)
  r(c, pal.ink, 10, -22, 6, 4)
  r(c, '#5a5f7a', 11, -21, 4, 2)
  r(c, k.scanning && Math.floor(k.t * 10) % 2 ? '#ffffff' : pal.red, 15, -21, 2, 2)
  // Head, goggles, cap
  r(c, pal.ink, -4, -32, 10, 9)
  r(c, '#c9a58a', -3, -31, 8, 7)
  r(c, pal.ink, -3, -29, 9, 3)
  r(c, '#ff4a5a', 0, -28, 5, 1)
  r(c, '#8a5a4a', -1, -25, 5, 1)
  r(c, pal.ink, -6, -35, 13, 4)
  r(c, '#1c2244', -5, -34, 11, 2)
  r(c, pal.ink, -3, -37, 9, 3)
  r(c, '#2a3566', -2, -36, 7, 2)
  r(c, '#ffd25a', 1, -36, 2, 1)
  r(c, pal.ink, 4, -32, 5, 2)
  c.restore()
  if (k.scanning) glow(c, k.x + k.face * 16, k.y - 20, 16, '#ff3a4a', 0.5)
}

// ── Cargo ────────────────────────────────────────────────────────────────
export function cargoSprite(c: Ctx, id: CargoId, x: number, y: number, live = false) {
  c.save()
  c.translate(Math.round(x), Math.round(y))
  switch (id) {
    case 'drums':
      for (const at of [-11, 0]) {
        r(c, '#1c1510', at, -18, 12, 18)
        r(c, '#936b42', at + 1, -17, 10, 16)
        r(c, '#d4ae73', at + 2, -16, 3, 14)
        for (const h of [-16, -5]) r(c, '#4f422d', at, h, 12, 2)
        r(c, '#eee0ac', at + 3, -12, 6, 4)
        r(c, '#5b3e29', at + 6, -11, 1, 2)
      }
      break
    case 'bales':
      r(c, '#262822', -12, -14, 24, 14)
      r(c, '#909686', -11, -13, 22, 12)
      r(c, '#c3c6ad', -10, -13, 20, 2)
      r(c, '#6d7566', -11, -7, 22, 1)
      for (const at of [-8, 5]) r(c, '#534e3f', at, -14, 3, 14)
      r(c, '#ece0bd', -3, -6, 7, 3)
      break
    case 'relays':
      r(c, '#101c1e', -12, -17, 24, 17)
      r(c, '#426a65', -11, -16, 22, 15)
      r(c, '#77958b', -10, -15, 20, 2)
      for (const at of [-8, -3, 2, 7]) r(c, '#253839', at, -12, 2, 7)
      r(c, '#d29f66', -9, -4, 4, 2)
      r(c, '#ab7d6b', 4, -4, 5, 2)
      break
    case 'cask':
      r(c, '#1b1720', -10, -27, 20, 27)
      r(c, '#44464d', -8, -25, 16, 24)
      r(c, '#777980', -7, -25, 4, 24)
      r(c, '#26252d', -6, -20, 13, 13)
      r(c, live ? '#ff9aca' : '#8c5373', -5, -15, 11, 1)
      r(c, live ? '#ffb3db' : '#ac688a', -1, -17, 3, 5)
      for (const h of [-25, -5]) r(c, '#9c9285', -9, h, 18, 2)
      r(c, '#e4c99c', 3, -9, 4, 5)
      break
  }
  c.restore()
}

/** An open hull breach on the back wall: torn plating with space showing through. */
export function breachHole(c: Ctx, x: number, floorY: number, t: number) {
  const cx = Math.round(x),
    cy = floorY - 30
  c.save()
  c.translate(cx, cy)
  // Torn edge
  const pts: [number, number][] = [[-9, -6], [-4, -11], [2, -9], [8, -12], [10, -3], [7, 5], [9, 10], [0, 8], [-6, 11], [-10, 4]]
  c.fillStyle = '#d0d8e8'
  c.beginPath()
  pts.forEach(([px, py], i) => (i ? c.lineTo(px * 1.25, py * 1.25) : c.moveTo(px * 1.25, py * 1.25)))
  c.closePath()
  c.fill()
  c.fillStyle = '#05030c'
  c.beginPath()
  pts.forEach(([px, py], i) => (i ? c.lineTo(px, py) : c.moveTo(px, py)))
  c.closePath()
  c.fill()
  // Stars through the hole
  r(c, '#ffffff', -3, -4, 1, 1)
  r(c, '#9ab0ff', 4, 2, 1, 1)
  // Frost rim flicker
  if (Math.floor(t * 6) % 2) r(c, '#bfe8ff', -10, 3, 2, 1)
  c.restore()
}

/** A welded patch plate left behind after a sealed breach. */
export function patchPlate(c: Ctx, x: number, floorY: number) {
  const cx = Math.round(x),
    cy = floorY - 30
  r(c, pal.ink, cx - 12, cy - 12, 24, 22)
  r(c, '#6a7088', cx - 11, cy - 11, 22, 20)
  r(c, '#8a90a8', cx - 11, cy - 11, 22, 1)
  for (const [dx, dy] of [[-8, -8], [7, -8], [-8, 6], [7, 6]]) r(c, '#c8ccd8', cx + dx, cy + dy, 2, 2)
  r(c, '#ff9a2a', cx - 11, cy + 8, 22, 1)
}
