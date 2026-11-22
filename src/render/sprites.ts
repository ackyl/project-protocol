import { disc, glow, mix, pal, r, type Ctx } from './pixel'

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
export interface CellLook {
  heat: number
  condition: number
  t: number
  shake: boolean
}

/** Volatile Cell: glass canister with a hot core. Origin is the bottom center. */
export function cell(c: Ctx, x: number, y: number, k: CellLook) {
  const h = Math.min(1, k.heat / 100)
  const jitter = k.shake ? Math.round(Math.sin(k.t * 70) * (h > 0.85 ? 1.5 : 1)) : 0
  c.save()
  c.translate(Math.round(x) + jitter, Math.round(y))
  // Base with hazard band
  r(c, pal.ink, -7, -4, 14, 4)
  r(c, '#3b3546', -6, -3, 12, 2)
  r(c, pal.hazard, -6, -3, 2, 2)
  r(c, pal.hazard, -2, -3, 2, 2)
  r(c, pal.hazard, 2, -3, 2, 2)
  // Glass body
  r(c, pal.ink, -6, -17, 12, 14)
  const core = h < 0.5 ? mix('#ff9a2a', '#ff4a1a', h * 2) : mix('#ff4a1a', '#fff0c8', (h - 0.5) * 2)
  const pulse = 0.5 + Math.sin(k.t * (3 + h * 18)) * 0.5
  r(c, '#5a2a1a', -5, -16, 10, 12)
  r(c, mix(core, '#ffffff', pulse * 0.25), -3, -15, 6, 10)
  r(c, mix(core, '#fff6d0', 0.6), -1, -14, 2, 8)
  r(c, 'rgba(255,255,255,0.55)', -4, -15, 1, 9)
  // Cap and terminals
  r(c, pal.ink, -7, -20, 14, 4)
  r(c, '#6c6688', -6, -19, 12, 2)
  r(c, '#a9a2c2', -6, -19, 12, 1)
  r(c, pal.ink, -4, -22, 2, 2)
  r(c, pal.ink, 2, -22, 2, 2)
  r(c, '#e0c050', -4, -23, 2, 1)
  r(c, '#e0c050', 2, -23, 2, 1)
  // Cracks from venting
  if (k.condition < 100) {
    r(c, '#fff0d0', 2, -13, 1, 3)
    r(c, '#fff0d0', 1, -10, 1, 2)
  }
  if (k.condition < 70) {
    r(c, '#fff0d0', -4, -9, 1, 3)
    r(c, '#fff0d0', -3, -7, 2, 1)
  }
  c.restore()
  glow(c, x, y - 10, 14 + h * 22, h > 0.7 ? '#ff5a2a' : '#ff9a3a', 0.25 + h * 0.45 + pulse * 0.1)
}

export interface CrateLook {
  t: number
  exposed: boolean
  condition: number
}

/** Signal Crate: teal ribbed case with a blinking antenna. */
export function crate(c: Ctx, x: number, y: number, k: CrateLook) {
  c.save()
  c.translate(Math.round(x), Math.round(y))
  r(c, pal.ink, -11, -15, 22, 15)
  r(c, pal.teal1, -10, -14, 20, 13)
  r(c, pal.teal2, -10, -14, 20, 2)
  r(c, pal.teal0, -10, -3, 20, 2)
  for (const xx of [-6, 0, 6]) r(c, pal.teal0, xx, -11, 1, 7)
  // Corners
  for (const [cx, cy] of [[-11, -15], [8, -15], [-11, -3], [8, -3]]) r(c, '#a9a2c2', cx, cy, 3, 3)
  // Speaker grille
  r(c, pal.ink, -4, -11, 8, 6)
  for (let i = 0; i < 3; i++) r(c, k.exposed ? pal.teal3 : '#3a6a66', -3 + i * 3, -10, 1, 4)
  // Antenna
  r(c, pal.ink, 6, -22, 2, 8)
  const blink = k.exposed && Math.floor(k.t * 3) % 2 === 0
  r(c, blink ? '#ff4a5a' : '#6a2a3a', 5, -24, 4, 3)
  c.restore()
  if (blink) glow(c, x + 7, y - 23, 8, '#ff4a5a', 0.5)
}

/** Expanding broadcast rings from an exposed crate. */
export function signalRings(c: Ctx, x: number, y: number, t: number, strength: number) {
  for (let i = 0; i < 3; i++) {
    const k = (t * 0.7 + i / 3) % 1
    const rad = 6 + k * 26
    c.save()
    c.globalAlpha = (1 - k) * 0.55 * strength
    c.strokeStyle = '#7ff0dc'
    c.lineWidth = 1
    c.beginPath()
    c.arc(Math.round(x + 7) + 0.5, Math.round(y - 23) + 0.5, rad, -Math.PI * 0.85, -Math.PI * 0.15)
    c.stroke()
    c.restore()
  }
}

