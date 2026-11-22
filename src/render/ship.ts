// Mule-07: static structure (cached once) and animated machinery.
import { box, disc, glow, hash, hazardStripe, mix, pal, poly, r, type Ctx } from './pixel'
import {
  AIRLOCK_X,
  CONSOLE_X,
  INNER_L,
  INNER_R,
  LADDER_X,
  RIBS,
  ceilY,
  floorY,
  slotX,
} from './world'
import type { Floor } from '../game/content'

const U = floorY[1],
  L = floorY[0]

function nacelle(c: Ctx, cy: number) {
  // Pylon
  r(c, pal.ink, 100, cy - 8, 36, 16)
  r(c, pal.hull1, 100, cy - 6, 36, 12)
  for (let x = 102; x < 134; x += 6) r(c, pal.hull0, x, cy - 6, 2, 12)
  // Body
  poly(c, pal.ink, [[40, cy - 20], [108, cy - 22], [114, cy - 14], [114, cy + 14], [108, cy + 22], [40, cy + 20]])
  poly(c, pal.hull2, [[42, cy - 18], [107, cy - 20], [112, cy - 13], [112, cy + 13], [107, cy + 20], [42, cy + 18]])
  r(c, pal.hull3, 44, cy - 17, 62, 2)
  r(c, pal.hull1, 44, cy + 8, 66, 9)
  // Rust armor cowling with stencil stripe
  r(c, pal.ink, 60, cy - 18, 30, 36)
  r(c, pal.rust1, 61, cy - 17, 28, 34)
  r(c, pal.rust2, 62, cy - 17, 26, 3)
  r(c, pal.rust0, 61, cy + 12, 28, 5)
  hazardStripe(c, 61, cy - 4, 28, 6)
  for (const y of [cy - 12, cy + 7]) for (const x of [63, 86]) r(c, pal.rust3, x, y, 1, 1)
  // Intake ribs
  for (let i = 0; i < 4; i++) {
    r(c, pal.ink, 94 + i * 4, cy - 15, 2, 30)
    r(c, pal.hull3, 94 + i * 4, cy - 15, 1, 30)
  }
  // Nozzle bell
  poly(c, pal.ink, [[22, cy - 14], [44, cy - 19], [44, cy + 19], [22, cy + 14]])
  poly(c, pal.hull1, [[24, cy - 12], [42, cy - 16], [42, cy + 16], [24, cy + 12]])
  for (let x = 27; x < 42; x += 4) r(c, pal.hull0, x, cy - 13, 1, 26)
  r(c, pal.ink, 20, cy - 13, 4, 26)
}

