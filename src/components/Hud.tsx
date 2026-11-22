import { useEffect, useRef, useState } from 'react'
import { breachSites, cargo, cargoIds, rules, searchStops, type CargoId } from '../game/content'
import { exposure, ledger } from '../game/customs'
import { cargoIcon } from '../render/icons'
import { heldItem, shielded, type Game } from '../game/simulation'
import type { UiState } from '../app/runner'
import { useReserve } from './reserve'

const clock = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

function objective(g: Game): { text: string; urgent?: boolean } | null {
  const held = heldItem(g)
  const loc = (id: CargoId) => g.items[id].location.kind
  const site = g.breach ? breachSites[g.breach.site].name : ''
  if (g.phase === 'highway') {
    if (g.fault && g.breach) return { text: `Two emergencies! Console (upper deck, aft) and the ${site} breach`, urgent: true }
    if ((g.fault || g.breach) && held) return { text: 'Emergency! Put the cargo down — stations need empty hands', urgent: true }
    if (g.fault) return { text: 'Power fault! Fix the console — upper deck, aft', urgent: true }
    if (g.breach) return { text: `Hull breach at the ${site}! Patch it`, urgent: true }
    if (g.items.specimen.agitation > 70 && loc('specimen') !== 'slot')
      return { text: 'The specimen is about to pulse — contain it!', urgent: true }
    if (held === 'cell') return { text: 'Rack the cell before it vents' }
    if (loc('cell') === 'loose') return { text: 'The cell is cooking — grab it and rack it', urgent: g.items.cell.heat > 60 }
    if (held === 'specimen') return { text: 'Contain the specimen in a free cradle' }
    if (loc('specimen') === 'loose') return { text: 'The specimen is getting restless — contain it' }
    if (held === 'crate') return { text: 'Shield bay — lower deck, bow end' }
    if (!shielded(g.items.crate)) return { text: 'The crate broadcasts — only the shield bay hides it' }
    return { text: 'Cargo secured. Stay sharp.' }
  }
  if (g.phase === 'prep') {
    if (held) return { text: 'Put it somewhere — hand-held cargo is found for sure', urgent: true }
    const loose = cargoIds.find((id) => loc(id) === 'loose')
    if (loose) return { text: `Loose cargo is always found — stow the ${cargo[loose].name}`, urgent: true }
    const risky = cargoIds.filter((id) => exposure(g, id) > 0)
    if (risky.length)
      return { text: `${risky.map((id) => cargo[id].name).join(' & ')} can still be found — bribe or gamble` }
    return { text: 'Looks clean. Wait for the knock.' }
  }
  return null
}

function CargoStrip({ g }: { g: Game }) {
  return (
    <div className="cargo-strip" aria-label="Cargo status">
      {cargoIds.map((id) => {
        const item = g.items[id]
        const loc = item.location.kind
        if (loc === 'surrendered') return null
        const level = id === 'cell' ? item.heat : id === 'specimen' ? item.agitation : 0
        const tone = level > 70 ? 'bad' : loc === 'slot' ? (id === 'crate' && !shielded(item) ? 'warn' : 'ok') : 'warn'
        const status =
          loc === 'slot' ? (id === 'crate' && !shielded(item) ? 'racked · loud' : 'secured') : loc === 'held' ? 'carried' : 'loose'
        return (
          <span key={id} className={'cargo-chip ' + tone} title={`${cargo[id].name}: ${status}`}>
            <img src={cargoIcon(id)} alt="" width={18} height={19} />
            {id !== 'crate' && <i style={{ transform: `scaleX(${Math.min(1, level / 100)})` }} />}
          </span>
        )
      })}
    </div>
  )
}

export function Hud({
  ui,
  muted,
  onMute,
  touch,
  training,
}: {
  ui: UiState
  muted: boolean
  onMute: () => void
  touch: boolean
  training: { objective: string | null; step: number; total: number; cleared: number } | null
}) {
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
  const obj = training ? (training.objective ? { text: training.objective, training: true } : null) : objective(g)
  const wallet = g.phase === 'result' ? ledger(g).balance : g.cash
  const segs = 10
  const lit = Math.ceil((g.hull / rules.hull) * segs)
  const hullTone = g.hull > 60 ? 'ok' : g.hull > 30 ? 'warn' : 'bad'

  return (
    <>
      <div className="hud" ref={top}>
        <div className="hud-left">
        <div className={`hud-hull ${hullTone}`} key={'h' + hit} data-hit={hit > 0}>
          <span className="hud-label">HULL</span>
          <span className="hull-bar" aria-hidden="true">
            {Array.from({ length: segs }, (_, i) => (
              <i key={i} className={i < lit ? 'on' : ''} />
            ))}
          </span>
          <b className="hud-num">{g.hull}</b>
          {g.phase === 'highway' && (g.fault || g.breach) && (
            <span className="hud-drain">
              −{(g.fault ? rules.surgeDamagePerSecond : 0) + (g.breach ? rules.breachDamagePerSecond : 0)}/s
            </span>
          )}
        </div>
        {(g.phase === 'highway' || g.phase === 'prep') && <CargoStrip g={g} />}
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
          {obj && (
            <div
              className={'objective' + ('urgent' in obj && obj.urgent ? ' urgent' : '') + ('training' in obj ? ' training' : '')}
              key={obj.text}
            >
              {'training' in obj && (
                <b>
                  TRAINING {training!.step}/{training!.total}
                </b>
              )}
              {obj.text}
            </div>
          )}
          {training && training.cleared > 0 && <div className="cleared" key={'c' + training.cleared}>✓ Done</div>}
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
