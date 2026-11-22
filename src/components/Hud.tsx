import { useEffect, useRef, useState } from 'react'
import { rules, searchStops } from '../game/content'
import { ledger } from '../game/customs'
import { heldItem, shielded, type Game } from '../game/simulation'
import type { UiState } from '../app/runner'
import { useReserve } from './reserve'

const clock = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

function objective(g: Game): { text: string; urgent?: boolean } | null {
  const held = heldItem(g)
  const cell = g.items.cell.location.kind
  if (g.phase === 'highway') {
    if (g.fault && held) return { text: 'Power fault! Put the cargo down and get to the console', urgent: true }
    if (g.fault) return { text: 'Power fault! Fix the console — upper deck, aft', urgent: true }
    if (held === 'cell') return { text: 'Rack the cell before it vents' }
    if (cell === 'loose') return { text: 'The cell is cooking — grab it and rack it', urgent: g.items.cell.heat > 60 }
    if (held === 'crate') return { text: 'Shield bay — lower deck, bow end' }
    if (!shielded(g.items.crate)) return { text: 'The crate broadcasts — hide it in the shield bay' }
    if (g.elapsed < rules.surge * rules.hz) return { text: 'Cargo secured. Stay sharp.' }
    return { text: 'Hold course for Cinder Gate' }
  }
  if (g.phase === 'prep') {
    if (held) return { text: 'Put it somewhere — hand-held cargo is found for sure', urgent: true }
    if (cell === 'loose') return { text: 'Loose cargo is always found — rack the cell', urgent: true }
    if (!shielded(g.items.crate)) return { text: 'Racks leak signal — only the shield bay hides the crate' }
    return { text: 'Looks clean. Wait for the knock.' }
  }
  return null
}

export function Hud({ ui, muted, onMute, touch }: { ui: UiState; muted: boolean; onMute: () => void; touch: boolean }) {
  const g = ui.game
  const top = useRef<HTMLDivElement>(null)
  useReserve(top, 'hud', 'top')
  const legend = useRef<HTMLDivElement>(null)
  const live = g.phase === 'highway' || g.phase === 'prep'
  useReserve(legend, 'legend', 'bottom', live && !touch)
  // Flash the hull meter whenever it drops.
  const [hit, setHit] = useState(0)
  const lastHull = useRef(g.hull)
  useEffect(() => {
    if (g.hull < lastHull.current) setHit((n) => n + 1)
    lastHull.current = g.hull
  }, [g.hull])
  const [cashBump, setCashBump] = useState(0)
  const lastCash = useRef(g.cash)
  useEffect(() => {
    if (g.cash !== lastCash.current) setCashBump((n) => n + 1)
    lastCash.current = g.cash
  }, [g.cash])

  const seconds = Math.max(0, (g.phase === 'prep' ? rules.prep : rules.highway) - Math.floor(g.elapsed / rules.hz))
  const progress = g.phase === 'highway' ? g.elapsed / (rules.highway * rules.hz) : 1
  const obj = objective(g)
  const wallet = g.phase === 'result' ? ledger(g).balance : g.cash
  const segs = 10
  const lit = Math.ceil((g.hull / rules.hull) * segs)
  const hullTone = g.hull > 60 ? 'ok' : g.hull > 30 ? 'warn' : 'bad'

  return (
    <>
      <div className="hud" ref={top}>
        <div className={`hud-hull ${hullTone}`} key={'h' + hit} data-hit={hit > 0}>
          <span className="hud-label">HULL</span>
          <span className="hull-bar" aria-hidden="true">
            {Array.from({ length: segs }, (_, i) => (
              <i key={i} className={i < lit ? 'on' : ''} />
            ))}
          </span>
          <b className="hud-num">{g.hull}</b>
          {g.fault && g.phase === 'highway' && <span className="hud-drain">−{rules.surgeDamagePerSecond}/s</span>}
        </div>

        <div className="hud-center">
          {g.phase === 'highway' && (
            <>
              <div className="route" aria-hidden="true">
                <span>RELAY 9</span>
                <i className="track">
                  <i className="fill" style={{ width: progress * 100 + '%' }} />
                  <i className="ship" style={{ left: progress * 100 + '%' }} />
                </i>
                <span>CINDER GATE</span>
              </div>
              <div className={'clock' + (g.fault ? ' alert' : '')} aria-label={`${seconds} seconds to Cinder Gate`}>
                {clock(seconds)}
              </div>
            </>
          )}
          {g.phase === 'prep' && (
            <>
              <div className="route customs-tag">CUSTOMS BOARDS IN</div>
              <div className={'clock amber' + (seconds <= 5 ? ' alert' : '')}>{clock(seconds)}</div>
            </>
          )}
          {g.phase === 'search' && (
            <>
              <div className="route customs-tag">CUSTOMS SEARCH</div>
              <div className="pips" aria-label={`Checkpoint ${g.stop + 1} of ${searchStops.length}`}>
                {searchStops.map((s, i) => (
                  <i key={s.id} className={i < g.stop ? 'done' : i === g.stop ? 'now' : ''} title={s.name} />
                ))}
              </div>
            </>
          )}
          {g.phase === 'result' && <div className="route customs-tag">CONTRACT CLOSED</div>}
          {obj && <div className={'objective' + (obj.urgent ? ' urgent' : '')} key={obj.text}>{obj.text}</div>}
        </div>

        <div className="hud-right">
          <div className="cash" key={'c' + cashBump}>
            <i className="coin" aria-hidden="true" />
            <b>{wallet}</b>
            <small>¢R</small>
          </div>
          <button className="mute" onClick={onMute} aria-label={muted ? 'Unmute sound' : 'Mute sound'} title="Sound (M)">
            {muted ? <SpeakerOff /> : <SpeakerOn />}
          </button>
        </div>
      </div>

      {live && !touch && (
        <div className="legend" ref={legend}>
          <span><kbd>A</kbd><kbd>D</kbd> move</span>
          <span><kbd>W</kbd><kbd>S</kbd> ladder</span>
          <span><kbd>E</kbd> use</span>
          <span><kbd>Q</kbd> drop</span>
          <span className="dim">or click anything to walk there</span>
        </div>
      )}
    </>
  )
}

const SpeakerOn = () => (
  <svg viewBox="0 0 16 16" width="18" height="18" aria-hidden="true">
    <path d="M2 6h3l4-3v10L5 10H2z" fill="currentColor" />
    <path d="M11 5v6M13 3v10" stroke="currentColor" strokeWidth="2" />
  </svg>
)
const SpeakerOff = () => (
  <svg viewBox="0 0 16 16" width="18" height="18" aria-hidden="true">
    <path d="M2 6h3l4-3v10L5 10H2z" fill="currentColor" />
    <path d="M11 6l4 4M15 6l-4 4" stroke="currentColor" strokeWidth="2" />
  </svg>
)