function hullShell(c: Ctx) {
  const outline: [number, number][] = [
    [122, 56],
    [130, 50],
    [214, 50],
    [220, 42],
    [312, 42],
    [318, 50],
    [530, 50],
    [560, 58],
    [596, 82],
    [626, 110],
    [646, 132],
    [648, 152],
    [636, 176],
    [600, 202],
    [548, 216],
    [134, 216],
    [122, 208],
  ]
  c.save()
  c.lineJoin = 'miter'
  c.beginPath()
  outline.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)))
  c.closePath()
  c.lineWidth = 4
  c.strokeStyle = pal.ink
  c.stroke()
  c.fillStyle = pal.hull1
  c.fill()
  c.restore()
  // Plating bands and highlights
  r(c, pal.hull2, 124, 52, 404, 3)
  r(c, pal.hull3, 132, 51, 80, 1)
  r(c, pal.hull3, 222, 43, 88, 1)
  r(c, pal.hull2, 222, 44, 88, 6)
  r(c, pal.hull0, 124, 206, 420, 8)
  r(c, pal.hull2, 124, 198, 420, 2)
  for (let x = 140; x < 530; x += 22) {
    r(c, pal.hull0, x, 55, 1, 9)
    r(c, pal.hull0, x + 8, 200, 1, 6)
    r(c, pal.hull3, x + 4, 57, 1, 1)
  }
  // Rust armor plates along the spine and keel
  for (const [x, y, w] of [
    [140, 55, 34],
    [236, 46, 40],
    [344, 55, 46],
    [452, 55, 30],
    [150, 207, 54],
    [372, 207, 66],
  ]) {
    r(c, pal.ink, x, y, w, 7)
    r(c, pal.rust1, x + 1, y + 1, w - 2, 5)
    r(c, pal.rust2, x + 1, y + 1, w - 2, 1)
    r(c, pal.rust0, x + 1, y + 5, w - 2, 1)
    r(c, pal.rust3, x + 2, y + 2, 1, 1)
    r(c, pal.rust3, x + w - 3, y + 2, 1, 1)
  }
  // Dorsal gear: radiator fins, comm mast, dish
  for (let i = 0; i < 8; i++) {
    r(c, pal.ink, 150 + i * 6, 38, 4, 13)
    r(c, pal.hull3, 151 + i * 6, 39, 2, 11)
    r(c, pal.hull4, 151 + i * 6, 39, 2, 1)
  }
  r(c, pal.ink, 147, 47, 50, 4)
  r(c, pal.ink, 284, 18, 3, 25)
  r(c, pal.hull3, 285, 19, 1, 23)
  r(c, pal.ink, 278, 26, 15, 2)
  poly(c, pal.ink, [[370, 50], [366, 38], [372, 30], [392, 30], [398, 38], [394, 50]])
  poly(c, pal.hull3, [[372, 48], [369, 39], [374, 33], [390, 33], [395, 39], [392, 48]])
  r(c, pal.hull4, 375, 34, 12, 1)
  r(c, pal.ink, 380, 26, 3, 7)
  // Belly skids
  for (const x of [176, 420]) {
    poly(c, pal.ink, [[x, 214], [x + 50, 214], [x + 44, 228], [x + 6, 228]])
    poly(c, pal.hull2, [[x + 3, 215], [x + 47, 215], [x + 42, 226], [x + 8, 226]])
    r(c, pal.ink, x - 4, 228, 58, 4)
    r(c, pal.hull3, x - 3, 228, 56, 1)
    hazardStripe(c, x + 12, 218, 26, 4)
  }
  // Nose: armored lower prow with the hull number
  poly(c, pal.ink, [[528, 140], [640, 140], [646, 152], [636, 176], [600, 202], [548, 214], [528, 214]])
  poly(c, pal.rust1, [[530, 142], [638, 142], [643, 152], [634, 174], [598, 199], [548, 211], [530, 211]])
  r(c, pal.rust2, 531, 143, 106, 2)
  r(c, pal.rust0, 531, 196, 80, 3)
  // "07"
  const seven = (x: number, y: number) => {
    r(c, pal.ink, x, y, 9, 3)
    r(c, pal.ink, x + 6, y, 3, 16)
  }
  const zero = (x: number, y: number) => {
    r(c, pal.ink, x, y, 9, 16)
    r(c, pal.rust1, x + 3, y + 3, 3, 10)
  }
  zero(568, 158)
  seven(580, 158)
  hazardStripe(c, 531, 186, 60, 5)
  // Cockpit glazing
  poly(c, pal.ink, [[528, 64], [556, 64], [592, 92], [622, 122], [622, 138], [528, 138]])
  poly(c, '#2a5a6e', [[532, 68], [554, 68], [588, 95], [616, 122], [616, 134], [532, 134]])
  poly(c, '#3f87a0', [[556, 72], [580, 92], [574, 92], [550, 72]])
  poly(c, '#6fc3d8', [[560, 74], [566, 79], [563, 79], [557, 74]])
}

