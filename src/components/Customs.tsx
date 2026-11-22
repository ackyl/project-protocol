import { useRef } from 'react'
import { cargo, cargoIds, rules, searchStops } from '../game/content'
import { atStop, detection, itemPayout } from '../game/customs'
import type { Runner, UiState } from '../app/runner'
import { cargoIcon, officerPortrait } from '../render/icons'
import { useReserve } from './reserve'

const lines: Record<string, [string, string]> = {
  lower: ['Lower deck. Stand still.', 'Something down here is humming.'],
  top: ['Upstairs. Nice and tidy.', 'Upstairs next. Hands where I can see them.'],
  aft: ['Aft cradle. Empty, apparently.', 'What is in the aft cradle, courier?'],
  upper: ['Upper rack. Nothing? Shame.', "Rack's latched. Let me have a look."],
  vault: ['Shield bay, empty. Pity.', 'A shield bay, huh. Expensive habit.'],
}

export function Customs({ ui, runner, touch }: { ui: UiState; runner: Runner; touch: boolean }) {
  const g = ui.game
  const box = useRef<HTMLElement>(null)
  const side = window.innerWidth > window.innerHeight * 1.6 && window.innerHeight < 520
  useReserve(box, 'customs', side ? 'right' : 'bottom')
  const stop = searchStops[g.stop]
  const here = cargoIds.filter((id) => atStop(g, id))
  const busy = ui.scanning
  const say = lines[stop.id][here.length ? 1 : 0]
  return (
    <section className={'customs ' + (side ? 'side' : 'bottom')} ref={box} aria-labelledby="stop-name">
      <div className="portrait">
        <img src={officerPortrait()} alt="Customs officer" width={130} height={110} />
        <span>GATE OFFICER</span>
      </div>
      <div className="customs-body">
        <div className="customs-head">
          <h2 id="stop-name">{stop.name}</h2>
          <span>
            CHECK {g.stop + 1}/{searchStops.length}
          </span>
        </div>
        <p className="speech">“{say}”</p>
        <ul className="exposed">
          {here.length === 0 && <li className="none">Nothing of yours here.</li>}
          {here.map((id) => {
            const pct = Math.round(detection(g, id) * 100)
            return (
              <li key={id} className={pct === 0 ? 'safe' : pct < 100 ? 'risky' : 'caught'}>
                <img src={cargoIcon(id)} alt="" width={28} height={30} />
                {cargo[id].name}
                <b>{pct === 0 ? 'hidden' : pct + '% found'}</b>
              </li>
            )
          })}
        </ul>
        <div className="choices">
          <button className="go" disabled={busy} onClick={() => runner.send({ type: 'inspect' })} autoFocus>
            {busy ? 'Scanning…' : 'Let them search'} {!touch && !busy && <kbd>E</kbd>}
          </button>
          <button className="alt" disabled={busy || g.cash < rules.bribe} onClick={() => runner.send({ type: 'bribe' })}>
            Bribe {rules.bribe}¢ {!touch && <kbd>B</kbd>}
            <small>{g.cash < rules.bribe ? `only ${g.cash}¢ left` : 'skip this check'}</small>
          </button>
          {here.map((id, i) => (
            <button className="alt bad" key={id} disabled={busy} onClick={() => runner.send({ type: 'surrender', id })}>
              Hand over {cargo[id].name.split(' ')[1]} {!touch && <kbd>{i + 1}</kbd>}
              <small>forfeit {itemPayout(g, id)}¢</small>
            </button>
          ))}
        </div>
      </div>
    </section>
  )
}
