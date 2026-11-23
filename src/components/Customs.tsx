import { useRef } from 'react'
import { cargo, rooms, rules } from '../game/content'
import { briefing, currentRoom, responsePoint, surrenderable } from '../game/customs'
import { near } from '../game/simulation'
import type { Runner, UiState } from '../app/runner'
import { officerPortrait } from '../render/icons'
import { useReserve } from './reserve'

const methods = { surface: 'Surface check', rack: 'Open paired rack', cradle: 'Open powered cradle', room: 'Open all local fixtures' }

export function Customs({ ui, runner, touch }: { ui: UiState; runner: Runner; touch: boolean }) {
  const g = ui.game
  const box = useRef<HTMLElement>(null)
  const side = window.innerWidth > window.innerHeight * 1.6 && window.innerHeight < 520
  useReserve(box, 'customs', side ? 'right' : 'bottom')
  const i = g.inspection!
  const room = currentRoom(g)
  const check = briefing(g)
  const heat = check.evidence.some((e) => e.kind === 'heat')
  const p = responsePoint(g)
  const ready = p && !g.climb && near(g, p)
  const hold = i.stage === 'hold'
  const review = i.stage === 'review'
  const waiting = i.stage === 'approach'
  return (
    <section className={'customs ' + (side ? 'side' : 'bottom')} ref={box} aria-labelledby="stop-name">
      <div className="portrait">
        <img src={officerPortrait()} alt="Customs officer" width={130} height={110} />
        <span>CINDER GATE</span>
      </div>
      <div className="customs-body">
        <div className="customs-head">
          <h2 id="stop-name">{rooms[room].name}</h2>
          <span className={check.suspicion >= rules.deepSearch ? 'escalated' : ''}>
            SUSPICION {waiting ? Math.min(i.carried, rules.suspicionLimit) : check.suspicion}/{rules.suspicionLimit}
          </span>
        </div>
        {waiting ? <p className="speech">Officer en route. You may follow.</p> : (
          <>
            <p className="speech">
              {ui.scanning ? 'Scanning' : methods[check.depth]}
              {!ui.scanning && check.found.length > 0 && <> · {check.found.some((id) => id === 'cask') ? 'impound risk' : 'freight exposed'}</>}
            </p>
            {check.evidence.length > 0 && (
              <ul className="case-evidence">
                {check.evidence.map((e) => <li key={e.text}>{e.text} <b>+{e.points}</b></li>)}
              </ul>
            )}
          </>
        )}
        {ui.scanning && <p className="case-note">{g.note}</p>}
        {hold && (
          <div className="choices">
            <button className="alt" onClick={ready ? () => runner.send({ type: 'respond' }) : runner.walkToResponse}>
              {ready ? 'File response' : i.response?.kind === 'cite' ? 'Walk to docket' : 'Walk to freight'}
              {!touch && <kbd>{ready ? 'E' : 'F'}</kbd>}
            </button>
            <span className="hold-clock">HOLD · {Math.ceil(i.remaining / rules.hz)}s</span>
            <button className="link light" onClick={() => runner.send({ type: 'inspect' })}>End hold</button>
          </div>
        )}
        {review && (
          <div className="choices">
            <button className="go" onClick={() => runner.send({ type: 'inspect' })}>
              Allow search {!touch && <kbd>E</kbd>}
            </button>
            {heat && (
              <button className="alt" onClick={() => runner.send({ type: 'hold', response: { kind: 'cite' } })}>
                Cite heated lubricant
                <small>Requires drums in front rack</small>
              </button>
            )}
            {surrenderable(g).map((id) => (
              <button className="alt bad" key={id} onClick={() => runner.send({ type: 'hold', response: { kind: 'surrender', id } })}>
                Surrender {id === 'relays' ? 'relays' : 'cask'}
                <small>{cargo[id].name} · lose {cargo[id].value}¢</small>
              </button>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
