import { disc, glow, hash, hazardStripe, pal, poly, r, type Ctx } from './pixel'

export type Scene = 'dock' | 'highway' | 'approach' | 'gate' | 'wreck'

const stars = Array.from({ length: 260 }, (_, i) => ({
  x: hash(i * 3 + 1),
  y: hash(i * 3 + 2),
  layer: i % 3,
  tw: hash(i * 3 + 3),
}))
const rocks = Array.from({ length: 14 }, (_, i) => ({
  x: hash(i + 900),
  y: hash(i + 950),
  s: 2 + Math.floor(hash(i + 990) * 5),
}))

export interface SpaceLook {
  W: number
  H: number
  camX: number
  camY: number
  scene: Scene
  travel: number
  t: number
  /** 0..1 approach progress toward Cinder Gate. */
  approach: number
  alarm: number
}

export function space(c: Ctx, k: SpaceLook) {
  const { W, H } = k
  const g = c.createLinearGradient(0, 0, 0, H)
  g.addColorStop(0, '#0c0a1a')
  g.addColorStop(0.55, '#1b1232')
  g.addColorStop(1, k.scene === 'gate' || k.scene === 'approach' ? '#3a1a22' : '#2a1430')
  c.fillStyle = g
  c.fillRect(0, 0, W, H)
  // Nebula smears
  const neb = (x: number, y: number, rad: number, col: string, a: number) => glow(c, x, y, rad, col, a)
  const drift = k.travel * 0.02
  neb(((W * 0.25 - drift) % (W + 300) + W + 300) % (W + 300) - 150, H * 0.3, 160, '#5a2a6a', 0.35)
  neb(((W * 0.8 - drift * 0.7) % (W + 300) + W + 300) % (W + 300) - 150, H * 0.75, 200, '#2a3a6a', 0.3)
  // Stars, three parallax layers
  const speeds = [0.05, 0.15, 0.4]
  for (const s of stars) {
    const sp = speeds[s.layer]
    const x = ((s.x * W - k.travel * sp) % W + W) % W
    const y = s.y * H
    const tw = Math.sin(k.t * (1 + s.tw * 3) + s.tw * 20) > 0.6
    const col = s.layer === 2 ? '#d8c8e8' : s.layer === 1 ? '#8a7aa8' : '#4a4268'
    r(c, tw && s.layer > 0 ? '#ffffff' : col, x, y, 1, 1)
    if (s.layer === 2 && k.scene === 'highway') r(c, 'rgba(216,200,232,0.35)', x + 1, y, 3, 1)
  }
  // Ringed moon
  const mx = W * 0.82 - k.travel * 0.01,
    my = H * 0.16
  c.save()
  c.translate(Math.round(mx), Math.round(my))
  c.strokeStyle = '#6a4a6a'
  c.lineWidth = 2
  c.beginPath()
  c.ellipse(0, 0, 44, 7, -0.25, Math.PI, Math.PI * 2)
  c.stroke()
  disc(c, '#7a5470', 0, 0, 20)
  for (let i = -20; i < 20; i += 5) r(c, '#6a4864', -18, i, 36, 2)
  disc(c, '#8a6480', -5, -6, 10)
  c.beginPath()
  c.ellipse(0, 0, 44, 7, -0.25, 0, Math.PI)
  c.strokeStyle = '#a8849a'
  c.stroke()
  c.restore()
  // Ash belt: drifting rock silhouettes and a dusty haze
  const haze = c.createLinearGradient(0, H * 0.7, 0, H)
  haze.addColorStop(0, 'rgba(120,50,50,0)')
  haze.addColorStop(1, 'rgba(150,70,50,0.35)')
  c.fillStyle = haze
  c.fillRect(0, H * 0.7, W, H * 0.3)
  for (const rk of rocks) {
    const x = ((rk.x * (W + 60) - k.travel * 0.6) % (W + 60) + W + 60) % (W + 60) - 30
    const y = H * (rk.y < 0.5 ? 0.04 + rk.y * 0.12 : 0.86 + (rk.y - 0.5) * 0.2)
    disc(c, '#2a1c26', x, y, rk.s)
    r(c, '#4a3038', x - rk.s + 1, y - rk.s + 1, rk.s, 1)
  }
  if (k.scene === 'highway' || k.scene === 'approach') {
    // Near ash streaks for speed
    for (let i = 0; i < 26; i++) {
      const x = ((hash(i + 400) * W * 2 - k.travel * 2.2) % (W * 2) + W * 2) % (W * 2) - W * 0.5
      const y = hash(i + 450) * H
      r(c, 'rgba(200,150,140,0.35)', x, y, 6 + hash(i) * 10, 1)
    }
    // Highway lane buoys
    for (let i = 0; i < 6; i++) {
      const span = W + 200
      const x = ((i * 260 - k.travel * 0.9) % span + span) % span - 100
      for (const y of [H * 0.08, H * 0.93]) buoy(c, x, y, k.t + i)
    }
  }
  if (k.scene === 'dock') dock(c, k)
  if (k.scene === 'approach') gateFar(c, k)
  if (k.scene === 'gate') gate(c, k)
}