function wall(c: Ctx, f: Floor) {
  const top = ceilY(f),
    y = floorY[f]
  r(c, pal.wall1, INNER_L, top, INNER_R - INNER_L, y - top)
  for (let x = INNER_L; x < INNER_R; x += 26) {
    r(c, pal.wall0, x, top, 1, y - top)
    r(c, pal.wall2, x + 1, top, 1, y - top)
    for (const yy of [top + 10, y - 16]) r(c, pal.wall3, x + 4, yy, 1, 1)
  }
  r(c, pal.wall0, INNER_L, top + 30, INNER_R - INNER_L, 1)
  r(c, pal.wall2, INNER_L, top + 31, INNER_R - INNER_L, 1)
  // Wainscot
  r(c, pal.wall0, INNER_L, y - 10, INNER_R - INNER_L, 10)
  for (let x = INNER_L + 3; x < INNER_R; x += 9) r(c, '#20222f', x, y - 8, 5, 6)
  // Ceiling plate and conduit
  r(c, pal.ink, INNER_L, top, INNER_R - INNER_L, 5)
  r(c, pal.hull1, INNER_L, top + 5, INNER_R - INNER_L, 4)
  r(c, pal.hull2, INNER_L, top + 5, INNER_R - INNER_L, 1)
  for (let x = INNER_L + 8; x < INNER_R; x += 32) {
    r(c, pal.ink, x, top + 4, 4, 7)
    r(c, pal.rust2, x + 1, top + 5, 2, 4)
  }
  // Interior bulkhead edges
  r(c, pal.ink, INNER_L - 2, top, 4, y - top)
  r(c, pal.ink, INNER_R - 2, top, 4, y - top)
}

function floor(c: Ctx, f: Floor) {
  const y = floorY[f]
  const h = f ? 14 : 4
  r(c, pal.ink, INNER_L - 2, y, INNER_R - INNER_L + 4, h + 2)
  r(c, pal.floor1, INNER_L, y, INNER_R - INNER_L, 3)
  r(c, pal.floor2, INNER_L, y, INNER_R - INNER_L, 1)
  for (let x = INNER_L + 2; x < INNER_R; x += 5) r(c, pal.floor0, x, y + 1, 2, 2)
  if (f) {
    r(c, pal.hull1, INNER_L, y + 4, INNER_R - INNER_L, 9)
    for (let x = INNER_L + 6; x < INNER_R; x += 14) {
      r(c, pal.hull0, x, y + 5, 8, 7)
      r(c, pal.hull2, x, y + 5, 8, 1)
    }
    // Ladder hatch
    r(c, pal.ink, LADDER_X - 11, y, 22, 15)
    r(c, pal.wall0, LADDER_X - 9, y, 18, 15)
    hazardStripe(c, LADDER_X - 14, y, 3, 14)
    hazardStripe(c, LADDER_X + 11, y, 3, 14)
  }
}

function rib(c: Ctx, x: number, f: Floor) {
  const top = ceilY(f) + 5,
    y = floorY[f]
  r(c, pal.ink, x - 5, top, 10, y - top)
  r(c, pal.hull2, x - 4, top, 8, y - top)
  r(c, pal.hull3, x - 4, top, 1, y - top)
  r(c, pal.hull1, x + 2, top, 2, y - top)
  for (let yy = top + 6; yy < y - 4; yy += 9) r(c, pal.ink, x - 1, yy, 2, 2)
  // Gussets
  for (const s of [-1, 1]) {
    poly(c, pal.ink, [[x + s * 4, top], [x + s * 16, top], [x + s * 4, top + 12]])
    poly(c, pal.hull1, [[x + s * 5, top + 1], [x + s * 13, top + 1], [x + s * 5, top + 9]])
  }
}

function ladder(c: Ctx) {
  const top = ceilY(1) + 6,
    bottom = floorY[0]
  r(c, 'rgba(10,8,16,0.55)', LADDER_X - 9, top, 18, bottom - top)
  for (const x of [LADDER_X - 8, LADDER_X + 6]) {
    r(c, pal.ink, x, top, 3, bottom - top)
    r(c, '#f5c542', x + 1, top, 1, bottom - top)
  }
  for (let y = top + 4; y < bottom; y += 7) {
    r(c, pal.ink, LADDER_X - 6, y, 12, 2)
    r(c, '#d9a830', LADDER_X - 6, y, 12, 1)
  }
}

