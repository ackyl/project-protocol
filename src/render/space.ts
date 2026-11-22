import { disc, glow, hash, hazardStripe, pal, poly, r, type Ctx } from './pixel'

export type Scene = 'dock' | 'highway' | 'approach' | 'gate' | 'wreck'

const stars = Array.from({ length: 260 }, (_, i) => ({
  x: hash(i * 3 + 1),
  y: hash(i * 3 + 2),
  layer: i % 3,
  tw: hash(i * 3 + 3),
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
  c.fillStyle = k.scene === 'gate' || k.scene === 'approach' ? '#1a0f22' : '#120d22'
  c.fillRect(0, 0, W, H)
  // Stars: two cheap parallax layers; only the near one drifts noticeably.
  const speeds = [0.04, 0.25]
  c.fillStyle = '#5a5078'
  for (const s of stars) {
    if (s.layer === 2) continue
    const x = ((s.x * W - k.travel * speeds[s.layer]) % W + W) % W
    c.fillStyle = s.layer ? '#a898c0' : '#4a4268'
    c.fillRect(Math.round(x), Math.round(s.y * H), 1, 1)
  }
  // Ringed moon (static)
  const mx = Math.round(W * 0.82),
    my = Math.round(H * 0.16)
  disc(c, '#7a5470', mx, my, 20)
  disc(c, '#8a6480', mx - 5, my - 6, 10)
  r(c, '#a8849a', mx - 44, my, 88, 2)
  if (k.scene === 'dock') dock(c, k)
  if (k.scene === 'approach') gateFar(c, k)
  if (k.scene === 'gate') gate(c, k)
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
