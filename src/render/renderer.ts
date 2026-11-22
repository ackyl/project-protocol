// Full-screen game renderer. A low-resolution pixel-art world is drawn into an
// offscreen buffer, sharply upscaled to the display, then crisp world-anchored
// UI (prompts, gauges, callouts) is drawn on top at display resolution.
import { breachSites, cargo, cargoIds, rules, searchStops, ship, type CargoId, type Dir, type Floor, type SiteId } from '../game/content'
import { atStop, detection, exposure } from '../game/customs'
import { canClimb, cursor, heldItem, mobile, position, shielded, type Game } from '../game/simulation'
import type { GameEvent } from '../app/events'
import { actions } from '../app/interact'
import type { Runner } from '../app/runner'
import type { Focus } from '../app/tutorial'
import { sfx } from '../audio/sfx'
import { Fx } from './fx'
import { pal, r, type Ctx } from './pixel'
import {
  consoleScreen,
  drawShipStatic,
  exhaust,
  machinery,
  rackBack,
  rackFront,
  slotHint,
  vaultBack,
  vaultFront,
  type ShipLook,
} from './ship'
import { debris, space, type Scene } from './space'
import { agitationGauge, breachHole, cell, courier, crate, heatGauge, officer, patchPlate, signalRings, specimen, type Pose } from './sprites'
import {
  AIRLOCK_X,
  BOUNDS,
  BOUNDS_TIGHT,
  CONSOLE_X,
  INNER_L,
  INNER_R,
  LADDER_X,
  ax,
  ceilY,
  floorY,
  gx,
  slotX,
} from './world'

export interface Insets {
  top: number
  right: number
  bottom: number
  left: number
}

interface Banner {
  text: string
  sub?: string
  color: string
  born: number
  dur: number
}

const FONT = '"Barlow Condensed", "Arial Narrow", sans-serif'
const lerp = (a: number, b: number, t: number) => a + (b - a) * t
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))

const LAMPS = [168, 236, 300, 362, 430, 494]
const DAMAGE = [
  [186, 56],
  [300, 46],
  [430, 57],
  [258, 212],
  [486, 210],
  [574, 74],
  [150, 206],
  [364, 212],
] as const

/** Where the officer stands for each search stop. */
function stopSpot(id: string): { x: number; floor: Floor; face: 1 | -1 } {
  if (id === 'lower') return { x: 300, floor: 0, face: -1 }
  if (id === 'top') return { x: 300, floor: 1, face: -1 }
  if (id === 'aft') return { x: slotX('aft') + 26, floor: 0, face: -1 }
  if (id === 'upper') return { x: slotX('upper') + 26, floor: 1, face: -1 }
  return { x: slotX('vault') + 30, floor: 0, face: -1 }
}

export class Renderer {
  private c: Ctx
  private b: Ctx
  private shipCache = document.createElement('canvas')
  fx = new Fx()
  insets: Insets = { top: 0, right: 0, bottom: 0, left: 0 }
  touch = false
  private W = 0
  private H = 0
  private dpr = 1
  private s = 0
  private camX = 0
  private camY = 0
  private t = 0
  private now = 0
  // Visual state
  private face: 1 | -1 = 1
  private step = 0
  private lastX = 0
  private moving = 0
  private climbFrom: number | null = null
  private power = 1
  private travel = 0
  private speed = 0
  private banners: Banner[] = []
  private gaugeFlash: { color: string; until: number } | null = null
  private officer = { x: AIRLOCK_X, floor: 0 as Floor, face: -1 as 1 | -1, step: 0, walking: false, climb: 0, visible: false, leaving: false }
  private gaugeRect = { x: 0, y: 0, w: 0, h: 0 }
  private rivetRects: { dir: Dir; x: number; y: number; w: number; h: number }[] = []
  private patched = new Set<SiteId>()
  private pulses: { x: number; y: number; born: number }[] = []
  /** Tutorial highlight provider. */
  focus: () => Focus | null = () => null
  private unsubs: (() => void)[] = []

  constructor(
    private buf: HTMLCanvasElement,
    private canvas: HTMLCanvasElement,
    private runner: Runner,
  ) {
    this.c = canvas.getContext('2d')!
    this.b = buf.getContext('2d', { alpha: false })!
    this.shipCache.width = 660
    this.shipCache.height = 250
    const sc = this.shipCache.getContext('2d')!
    sc.imageSmoothingEnabled = false
    drawShipStatic(sc)
    this.fx.reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
    this.lastX = runner.game.player.x
    runner.scanReady = () => this.officerAtPost(runner.game)
    this.unsubs.push(runner.onEvent((e) => this.event(e)))
    this.unsubs.push(runner.onFrame((now) => this.frame(now)))
  }
  destroy() {
    this.unsubs.forEach((u) => u())
  }

  // ── Camera ─────────────────────────────────────────────────────────────
  private layout() {
    const W = this.canvas.clientWidth,
      H = this.canvas.clientHeight
    // The overlay only carries text and prompts; cap its resolution.
    const dpr = Math.min(1.5, window.devicePixelRatio || 1)
    if (W !== this.W || H !== this.H || dpr !== this.dpr) {
      this.W = W
      this.H = H
      this.dpr = dpr
      this.canvas.width = Math.round(W * dpr)
      this.canvas.height = Math.round(H * dpr)
    }
    const i = this.insets
    const aw = Math.max(80, W - i.left - i.right),
      ah = Math.max(60, H - i.top - i.bottom)
    const B = aw / ah < 1.1 ? BOUNDS_TIGHT : BOUNDS
    const target = Math.min(aw / B.w, ah / B.h)
    this.s = target
    const cx = i.left + aw / 2,
      cy = i.top + ah / 2
    this.camX = Math.floor(B.x + B.w / 2 - cx / this.s)
    this.camY = Math.floor(B.y + B.h / 2 - cy / this.s)
  }
  toArt(px: number, py: number) {
    return { x: px / this.s + this.camX, y: py / this.s + this.camY }
  }
  private sx(x: number) {
    return (x - this.camX) * this.s
  }
  private sy(y: number) {
    return (y - this.camY) * this.s
  }

