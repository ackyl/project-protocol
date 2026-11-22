// Guided first delivery. Big instructional panels pause the simulation; between
// panels the player plays the real game. The tutorial only ever talks to the
// game through validated commands (training hooks), never by editing state.
import { breachSites, rules, ship, slots, type CargoId, type Floor } from '../game/content'
import { nextSeed } from '../game/hazards'
import { type Command, type Game } from '../game/simulation'
import type { Runner } from './runner'

const KEY = 'pp-tutorial-done'
export function tutorialDone() {
  try {
    return localStorage.getItem(KEY) === '1'
  } catch {
    return false
  }
}
function markDone() {
  try {
    localStorage.setItem(KEY, '1')
  } catch {
    /* storage unavailable: the tutorial simply offers itself again */
  }
}

export type Art = 'move' | 'cell' | 'crate' | 'specimen' | 'surge' | 'breach' | 'prep' | 'search' | 'payday'
export interface Focus {
  x: number
  floor: Floor
  w: number
  h: number
}
export interface Step {
  id: string
  title: string
  lines: string[]
  keys: [string[], string][]
  touch: string
  art: Art
  /** HUD objective while the step is being played. Info-only steps have none. */
  objective?: string
  /** When the panel should open. */
  ready: (g: Game, resultShown: boolean) => boolean
  /** The player has demonstrated the mechanic. */
  done?: (g: Game) => boolean
  /** Commands sent when the panel closes (wake cargo, start a drill). */
  enter?: Command[]
  /** Commands sent when the objective completes. */
  after?: Command[]
  focus?: (g: Game) => Focus | null
  /** No panel: just a HUD objective (a follow-up to the previous lesson). */
  silent?: boolean
}

const inSlot = (g: Game, id: CargoId) => g.items[id].location.kind === 'slot'
const at = (g: Game, id: CargoId): Focus | null => {
  const loc = g.items[id].location
  if (loc.kind === 'held' || loc.kind === 'surrendered') return null
  const p = loc.kind === 'slot' ? slots[loc.slot] : loc
  return { x: p.x, floor: p.floor, w: 30, h: 34 }
}
const slotFocus = (id: keyof typeof slots, w = 40, h = 44): Focus => ({ x: slots[id].x, floor: slots[id].floor, w, h })
const highway = (g: Game) => g.phase === 'highway'

