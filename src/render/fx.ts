// Presentation-only particles, floating callouts, flashes and screen shake.
import { r, type Ctx } from './pixel'

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  max: number
  color: string
  size: number
  gravity: number
  drag: number
  glow?: boolean
}
export interface Floater {
  text: string
  x: number
  y: number
  born: number
  color: string
  big?: boolean
}

export class Fx {
  particles: Particle[] = []
  floaters: Floater[] = []
  shakeMag = 0
  flash: { color: string; until: number; dur: number } | null = null
  reduced = false

  burst(
    x: number,
    y: number,
    n: number,
    o: Partial<Particle> & { speed?: number; spread?: number; angle?: number; colors?: string[] } = {},
  ) {
    const speed = o.speed ?? 40,
      spread = o.spread ?? Math.PI * 2,
      angle = o.angle ?? -Math.PI / 2
    for (let i = 0; i < n; i++) {
      const a = angle + (Math.random() - 0.5) * spread
      const v = speed * (0.4 + Math.random() * 0.8)
      const max = (o.max ?? 0.6) * (0.6 + Math.random() * 0.6)
      this.particles.push({
        x,
        y,
        vx: Math.cos(a) * v,
        vy: Math.sin(a) * v,
        life: max,
        max,
        color: o.colors ? o.colors[i % o.colors.length] : (o.color ?? '#ffd24a'),
        size: o.size ?? 1,
        gravity: o.gravity ?? 0,
        drag: o.drag ?? 0,
        glow: o.glow,
      })
    }
    if (this.particles.length > 160) this.particles.splice(0, this.particles.length - 160)
  }
  sparks(x: number, y: number, n = 10) {
    this.burst(x, y, n, { speed: 70, gravity: 160, max: 0.5, colors: ['#fff6c8', '#ffd24a', '#ff9a2a'], glow: true })
  }
  smoke(x: number, y: number, n = 1, dark = false) {
    this.burst(x, y, n, {
      speed: 8,
      spread: 1.2,
      gravity: -14,
      drag: 1.2,
      max: 1.6,
      size: 3,
      colors: dark ? ['#2a2430', '#3a3440'] : ['#6a6478', '#8a8496', '#5a5468'],
    })
  }
  shake(mag: number) {
    if (!this.reduced) this.shakeMag = Math.max(this.shakeMag, mag)
  }
  flashScreen(color: string, dur: number, now: number) {
    this.flash = { color, until: now + dur, dur }
  }
  say(text: string, x: number, y: number, now: number, color = '#ffffff', big = false) {
    this.floaters = this.floaters.filter((f) => now - f.born < 1400)
    // Stack callouts that land on top of a recent one instead of overlapping.
    for (let i = 0; i < 6; i++) {
      const clash = this.floaters.some((f) => Math.abs(f.x - x) < 60 && Math.abs(f.y - y) < 12 && now - f.born < 900)
      if (!clash) break
      y -= 13
    }
    this.floaters.push({ text, x, y, born: now, color, big })
  }

  update(dt: number) {
    for (const p of this.particles) {
      p.life -= dt
      p.vy += p.gravity * dt
      const d = Math.max(0, 1 - p.drag * dt)
      p.vx *= d
      p.vy *= d
      p.x += p.vx * dt
      p.y += p.vy * dt
    }
    this.particles = this.particles.filter((p) => p.life > 0)
    this.shakeMag = Math.max(0, this.shakeMag - dt * 18)
  }

  shakeOffset(t: number): [number, number] {
    if (this.shakeMag < 0.3) return [0, 0]
    return [Math.round(Math.sin(t * 91) * this.shakeMag), Math.round(Math.cos(t * 73) * this.shakeMag * 0.6)]
  }

  draw(c: Ctx) {
    for (const p of this.particles) {
      const k = p.life / p.max
      c.globalAlpha = Math.min(1, k * 1.5)
      if (p.glow) c.globalCompositeOperation = 'lighter'
      const s = p.size > 1 ? Math.max(1, Math.round(p.size * (0.5 + (1 - k)))) : 1
      r(c, p.color, p.x - s / 2, p.y - s / 2, s, s)
      c.globalCompositeOperation = 'source-over'
    }
    c.globalAlpha = 1
  }
}