// ── Rooms ────────────────────────────────────────────────────────────────
function engineering(c: Ctx) {
  const y = U
  // Power column (reactor bus) on the aft wall
  box(c, 138, y - 50, 26, 50, pal.hull2, pal.hull3, pal.hull1)
  r(c, pal.ink, 143, y - 44, 16, 30)
  r(c, '#0b1a1e', 144, y - 43, 14, 28)
  r(c, pal.hull3, 140, y - 48, 22, 2)
  for (let i = 0; i < 3; i++) r(c, pal.ink, 140, y - 10 + i * 3, 22, 1)
  // Bolt sigil
  poly(c, pal.hazard, [[152, y - 10], [147, y - 4], [150, y - 4], [148, y + 0], [154, y - 6], [151, y - 6]])
  // Conduit from column + console to the bus line
  r(c, pal.ink, 149, ceilY(1) + 8, 4, 8)
  r(c, pal.ink, CONSOLE_X - 2, ceilY(1) + 8, 4, 14)
  r(c, pal.rust1, CONSOLE_X - 1, ceilY(1) + 8, 2, 14)
  // Junction boxes
  for (const x of [176, 236]) {
    box(c, x - 6, ceilY(1) + 9, 12, 9, pal.hull2, pal.hull3)
    r(c, pal.ink, x - 1, ceilY(1) + 12, 2, 3)
  }
  // Breaker wall
  box(c, 226, y - 46, 28, 26, pal.wall3, '#4a5170')
  for (let i = 0; i < 4; i++)
    for (let j = 0; j < 2; j++) {
      r(c, pal.ink, 229 + i * 6, y - 43 + j * 11, 4, 8)
      r(c, pal.hull4, 230 + i * 6, y - 42 + j * 11 + (i + j) % 2 * 3, 2, 3)
    }
  // Console cabinet
  const x = CONSOLE_X
  box(c, x - 14, y - 40, 28, 40, pal.hull2, pal.hull3, pal.hull1)
  r(c, pal.hull1, x - 13, y - 14, 26, 13)
  poly(c, pal.ink, [[x - 15, y - 18], [x + 15, y - 18], [x + 17, y - 13], [x - 17, y - 13]])
  poly(c, pal.hull3, [[x - 14, y - 17], [x + 14, y - 17], [x + 15, y - 14], [x - 15, y - 14]])
  for (let i = 0; i < 6; i++) r(c, pal.ink, x - 11 + i * 4, y - 16, 2, 1)
  r(c, pal.ink, x - 11, y - 37, 22, 17)
  hazardStripe(c, x - 13, y - 5, 26, 3)
  // Lever housing
  r(c, pal.ink, x + 14, y - 30, 5, 12)
  r(c, pal.hull3, x + 15, y - 29, 3, 10)
}

function crewDeck(c: Ctx) {
  const y = U
  // Poster: grinning skull, “days without incident: 0”
  box(c, 270, y - 46, 20, 26, '#d8c9a3', '#efe3c2', '#b8a37c')
  disc(c, '#3a2c2a', 280, y - 37, 5)
  r(c, '#d8c9a3', 277, y - 38, 2, 2)
  r(c, '#d8c9a3', 281, y - 38, 2, 2)
  r(c, '#3a2c2a', 277, y - 32, 7, 2)
  r(c, pal.red0, 272, y - 26, 16, 4)
  r(c, '#d8c9a3', 279, y - 25, 2, 2)
  // Galley counter + coffee machine
  box(c, 296, y - 16, 24, 16, pal.hull2, pal.hull3)
  r(c, pal.hull1, 297, y - 9, 22, 8)
  box(c, 300, y - 30, 10, 14, '#5b3a2c', '#7a5038')
  r(c, pal.ink, 302, y - 24, 6, 5)
  r(c, '#e6d6b8', 313, y - 20, 4, 4)
  // Bunk
  box(c, 348, y - 34, 44, 8, pal.hull2, pal.hull3)
  r(c, pal.rust1, 351, y - 37, 38, 4)
  r(c, pal.rust2, 351, y - 37, 38, 1)
  r(c, '#e8e0d0', 384, y - 38, 6, 4)
  r(c, pal.ink, 350, y - 26, 2, 26)
  r(c, pal.ink, 388, y - 26, 2, 26)
  // Footlocker
  box(c, 356, y - 10, 22, 10, '#3e5a4a', '#5c8068')
  r(c, pal.hazard, 365, y - 7, 4, 2)
  // Porthole
  disc(c, pal.ink, 366, y - 46, 7)
  disc(c, '#16243a', 366, y - 46, 5)
  r(c, '#9fd6ff', 363, y - 49, 2, 2)
}

