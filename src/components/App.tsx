import { ShipCanvas } from '../render/ShipCanvas'
import { rules } from '../game/content'
import { Manifest } from './Manifest'
import { Contract } from './Contract'
import { canClimb, mobile } from '../game/simulation'
import { useFlight } from '../input/useFlight'
import { Icon } from './Icon'
import { Checkpoint, OutcomePanel } from './Checkpoint'
import { FlightPanel, shortcut } from './FlightPanel'
const time = (s: number) =>
  Math.floor(s / 60)
    .toString()
    .padStart(2, '0') +
  ':' +
  (s % 60).toString().padStart(2, '0')
export function App() {
  const { game: g, send, hold } = useFlight(shortcut)
  const docked = g.phase === 'contract'
  return (
    <main className={docked ? 'docked' : 'running ' + g.phase}>
      <header className="mast">
        <div className="brand">
          <span className="logomark" aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
          PROJECT <b>PROTOCOL</b>
        </div>
        <span className="online">
          <i /> SYSTEM ONLINE
        </span>
      </header>
      <div className="pagehead">
        <div>
          <div className="kicker">
            <span className="tinyline" /> COURIER OPERATIONS
          </div>
          <h1>
            Dispatch terminal<span>.</span>
          </h1>
        </div>
        <span className="day">
          DAY <b>01</b>
        </span>
      </div>
      <div className="layout">
        <div className="left">
          <section className="panel vessel">
            <div className="panel-title">
              <Icon name="ship" />
              <h2>Vessel telemetry</h2>
              <span className="live">
                <i /> {g.phase === 'result' ? 'LAST FRAME' : 'LIVE FEED'}
              </span>
            </div>
            <div className="view">
              <ShipCanvas game={g} />
              <div className="vessel-name">
                <small>FREIGHTER CLASS / F-07</small>
                <strong>MULE–07</strong>
              </div>
              <span className="view-id">CAM 01 · CUTAWAY</span>
              {mobile(g) && (
                <div className="deck-labels">
                  <span>POWER ↘</span>
                  <span>RACK ↓</span>
                  <span>↑ AFT RACK</span>
                  <span>↑ SHIELD BAY</span>
                </div>
              )}
            </div>
            <div className="stats">
              <div>
                <small>
                  <Icon name="hull" size={13} />
                  HULL
                </small>
                <b>
                  {g.hull}
                  <em>%</em>
                </b>
              </div>
              <div>
                <small>
                  <Icon name="clock" size={13} />
                  {g.phase === 'prep' ? 'CUSTOMS' : 'TRANSIT'}
                </small>
                <b>
                  {g.phase === 'search' || g.phase === 'result'
                    ? '—'
                    : time(
                        Math.max(
                          0,
                          (g.phase === 'prep' ? rules.prep : rules.highway) -
                            Math.floor(g.elapsed / rules.hz),
                        ),
                      )}
                </b>
              </div>
              <div>
                <small>
                  <Icon name="bolt" size={13} />
                  POWER
                </small>
                <b className={g.fault ? 'bad' : 'good'}>
                  {g.outcome === 'death'
                    ? 'Offline'
                    : g.fault
                      ? 'Fault'
                      : 'Nominal'}
                </b>
              </div>
            </div>
          </section>
          <Manifest game={g} />
        </div>
        <aside className="right">
          {g.phase === 'result' ? (
            <OutcomePanel g={g} send={send} />
          ) : g.phase === 'search' ? (
            <Checkpoint g={g} send={send} />
          ) : !docked ? (
            <FlightPanel g={g} send={send} />
          ) : (
            <Contract accept={() => send({ type: 'accept' })} />
          )}
          {(docked || (mobile(g) && g.repairTicks === null)) && (
            <section className="panel control-panel">
              <div className="panel-title">
                <Icon name="controls" />
                <h2>Courier controls</h2>
              </div>
              {mobile(g) ? (
                <div className="pad">
                  {([-1, 1] as const).map((d) => (
                    <button
                      key={d}
                      disabled={!!g.climb || g.repairTicks !== null}
                      aria-label={d < 0 ? 'Walk left' : 'Walk right'}
                      onPointerDown={(e) => {
                        e.currentTarget.setPointerCapture(e.pointerId)
                        hold(e.pointerId, d)
                      }}
                      onLostPointerCapture={(e) => hold(e.pointerId, 0)}
                      onPointerUp={(e) => hold(e.pointerId, 0)}
                      onPointerCancel={(e) => hold(e.pointerId, 0)}
                    >
                      {d < 0 ? '←' : '→'}
                    </button>
                  ))}
                  <button
                    disabled={!canClimb(g, g.player.floor === 0 ? 1 : 0)}
                    onClick={() =>
                      send({ type: 'climb', to: g.player.floor === 0 ? 1 : 0 })
                    }
                  >
                    Climb
                  </button>
                </div>
              ) : (
                <div className="keyguide">
                  <p>
                    Hold the arrows to walk. Use Climb at the center ladder.
                  </p>
                  <span>
                    <kbd>A</kbd>
                    <kbd>D</kbd> Walk
                  </span>
                  <span>
                    <kbd>W</kbd>
                    <kbd>S</kbd> Ladder
                  </span>
                  <span>
                    <kbd>E</kbd> Interact
                  </span>
                  <span>
                    <kbd>Q</kbd> Drop
                  </span>
                </div>
              )}
            </section>
          )}
        </aside>
      </div>
      <footer>
        <span>
          <i /> COURIER UPLINK ESTABLISHED
        </span>
        <span>MULE–07 / RELAY NINE</span>
      </footer>
    </main>
  )
}
