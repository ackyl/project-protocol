import { rules } from '../game/content'
import type { Art, Step } from '../app/tutorial'
import { cargoIcon, courierIcon } from '../render/icons'

function Illustration({ art }: { art: Art }) {
  switch (art) {
    case 'move':
      return (
        <div className="ill ill-move">
          <span className="arr l">◀</span>
          <img src={courierIcon()} alt="" className="walker" />
          <span className="arr r">▶</span>
          <span className="ladder-ill">
            <i />
            <b>▲</b>
          </span>
        </div>
      )
    case 'cell':
      return (
        <div className="ill">
          <figure className="cargo-ill">
            <img src={cargoIcon('cell')} alt="" />
            <span className="meter heat">
              <i />
            </span>
          </figure>
          <span className="to">→</span>
          <span className="cradle-ill">
            <img src={cargoIcon('cell')} alt="" />
          </span>
          <span className="tag ok">COOLING</span>
        </div>
      )
    case 'crate':
      return (
        <div className="ill">
          <figure className="cargo-ill rings">
            <img src={cargoIcon('crate')} alt="" />
          </figure>
          <span className="to">→</span>
          <span className="vault-ill">
            <img src={cargoIcon('crate')} alt="" />
          </span>
          <span className="tag ok">HIDDEN</span>
        </div>
      )
    case 'specimen':
      return (
        <div className="ill">
          <figure className="cargo-ill shake">
            <img src={cargoIcon('specimen')} alt="" />
            <span className="meter bio">
              <i />
            </span>
          </figure>
          <span className="burst">PULSE</span>
          <span className="tag bad">−{rules.pulseConditionLoss}% · LATCHES BLOWN</span>
        </div>
      )
    case 'surge':
      return (
        <div className="ill">
          <div className="lock-ill">
            <span className="band" style={{ left: rules.targetStart * 100 + '%', width: (rules.targetEnd - rules.targetStart) * 100 + '%' }} />
            <span className="needle" />
          </div>
          <span className="tag">LOCK IN THE GREEN</span>
        </div>
      )
    case 'breach':
      return (
        <div className="ill">
          <div className="rivet-ill">
            {['▲', '◀', '◀', '▼'].map((g, i) => (
              <i key={i} style={{ animationDelay: i * 0.5 + 's' }}>
                {g}
              </i>
            ))}
          </div>
          <span className="tag">IN ORDER · NO SLIPS</span>
        </div>
      )
    case 'prep':
      return (
        <div className="ill">
          <span className="tag ok">HIDDEN</span>
          <span className="tag warn">{rules.bioRackChance * 100}% SEEN</span>
          <span className="tag warn">{rules.signalRackChance * 100}% SEEN</span>
          <span className="tag bad">100% SEEN</span>
        </div>
      )
    case 'search':
      return (
        <div className="ill">
          <span className="btn-ill main">SEARCH</span>
          <span className="btn-ill">BRIBE {rules.bribe}¢</span>
          <span className="btn-ill bad">HAND OVER</span>
        </div>
      )
    case 'payday':
      return (
        <div className="ill">
          <div className="receipt-ill">
            <span>Cargo × condition</span>
            <b className="plus">+</b>
            <span>Bribes · repairs · fines</span>
            <b className="minus">−</b>
            <span>Reserve {rules.debtTarget}¢</span>
            <b>?</b>
          </div>
        </div>
      )
  }
}

export function TutorialPanel({
  step,
  index,
  total,
  touch,
  onContinue,
  onSkip,
}: {
  step: Step
  index: number
  total: number
  touch: boolean
  onContinue: () => void
  onSkip: () => void
}) {
  return (
    <div className={'tut-backdrop' + (step.art === 'payday' ? ' aside' : '')}>
      <section className="tut-panel" role="dialog" aria-modal="true" aria-labelledby="tut-title">
        <header>
          <span>
            TRAINING {index + 1}/{total}
          </span>
          <button className="link light" onClick={onSkip}>
            Skip training
          </button>
        </header>
        <h2 id="tut-title">{step.title}</h2>
        <Illustration art={step.art} />
        {step.lines.map((l) => (
          <p key={l}>{l}</p>
        ))}
        {touch ? (
          <p className="tut-touch">{step.touch}</p>
        ) : (
          <div className="tut-keys">
            {step.keys.map(([keys, label]) => (
              <span key={label}>
                {keys.map((k) => (
                  <kbd key={k}>{k}</kbd>
                ))}
                {label}
              </span>
            ))}
          </div>
        )}
        {step.objective && <div className="tut-goal">Goal: {step.objective}</div>}
        <button className="go" onClick={onContinue} autoFocus>
          {step.id === 'payday' ? 'Got it' : step.objective ? "Let's go" : 'Got it'} {!touch && <kbd>E</kbd>}
        </button>
      </section>
    </div>
  )
}