  // ── Events → effects & sound ──────────────────────────────────────────
  private say(text: string, x: number, y: number, color = '#fff', big = false) {
    this.fx.say(text, x, y, this.now, color, big)
  }
  private banner(text: string, color: string, sub?: string, dur = 2200) {
    this.banners = [{ text, sub, color, born: this.now, dur }]
  }
  private itemArt(g: Game, id: CargoId) {
    const p = position(g, id)
    if (!p) return { x: this.officerArt().x, y: this.officerArt().y }
    return { x: ax(p.x), y: floorY[p.floor] }
  }
  private officerArt() {
    return { x: this.officer.x, y: floorY[this.officer.floor] }
  }
  private event(e: GameEvent) {
    const g = this.runner.game
    const pxArt = ax(g.player.x),
      pyArt = floorY[g.player.floor]
    switch (e.type) {
      case 'accepted':
        sfx.accept()
        if (!g.training) this.banner('UNDERWAY', '#ffd38a', 'Ash Belt highway · Cinder Gate in 90s')
        break
      case 'restart':
        this.patched.clear()
        this.pulses = []
        this.officer.visible = false
        this.banners = []
        this.fx.particles = []
        break
      case 'pick':
        sfx.pick()
        this.fx.burst(pxArt, pyArt - 2, 6, { speed: 20, gravity: 40, max: 0.4, colors: ['#8a8496', '#6a6478'] })
        break
      case 'drop':
        sfx.drop()
        this.fx.burst(pxArt, pyArt - 1, 10, { speed: 35, spread: 1.6, angle: -Math.PI / 2, gravity: 90, max: 0.45, colors: ['#9a94a8', '#6a6478'] })
        break
      case 'stow': {
        sfx.stow()
        const x = slotX(e.slot),
          y = floorY[e.slot === 'upper' ? 1 : 0]
        const vault = e.slot === 'vault'
        this.say(vault ? 'SHIELDED' : 'SECURED', x, y - 40, vault ? '#62e6ff' : '#7dffa8')
        this.fx.burst(x, y - 16, 12, { speed: 50, max: 0.4, colors: vault ? ['#bff6ff', '#62e6ff'] : ['#d0ffe0', '#7dffa8'], glow: true })
        break
      }
      case 'ejected': {
        sfx.zap()
        const p = this.itemArt(g, e.id)
        this.fx.sparks(p.x, p.y - 20, 18)
        this.say('LATCH BLOWN!', p.x, p.y - 44, '#ffb02a')
        break
      }
      case 'vent': {
        sfx.vent()
        const p = this.itemArt(g, e.id)
        this.fx.burst(p.x, p.y - 10, 50, { speed: 120, max: 0.8, gravity: 40, colors: ['#fff0c8', '#ffb02a', '#ff5a1a', '#ff2a1a'], glow: true })
        this.say('VENTED!', p.x, p.y - 40, '#ff6a3a', true)
        this.say(`−${rules.blastDamage} HULL  −${rules.conditionLoss}% CARGO`, p.x, p.y - 26, '#ffb08a')
        break
      }
      case 'hullLoss': {
        if (e.amount < rules.blastDamage) sfx.hit()
        const [x, y] = DAMAGE[Math.floor(Math.random() * DAMAGE.length)]
        this.fx.sparks(x, y, 8)
        break
      }
      case 'climbStart':
        this.climbFrom = ax(e.fromX)
        break
      case 'climbEnd':
        this.climbFrom = null
        break
      case 'surge':
        sfx.surge()
                for (const x of [CONSOLE_X, 176, 236, 300, 380, 460]) this.fx.sparks(x, ceilY(1) + 10, 14)
        this.fx.sparks(CONSOLE_X, floorY[1] - 34, 24)
        this.banner('POWER SURGE', '#ff4a4a', 'Bus fault · hull is draining', 2600)
        break
      case 'repaired':
        sfx.repaired()
                this.gaugeFlash = { color: '#7dffa8', until: this.now + 300 }
        this.fx.burst(CONSOLE_X, floorY[1] - 30, 30, { speed: 80, max: 0.6, colors: ['#d0ffe0', '#7dffa8', '#ffffff'], glow: true })
        this.say('POWER RESTORED', CONSOLE_X, floorY[1] - 52, '#7dffa8', true)
        break
      case 'impact': {
        sfx.impact()
        const b = breachSites[e.site]
        const x = ax(b.x),
          y = floorY[b.floor] - 30
        this.fx.burst(x, y, 24, { speed: 110, max: 0.6, gravity: 60, colors: ['#ffffff', '#bfe8ff', '#8a90a8'] })
        this.say(`−${rules.impactDamage} HULL`, x, y - 24, '#bfe8ff')
        this.banner('HULL BREACH', '#62e6ff', `${b.name} · patch it before the hull bleeds out`, 2600)
        break
      }
      case 'patchOpen':
        sfx.open()
        break
      case 'rivet': {
        sfx.rivet(e.progress)
        const b = g.breach ? breachSites[g.breach.site] : null
        if (b) this.fx.sparks(ax(b.x), floorY[b.floor] - 30, 5)
        break
      }
      case 'slip': {
        sfx.miss()
        const b = g.breach ? breachSites[g.breach.site] : null
        if (b) {
          this.fx.sparks(ax(b.x), floorY[b.floor] - 30, 14)
          this.say(`SLIPPED  −${rules.slipDamage}`, ax(b.x), floorY[b.floor] - 56, '#ff8a6a')
        }
        this.gaugeFlash = { color: '#ff3d4a', until: this.now + 260 }
        break
      }
      case 'sealed': {
        sfx.repaired()
        this.patched.add(e.site)
        const b = breachSites[e.site]
        this.fx.burst(ax(b.x), floorY[b.floor] - 30, 20, { speed: 70, max: 0.5, colors: ['#bfe8ff', '#ffffff'] })
        this.say('BREACH SEALED', ax(b.x), floorY[b.floor] - 58, '#62e6ff', true)
        break
      }
      case 'pulse': {
        sfx.pulse()
        const p = this.itemArt(g, e.id)
        this.pulses.push({ x: p.x, y: p.y - 12, born: this.now })
        this.fx.burst(p.x, p.y - 12, 18, { speed: 90, max: 0.5, colors: ['#ff7ad8', '#9dff6a', '#ffffff'] })
        this.say('SPECIMEN PULSE!', p.x, p.y - 44, '#ff7ad8', true)
        this.say(`−${rules.pulseConditionLoss}% CARGO · LATCHES BLOWN`, p.x, p.y - 30, '#ffb0e8')
        break
      }
      case 'consoleOpen':
        sfx.open()
        break
      case 'repairMiss':
        sfx.miss()
        this.gaugeFlash = { color: '#ff3d4a', until: this.now + 260 }
        this.fx.sparks(CONSOLE_X, floorY[1] - 30, 14)
        break
      case 'prep':
        sfx.open()
        this.banner('CINDER GATE AHEAD', '#ffb02a', `${rules.prep}s until customs boards — hide the cargo`, 2800)
        break
      case 'boarded':
        sfx.stamp()
        this.officer = { ...this.officer, x: AIRLOCK_X, floor: 0, face: -1, visible: true, leaving: false, climb: 0 }
        this.banner('CUSTOMS BOARDING', '#ff7a5a', 'Five checkpoints. Every one costs something.', 2200)
        break
      case 'stopCleared': {
        const o = this.officerArt()
        if (e.bribed) {
          sfx.coin()
          this.say(`BRIBED  −${rules.bribe}¢`, o.x, o.y - 50, '#ffd24a')
        } else {
          sfx.clear()
          this.say('CLEAR', o.x, o.y - 50, '#7dffa8')
        }
        break
      }
      case 'surrender': {
        sfx.stamp()
        const o = this.officerArt()
        this.fx.burst(o.x - 20, o.y - 10, 20, { speed: 40, max: 0.6, colors: ['#ffffff', '#c0c0d0'] })
        this.say(`${cargo[e.id].name.toUpperCase()} SEIZED`, o.x, o.y - 50, '#ff9a7a')
        break
      }
      case 'outcome':
        if (e.outcome === 'delivered') {
          sfx.delivered()
          this.officer.leaving = true
          this.banner('GATE CLEARED', '#7dffa8', 'Freight delivered', 1600)
        } else if (e.outcome === 'arrest') {
          sfx.busted()
          this.banner('CONTRABAND DETECTED', '#ff3d4a', 'Courier detained', 2400)
        } else {
          sfx.boom()
          for (const [x, y] of DAMAGE) {
            this.fx.burst(x, y, 30, { speed: 140, max: 1.2, colors: ['#fff0c8', '#ffb02a', '#ff5a1a'], glow: true })
          }
          this.banner('HULL FAILURE', '#ff5a3a', 'The Ash Belt keeps what it takes', 2600)
        }
        break
    }
  }

