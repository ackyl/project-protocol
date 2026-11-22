import { useRef } from 'react'
import { cargo, cargoIds, rules } from '../game/content'
import type { Runner } from '../app/runner'
import { cargoIcon } from '../render/icons'
import { useReserve } from './reserve'

const hazard = {
  cell: 'Heats up when loose or carried. Vents at 100% — hull and cargo damage.',
  crate: 'Broadcasts a signal. Only the shield bay hides it from customs.',
}

export function Title({ runner, touch, muted, onMute }: { runner: Runner; touch: boolean; muted: boolean; onMute: () => void }) {
  const ticket = useRef<HTMLElement>(null)
  const wide = window.innerWidth >= window.innerHeight * 1.15
  useReserve(ticket, 'ticket', wide ? 'right' : 'bottom')
  const logo = useRef<HTMLDivElement>(null)
  useReserve(logo, 'logo', 'top')
  const total = cargoIds.reduce((n, id) => n + cargo[id].value, 0)
  return (
    <>
      <div className="logo" ref={logo}>
        <h1>
          <span>PROJECT</span>
          <b>PROTOCOL</b>
        </h1>
        <p>Disposable courier · dangerous freight · day 01</p>
        <button className="mute title-mute" onClick={onMute} aria-label={muted ? 'Unmute sound' : 'Mute sound'}>
          {muted ? 'SOUND OFF' : 'SOUND ON'}
        </button>
      </div>
      <section className={'ticket ' + (wide ? 'side' : 'bottom')} ref={ticket} aria-labelledby="job-title">
        <div className="ticket-head">
          <span>SYNDICATE JOB</span>
          <span>#071</span>
        </div>
        <h2 id="job-title">The Cinder Run</h2>
        <div className="leg">
          <b>Relay Nine</b>
          <i />
          <b>Cinder Gate</b>
        </div>
        <p className="brief">
          {rules.highway}s down the Ash Belt highway, then a customs search. Keep the hull in one piece and the freight out of sight.
        </p>
        <ul className="freight">
          {cargoIds.map((id) => (
            <li key={id} className={id}>
              <img src={cargoIcon(id)} alt="" width={56} height={60} />
              <div>
                <b>{cargo[id].name}</b>
                <small>{hazard[id]}</small>
              </div>
              <em>{cargo[id].value}¢</em>
            </li>
          ))}
        </ul>
        <div className="pay">
          <span>
            Payout <b>{total}¢</b>
          </span>
          <span>
            Wallet <b>{rules.startingCash}¢</b>
          </span>
        </div>
        <button className="go" onClick={() => runner.send({ type: 'accept' })} autoFocus>
          Take the job {!touch && <kbd>E</kbd>}
        </button>
        <div className="controls-hint">
          {touch ? (
            <span>Tap the ship to walk & interact · buttons to move, climb, drop</span>
          ) : (
            <>
              <span><kbd>A</kbd><kbd>D</kbd> walk</span>
              <span><kbd>W</kbd><kbd>S</kbd> ladder</span>
              <span><kbd>E</kbd> use</span>
              <span><kbd>Q</kbd> drop</span>
              <span>or click to walk</span>
            </>
          )}
        </div>
      </section>
    </>
  )
}
