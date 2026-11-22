import { cargo, cargoIds, rules, searchStops } from '../game/content'
import { atStop, detection, ledger } from '../game/customs'
import type { Command, Game } from '../game/simulation'
import { Icon } from './Icon'
type Props = { g: Game; send: (cmd: Command) => void }
export function Checkpoint({ g, send }: Props) {
  const items = cargoIds.filter((id) => atStop(g, id))
  return (
    <section className="panel flight">
      <div className="panel-title">
        <Icon name="doc" />
        <h2>Customs inspection</h2>
        <span className="tag">
          {g.stop + 1} / {searchStops.length}
        </span>
      </div>
      <div className="action-body">
        <h2>{searchStops[g.stop].name}</h2>
        <ol className="stop-list" aria-label="Search order">
          {searchStops.map((s, i) => (
            <li
              key={s.id}
              aria-current={g.stop === i ? 'step' : undefined}
              className={i < g.stop ? 'cleared' : ''}
            >
              {s.name}
            </li>
          ))}
        </ol>
        <div className="scan">
          {items.length ? (
            items.map((id) => (
              <p key={id}>
                {cargo[id].name}{' '}
                <b>{Math.round(detection(g, id) * 100)}% detection</b>
              </p>
            ))
          ) : (
            <p>Location empty. Safe to inspect.</p>
          )}
        </div>
        <button className="primary" onClick={() => send({ type: 'inspect' })}>
          Allow inspection <Icon name="arrow" />
        </button>
        <div className="search-actions">
          <button
            className="secondary"
            disabled={g.cash < rules.bribe}
            onClick={() => send({ type: 'bribe' })}
          >
            Skip for {rules.bribe} CR
          </button>
          <small>Guaranteed bribe · {g.cash} CR available</small>
        </div>
        {items.map((id) => (
          <button
            className="secondary surrender"
            key={id}
            onClick={() => send({ type: 'surrender', id })}
          >
            Surrender {cargo[id].name}
          </button>
        ))}
        <p className="feedback" role="status">
          {g.note}
        </p>
      </div>
    </section>
  )
}
export function OutcomePanel({ g, send }: Props) {
  const book = ledger(g),
    delivered = g.outcome === 'delivered'
  const row = (label: string, amount: number) => (
    <div className="ledger-row" key={label}>
      <span>{label}</span>
      <b>
        {amount > 0 ? '+' : ''}
        {amount} CR
      </b>
    </div>
  )
  return (
    <section className="panel flight">
      <div className="panel-title">
        <Icon name="coins" />
        <h2>Financial ledger</h2>
        <span className="tag">DAY 01</span>
      </div>
      <div className="action-body">
        <div className="kicker amber">CONTRACT #071 / CLOSED</div>
        <h2>
          {delivered
            ? 'Delivery complete'
            : g.outcome === 'arrest'
              ? 'Courier arrested'
              : 'Courier lost'}
        </h2>
        <p>{g.note}</p>
        <div className="ledger">
          {row('Opening balance', rules.startingCash)}
          {cargoIds.map((id) => {
            const reason =
              g.items[id].location.kind === 'surrendered'
                ? 'surrendered'
                : g.outcome === 'arrest'
                  ? 'forfeited'
                  : g.outcome === 'death'
                    ? 'lost'
                    : g.items[id].condition + '%'
            return row(cargo[id].name + ' · ' + reason, book.earnings[id])
          })}
          {row('Bribes paid', -book.bribes)}
          {row('Hull repairs', -book.repairs)}
          {book.penalty > 0 &&
            row(
              g.outcome === 'arrest' ? 'Impound fee' : 'Wreck recovery',
              -book.penalty,
            )}
        </div>
        <div className="balance">
          Closing balance <b>{book.balance} CR</b>
        </div>
        {book.shortfall > 0 && (
          <p className="feedback">
            Debt warning · {book.shortfall} CR short of the {rules.debtTarget}{' '}
            CR syndicate reserve.
          </p>
        )}
        <button
          className="primary restart"
          onClick={() => send({ type: 'restart' })}
        >
          Restart delivery <Icon name="arrow" />
        </button>
      </div>
    </section>
  )
}