export const steps: Step[] = [
  {
    id: 'welcome',
    title: 'Welcome aboard',
    lines: [
      'This is Mule-07, and you are its only crew.',
      'Walk the decks, climb the centre ladder, and use whatever is in front of you.',
    ],
    keys: [
      [['A', 'D'], 'Walk'],
      [['W', 'S'], 'Ladder'],
      [['E'], 'Use'],
    ],
    touch: 'Hold ◀ ▶ to walk. Tap the ladder button, or just tap where you want to go.',
    art: 'move',
    objective: 'Climb the ladder to the upper deck',
    ready: highway,
    done: (g) => g.player.floor === 1 && !g.climb,
    focus: () => ({ x: ship.ladder, floor: 0, w: 26, h: 128 }),
  },
  {
    id: 'cell',
    title: 'Handle contraband',
    lines: [
      'The Volatile Cell cooks while it is loose or in your hands. At 100% it vents and wrecks hull and cargo.',
      'Any cargo cradle cools it down. Carry it there and stow it.',
    ],
    keys: [
      [['E'], 'Grab / stow'],
      [['Q'], 'Drop'],
    ],
    touch: 'Tap the cell to grab it, then tap a cradle. DROP puts it down.',
    art: 'cell',
    objective: 'Stow the Volatile Cell in a cargo cradle',
    ready: highway,
    done: (g) => inSlot(g, 'cell'),
    enter: [{ type: 'train', wake: 'cell' }],
    focus: (g) => (g.items.cell.location.kind === 'held' ? slotFocus('aft') : at(g, 'cell')),
  },
  {
    id: 'crate',
    title: 'Loud cargo',
    lines: [
      'The Signal Crate never stops broadcasting. Customs hears it from a rack 80% of the time.',
      'Only the shield bay on the lower deck blocks the signal completely.',
    ],
    keys: [[['E'], 'Grab / stow']],
    touch: 'Tap the crate, then tap the teal shield bay.',
    art: 'crate',
    objective: 'Put the Signal Crate in the shield bay',
    ready: highway,
    done: (g) => g.items.crate.location.kind === 'slot' && g.items.crate.location.slot === 'vault',
    focus: (g) => (g.items.crate.location.kind === 'held' ? slotFocus('vault', 50, 58) : at(g, 'crate')),
  },
  {
    id: 'specimen',
    title: 'Live cargo',
    lines: [
      'The Bio Specimen pays best and hates being out of containment.',
      'Left loose it gets agitated, then pulses: it loses value, blows rack latches on its deck and knocks you off any station there.',
    ],
    keys: [[['E'], 'Grab / stow']],
    touch: 'Tap the jar, then tap a free cradle.',
    art: 'specimen',
    objective: 'Contain the Bio Specimen in a free cradle',
    ready: highway,
    done: (g) => inSlot(g, 'specimen'),
    enter: [{ type: 'train', wake: 'specimen' }],
    focus: (g) => (g.items.specimen.location.kind === 'held' ? null : at(g, 'specimen')),
  },
  {
    id: 'surge',
    title: 'Emergency: power surge',
    lines: [
      'Surges black out the ship, drain the hull every second and blow ordinary rack latches. A racked specimen stirs while the power is down.',
      'Get to the console with empty hands and lock the needle inside the green band.',
    ],
    keys: [
      [['E'], 'Open console / lock'],
      [['Esc'], 'Leave'],
    ],
    touch: 'Tap the console, then tap the gauge (or LOCK) when the needle is in the green.',
    art: 'surge',
    objective: 'Restore power at the console (upper deck, aft)',
    ready: highway,
    done: (g) => !g.fault,
    enter: [{ type: 'trigger', hazard: 'surge' }],
    focus: () => ({ x: ship.station.x, floor: 1, w: 40, h: 50 }),
  },
  {
    id: 'relatch',
    title: 'Latch blown',
    lines: [],
    keys: [],
    touch: '',
    art: 'cell',
    silent: true,
    objective: 'The surge knocked the cell loose — rack it again',
    ready: highway,
    done: (g) => inSlot(g, 'cell'),
    focus: (g) => (g.items.cell.location.kind === 'held' ? null : at(g, 'cell')),
  },
  {
    id: 'breach',
    title: 'Emergency: hull breach',
    lines: [
      'Debris punches through the plating. Air screams out and the hull bleeds until the hole is patched.',
      'At the breach, drive the four rivets in the order shown. A wrong rivet slips the plate: it costs hull and starts over.',
    ],
    keys: [
      [['E'], 'Start patch'],
      [['↑', '←', '↓', '→'], 'Rivets (or WASD)'],
    ],
    touch: 'Tap the breach, then press the arrows in order.',
    art: 'breach',
    objective: 'Patch the breach on the lower deck',
    ready: highway,
    done: (g) => !g.breach,
    enter: [{ type: 'trigger', hazard: 'impact' }],
    after: [{ type: 'train', clock: false, remaining: rules.trainingRemaining }],
    focus: (g) => (g.breach ? { x: breachSites[g.breach.site].x, floor: breachSites[g.breach.site].floor, w: 36, h: 44 } : null),
  },
  {
    id: 'prep',
    title: 'Customs ahead',
    lines: [
      `Cinder Gate is close. You have ${rules.prep} seconds before the officer boards.`,
      'Tags under each item show the odds of it being found where it sits. Loose or carried cargo is always found.',
    ],
    keys: [[['E'], 'Move cargo']],
    touch: 'Tap cargo and cradles to rearrange.',
    art: 'prep',
    ready: (g) => g.phase === 'prep',
  },
  {
    id: 'search',
    title: 'The search',
    lines: [
      'The officer checks five places in order. At each one you choose:',
      `Let them search and risk the odds, bribe ${rules.bribe}¢ to skip that check, or hand over an item to protect the rest.`,
    ],
    keys: [
      [['E'], 'Search'],
      [['B'], 'Bribe'],
      [['1', '2', '3'], 'Hand over'],
    ],
    touch: 'Use the buttons in the officer’s box.',
    art: 'search',
    ready: (g) => g.phase === 'search',
  },
  {
    id: 'payday',
    title: 'Payday',
    lines: [
      'The receipt is the score: cargo pays by its condition, then bribes, hull repairs and fines come out.',
      `Finish under ${rules.debtTarget}¢ and you owe the syndicate. Every vent, pulse and breach on the way showed up here.`,
    ],
    keys: [[['R'], 'Next run']],
    touch: 'Tap NEXT RUN for a new route.',
    art: 'payday',
    ready: (_g, shown) => shown,
  },
]