function forwardHold(c: Ctx) {
  const y = U
  // Overhead shelf with junk
  r(c, pal.ink, 470, y - 40, 50, 3)
  box(c, 474, y - 52, 14, 12, '#4c4466', '#665c88')
  box(c, 490, y - 49, 10, 9, '#6a4a3a', '#8a6248')
  box(c, 502, y - 54, 14, 14, '#3e4e5e', '#566a7e')
  // Cockpit door
  box(c, INNER_R - 14, y - 46, 14, 46, pal.hull2, pal.hull3)
  r(c, pal.ink, INNER_R - 11, y - 40, 8, 12)
  r(c, '#3f87a0', INNER_R - 10, y - 39, 6, 10)
  r(c, pal.hazard, INNER_R - 12, y - 24, 2, 4)
  // Floor marking under the rack
  hazardStripe(c, slotX('upper') - 18, y - 1, 36, 1)
}

function machineRoom(c: Ctx) {
  const y = L
  for (const x of [138, 160]) {
    box(c, x, y - 46, 18, 46, '#3d4a62', '#5a6c8a', '#2a3346')
    r(c, '#6f84a8', x + 3, y - 44, 2, 40)
    r(c, pal.ink, x, y - 36, 18, 2)
    r(c, pal.rust1, x, y - 14, 18, 3)
  }
  // Pipes
  r(c, pal.ink, 136, y - 52, 120, 4)
  r(c, pal.hull3, 136, y - 51, 120, 1)
  for (const x of [150, 200, 244]) {
    r(c, pal.ink, x, y - 54, 4, 8)
    r(c, pal.rust2, x + 1, y - 53, 2, 6)
  }
  // Generator housing
  box(c, 220, y - 34, 36, 34, pal.hull2, pal.hull3, pal.hull1)
  disc(c, pal.ink, 238, y - 18, 11)
  disc(c, pal.hull0, 238, y - 18, 9)
  hazardStripe(c, 220, y - 4, 36, 3)
  // Floor marking under the rack
  hazardStripe(c, slotX('aft') - 18, y - 1, 36, 1)
}

function hold(c: Ctx) {
  const y = L
  // Background junk freight (desaturated so it never reads as interactable)
  const junk = [
    [352, 22, 18],
    [374, 18, 14],
    [358, 14, 10],
  ]
  for (const [x, w, h] of junk) {
    const top = y - h - (x === 358 ? 18 : 0)
    box(c, x, top, w, h, '#3a3a4a', '#4a4a5c', '#2c2c3a')
    r(c, '#2c2c3a', x + 2, top + 3, w - 4, 1)
  }
  // Load-zone floor marking
  r(c, '#3c3a26', 266, y - 1, 52, 1)
  for (let x = 268; x < 316; x += 8) r(c, '#8a7a3a', x, y - 1, 4, 1)
}