  // ── Frame ──────────────────────────────────────────────────────────────
  private lastRender = 0
  private frame(now: number) {
    const g = this.runner.game
    sfx.update(now, {
      alarm: g.fault && g.phase === 'highway',
      breach: !!g.breach && g.phase === 'highway',
      agitation: g.phase === 'highway' ? g.items.specimen.agitation : 0,
      heat: mobile(g) && g.phase === 'highway' ? g.items.cell.heat : 0,
      engine: g.phase === 'highway' ? 1 : g.phase === 'prep' ? 0.6 : g.phase === 'contract' ? 0.25 : 0,
    })
    // The simulation runs at 30 Hz, so drawing faster only burns GPU time.
    if (now - this.lastRender < 1000 / 31) return
    const step = Math.min(0.1, (now - this.lastRender) / 1000)
    this.lastRender = now
    this.now = now
    this.t += step
    this.layout()
    this.fx.update(step)
    this.updateVisuals(g, step)
    this.world(g)
    this.overlay(g)
  }
  private scene(g: Game): Scene {
    if (g.phase === 'contract') return 'dock'
    if (g.phase === 'highway') return 'highway'
    if (g.phase === 'prep') return 'approach'
    if (g.phase === 'result' && g.outcome === 'death') return 'wreck'
    return 'gate'
  }

  private updateVisuals(g: Game, dt: number) {
    // Courier facing and walk cycle
    const x = g.player.x
    const dx = x - this.lastX
    if (Math.abs(dx) > 0.01 && Math.abs(dx) < 30) {
      this.face = dx > 0 ? 1 : -1
      const before = Math.floor(this.step)
      this.step += Math.abs(dx) / 9
      if (Math.floor(this.step) !== before && Math.floor(this.step) % 2 === 0) sfx.step()
      this.moving = 0.12
    } else this.moving = Math.max(0, this.moving - dt)
    this.lastX = x
    if (g.climb) {
      const before = Math.floor(this.step)
      this.step += dt * 7
      if (Math.floor(this.step) !== before) sfx.climb()
    }
    // Lighting
    const target = g.outcome === 'death' ? 0 : g.fault ? 0.18 : 1
    this.power = lerp(this.power, target, Math.min(1, dt * 5))
    // Travel speed
    const scene = this.scene(g)
    const want = scene === 'highway' ? 140 : scene === 'approach' ? lerp(140, 8, g.elapsed / (rules.prep * rules.hz)) : 0
    this.speed = lerp(this.speed, want, Math.min(1, dt * 2))
    this.travel += this.speed * dt
    // Air rushing toward an open breach (a handful of streaks per second)
    if (g.breach && g.phase === 'highway' && Math.random() < dt * 10) {
      const b = breachSites[g.breach.site]
      const x = ax(b.x),
        y = floorY[b.floor] - 30
      const sx = x + (Math.random() < 0.5 ? -1 : 1) * (30 + Math.random() * 40)
      const sy = y + (Math.random() - 0.5) * 36
      this.fx.burst(sx, sy, 1, { speed: 0, max: 0.5, colors: ['#bfe8ff'] })
      const p = this.fx.particles[this.fx.particles.length - 1]
      p.vx = (x - sx) * 2
      p.vy = (y - sy) * 2
    }
    this.updateOfficer(g, dt)
  }

  private updateOfficer(g: Game, dt: number) {
    const o = this.officer
    // Never leave a search without an officer to perform it.
    if (g.phase === 'search' && !o.visible) Object.assign(o, { visible: true, leaving: false, x: AIRLOCK_X, floor: 0, climb: 0 })
    if (!o.visible) return
    let goal: { x: number; floor: Floor; face: 1 | -1 }
    if (o.leaving) goal = { x: AIRLOCK_X, floor: 0, face: 1 }
    else if (g.phase === 'search') goal = stopSpot(searchStops[g.stop].id)
    else return
    o.walking = false
    if (o.climb > 0) {
      o.climb -= dt
      if (o.climb <= 0) o.floor = o.floor === 0 ? 1 : 0
      o.step += dt * 6
      return
    }
    const tx = o.floor !== goal.floor ? LADDER_X : goal.x
    const d = tx - o.x
    const sp = 100 * dt
    if (Math.abs(d) > sp) {
      o.x += Math.sign(d) * sp
      o.face = d > 0 ? 1 : -1
      o.step += sp / 9
      o.walking = true
    } else {
      o.x = tx
      if (o.floor !== goal.floor) o.climb = 0.45
      else {
        o.face = goal.face
        if (o.leaving) o.visible = false
      }
    }
  }

  private officerAtPost(g: Game) {
    const o = this.officer
    if (!o.visible || g.phase !== 'search' || o.climb > 0) return false
    const goal = stopSpot(searchStops[g.stop].id)
    return o.floor === goal.floor && Math.abs(o.x - goal.x) < 1
  }

