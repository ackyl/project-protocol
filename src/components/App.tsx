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

export function App() {
  const runner = useMemo(() => new Runner(), [])
  const ui = useSyncExternalStore(runner.subscribe, runner.getUi)
  const canvas = useRef<HTMLCanvasElement>(null)
  const [renderer, setRenderer] = useState<Renderer | null>(null)
  const [touch, setTouch] = useState(() => matchMedia('(pointer: coarse)').matches)
  const [muted, setMuted] = useState(sfx.muted)
  const g = ui.game

  useEffect(() => {
    const r = new Renderer(canvas.current!, runner)
    setRenderer(r)
    runner.start()
    if (import.meta.env.DEV) Object.assign(window, { __pp: { runner, renderer: r } })
    return () => {
      runner.stop()
      r.destroy()
    }
  }, [runner])

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
  }, [runner])

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
          <Hud ui={ui} muted={muted} onMute={() => setMuted(sfx.toggleMute())} touch={touch} />
        )}
        {g.phase === 'contract' && <Title runner={runner} touch={touch} muted={muted} onMute={() => setMuted(sfx.toggleMute())} />}
        {g.phase === 'search' && <Customs ui={ui} runner={runner} touch={touch} />}
        {g.phase === 'result' && ui.resultShown && <Ledger g={g} runner={runner} touch={touch} />}
        {touch && mobile(g) && <TouchControls g={g} runner={runner} />}
        <p className="sr-only" role="status" aria-live="polite">
          {g.note}
        </p>
      </main>
    </ReserveContext.Provider>
  )
}