/** Small pixel heat gauge drawn above the cell. */
export function heatGauge(c: Ctx, x: number, y: number, heat: number, t: number) {
  const w = 16,
    h = Math.min(1, heat / 100)
  const danger = h > 0.7
  const bx = Math.round(x - w / 2),
    by = Math.round(y)
  r(c, pal.ink, bx - 1, by - 1, w + 2, 4)
  r(c, '#2a1a1a', bx, by, w, 2)
  const col = h < 0.5 ? '#ffb02a' : h < 0.7 ? '#ff7a2a' : Math.floor(t * 8) % 2 ? '#ff2a3a' : '#ffe0a0'
  r(c, col, bx, by, Math.max(1, Math.round(w * h)), 2)
  if (danger && Math.floor(t * 4) % 2 === 0) {
    r(c, pal.ink, bx + w + 2, by - 4, 4, 8)
    r(c, '#ffd24a', bx + w + 3, by - 3, 2, 4)
    r(c, '#ffd24a', bx + w + 3, by + 2, 2, 1)
  }
}

export interface SpecimenLook {
  agitation: number
  condition: number
  t: number
}

/** Bio Specimen: a bell jar with a one-eyed creature that gets restless. */
export function specimen(c: Ctx, x: number, y: number, k: SpecimenLook) {
  const a = Math.min(1, k.agitation / 100)
  const thrash = a > 0.6 ? Math.round(Math.sin(k.t * (10 + a * 30)) * (a > 0.85 ? 2 : 1)) : 0
  c.save()
  c.translate(Math.round(x), Math.round(y))
  // Base plate with hazard dots
  r(c, pal.ink, -8, -4, 16, 4)
  r(c, '#3a3a4e', -7, -3, 14, 2)
  r(c, '#9dff6a', -5, -3, 2, 1)
  r(c, '#9dff6a', 3, -3, 2, 1)
  // Jar
  r(c, pal.ink, -7, -20, 14, 16)
  const fluid = mix('#2f7a3a', '#a0308a', a)
  r(c, fluid, -6, -19, 12, 15)
  r(c, mix('#5fd06a', '#ff5ad0', a), -6, -19, 12, 2)
  // Creature
  const cx = thrash
  r(c, mix('#c9ff9a', '#ffb0f0', a), -3 + cx, -14, 6, 6)
  r(c, '#ffffff', -1 + cx, -13, 3, 3)
  r(c, pal.ink, (a > 0.6 ? 0 : 1) + cx, -12, 1, 1)
  const wig = Math.floor(k.t * (3 + a * 10)) % 2
  r(c, mix('#c9ff9a', '#ffb0f0', a), -5 + cx, -9 + wig, 2, 3)
  r(c, mix('#c9ff9a', '#ffb0f0', a), 3 + cx, -9 + (1 - wig), 2, 3)
  // Bubbles
  for (let i = 0; i < 2 + Math.round(a * 3); i++) {
    const by = -6 - ((k.t * (4 + a * 10) + i * 3.3) % 12)
    r(c, 'rgba(220,255,220,0.7)', -5 + ((i * 4) % 10), Math.round(by), 1, 1)
  }
  // Glass glint and lid
  r(c, 'rgba(255,255,255,0.5)', -5, -18, 1, 10)
  r(c, pal.ink, -8, -23, 16, 4)
  r(c, '#7a7a94', -7, -22, 14, 2)
  r(c, '#a9a2c2', -7, -22, 14, 1)
  r(c, pal.ink, -1, -26, 2, 3)
  // Cracks from pulses
  if (k.condition < 100) r(c, '#e8ffe0', 3, -17, 1, 4)
  if (k.condition < 80) r(c, '#e8ffe0', -4, -10, 1, 3)
  c.restore()
}

/** Agitation gauge: green to magenta, with a warning blip near the limit. */
export function agitationGauge(c: Ctx, x: number, y: number, level: number, t: number) {
  const w = 16,
    h = Math.min(1, level / 100)
  const bx = Math.round(x - w / 2),
    by = Math.round(y)
  r(c, pal.ink, bx - 1, by - 1, w + 2, 4)
  r(c, '#1a2a1a', bx, by, w, 2)
  const col = h < 0.6 ? '#7dff6a' : h < 0.85 ? '#ff7ad8' : Math.floor(t * 8) % 2 ? '#ff3ac0' : '#ffe0f6'
  r(c, col, bx, by, Math.max(1, Math.round(w * h)), 2)
  if (h > 0.75 && Math.floor(t * 4) % 2 === 0) {
    r(c, pal.ink, bx + w + 2, by - 4, 4, 8)
    r(c, '#ff7ad8', bx + w + 3, by - 3, 2, 4)
    r(c, '#ff7ad8', bx + w + 3, by + 2, 2, 1)
  }
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