function shieldWing(c: Ctx) {
  const y = L
  // Lead-lined locker wall
  box(c, 400, y - 50, 32, 50, '#2c3242', '#3c4458', '#20242f')
  for (let i = 0; i < 4; i++) r(c, pal.ink, 403, y - 44 + i * 11, 26, 1)
  r(c, pal.teal1, 427, y - 30, 2, 6)
  // Airlock
  box(c, AIRLOCK_X - 10, y - 50, 20, 50, pal.hull2, pal.hull3, pal.hull1)
  r(c, pal.ink, AIRLOCK_X - 1, y - 48, 2, 46)
  hazardStripe(c, AIRLOCK_X - 9, y - 50, 18, 3)
  disc(c, pal.ink, AIRLOCK_X, y - 30, 4)
  disc(c, '#2a5a6e', AIRLOCK_X, y - 30, 3)
}

export function drawShipStatic(c: Ctx) {
  nacelle(c, 95)
  nacelle(c, 167)
  hullShell(c)
  wall(c, 1)
  wall(c, 0)
  engineering(c)
  crewDeck(c)
  forwardHold(c)
  machineRoom(c)
  hold(c)
  shieldWing(c)
  for (const f of [0, 1] as Floor[]) for (const x of RIBS) rib(c, x, f)
  floor(c, 1)
  floor(c, 0)
  ladder(c)
  // Cockpit interior: seat and dash under the glazing
  box(c, 536, 106, 30, 18, pal.hull2, pal.hull3)
  r(c, pal.ink, 540, 98, 4, 10)
  box(c, 544, 88, 12, 22, '#5a3a3a', '#7a5048')
  r(c, pal.ink, 528, 124, 98, 16)
  r(c, pal.hull1, 530, 125, 88, 12)
}

// ── Animated machinery ───────────────────────────────────────────────────
export interface ShipLook {
  t: number
  /** 0 = lights out, 1 = normal. */
  power: number
  fault: boolean
  thrust: number
  hull: number
  airlockOpen: number
}

export function exhaust(c: Ctx, s: ShipLook) {
  for (const cy of [95, 167]) {
    const flick = Math.sin(s.t * 31 + cy) * 0.5 + Math.sin(s.t * 13) * 0.5
    const len = (14 + flick * 4) * s.thrust
    if (len < 1) continue
    poly(c, '#2f6f9a', [[22, cy - 11], [22 - len * 1.8, cy - 3], [22 - len * 2.2, cy], [22 - len * 1.8, cy + 3], [22, cy + 11]])
    poly(c, '#59c8f0', [[22, cy - 8], [22 - len * 1.3, cy - 2], [22 - len * 1.5, cy], [22 - len * 1.3, cy + 2], [22, cy + 8]])
    poly(c, '#d8f6ff', [[22, cy - 4], [22 - len * 0.8, cy], [22, cy + 4]])
    glow(c, 16, cy, 40 * s.thrust, '#3fa8ff', 0.35)
  }
}

export function machinery(c: Ctx, s: ShipLook) {
  const p = s.power
  // Power column window
  const col = s.fault ? mix('#ff3d2a', '#3a0a0a', (Math.sin(s.t * 18) + 1) / 2) : '#3fe0c8'
  for (let i = 0; i < 5; i++) {
    const h = 4 + Math.round((Math.sin(s.t * 6 + i * 1.7) + 1) * 3 * p)
    r(c, col, 145 + i * 3, U - 16 - h, 2, h)
  }
  // Generator fan
  const a = s.t * (s.fault ? 3 : 14)
  for (let k = 0; k < 3; k++) {
    const ang = a + (k * Math.PI * 2) / 3
    for (let d = 2; d < 9; d++) r(c, pal.hull3, 238 + Math.cos(ang) * d, L - 18 + Math.sin(ang) * d, 1, 1)
  }
  disc(c, pal.hull4, 238, L - 18, 1)
  // Breaker lights
  for (let i = 0; i < 4; i++)
    r(c, s.fault && (i + Math.floor(s.t * 6)) % 2 ? pal.red : p > 0.5 ? pal.green : '#1f3a2a', 230 + i * 6, U - 22, 2, 1)
  // Coffee machine light
  r(c, (Math.floor(s.t * 2) % 2 && p > 0.5) ? pal.red : pal.red0, 304, U - 28, 2, 1)
  // Airlock status lamp
  r(c, s.airlockOpen > 0 ? pal.red : pal.green, AIRLOCK_X - 2, L - 47, 4, 1)
  // Cockpit dash blinkers (autopilot)
  for (let i = 0; i < 5; i++)
    r(c, (Math.floor(s.t * 3 + i * 1.3) % 3 === 0) ? '#ffcf5a' : '#5ae0a0', 534 + i * 5, 127, 3, 2)
}

