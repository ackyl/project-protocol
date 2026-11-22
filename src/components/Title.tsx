import { useRef } from 'react'
import { cargo, cargoIds, rules } from '../game/content'
import type { Runner } from '../app/runner'
import { cargoIcon } from '../render/icons'
import { useReserve } from './reserve'

const hazard = {
  cell: 'Heats up when loose or carried. Vents at 100% — hull and cargo damage.',
  crate: 'Broadcasts a signal. Only the shield bay hides it from customs.',
  specimen: 'Restless outside a cradle. Pulses blow latches and spoil it.',
}

export function Title({
  runner,
  touch,
  muted,
  onMute,
  firstTime,
  onTraining,
  onSkipTraining,
}: {
  runner: Runner
  touch: boolean
  muted: boolean
  onMute: () => void
  firstTime: boolean
  onTraining: () => void
  onSkipTraining: () => void
}) {
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
          <span>{firstTime ? 'TRAINING RUN' : 'SYNDICATE JOB'}</span>
          <span>ROUTE {runner.game.seed.toString(36).toUpperCase()}</span>
        </div>
        <h2 id="job-title">The Cinder Run</h2>
        <div className="leg">
          <b>Relay Nine</b>
          <i />
          <b>Cinder Gate</b>
        </div>
        <p className="brief">
          {firstTime
            ? 'First job? The clock waits while you learn each system, then the gate is real.'
            : `${rules.highway}s down the Ash Belt. Expect a power surge and a hull impact — when and where depends on the route.`}
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
        <button className="go" onClick={firstTime ? onTraining : () => runner.send({ type: 'accept' })} autoFocus>
          {firstTime ? 'Start training' : 'Take the job'} {!touch && <kbd>E</kbd>}
        </button>
        <button className="link" onClick={firstTime ? onSkipTraining : onTraining}>
          {firstTime ? 'Skip training — I know the job' : 'Replay training'}
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
