// Owns the live snapshot, the fixed-step clock and all player input. React and
// the canvas renderer both read from here; every change goes through the game's
// validated `command` and `tick` functions.
import { cargoIds, rules, type Floor } from '../game/content'
import { atStop } from '../game/customs'
import {
  canClimb,
  command,
  heldItem,
  initial,
  mobile,
  tick,
  type Command,
  type Direction,
  type Game,
} from '../game/simulation'
import { steer, type Target } from './autopilot'
import { diff, type GameEvent } from './events'
import { nearest } from './interact'

export interface UiState {
  game: Game
  /** An inspection is being performed (scanner animation) before it resolves. */
  scanning: boolean
  /** The result screen is ready to show (after the outcome plays out in the world). */
  resultShown: boolean
}

const SCAN_MS = 900
const RESULT_DELAY = { delivered: 1300, arrest: 2000, death: 2400 }

export class Runner {
  game: Game
  prev: Game
  alpha = 0
  ui: UiState
  target: Target | null = null
  private holds = new Map<string, Direction>()
  private vertical = new Map<string, Floor>()
  private pending: { cmd: Command; at: number } | null = null
  /** Presentation hook: true once the officer is in position to scan. */
  scanReady: () => boolean = () => true
  private resultAt = 0
  private subs = new Set<() => void>()
  private eventSubs = new Set<(e: GameEvent) => void>()
  private frameSubs = new Set<(now: number, dt: number) => void>()
  private raf = 0
  private last = 0
  private bank = 0

  constructor(seed?: number) {
    this.game = this.prev = initial(seed)
    this.ui = { game: this.game, scanning: false, resultShown: false }
  }

  // ── Subscriptions ──────────────────────────────────────────────────────
  subscribe = (fn: () => void) => {
    this.subs.add(fn)
    return () => void this.subs.delete(fn)
  }
  getUi = () => this.ui
  onEvent(fn: (e: GameEvent) => void) {
    this.eventSubs.add(fn)
    return () => void this.eventSubs.delete(fn)
  }
  onFrame(fn: (now: number, dt: number) => void) {
    this.frameSubs.add(fn)
    return () => void this.frameSubs.delete(fn)
  }
  private publish(now = performance.now()) {
    const g = this.game
    const scanning = !!this.pending
    const resultShown = g.phase === 'result' && now >= this.resultAt
    if (g !== this.ui.game || scanning !== this.ui.scanning || resultShown !== this.ui.resultShown) {
      this.ui = { game: g, scanning, resultShown }
      this.subs.forEach((f) => f())
    }
  }
  private apply(next: Game) {
    if (next === this.game) return false
    const events = diff(this.game, next)
    this.game = next
    for (const e of events) {
      if (e.type === 'outcome') this.resultAt = performance.now() + RESULT_DELAY[e.outcome]
      this.eventSubs.forEach((f) => f(e))
    }
    return true
  }

  // ── Commands ───────────────────────────────────────────────────────────
  send = (cmd: Command) => {
    if (this.pending) return
    if (this.game.phase === 'search' && cmd.type === 'inspect') {
      // Let the officer visibly scan before the roll resolves.
      this.pending = { cmd, at: performance.now() + SCAN_MS }
      this.publish()
      return
    }
    if (cmd.type === 'restart' && !this.ui.resultShown) return
    const before = this.game
    if (this.apply(command(before, cmd))) {
      if (cmd.type === 'restart' || cmd.type === 'accept') {
        this.prev = this.game
        this.target = null
      }
      this.publish()
    }
  }

  /** Context interaction: lock the repair cursor or perform the nearest action. */
  interact = () => {
    const g = this.game
    if (g.phase === 'contract') return this.send({ type: 'accept' })
    if (g.phase === 'result') return this.send({ type: 'restart' })
    if (g.phase === 'search') return this.send({ type: 'inspect' })
    if (g.repairTicks !== null) return this.send({ type: 'stop' })
    const a = nearest(g)
    if (a) {
      this.target = null
      this.send(a.cmd)
    }
  }

  drop = () => this.send({ type: 'drop' })

  surrenderIndex(i: number) {
    const id = cargoIds.filter((id) => atStop(this.game, id))[i]
    if (id) this.send({ type: 'surrender', id })
  }

  climb(to: Floor) {
    this.target = null
    this.send({ type: 'climb', to })
  }

  /** Walk somewhere (and optionally act on arrival). */
  goTo(t: Target) {
    if (!mobile(this.game)) return
    if (this.game.repairTicks !== null) this.send({ type: 'leave' })
    this.target = t
  }