export function consoleScreen(c: Ctx, s: ShipLook, open: boolean) {
  const x = CONSOLE_X,
    y = U
  const sx = x - 10,
    sy = y - 36
  if (s.fault) {
    const on = Math.floor(s.t * 5) % 2 === 0
    r(c, on ? '#5a0f18' : '#2a0810', sx, sy, 20, 15)
    for (let i = 0; i < 6; i++) r(c, '#ff5a5a', sx + (hash(i + Math.floor(s.t * 20)) * 18) | 0, sy + (hash(i * 7 + Math.floor(s.t * 20)) * 14) | 0, 2, 1)
    // "!" glyph
    r(c, on ? '#ffd24a' : '#ff7a3a', x - 1, sy + 3, 2, 6)
    r(c, on ? '#ffd24a' : '#ff7a3a', x - 1, sy + 11, 2, 2)
    glow(c, x, sy + 7, 22, '#ff3a2a', on ? 0.6 : 0.3)
  } else {
    r(c, '#0b2418', sx, sy, 20, 15)
    for (let i = 0; i < 18; i++) {
      const h = Math.round(Math.sin(s.t * 4 + i * 0.7) * 3 * s.power)
      r(c, '#6bffa8', sx + 1 + i, sy + 7 - h, 1, 1)
    }
    r(c, '#2c7a4a', sx, sy + 12, 20, 1)
    glow(c, x, sy + 7, 16, '#4aff9a', 0.25 * s.power)
  }
  // Lever: down during fault, up when stable, pulled while console open
  const up = !s.fault
  r(c, pal.ink, x + 15, up ? y - 40 : y - 24, 3, 12)
  r(c, open ? pal.hazard : pal.red, x + 14, up ? y - 42 : y - 14, 5, 4)
}

// ── Cargo slots ──────────────────────────────────────────────────────────
export function rackBack(c: Ctx, x: number, f: Floor) {
  const y = floorY[f]
  // Recessed back plate with a stencilled cargo outline
  r(c, pal.ink, x - 15, y - 30, 30, 30)
  r(c, '#30364c', x - 14, y - 29, 28, 26)
  r(c, '#3a4260', x - 14, y - 29, 28, 1)
  for (const [sx, sy, w, h] of [
    [-7, -24, 14, 1],
    [-7, -9, 14, 1],
    [-7, -24, 1, 16],
    [6, -24, 1, 16],
  ])
    r(c, '#4a5274', x + sx, y + sy, w, h)
  // Mustard cradle posts and header
  for (const s of [-1, 1]) {
    const px = s < 0 ? x - 17 : x + 13
    r(c, pal.ink, px, y - 34, 5, 34)
    r(c, '#d9a830', px + 1, y - 33, 3, 32)
    r(c, '#f5d070', px + 1, y - 33, 1, 32)
    r(c, '#8a6418', px + 3, y - 33, 1, 32)
  }
  r(c, pal.ink, x - 18, y - 36, 36, 5)
  hazardStripe(c, x - 17, y - 35, 34, 3)
  r(c, pal.ink, x - 18, y - 5, 36, 5)
  r(c, '#8a8aa8', x - 17, y - 4, 34, 1)
  r(c, '#5a5a78', x - 17, y - 3, 34, 2)
}