  // ── World (pixel buffer) ──────────────────────────────────────────────
  private world(g: Game) {
    const bw = Math.ceil(this.W / this.s) + 1,
      bh = Math.ceil(this.H / this.s) + 1
    if (this.buf.width !== bw || this.buf.height !== bh) {
      this.buf.width = bw
      this.buf.height = bh
      this.buf.style.width = bw * this.s + 'px'
      this.buf.style.height = bh * this.s + 'px'
    }
    const c = this.b
    c.imageSmoothingEnabled = false
    c.setTransform(1, 0, 0, 1, 0, 0)
    const scene = this.scene(g)
    const ox = Math.floor(this.camX),
      oy = Math.floor(this.camY)
    space(c, {
      W: bw,
      H: bh,
      camX: ox,
      camY: oy,
      scene,
      travel: this.travel,
      t: this.t,
      approach: g.phase === 'prep' ? g.elapsed / (rules.prep * rules.hz) : 0,
      alarm: g.outcome === 'arrest' ? 1 : this.runner.ui.scanning ? 0.4 : 0,
    })
    c.translate(-ox, -oy)
    const power = this.power
    const look: ShipLook = {
      t: this.t,
      power,
      fault: g.fault,
      thrust: scene === 'highway' ? 1 : scene === 'approach' ? lerp(1, 0.25, g.elapsed / (rules.prep * rules.hz)) : scene === 'dock' ? 0.2 : 0,
      hull: g.hull,
      airlockOpen: this.officer.visible ? 1 : 0,
    }
    exhaust(c, look)
    c.drawImage(this.shipCache, 0, 0)
    // Slots (backs)
    rackBack(c, slotX('aft'), 0)
    rackBack(c, slotX('upper'), 1)
    vaultBack(c, this.t)
    this.lighting(c, g, power)
    machinery(c, look)
    consoleScreen(c, look, g.repairTicks !== null)
    for (const site of this.patched) patchPlate(c, ax(breachSites[site].x), floorY[breachSites[site].floor])
    if (g.breach) {
      const b = breachSites[g.breach.site]
      breachHole(c, ax(b.x), floorY[b.floor], this.t)
    }
    this.searchMarks(c, g)
    this.items(c, g, 'slot')
    // Slot fronts
    const occ = (s: 'aft' | 'upper' | 'vault') =>
      cargoIds.some((id) => {
        const l = g.items[id].location
        return l.kind === 'slot' && l.slot === s
      })
    const cooling = (s: 'aft' | 'upper') => {
      const l = g.items.cell.location
      return l.kind === 'slot' && l.slot === s && g.items.cell.heat > 0 && g.phase === 'highway' ? 1 : 0
    }
    rackFront(c, slotX('aft'), 0, occ('aft'), this.t, cooling('aft'))
    rackFront(c, slotX('upper'), 1, occ('upper'), this.t + 0.5, cooling('upper'))
    vaultFront(c, this.t, occ('vault'), Math.max(0.3, power))
    if (mobile(g) && heldItem(g) && !g.climb) {
      if (!occ('aft')) slotHint(c, slotX('aft'), 0, 36, 36, '#7dffa8', this.t)
      if (!occ('upper')) slotHint(c, slotX('upper'), 1, 36, 36, '#7dffa8', this.t)
      if (!occ('vault')) slotHint(c, slotX('vault'), 0, 44, 52, '#62e6ff', this.t)
    }
    this.items(c, g, 'loose')
    if (this.officer.visible) this.drawOfficer(c, g)
    this.drawCourier(c, g)
    this.items(c, g, 'held')
    this.damage(c, g)
    if (scene === 'wreck') debris(c, 0, 0, 0)
    // Specimen pulse shockwaves (a few cheap expanding rings)
    this.pulses = this.pulses.filter((p) => this.now - p.born < 600)
    for (const p of this.pulses) {
      const k = (this.now - p.born) / 600
      c.strokeStyle = k < 0.5 ? '#ff7ad8' : '#9dff6a'
      c.globalAlpha = 1 - k
      c.lineWidth = 2
      c.beginPath()
      c.arc(p.x, p.y, 6 + k * 70, 0, Math.PI * 2)
      c.stroke()
      c.globalAlpha = 1
    }
    this.fx.draw(c)
    c.setTransform(1, 0, 0, 1, 0, 0)
  }

  private lighting(c: Ctx, g: Game, power: number) {
    const top = ceilY(1),
      w = INNER_R - INNER_L
    // Ambient darkness over the interior
    c.fillStyle = `rgba(6,4,16,${0.12 + (1 - power) * 0.55})`
    c.fillRect(INNER_L, top, w, floorY[0] - top)
    for (const f of [0, 1] as Floor[]) {
      for (const x of LAMPS) {
        const y = ceilY(f) + 9
        r(c, pal.ink, x - 5, y, 10, 3)
        r(c, power > 0.5 ? '#ffe6b0' : '#4a3a2a', x - 4, y + 1, 8, 2)
      }
    }
    // Emergency beacons during a fault
    if (g.fault && g.phase === 'highway') {
      const reduced = this.fx.reduced
      for (const [i, x] of [200, 330, 462].entries()) {
        for (const f of [0, 1] as Floor[]) {
          const y = ceilY(f) + 8
          const a = reduced ? 1 : Math.floor(this.t * 2 + i) % 2
          r(c, pal.ink, x - 3, y - 1, 6, 4)
          r(c, a > 0.5 ? '#ff4a4a' : '#7a1a1a', x - 2, y, 4, 2)
        }
      }
    }
    // Customs inspection floodlights tint the interior cold
    if (g.phase === 'search' || (g.phase === 'result' && g.outcome !== 'death')) {
      c.fillStyle = 'rgba(40,70,140,0.12)'
      c.fillRect(INNER_L, top, w, floorY[0] - top)
    }
  }

  private searchMarks(c: Ctx, g: Game) {
    if (g.phase !== 'search') return
    const stop = searchStops[g.stop].id
    const scanning = this.runner.ui.scanning
    const at = this.officerAtPost(g)
    if (!at) return
    const speed = scanning ? 3 : 0.8
    const k = (this.t * speed) % 1
    if (stop === 'lower' || stop === 'top') {
      const f: Floor = stop === 'top' ? 1 : 0
      const y = ceilY(f) + 10 + k * DECK_LINE(f)
      c.save()
      c.globalCompositeOperation = 'lighter'
      r(c, `rgba(255,60,80,${scanning ? 0.9 : 0.5})`, INNER_L, Math.round(y), INNER_R - INNER_L, 1)
      c.fillStyle = `rgba(255,40,60,${scanning ? 0.12 : 0.06})`
      c.fillRect(INNER_L, ceilY(f) + 10, INNER_R - INNER_L, DECK_LINE(f))
      c.restore()
    } else {
      const x = slotX(stop),
        f: Floor = stop === 'upper' ? 1 : 0
      const o = this.officer
      c.save()
      c.globalCompositeOperation = 'lighter'
      c.fillStyle = `rgba(255,50,70,${scanning ? 0.3 : 0.16})`
      c.beginPath()
      c.moveTo(o.x - 16, floorY[f] - 21)
      c.lineTo(x + 18, floorY[f] - 44)
      c.lineTo(x + 18, floorY[f])
      c.closePath()
      c.fill()
      r(c, `rgba(255,80,90,${scanning ? 1 : 0.6})`, x - 20, floorY[f] - 44 + Math.round(k * 44), 40, 1)
      c.restore()
    }
  }