  hold(id: string, dir: Direction) {
    if (dir) {
      this.target = null
      if (this.game.repairTicks !== null) this.send({ type: 'leave' })
      this.holds.delete(id)
      this.holds.set(id, dir)
    } else this.holds.delete(id)
  }
  holdVertical(id: string, to: Floor | null) {
    if (to === null) this.vertical.delete(id)
    else {
      this.target = null
      this.vertical.set(id, to)
    }
  }
  releaseAll = () => {
    this.holds.clear()
    this.vertical.clear()
    this.target = null
    this.bank = 0
    this.last = performance.now()
  }
  get heldDirection(): Direction {
    return [...this.holds.values()].at(-1) ?? 0
  }

  // ── Loop ───────────────────────────────────────────────────────────────
  start() {
    this.last = performance.now()
    const frame = (now: number) => {
      const dt = Math.max(0, Math.min(now - this.last, rules.maxFrameMs))
      this.last = now
      if (!document.hidden) this.bank += dt
      this.step(now)
      this.frameSubs.forEach((f) => f(now, dt / 1000))
      this.raf = requestAnimationFrame(frame)
    }
    this.raf = requestAnimationFrame(frame)
    window.addEventListener('blur', this.releaseAll)
    document.addEventListener('visibilitychange', this.releaseAll)
  }
  stop() {
    cancelAnimationFrame(this.raf)
    window.removeEventListener('blur', this.releaseAll)
    document.removeEventListener('visibilitychange', this.releaseAll)
  }

  private step(now: number) {
    if (this.pending && !this.scanReady()) this.pending.at = now + SCAN_MS
    if (this.pending && now >= this.pending.at) {
      const { cmd } = this.pending
      this.pending = null
      this.apply(command(this.game, cmd))
    }
    const slice = 1000 / rules.hz
    if (!mobile(this.game)) {
      this.bank = 0
      this.prev = this.game
      this.alpha = 1
      this.publish(now)
      return
    }
    while (this.bank >= slice) {
      this.bank -= slice
      this.stepOnce()
      if (!mobile(this.game)) break
    }
    this.alpha = this.bank / slice
    this.publish(now)
  }

  /** One fixed simulation step with the current held input and autopilot. */
  private stepOnce() {
    let dir = this.heldDirection
    if (this.target && !dir) {
      const s = steer(this.game, this.target)
      dir = s.dir
      if (s.cmd) this.send(s.cmd)
      if (s.done) this.target = null
    }
    const up = [...this.vertical.values()].at(-1)
    if (up !== undefined && canClimb(this.game, up)) this.send({ type: 'climb', to: up })
    this.prev = this.game
    this.apply(tick(this.game, dir))
  }

  /** Verification aid: run the clock forward exactly as live play would. */
  advance(seconds: number) {
    for (let i = 0; i < seconds * rules.hz && mobile(this.game); i++) this.stepOnce()
    this.publish()
  }

  // ── Keyboard ───────────────────────────────────────────────────────────
  keydown = (e: KeyboardEvent): boolean => {
    if (e.metaKey || e.ctrlKey || e.altKey) return false
    const k = e.key.toLowerCase()
    const g = this.game
    const onButton = (e.target as HTMLElement | null)?.closest?.('button')
    const move: Record<string, Direction> = { a: -1, arrowleft: -1, d: 1, arrowright: 1 }
    const ladder: Record<string, Floor> = { w: 1, arrowup: 1, s: 0, arrowdown: 0 }
    if (mobile(g)) {
      if (k in move) {
        if (!e.repeat) this.hold(k, move[k])
        return true
      }
      if (k in ladder) {
        if (!e.repeat) this.holdVertical(k, ladder[k])
        return true
      }
      if (e.repeat) return k === 'e' || k === ' ' || k === 'q'
      if (k === 'e' || k === ' ' || (k === 'enter' && !onButton)) return this.interact(), true
      if (k === 'q') {
        if (heldItem(g)) this.drop()
        return true
      }
      if (k === 'escape') return this.send({ type: 'leave' }), true
      return false
    }
    if (e.repeat) return false
    if (g.phase === 'contract' && (k === 'e' || ((k === 'enter' || k === ' ') && !onButton)))
      return this.interact(), true
    if (g.phase === 'search') {
      if (k === 'e' || ((k === 'enter' || k === ' ') && !onButton)) return this.interact(), true
      if (k === 'b') return this.send({ type: 'bribe' }), true
      if (k === '1' || k === '2') return this.surrenderIndex(+k - 1), true
    }
    if (g.phase === 'result' && (k === 'r' || ((k === 'enter' || k === ' ') && !onButton)))
      return this.send({ type: 'restart' }), true
    return false
  }
  keyup = (e: KeyboardEvent) => {
    const k = e.key.toLowerCase()
    this.holds.delete(k)
    this.vertical.delete(k)
  }
}