export function rackFront(c: Ctx, x: number, f: Floor, occupied: boolean, t: number, cooling: number) {
  const y = floorY[f]
  // Clamp jaws close over an occupant
  const reach = occupied ? 7 : 2
  for (const s of [-1, 1]) {
    const jx = x + s * 12
    r(c, pal.ink, s < 0 ? jx : jx - reach, y - 17, reach + 1, 5)
    r(c, pal.hull4, s < 0 ? jx : jx - reach + 1, y - 16, reach, 3)
  }
  // Status lamp
  const lamp = occupied ? pal.green : Math.floor(t * 2) % 2 ? '#c88a2a' : '#5a3a1a'
  r(c, pal.ink, x - 3, y - 40, 6, 4)
  r(c, lamp, x - 2, y - 39, 4, 2)
  glow(c, x, y - 38, 8, occupied ? '#4aff8a' : '#ffaa3a', 0.35)
  if (cooling > 0) {
    for (let i = 0; i < 3; i++) {
      const k = (t * 1.5 + i / 3) % 1
      r(c, `rgba(150,220,255,${(1 - k) * 0.6 * cooling})`, x - 10 + i * 9, y - 30 - k * 10, 2, 2)
    }
  }
}

export function vaultBack(c: Ctx, t: number) {
  const x = slotX('vault'),
    y = L
  r(c, pal.ink, x - 20, y - 46, 40, 46)
  r(c, '#1c2432', x - 18, y - 44, 36, 42)
  for (let j = 0; j < 7; j++)
    for (let i = 0; i < 6; i++)
      r(c, '#243042', x - 16 + i * 6 + (j % 2) * 3, y - 42 + j * 6, 3, 3)
  r(c, pal.teal0, x - 18, y - 6, 36, 2)
  void t
}

export function vaultFront(c: Ctx, t: number, occupied: boolean, power: number) {
  const x = slotX('vault'),
    y = L
  for (const s of [-1, 1]) {
    const px = s < 0 ? x - 22 : x + 16
    box(c, px, y - 48, 7, 48, pal.teal1, pal.teal2, pal.teal0)
    r(c, pal.teal3, px + 2, y - 40, 3, 2)
    r(c, pal.teal3, px + 2, y - 30, 3, 2)
  }
  box(c, x - 18, y - 52, 36, 9, pal.teal1, pal.teal2, pal.teal0)
  r(c, pal.ink, x - 6, y - 45, 12, 3)
  r(c, occupied ? pal.cyan : '#2a6a7a', x - 5, y - 45, 10, 2)
  box(c, x - 20, y - 5, 40, 5, pal.teal1, pal.teal2)
  if (occupied && power > 0) {
    c.save()
    c.globalAlpha = 0.22 + Math.sin(t * 5) * 0.06
    r(c, pal.cyan, x - 15, y - 43, 30, 38)
    c.globalAlpha = 0.35
    for (let yy = 0; yy < 38; yy += 3) {
      const k = (yy + Math.floor(t * 30)) % 38
      r(c, '#bff6ff', x - 15, y - 43 + k, 30, 1)
    }
    c.restore()
    glow(c, x, y - 24, 34, '#3ad6ff', 0.35)
  } else glow(c, x, y - 46, 10, '#3ad6ff', 0.25)
}

/** Pulsing pixel outline marking a valid drop-off while carrying cargo. */
export function slotHint(c: Ctx, x: number, f: Floor, w: number, h: number, color: string, t: number) {
  const y = floorY[f]
  const a = 0.45 + Math.sin(t * 7) * 0.35
  const x0 = Math.round(x - w / 2) - 3,
    y0 = y - h - 3
  c.save()
  c.globalAlpha = a
  const dash = Math.floor(t * 12) % 4
  for (let i = 0; i < w + 6; i++) {
    if ((i + dash) % 4 < 2) {
      r(c, color, x0 + i, y0, 1, 1)
      r(c, color, x0 + i, y + 1, 1, 1)
    }
  }
  for (let j = 0; j < h + 4; j++) {
    if ((j + dash) % 4 < 2) {
      r(c, color, x0, y0 + j, 1, 1)
      r(c, color, x0 + w + 6, y0 + j, 1, 1)
    }
  }
  c.restore()
  glow(c, x, y - h / 2, w, color, 0.18 + a * 0.15)
}