export interface TutorialState {
  active: boolean
  /** Index of the current step. */
  index: number
  /** Panel currently covering the game. */
  panel: Step | null
  objective: string | null
  /** Bumps each time an objective is completed (for a short ✓ flash). */
  cleared: number
}

export class Tutorial {
  state: TutorialState = { active: false, index: 0, panel: null, objective: null, cleared: 0 }
  private subs = new Set<() => void>()
  private waiting = false
  private unsub: (() => void) | null = null

  constructor(private runner: Runner) {}

  subscribe = (fn: () => void) => {
    this.subs.add(fn)
    return () => void this.subs.delete(fn)
  }
  get = () => this.state
  private set(patch: Partial<TutorialState>) {
    this.state = { ...this.state, ...patch }
    this.subs.forEach((f) => f())
  }
  get focus(): Focus | null {
    const s = steps[this.state.index]
    return this.state.active && this.waiting && s?.focus ? s.focus(this.runner.game) : null
  }

  /** Begin the guided delivery from the contract screen. */
  start() {
    this.waiting = false
    this.set({ active: true, index: 0, panel: null, objective: null })
    this.runner.send({ type: 'accept', training: true })
    this.unsub?.()
    this.unsub = this.runner.onFrame(() => this.update())
  }

  /** Leave training: remember it and go back to a fresh contract. */
  skip() {
    markDone()
    this.stop()
    this.runner.reset(nextSeed(this.runner.game.seed))
  }

  private stop() {
    this.unsub?.()
    this.unsub = null
    this.runner.pause(false)
    this.waiting = false
    this.set({ active: false, panel: null, objective: null })
  }

  dismiss = () => {
    const step = this.state.panel
    if (!step) return
    this.runner.pause(false)
    step.enter?.forEach((c) => this.runner.send(c))
    if (step.id === 'payday') {
      markDone()
      this.stop()
      return
    }
    if (step.done) {
      this.waiting = true
      this.set({ panel: null, objective: step.objective ?? null })
    } else this.advance({ panel: null })
  }

  private advance(patch: Partial<TutorialState> = {}) {
    this.waiting = false
    this.set({ ...patch, index: this.state.index + 1, objective: null })
  }

  /** Called every frame by the runner; exposed for tests. */
  update() {
    if (!this.state.active || this.state.panel) return
    const g = this.runner.game
    const ui = this.runner.ui
    // A failed or finished run goes straight to the payday lesson.
    if (g.phase === 'result' && steps[this.state.index].id !== 'payday') {
      this.waiting = false
      this.set({ index: steps.findIndex((s) => s.id === 'payday'), objective: null })
      return
    }
    const step = steps[this.state.index]
    if (!step) return this.stop()
    if (this.waiting) {
      if (step.done?.(g)) {
        step.after?.forEach((c) => this.runner.send(c))
        this.advance({ cleared: this.state.cleared + 1 })
      }
      return
    }
    if (!step.ready(g, ui.resultShown)) return
    // Already demonstrated? Skip the lecture but keep the drill's side effects.
    if (step.done?.(g) && !step.enter?.some((c) => c.type === 'trigger')) {
      step.enter?.forEach((c) => this.runner.send(c))
      step.after?.forEach((c) => this.runner.send(c))
      this.advance()
      return
    }
    if (step.silent) {
      this.waiting = true
      this.set({ objective: step.objective ?? null })
      return
    }
    this.runner.pause(true)
    this.set({ panel: step })
  }
}
