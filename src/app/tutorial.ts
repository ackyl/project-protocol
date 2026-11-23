// Guided first delivery. Big instructional panels pause the simulation; between
// panels the player plays the real game. The tutorial only ever talks to the
// game through validated commands (training hooks), never by editing state.
import { breachSites, rules, ship, slots, type CargoId, type Floor } from '../game/content'
import { nextSeed } from '../game/hazards'
import { type Command, type Game } from '../game/simulation'
import type { Runner } from './runner'

const KEY = 'pp-manifest-tutorial-done'
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

export type Art = 'move' | 'cargo' | 'cover' | 'surge' | 'breach' | 'prep' | 'search' | 'payday'
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
  /** Commands sent when the panel closes (for example, start a drill). */
  enter?: Command[]
  /** Commands sent when the objective completes. */
  after?: Command[]
  focus?: (g: Game) => Focus | null
  /** No panel: just a HUD objective (a follow-up to the previous lesson). */
  silent?: boolean
}

const inSlot = (g: Game, id: CargoId, slot: keyof typeof slots) => {
  const loc = g.items[id].location
  return loc.kind === 'slot' && loc.slot === slot
}
const at = (g: Game, id: CargoId): Focus | null => {
  const loc = g.items[id].location
  if (loc.kind !== 'loose' && loc.kind !== 'slot') return null
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
    id: 'relays',
    title: 'Load the rear rack',
    lines: [
      'Your manifest lists drums and gasket stock. It omits the warm relay bank with its duty plate scraped off.',
      'Carry the relays to the rear rack. The front rack is reserved for legal freight.',
    ],
    keys: [[['E'], 'Grab / stow'], [['Q'], 'Drop']],
    touch: 'Tap the relays, then tap the rear rack.',
    art: 'cargo',
    objective: 'Stow the relay bank in the rear rack',
    ready: highway,
    done: (g) => inSlot(g, 'relays', 'rear'),
    focus: (g) => g.items.relays.location.kind === 'held' ? slotFocus('rear') : at(g, 'relays'),
  },
  {
    id: 'cover',
    title: 'Give the heat a source',
    lines: [
      'The declared bearing drums run warm. In the front rack they obscure the relays and give customs a plausible explanation for a second heat return.',
      'The gasket bales satisfy the count in the open berth. They block sight if you put them in front, but cannot explain heat.',
    ],
    keys: [[['E'], 'Grab / stow']],
    touch: 'Tap the drums, then tap the front rack.',
    art: 'cover',
    objective: 'Stow the heated bearing drums in the front rack',
    ready: highway,
    done: (g) => inSlot(g, 'drums', 'front'),
    focus: (g) => g.items.drums.location.kind === 'held' ? slotFocus('front') : at(g, 'drums'),
  },
  {
    id: 'surge',
    title: 'Emergency: power surge',
    lines: [
      `A power cut drains the hull and takes the Choir Cask out of containment. After ${rules.echoSeconds} seconds it leaves an echo that customs can hear even after repairs.`,
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
      'Read the tags under your freight. Keep legal goods visible, the relays behind the drums, and the cask in its cradle. Shore power seals the cradle, but any echo is still on record.',
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
      'The officer follows the evidence. At two suspicion points the officer opens the fixture tied to the strongest clue. Three points triggers a room search and a containment check.',
      'If challenged over the extra heat, cite the heated lubricant and reach the docket. You can also give up a disputed item. Surrender clears its live signal, but a recorded echo stays on file.',
    ],
    keys: [[['E'], 'Search or file at the marker'], [['F'], 'Walk and file during a hold']],
    touch: 'Choose a response in the officer’s box, then tap the marker or Walk to docket.',
    art: 'search',
    ready: (g) => g.phase === 'search',
  },
  {
    id: 'payday',
    title: 'Payday',
    lines: [
      'The receipt records what arrived, what you gave up, and the hull repairs and duties you owe.',
      `Finish under ${rules.debtTarget}¢ and the syndicate records a reserve shortfall.`,
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
}

export class Tutorial {
  state: TutorialState = { active: false, index: 0, panel: null, objective: null }
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
    if (g.phase === 'result' && steps[this.state.index]?.id !== 'payday') {
      this.waiting = false
      this.set({ index: steps.findIndex((s) => s.id === 'payday'), objective: null })
      return
    }
    const step = steps[this.state.index]
    if (!step) return this.stop()
    if (this.waiting) {
      if (step.done?.(g)) {
        step.after?.forEach((c) => this.runner.send(c))
        this.advance()
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