  private items(c: Ctx, g: Game, pass: 'slot' | 'loose' | 'held') {
    const cx = this.courierX(g),
      cy = this.courierY(g)
    for (const id of cargoIds) {
      const item = g.items[id],
        loc = item.location
      if (loc.kind === 'surrendered') continue
      if (loc.kind !== pass) continue
      if (g.phase === 'result' && g.outcome === 'death') continue
      let x: number, y: number
      if (loc.kind === 'held') {
        x = cx
        y = cy - 29 + (g.climb ? 0 : this.moving > 0 && Math.floor(this.step) % 2 ? -1 : 0)
      } else if (loc.kind === 'slot') {
        x = slotX(loc.slot)
        y = floorY[loc.slot === 'upper' ? 1 : 0] - (loc.slot === 'vault' ? 5 : 4)
      } else {
        x = ax(loc.x)
        y = floorY[loc.floor]
      }
      const live = mobile(g)
      if (id === 'cell') {
        const hot = live && item.heat > 70 && loc.kind !== 'slot'
        cell(c, x, y, { heat: g.phase === 'contract' ? 18 : item.heat, condition: item.condition, t: this.t, shake: hot })
        if (live && g.phase === 'highway' && (item.heat > 1 || loc.kind !== 'slot')) heatGauge(c, x, y - 30, item.heat, this.t)
      } else if (id === 'specimen') {
        specimen(c, x, y, { agitation: item.agitation, condition: item.condition, t: this.t })
        if (live && g.phase === 'highway' && item.agitation > 1) agitationGauge(c, x, y - 32, item.agitation, this.t)
      } else {
        const exposed = !shielded(item)
        if (exposed && (live || g.phase === 'search')) signalRings(c, x, y, this.t, g.phase === 'highway' ? 0.5 : 1)
        crate(c, x, y, { t: this.t, exposed, condition: item.condition })
      }
    }
  }

  private courierX(g: Game) {
    const p = this.runner.prev,
      a = this.runner.alpha
    if (g.climb) {
      const k = clamp((g.climb.ticks + a) / 4, 0, 1)
      return Math.round(lerp(this.climbFrom ?? LADDER_X, LADDER_X, k))
    }
    if (p.player.floor === g.player.floor && !p.climb) return ax(lerp(p.player.x, g.player.x, a))
    return ax(g.player.x)
  }
  private courierY(g: Game) {
    if (!g.climb) return floorY[g.player.floor]
    const k = clamp((g.climb.ticks + this.runner.alpha) / rules.climbTicks, 0, 1)
    return lerp(floorY[g.player.floor], floorY[g.climb.to], k)
  }

  private drawCourier(c: Ctx, g: Game) {
    if (g.phase === 'result' && g.outcome === 'death') return
    const pose: Pose = g.climb
      ? 'climb'
      : g.repairTicks !== null
        ? 'work'
        : this.moving > 0 && mobile(g)
          ? 'walk'
          : 'idle'
    const face = g.repairTicks !== null ? (ship.station.x < g.player.x ? -1 : 1) : this.face
    courier(c, {
      x: this.courierX(g),
      y: this.courierY(g),
      face,
      pose,
      step: this.step,
      t: this.t,
      carrying: !!heldItem(g),
      panic: (g.fault && g.phase === 'highway') || g.items.cell.heat > 70 || g.phase === 'search',
    })
    if (g.outcome === 'arrest') {
      // Cuffs
      const x = this.courierX(g),
        y = this.courierY(g)
      r(c, '#c0c8e0', x - 2, y - 13, 5, 2)
    }
  }

  private drawOfficer(c: Ctx, g: Game) {
    const o = this.officer
    if (o.climb > 0) {
      const k = 1 - o.climb / 0.45
      const from = floorY[o.floor],
        to = floorY[o.floor === 0 ? 1 : 0]
      officer(c, { x: o.x, y: lerp(from, to, k), face: o.face, step: o.step, walking: true, scanning: false, t: this.t })
      return
    }
    officer(c, {
      x: o.x,
      y: floorY[o.floor],
      face: o.face,
      step: o.step,
      walking: o.walking,
      scanning: this.officerAtPost(g),
      t: this.t,
    })
  }

  private damage(c: Ctx, g: Game) {
    const dmg = 1 - g.hull / rules.hull
    const n = Math.floor(dmg * DAMAGE.length)
    for (let i = 0; i < n; i++) {
      const [x, y] = DAMAGE[i]
      r(c, '#120c10', x - 3, y - 2, 7, 4)
      r(c, '#2a1a1a', x - 5, y - 1, 11, 2)
      if (dmg > 0.5 && Math.floor(this.t * 12 + i) % 3) r(c, '#ff9a2a', x - 1, y - 3, 2, 2)
    }
  }

  // ── Crisp overlay ──────────────────────────────────────────────────────
  private overlay(g: Game) {
    const c = this.c
    c.setTransform(1, 0, 0, 1, 0, 0)
    c.clearRect(0, 0, this.canvas.width, this.canvas.height)
    c.setTransform(this.dpr, 0, 0, this.dpr, 0, 0)
    c.textBaseline = 'middle'
    c.textAlign = 'center'
    const s = this.s
    const ui = clamp(s / 2, 0.75, 1.35)
    if (mobile(g)) this.prompts(c, g, ui)
    if (g.phase === 'prep') this.riskTags(c, g, ui, false)
    if (g.phase === 'search' && this.officerAtPost(g) && s >= 1.2) this.riskTags(c, g, ui, true)
    if (g.repairTicks !== null) this.gauge(c, g, ui)
    else this.gaugeRect.w = 0
    if (g.patch !== null && g.breach) this.patchPanel(c, g, ui)
    else this.rivetRects = []
    const f = this.focus()
    if (f) this.brackets(c, f)
    // Floaters
    for (const f of this.fx.floaters) {
      const age = (this.now - f.born) / 1000
      if (age > 1.3) continue
      const x = this.sx(f.x),
        y = this.sy(f.y) - age * 28
      c.globalAlpha = clamp(1.4 - age, 0, 1)
      this.text(c, f.text, x, y, (f.big ? 22 : 15) * ui, f.color)
      c.globalAlpha = 1
    }
    // Banners
    for (const b of this.banners) {
      const age = this.now - b.born
      if (age > b.dur) continue
      const k = clamp(age / 180, 0, 1) * clamp((b.dur - age) / 300, 0, 1)
      const y = this.insets.top + 30 + (1 - k) * -12
      c.globalAlpha = k
      const size = clamp(Math.min(this.W / 18, this.H / 15), 22, 46)
      c.font = `italic 800 ${size}px ${FONT}`
      const tw = c.measureText(b.text).width
      c.fillStyle = 'rgba(10,6,18,0.72)'
      c.beginPath()
      c.moveTo(this.W / 2 - tw / 2 - 30, y - size * 0.55)
      c.lineTo(this.W / 2 + tw / 2 + 40, y - size * 0.55)
      c.lineTo(this.W / 2 + tw / 2 + 30, y + size * 0.55 + (b.sub ? 18 : 0))
      c.lineTo(this.W / 2 - tw / 2 - 40, y + size * 0.55 + (b.sub ? 18 : 0))
      c.closePath()
      c.fill()
      c.fillStyle = b.color
      c.fillRect(this.W / 2 - tw / 2 - 30, y - size * 0.55, tw + 70, 3)
      this.text(c, b.text, this.W / 2, y, size, b.color, true)
      if (b.sub) {
        c.font = `600 ${clamp(size * 0.36, 12, 15)}px ${FONT}`
        c.fillStyle = '#e8e0f0'
        c.fillText(b.sub.toUpperCase(), this.W / 2, y + size * 0.55 + 6)
      }
      c.globalAlpha = 1
    }
  }

