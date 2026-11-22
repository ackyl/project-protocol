export type Ctx = CanvasRenderingContext2D

export const pal = {
  ink: '#120f1a',
  ink2: '#1c1826',
  hull0: '#26243a',
  hull1: '#3a3854',
  hull2: '#55516f',
  hull3: '#7c7697',
  hull4: '#a9a2c2',
  rust0: '#7a3a2a',
  rust1: '#b25a36',
  rust2: '#e0843f',
  rust3: '#f6b562',
  wall0: '#1a1c29',
  wall1: '#232738',
  wall2: '#2c3145',
  wall3: '#3a4058',
  floor0: '#2a2738',
  floor1: '#4a4560',
  floor2: '#7a7294',
  hazard: '#f2c23d',
  warm: '#ffd38a',
  teal0: '#164a4c',
  teal1: '#1f7a73',
  teal2: '#34b3a4',
  teal3: '#7ff0dc',
  cyan: '#62e6ff',
  red: '#ff3d4a',
  red0: '#8a1f2c',
  green: '#7dffa8',
  green0: '#1f5a3e',
  orange: '#ff8a2a',
  white: '#fff6e8',
}

export function r(c: Ctx, color: string, x: number, y: number, w: number, h: number) {
  c.fillStyle = color
  c.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h))
}

export function poly(c: Ctx, color: string, pts: [number, number][]) {
  c.fillStyle = color
  c.beginPath()
  pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)))
  c.closePath()
  c.fill()
}

/** Pixel-exact filled disc built from horizontal spans. */
export function disc(c: Ctx, color: string, cx: number, cy: number, rad: number) {
  c.fillStyle = color
  for (let y = -rad; y <= rad; y++) {
    const span = Math.round(Math.sqrt(rad * rad - y * y + rad * 0.6))
    c.fillRect(Math.round(cx - span), Math.round(cy + y), span * 2 + 1, 1)
  }
}

/** Outlined box: ink border with a fill and a top highlight and bottom shade. */
export function box(
  c: Ctx,
  x: number,
  y: number,
  w: number,
  h: number,
  fill: string,
  light?: string,
  shade?: string,
) {
  r(c, pal.ink, x, y, w, h)
  r(c, fill, x + 1, y + 1, w - 2, h - 2)
  if (light) r(c, light, x + 1, y + 1, w - 2, 1)
  if (shade) r(c, shade, x + 1, y + h - 2, w - 2, 1)
}

export function hazardStripe(c: Ctx, x: number, y: number, w: number, h: number) {
  r(c, pal.ink, x, y, w, h)
  c.save()
  c.beginPath()
  c.rect(x, y, w, h)
  c.clip()
  for (let i = -h; i < w; i += 6) poly(c, pal.hazard, [[x + i, y + h], [x + i + 3, y + h], [x + i + 3 + h, y], [x + i + h, y]])
  c.restore()
}

export function mix(a: string, b: string, t: number) {
  const pa = parseInt(a.slice(1), 16),
    pb = parseInt(b.slice(1), 16)
  const ch = (s: number) =>
    Math.round(((pa >> s) & 255) * (1 - t) + ((pb >> s) & 255) * t)
  return '#' + ((1 << 24) | (ch(16) << 16) | (ch(8) << 8) | ch(0)).toString(16).slice(1)
}

/** Deterministic hash noise for decoration placement. */
export function hash(n: number) {
  n = Math.imul(n ^ 0x9e3779b9, 0x85ebca6b)
  n ^= n >>> 13
  n = Math.imul(n, 0xc2b2ae35)
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296
}

/** Soft light halos were removed for performance; kept as a no-op hook. */
export function glow(_c: Ctx, _x: number, _y: number, _rad: number, _color: string, _alpha: number) {}
