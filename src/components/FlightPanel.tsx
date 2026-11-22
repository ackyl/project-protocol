import { cargo, deckName, rules } from '../game/content'
import {
  contextActions,
  cursor,
  heldItem,
  shielded,
  type Command,
  type Game,
} from '../game/simulation'
import { Icon } from './Icon'
export function shortcut(g: Game, key: string): Command | undefined {
  if (key === 'e')
    return g.repairTicks !== null ? { type: 'stop' } : contextActions(g)[0]?.cmd
  if (key === 'q') return { type: 'drop' }
  if (key === 'escape') return { type: 'leave' }
}
function objective(g: Game) {
  if (g.phase === 'prep')
    return 'Shield the crate. Stow the cell before the officer boards.'
  if (g.fault)
    return 'Restore power at the upper-left console. Stow or drop carried cargo first.'
  if (g.items.cell.location.kind !== 'slot')
    return 'Pick up the orange cell. Walk it to a rack before it vents.'
  if (!shielded(g.items.crate))
    return 'Take the upper-deck crate down the ladder to the shield bay.'
  if (g.elapsed < rules.surge * rules.hz)
    return 'Freight secured. Stand by for the surge at the upper-left console.'
  return 'Freight secured and power stable. Hold course for Cinder Gate.'
}
export function FlightPanel({
  g,
  send,
}: {
  g: Game
  send: (cmd: Command) => void
}) {
  const held = heldItem(g),
    actions = contextActions(g)
  const prep = g.phase === 'prep'
  const title = prep
    ? 'Customs approach'
    : g.fault
      ? 'Power surge'
      : 'Highway transit'
  return (
    <section className={'panel flight ' + (g.fault && !prep ? 'alert' : '')}>
      <div className="panel-title">
        <Icon name={g.fault ? 'bolt' : 'route'} />
        <h2>{title}</h2>
        <span className="tag">{prep ? 'CHECKPOINT' : 'ASH BELT'}</span>
      </div>
      <div className="action-body">
        {g.repairTicks === null && <p className="objective">{objective(g)}</p>}
        <div className="readout">
          <span>{deckName(g.player.floor)}</span>
          <b>{held ? cargo[held].name : 'Hands empty'}</b>
        </div>
        {g.repairTicks !== null ? (
          <div className="repair">
            <p>Stop the cursor inside the striped band.</p>
            <div
              className="timing"
              aria-label={`Repair cursor ${Math.round(cursor(g) * 100)} percent`}
            >
              <i
                style={{
                  left: rules.targetStart * 100 + '%',
                  width: (rules.targetEnd - rules.targetStart) * 100 + '%',
                }}
              />
              <b style={{ left: cursor(g) * 100 + '%' }} />
            </div>
            <div className="choices">
              <button
                className="primary"
                onClick={() => send({ type: 'stop' })}
              >
                Lock phase <kbd>E</kbd>
              </button>
              <button
                className="secondary"
                onClick={() => send({ type: 'leave' })}
              >
                Leave
              </button>
            </div>
          </div>
        ) : (
          <div className="choices">
            {actions.map((a, i) => (
              <button
                className="primary"
                key={a.label}
                onClick={() => send(a.cmd)}
              >
                {a.label}
                {i === 0 && <kbd>E</kbd>}
              </button>
            ))}
            {held && !g.climb && (
              <button
                className="secondary"
                onClick={() => send({ type: 'drop' })}
              >
                Drop <kbd>Q</kbd>
              </button>
            )}
            {!actions.length && !held && (
              <small>
                {g.climb
                  ? 'Climbing…'
                  : 'Walk near cargo or the active console to interact.'}
              </small>
            )}
          </div>
        )}
        <p className="feedback" role="status">
          {g.note}
        </p>
      </div>
    </section>
  )
}