  private text(c: Ctx, str: string, x: number, y: number, size: number, color: string, italic = false) {
    c.font = `${italic ? 'italic ' : ''}800 ${size}px ${FONT}`
    c.lineWidth = Math.max(3, size / 5)
    c.strokeStyle = 'rgba(10,6,18,0.95)'
    c.lineJoin = 'round'
    c.strokeText(str, x, y)
    c.fillStyle = color
    c.fillText(str, x, y)
  }

  private keycap(c: Ctx, key: string, x: number, y: number, size: number, color = '#ffd38a') {
    c.font = `800 ${size}px ${FONT}`
    const w = Math.max(size * 1.15, c.measureText(key).width + size * 0.6),
      h = size * 1.2
    c.fillStyle = 'rgba(10,6,18,0.9)'
    c.fillRect(x - w / 2 - 2, y - h / 2 - 2, w + 4, h + 6)
    c.fillStyle = color
    c.fillRect(x - w / 2, y - h / 2, w, h + 2)
    c.fillStyle = '#fff6e0'
    c.fillRect(x - w / 2, y - h / 2, w, h - 2)
    c.fillStyle = '#1a1220'
    c.fillText(key, x, y + 1)
    return w
  }

  private chip(c: Ctx, key: string | null, label: string, x: number, y: number, ui: number, color: string, notchUp = false) {
    const size = 14 * ui
    c.font = `800 ${size}px ${FONT}`
    const lw = c.measureText(label).width
    const kw = key && !this.touch ? size * 1.5 : 0
    const w = lw + kw + 16 * ui,
      h = size * 1.7
    const x0 = x - w / 2
    c.fillStyle = 'rgba(12,8,22,0.88)'
    c.fillRect(x0, y - h / 2, w, h)
    c.fillStyle = color
    c.fillRect(x0, notchUp ? y - h / 2 : y + h / 2 - 2, w, 2)
    // pointer notch
    const ny = notchUp ? y - h / 2 : y + h / 2
    c.beginPath()
    c.moveTo(x - 5, ny)
    c.lineTo(x + 5, ny)
    c.lineTo(x, ny + (notchUp ? -6 : 6))
    c.closePath()
    c.fill()
    if (key && !this.touch) this.keycap(c, key, x0 + 6 * ui + kw / 2 - 2, y, size * 0.9, color)
    c.fillStyle = '#fff6e8'
    c.textAlign = 'left'
    c.fillText(label, x0 + 8 * ui + kw, y + 1)
    c.textAlign = 'center'
  }

  private prompts(c: Ctx, g: Game, ui: number) {
    const pulse = (Math.sin(this.t * 6) + 1) / 2
    // Emergency marker over the console
    const acts = actions(g)
    if (g.fault && g.phase === 'highway' && g.repairTicks === null && acts[0]?.cmd.type !== 'repair') {
      const x = this.sx(CONSOLE_X),
        y = this.sy(floorY[1] - 50) - pulse * 6
      this.diamond(c, x, y, 13 * ui, '#ff3d4a', '!')
    }
    // Overheating cell marker
    const cp = position(g, 'cell')
    if (cp && g.phase === 'highway' && g.items.cell.heat > 60 && g.items.cell.location.kind === 'loose') {
      this.diamond(c, this.sx(ax(cp.x)), this.sy(floorY[cp.floor] - 46) - pulse * 5, 11 * ui, '#ff8a2a', '!')
    }
    // Breach marker (cold blue: vacuum, not electrical)
    if (g.breach && g.phase === 'highway' && g.patch === null && acts[0]?.cmd.type !== 'patch') {
      const b = breachSites[g.breach.site]
      this.diamond(c, this.sx(ax(b.x)), this.sy(floorY[b.floor] - 52) - pulse * 6, 12 * ui, '#62e6ff', '!')
    }
    // Restless specimen marker
    const sp = position(g, 'specimen')
    if (sp && g.phase === 'highway' && g.items.specimen.agitation > 70 && g.items.specimen.location.kind !== 'held') {
      this.diamond(c, this.sx(ax(sp.x)), this.sy(floorY[sp.floor] - 48) - pulse * 5, 11 * ui, '#ff7ad8', '!')
    }
    if (g.climb || g.repairTicks !== null || g.patch !== null) return
    // Nearest context action
    const held = heldItem(g)
    const a = acts[0]
    if (a) {
      const top = a.cmd.type === 'repair' ? 46 : a.cmd.type === 'patch' ? 50 : a.cmd.type === 'stow' ? (a.cmd.slot === 'vault' ? 58 : 42) : 34
      const x = this.sx(ax(a.at.x)),
        y = this.sy(floorY[a.at.floor] - top) - 14 * ui
      const col =
        a.cmd.type === 'repair'
          ? '#ff6a5a'
          : a.cmd.type === 'patch'
            ? '#62e6ff'
            : a.cmd.type === 'stow'
            ? a.cmd.slot === 'vault'
              ? '#62e6ff'
              : '#7dffa8'
            : a.verb === 'Take'
              ? '#8a84a0'
              : '#ffd38a'
      const label = a.cmd.type === 'stow' ? (a.cmd.slot === 'vault' ? 'Shield' : 'Stow') : a.verb
      this.chip(c, 'E', label, x, y, ui, col)
    } else if (held && !this.touch) {
      const x = this.sx(this.courierX(g)),
        y = this.sy(this.courierY(g) - 54)
      this.chip(c, 'Q', 'Drop', x, y, ui * 0.85, '#b8b2c8')
    }
    // Ladder hint
    const other: Floor = g.player.floor === 0 ? 1 : 0
    if (canClimb(g, other)) {
      const x = this.sx(LADDER_X + 16),
        y = this.sy(floorY[g.player.floor] - 20)
      c.globalAlpha = 0.95
      if (!this.touch) this.keycap(c, other ? 'W' : 'S', x + 10 * ui, y, 13 * ui, '#f5c542')
      this.arrow(c, x + (this.touch ? 6 : 26) * ui, y, other ? -1 : 1, 7 * ui, '#f5c542')
      c.globalAlpha = 1
    }
  }

