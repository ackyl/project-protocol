import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { Runner } from '../app/runner'
import { sfx } from '../audio/sfx'
import { Renderer } from '../render/renderer'
import { mobile } from '../game/simulation'
import { Hud } from './Hud'
import { Title } from './Title'
import { Customs } from './Customs'
import { Ledger } from './Ledger'
import { TouchControls } from './TouchControls'
import { ReserveContext, type Side } from './reserve'
import { Tutorial, steps, tutorialDone } from '../app/tutorial'
import { TutorialPanel } from './TutorialPanel'

/** Each page load starts on a fresh, reproducible route. */
const bootSeed = () => (Math.floor(Math.random() * 0xfffffff) + 1) >>> 0

export function App() {
  const runner = useMemo(() => new Runner(bootSeed()), [])
  const tutorial = useMemo(() => new Tutorial(runner), [runner])
  const ui = useSyncExternalStore(runner.subscribe, runner.getUi)
  const tut = useSyncExternalStore(tutorial.subscribe, tutorial.get)
  const canvas = useRef<HTMLCanvasElement>(null)
  const world = useRef<HTMLCanvasElement>(null)
  const [renderer, setRenderer] = useState<Renderer | null>(null)
  const [touch, setTouch] = useState(() => matchMedia('(pointer: coarse)').matches)
  const [muted, setMuted] = useState(sfx.muted)
  const g = ui.game

  useEffect(() => {
    const r = new Renderer(world.current!, canvas.current!, runner)
    r.focus = () => tutorial.focus
    setRenderer(r)
    runner.start()
    if (import.meta.env.DEV) Object.assign(window, { __pp: { runner, renderer: r, tutorial } })
    return () => {
      runner.stop()
      r.destroy()
    }
  }, [runner, tutorial])

  useEffect(() => {
    if (renderer) renderer.touch = touch
  }, [renderer, touch])

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      sfx.unlock()
      if (e.key.toLowerCase() === 'm' && !e.repeat && !e.metaKey && !e.ctrlKey) {
        setMuted(sfx.toggleMute())
        return
      }
      const k = e.key.toLowerCase()
      const onButton = (e.target as HTMLElement | null)?.closest?.('button')
      if (tutorial.state.panel) {
        if (!e.repeat && (k === 'e' || ((k === 'enter' || k === ' ') && !onButton))) {
          e.preventDefault()
          tutorial.dismiss()
        }
        return
      }
      if (runner.game.phase === 'contract' && !tutorialDone() && !e.repeat && (k === 'e' || ((k === 'enter' || k === ' ') && !onButton))) {
        e.preventDefault()
        tutorial.start()
        return
      }
      if (runner.keydown(e)) e.preventDefault()
    }
    const pointer = (e: PointerEvent) => {
      sfx.unlock()
      if (e.pointerType === 'touch') setTouch(true)
      else if (e.pointerType === 'mouse') setTouch(false)
    }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', runner.keyup)
    window.addEventListener('pointerdown', pointer, true)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', runner.keyup)
      window.removeEventListener('pointerdown', pointer, true)
    }
  }, [runner, tutorial])

  const firstTime = useMemo(() => !tutorialDone(), [tut, g.phase]) // eslint-disable-line react-hooks/exhaustive-deps
  const reserve = useMemo(() => {
    const sizes = new Map<string, { side: Side; px: number }>()
    return (key: string, side: Side, px: number | null) => {
      if (px === null) sizes.delete(key)
      else sizes.set(key, { side, px })
      if (!renderer) return
      const out = { top: 0, right: 0, bottom: 0, left: 0 }
      for (const v of sizes.values()) out[v.side] = Math.max(out[v.side], v.px)
      renderer.insets = out
    }
  }, [renderer])

  return (
    <ReserveContext.Provider value={reserve}>
      <main className={`game phase-${g.phase} ${touch ? 'is-touch' : 'is-desk'}`}>
        <canvas ref={world} className="world" aria-hidden="true" />
        <canvas
          ref={canvas}
          className="stage"
          aria-label="Mule-07 ship cutaway"
          onPointerDown={(e) => {
            if (e.button !== 0) return
            const rect = e.currentTarget.getBoundingClientRect()
            renderer?.pointer(e.clientX - rect.left, e.clientY - rect.top)
          }}
        />
        {g.phase !== 'contract' && (
          <Hud
            ui={ui}
            muted={muted}
            onMute={() => setMuted(sfx.toggleMute())}
            touch={touch}
            training={tut.active ? { objective: tut.objective, step: tut.index + 1, total: steps.length, cleared: tut.cleared } : null}
          />
        )}
        {g.phase === 'contract' && (
          <Title
            runner={runner}
            touch={touch}
            muted={muted}
            onMute={() => setMuted(sfx.toggleMute())}
            firstTime={firstTime}
            onTraining={() => tutorial.start()}
            onSkipTraining={() => tutorial.skip()}
          />
        )}
        {g.phase === 'search' && <Customs ui={ui} runner={runner} touch={touch} />}
        {g.phase === 'result' && ui.resultShown && <Ledger g={g} runner={runner} touch={touch} />}
        {touch && mobile(g) && !tut.panel && <TouchControls g={g} runner={runner} />}
        {tut.panel && (
          <TutorialPanel
            step={tut.panel}
            index={tut.index}
            total={steps.length}
            touch={touch}
            onContinue={tutorial.dismiss}
            onSkip={() => tutorial.skip()}
          />
        )}
        <p className="sr-only" role="status" aria-live="polite">
          {g.note}
        </p>
      </main>
    </ReserveContext.Provider>
  )
}