function buoy(c: Ctx, x: number, y: number, t: number) {
  r(c, pal.ink, x - 2, y - 6, 5, 12)
  r(c, '#4a4a62', x - 1, y - 5, 3, 10)
  r(c, pal.ink, x - 6, y - 1, 13, 3)
  r(c, '#6a6a82', x - 5, y, 11, 1)
  const on = Math.floor(t * 2) % 2 === 0
  r(c, on ? '#ffb02a' : '#5a3a1a', x - 1, y - 8, 3, 2)
  if (on) glow(c, x, y - 7, 12, '#ffa02a', 0.5)
}

function dock(c: Ctx, k: SpaceLook) {
  // Relay Nine gantry: a clamp arm from above and a fuel boom below.
  const ox = -k.camX,
    oy = -k.camY
  const ax = ox + 300
  r(c, pal.ink, ax - 6, 0, 12, oy + 22)
  r(c, '#3a3850', ax - 4, 0, 8, oy + 22)
  for (let y = 4; y < oy + 20; y += 10) r(c, '#5a5878', ax - 4, y, 8, 2)
  poly(c, pal.ink, [[ax - 16, oy + 18], [ax + 16, oy + 18], [ax + 10, oy + 30], [ax - 10, oy + 30]])
  hazardStripe(c, ax - 12, oy + 20, 24, 4)
  // Pier below
  r(c, pal.ink, 0, oy + 236, k.W, 8)
  r(c, '#2a2840', 0, oy + 238, k.W, 6)
  for (let x = ((ox % 40) + 40) % 40 - 40; x < k.W; x += 40) {
    r(c, '#4a4868', x, oy + 238, 20, 1)
    const on = Math.floor(k.t * 1.5 + x / 40) % 3 === 0
    r(c, on ? '#7dffa8' : '#2a4a3a', x + 8, oy + 234, 3, 2)
  }
}

function gateFar(c: Ctx, k: SpaceLook) {
  const s = 0.25 + k.approach * 0.75
  const cx = k.W * (1.05 - k.approach * 0.55),
    cy = k.H * 0.5
  const h = k.H * 0.9 * s,
    w = 50 * s
  c.save()
  c.globalAlpha = 0.5 + k.approach * 0.5
  for (const sgn of [-1, 1]) {
    const y = cy + sgn * h * 0.5
    r(c, '#1a1424', cx - w, y - 10 * s, w * 2, 20 * s)
    r(c, '#3a2a3a', cx - w, y - 10 * s, w * 2, 3)
    glow(c, cx, y, 30 * s, '#ff6a2a', 0.5)
  }
  r(c, '#1a1424', cx - 6 * s, cy - h * 0.5, 12 * s, h)
  c.restore()
}

function gate(c: Ctx, k: SpaceLook) {
  // Cinder Gate inspection arch frames the docked ship.
  const oy = -k.camY
  for (const y of [oy + 6, oy + 238]) {
    r(c, pal.ink, 0, y, k.W, 14)
    r(c, '#2e2236', 0, y + 2, k.W, 10)
    r(c, '#4a3448', 0, y + 2, k.W, 1)
    for (let x = 0; x < k.W; x += 24) {
      r(c, pal.ink, x, y + 2, 2, 10)
      const on = Math.floor(k.t * 2 + x / 24) % 4 === 0
      r(c, on ? '#ff7a2a' : '#5a2a1a', x + 10, y + 5, 4, 3)
    }
  }
  if (k.alarm > 0) {
    const a = (Math.sin(k.t * 10) + 1) / 2
    glow(c, k.W * 0.2, oy + 14, 80, '#ff2a3a', a * k.alarm)
    glow(c, k.W * 0.8, oy + 14, 80, '#2a5aff', (1 - a) * k.alarm)
  }
}

/** Darkened wreck debris for hull loss. */
export function debris(c: Ctx, t: number, ox: number, oy: number) {
  for (let i = 0; i < 26; i++) {
    const x = ox + 120 + hash(i) * 520 + Math.sin(t * 0.3 + i) * 6 + (hash(i + 7) - 0.5) * t * 6
    const y = oy + 40 + hash(i + 50) * 190 + Math.cos(t * 0.4 + i) * 5
    const s = 1 + Math.floor(hash(i + 90) * 4)
    r(c, pal.ink, x - 1, y - 1, s + 2, s + 2)
    r(c, i % 3 ? '#4a4660' : pal.rust1, x, y, s, s)
  }
}