  private diamond(c: Ctx, x: number, y: number, size: number, color: string, glyph: string) {
    c.save()
    c.translate(x, y)
    c.rotate(Math.PI / 4)
    c.fillStyle = 'rgba(10,6,18,0.95)'
    c.fillRect(-size - 3, -size - 3, size * 2 + 6, size * 2 + 6)
    c.fillStyle = color
    c.fillRect(-size, -size, size * 2, size * 2)
    c.restore()
    c.font = `900 ${size * 1.5}px ${FONT}`
    c.fillStyle = '#fff6e0'
    c.fillText(glyph, x, y + 1)
  }

  private arrow(c: Ctx, x: number, y: number, dir: 1 | -1, size: number, color: string) {
    const bob = Math.sin(this.t * 8) * 2 * dir
    c.fillStyle = 'rgba(10,6,18,0.9)'
    c.beginPath()
    c.moveTo(x - size - 2, y - dir * (size / 2 + 2) + bob)
    c.lineTo(x + size + 2, y - dir * (size / 2 + 2) + bob)
    c.lineTo(x, y + dir * (size + 3) + bob)
    c.closePath()
    c.fill()
    c.fillStyle = color
    c.beginPath()
    c.moveTo(x - size, y - (dir * size) / 2 + bob)
    c.lineTo(x + size, y - (dir * size) / 2 + bob)
    c.lineTo(x, y + dir * size + bob)
    c.closePath()
    c.fill()
  }

  private riskTags(c: Ctx, g: Game, ui: number, onlyStop: boolean) {
    for (const id of cargoIds) {
      const loc = g.items[id].location
      if (loc.kind === 'surrendered') continue
      if (onlyStop && !atStop(g, id)) continue
      const risk = onlyStop ? detection(g, id) : exposure(g, id)
      const p = position(g, id)!
      const ax0 = loc.kind === 'held' ? this.courierX(g) : ax(p.x)
      // Tags hang under the deck plating, clear of the action prompts above.
      const ay = (loc.kind === 'held' ? this.courierY(g) : floorY[p.floor]) + 9
      const pct = Math.round(risk * 100)
      const col = pct === 0 ? '#7dffa8' : pct < 100 ? '#ffb02a' : '#ff3d4a'
      const label = pct === 0 ? 'HIDDEN' : `${pct}% SEEN`
      this.chip(c, null, label, this.sx(ax0), this.sy(ay) + 4 * ui, ui * 0.85, col, true)
    }
  }

  private gauge(c: Ctx, g: Game, ui: number) {
    const w = Math.min(this.W - 24, 300 * ui),
      h = 96 * ui
    let x = this.sx(CONSOLE_X) - w / 2
    x = clamp(x, 12, this.W - w - 12)
    let y = this.sy(floorY[1] - 60) - h
    y = Math.max(this.insets.top + 6, y)
    this.gaugeRect = { x, y, w, h }
    const flash = this.gaugeFlash && this.now < this.gaugeFlash.until ? this.gaugeFlash.color : null
    c.fillStyle = 'rgba(10,6,18,0.94)'
    c.fillRect(x - 3, y - 3, w + 6, h + 6)
    c.fillStyle = flash ?? '#3a3050'
    c.fillRect(x, y, w, h)
    c.fillStyle = '#16101f'
    c.fillRect(x + 3, y + 3, w - 6, h - 6)
    c.textAlign = 'left'
    c.font = `italic 800 ${16 * ui}px ${FONT}`
    c.fillStyle = '#ff6a5a'
    c.fillText('PHASE LOCK', x + 14 * ui, y + 16 * ui)
    c.textAlign = 'right'
    c.font = `700 ${13 * ui}px ${FONT}`
    c.fillStyle = '#b8b2c8'
    c.fillText(this.touch ? 'TAP TO LOCK' : 'E / SPACE  LOCK    ESC  LEAVE', x + w - 14 * ui, y + 16 * ui)
    c.textAlign = 'center'
    // Track
    const tx = x + 14 * ui,
      tw = w - 28 * ui,
      ty = y + 34 * ui,
      th = 30 * ui
    c.fillStyle = '#05030a'
    c.fillRect(tx, ty, tw, th)
    const b0 = tx + tw * rules.targetStart,
      b1 = tx + tw * rules.targetEnd
    c.fillStyle = '#1f5a3e'
    c.fillRect(b0, ty, b1 - b0, th)
    c.save()
    c.beginPath()
    c.rect(b0, ty, b1 - b0, th)
    c.clip()
    c.fillStyle = '#2f8a5a'
    for (let i = -th; i < b1 - b0; i += 10) {
      c.beginPath()
      c.moveTo(b0 + i, ty + th)
      c.lineTo(b0 + i + 5, ty + th)
      c.lineTo(b0 + i + 5 + th, ty)
      c.lineTo(b0 + i + th, ty)
      c.fill()
    }
    c.restore()
    c.fillStyle = '#7dffa8'
    c.fillRect(b0, ty - 3, 2, th + 6)
    c.fillRect(b1 - 2, ty - 3, 2, th + 6)
    for (let i = 0; i <= 20; i++) {
      c.fillStyle = '#3a3050'
      c.fillRect(tx + (tw * i) / 20, ty + th - (i % 5 ? 5 : 10), 1, i % 5 ? 5 : 10)
    }
    // Needle
    const cur = cursor(g)
    const inBand = cur >= rules.targetStart && cur <= rules.targetEnd
    const nx = tx + tw * cur
    c.fillStyle = inBand ? '#d0ffe0' : '#ffd24a'
    c.fillRect(nx - 2, ty - 6, 4, th + 12)
    c.beginPath()
    c.moveTo(nx - 7, ty - 10)
    c.lineTo(nx + 7, ty - 10)
    c.lineTo(nx, ty - 2)
    c.closePath()
    c.fill()
    // Hull drain reminder
    c.font = `700 ${12 * ui}px ${FONT}`
    c.fillStyle = Math.floor(this.t * 4) % 2 ? '#ff6a5a' : '#ffb0a0'
    c.fillText('HULL DRAINING — CLOCK STILL RUNNING', x + w / 2, y + h - 12 * ui)
  }

