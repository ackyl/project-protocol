import { useEffect, useRef, useState } from 'react'
import { breachSites, cargo, cargoIds, roomAt, roomIds, rooms, rules, ship } from '../game/content'
import { cargoStatus, currentRoom, ledger } from '../game/customs'
import { cargoIcon } from '../render/icons'
import { caskSealed, heldItem, mobile, position, type Game } from '../game/simulation'
import type { UiState } from '../app/runner'
import { useReserve } from './reserve'

const clock = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

function objective(g: Game): { text: string; urgent?: boolean } | null {
  const held = heldItem(g)
  const site = g.breach ? breachSites[g.breach.site].name : ''
  if (g.phase === 'highway') {
    if (!caskSealed(g) && !g.echo) {
      const grace = Math.ceil(rules.echoSeconds - g.exposedTicks / rules.hz)
      return { text: `Containment offline · ${grace}s to echo`, urgent: true }
    }
    if (g.fault && g.breach) return { text: `Power fault and ${site} breach`, urgent: true }
    if ((g.fault || g.breach) && held) return { text: 'Drop your load to use the repair station', urgent: true }
    if (g.fault) return { text: 'Power fault · reach Engineering', urgent: true }
    if (g.breach) return { text: `Patch the ${site} breach`, urgent: true }
  }
  if (g.phase === 'prep' || g.phase === 'highway') {
    if (cargoStatus(g, 'relays') === 'EXPOSED' || cargoStatus(g, 'relays') === 'UNEXPLAINED HEAT')
      return { text: 'Relays in rear rack · heated drums in front' }
    if (cargoStatus(g, 'bales') === 'OFF MANIFEST') return { text: 'Stow gasket bales in the open berth' }
    if (!caskSealed(g)) return { text: 'Return the cask to its powered cradle', urgent: true }
    if (g.echo) return { text: `Echo on record in ${rooms[g.echo].name}` }
    return { text: g.phase === 'prep' ? 'Manifest matches · keep freight stowed' : 'Freight secured' }
  }
  return null
}

function CargoStrip({ g }: { g: Game }) {
  return (
    <div className="cargo-strip" aria-label="Cargo status">
      {cargoIds.map((id) => {
        const item = g.items[id]
        const loc = item.location.kind
        if (loc === 'surrendered' || loc === 'confiscated') return null
        const level = id === 'cask' ? g.exposedTicks / (rules.hz * rules.echoSeconds) : 0
        const status = cargoStatus(g, id)
        const tone = status === 'LIVE REPLY' || status === 'EXPOSED' ? 'bad' : loc !== 'slot' || g.echo && id === 'cask' ? 'warn' : 'ok'
        return (
          <span key={id} className={'cargo-chip ' + tone} title={`${cargo[id].name}: ${status}`}>
            <img src={cargoIcon(id)} alt="" width={18} height={19} />
            {id === 'cask' && <i style={{ transform: `scaleX(${Math.min(1, level)})` }} />}
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
  training: { objective: string | null; step: number; total: number } | null
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
              <div className="pips" aria-label="Inspection route">
                {g.inspection?.route.map((room, i) => (
                  <i key={room} className={i < g.inspection!.index ? 'done' : i === g.inspection!.index ? 'now' : ''} title={rooms[room].name} />
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
        {mobile(g) && <RoomStrip g={g} />}
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

function RoomStrip({ g }: { g: Game }) {
  const here = roomAt(g.player)
  const officer = g.phase === 'search' ? currentRoom(g) : null
  const caseRoom = position(g, 'cask')
  const threats = new Set([
    g.phase === 'highway' && g.fault ? roomAt(ship.station) : null,
    g.phase === 'highway' && g.breach ? roomAt(breachSites[g.breach.site]) : null,
    g.phase === 'highway' && !caskSealed(g) && caseRoom ? roomAt(caseRoom) : null,
  ])
  return (
    <div className="room-strip" aria-label="Ship compartments">
      {roomIds.map((id) => (
        <span className={here === id ? 'here' : ''} key={id}
          title={rooms[id].name + (here === id ? ' · you' : '') + (officer === id ? ' · officer destination' : '') + (g.echo === id ? ' · residual echo' : '') + (threats.has(id) ? ' · emergency' : '')}>
          {here === id && <b aria-label="You">● </b>}{rooms[id].short}
          {officer === id && <b aria-label="Officer destination"> ◆</b>}
          {threats.has(id) && <b className="threat" aria-label="Emergency"> !</b>}
          {g.echo === id && <b className="trace" aria-label="Residual echo"> ≋</b>}
        </span>
      ))}
    </div>
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