  private patchPanel(c: Ctx, g: Game, ui: number) {
    const b = breachSites[g.breach!.site]
    const seq = g.breach!.seq
    const w = Math.min(this.W - 24, 300 * ui),
      h = 132 * ui
    const x = clamp(this.sx(ax(b.x)) - w / 2, 12, this.W - w - 12)
    let y = this.sy(floorY[b.floor] - 62) - h
    if (y < this.insets.top + 6) y = this.sy(floorY[b.floor] + 8)
    const flash = this.gaugeFlash && this.now < this.gaugeFlash.until ? this.gaugeFlash.color : null
    c.fillStyle = 'rgba(10,6,18,0.94)'
    c.fillRect(x - 3, y - 3, w + 6, h + 6)
    c.fillStyle = flash ?? '#24405a'
    c.fillRect(x, y, w, h)
    c.fillStyle = '#0e1620'
    c.fillRect(x + 3, y + 3, w - 6, h - 6)
    c.textAlign = 'left'
    c.font = `italic 800 ${16 * ui}px ${FONT}`
    c.fillStyle = '#62e6ff'
    c.fillText('SEAL BREACH', x + 14 * ui, y + 16 * ui)
    c.textAlign = 'right'
    c.font = `700 ${13 * ui}px ${FONT}`
    c.fillStyle = '#b8b2c8'
    c.fillText(this.touch ? 'TAP THE ARROWS IN ORDER' : 'ARROWS / WASD   ESC LEAVE', x + w - 14 * ui, y + 16 * ui)
    c.textAlign = 'center'
    const glyph: Record<Dir, string> = { up: '▲', down: '▼', left: '◀', right: '▶' }
    // Rivet sequence
    const n = seq.length,
      cell = Math.min(46 * ui, (w - 28 * ui) / n - 8)
    const rowW = n * cell + (n - 1) * 8
    for (let i = 0; i < n; i++) {
      const cx = x + w / 2 - rowW / 2 + i * (cell + 8),
        cy = y + 30 * ui
      const done = i < g.patch!,
        now = i === g.patch
      c.fillStyle = done ? '#62e6ff' : now ? '#fff6e0' : '#2a3a4a'
      c.fillRect(cx, cy, cell, cell * 0.8)
      c.fillStyle = done ? '#0e1620' : now ? '#0e1620' : '#6a8aa0'
      c.font = `900 ${cell * 0.45}px ${FONT}`
      c.fillText(done ? '✓' : glyph[seq[i]], cx + cell / 2, cy + cell * 0.42)
    }
    // Direction buttons (mouse/touch)
    this.rivetRects = []
    const bw = (w - 28 * ui - 3 * 8) / 4,
      bh = 30 * ui,
      by = y + h - bh - 10 * ui
    ;(['left', 'up', 'down', 'right'] as Dir[]).forEach((d, i) => {
      const bx = x + 14 * ui + i * (bw + 8)
      c.fillStyle = '#2a3a4a'
      c.fillRect(bx, by, bw, bh)
      c.fillStyle = '#bfe8ff'
      c.font = `900 ${16 * ui}px ${FONT}`
      c.fillText(glyph[d], bx + bw / 2, by + bh / 2 + 1)
      this.rivetRects.push({ dir: d, x: bx, y: by, w: bw, h: bh })
    })
  }

  /** Animated corner brackets around the tutorial's focus. */
  private brackets(c: Ctx, f: Focus) {
    const cx = this.sx(ax(f.x)),
      bottom = this.sy(floorY[f.floor] + 4)
    const pad = 4 + ((Math.sin(this.t * 5) + 1) / 2) * 5
    const w = f.w * this.s + pad * 2,
      h = f.h * this.s + pad * 2
    const x0 = cx - w / 2,
      y0 = bottom - h + pad,
      L = Math.min(18, w / 3)
    c.strokeStyle = '#ffd24a'
    c.lineWidth = 3
    c.beginPath()
    for (const [x, y, dx, dy] of [
      [x0, y0, 1, 1],
      [x0 + w, y0, -1, 1],
      [x0, y0 + h, 1, -1],
      [x0 + w, y0 + h, -1, -1],
    ]) {
      c.moveTo(x + dx * L, y)
      c.lineTo(x, y)
      c.lineTo(x, y + dy * L)
    }
    c.stroke()
  }

  /** Map a pointer on the canvas to a world interaction. */
  pointer(px: number, py: number) {
    const g = this.runner.game
    if (!mobile(g)) return
    const gr = this.gaugeRect
    if (g.repairTicks !== null && gr.w && px >= gr.x && px <= gr.x + gr.w && py >= gr.y && py <= gr.y + gr.h) {
      this.runner.interact()
      return
    }
    if (g.patch !== null) {
      const hit = this.rivetRects.find((r) => px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h)
      if (hit) return this.runner.send({ type: 'rivet', dir: hit.dir })
    }
    const { x, y } = this.toArt(px, py)
    const pad = this.touch ? 8 : 4
    const inBox = (bx: number, by: number, w: number, h: number) =>
      x >= bx - w / 2 - pad && x <= bx + w / 2 + pad && y >= by - h - pad && y <= by + pad
    const held = heldItem(g)
    // Courier / carried cargo → drop
    if (held && inBox(this.courierX(g), this.courierY(g), 22, 48)) return this.runner.drop()
    // Cargo
    for (const id of cargoIds) {
      const loc = g.items[id].location
      if (loc.kind === 'held' || loc.kind === 'surrendered') continue
      const p = position(g, id)!
      const bx = ax(p.x),
        by = floorY[p.floor]
      if (inBox(bx, by, 24, 28) && !held) return this.runner.goTo({ x: p.x, floor: p.floor, act: { type: 'pick', id } })
    }
    // Slots
    for (const s of ['aft', 'upper', 'vault'] as const) {
      const f: Floor = s === 'upper' ? 1 : 0
      if (inBox(slotX(s), floorY[f], s === 'vault' ? 44 : 32, s === 'vault' ? 52 : 36)) {
        const gx0 = gx(slotX(s))
        return this.runner.goTo({ x: gx0, floor: f, act: held ? { type: 'stow', slot: s } : undefined })
      }
    }
    // Breach
    if (g.breach) {
      const b = breachSites[g.breach.site]
      if (inBox(ax(b.x), floorY[b.floor] - 8, 36, 40))
        return this.runner.goTo({ x: b.x, floor: b.floor, act: !held && g.phase === 'highway' ? { type: 'patch' } : undefined })
    }
    // Console
    if (inBox(CONSOLE_X, floorY[1], 36, 46))
      return this.runner.goTo({ x: ship.station.x, floor: 1, act: g.fault && !held && g.phase === 'highway' ? { type: 'repair' } : undefined })
    // Ladder
    const other: Floor = g.player.floor === 0 ? 1 : 0
    if (Math.abs(x - LADDER_X) < 12 + pad && y > ceilY(1) && y < floorY[0] + 4)
      return this.runner.goTo({ x: ship.ladder, floor: other })
    // Deck
    for (const f of [0, 1] as Floor[]) {
      if (y >= ceilY(f) - 4 && y <= floorY[f] + 10 && x >= INNER_L - 10 && x <= INNER_R + 10)
        return this.runner.goTo({ x: gx(x), floor: f })
    }
  }
}

const DECK_LINE = (f: Floor) => floorY[f] - ceilY(f) - 10
