import { useEffect, useRef, useState } from 'react'
import { cargo, cargoIds, rules } from '../game/content'
import { ledger } from '../game/customs'
import type { Game } from '../game/simulation'
import type { Runner } from '../app/runner'
import { cargoIcon } from '../render/icons'
import { sfx } from '../audio/sfx'
import { useReserve } from './reserve'

const stamp = {
  delivered: { word: 'DELIVERED', tone: 'good', line: 'Cinder Gate cleared. The syndicate pays — minus your mess.' },
  arrest: { word: 'IMPOUNDED', tone: 'bad', line: 'Customs keeps the freight. You keep the bill.' },
  death: { word: 'WRECKED', tone: 'dead', line: 'Mule-07 came apart on the Ash Belt. Recovery isn’t free.' },
}

export function Ledger({ g, runner, touch }: { g: Game; runner: Runner; touch: boolean }) {
  const book = ledger(g)
  const s = stamp[g.outcome ?? 'death']
  const panel = useRef<HTMLElement>(null)
  const wide = window.innerWidth >= window.innerHeight * 1.15
  useReserve(panel, 'ledger', wide ? 'right' : 'bottom')
  const rows: [string, number, string?][] = [
    ['Wallet before the run', rules.startingCash],
    ...cargoIds.map((id): [string, number, string] => {
      const loc = g.items[id].location
      const why =
        loc.kind === 'surrendered'
          ? 'surrendered'
          : g.outcome === 'arrest'
            ? 'impounded'
            : g.outcome === 'death'
              ? 'lost'
              : `${g.items[id].condition}% condition`
      return [`${cargo[id].name} · ${why}`, book.earnings[id], id]
    }),
  ]
  if (book.bribes) rows.push(['Bribes', -book.bribes])
  if (book.repairs) rows.push([`Hull repairs (${rules.hull - g.hull} pts)`, -book.repairs])
  if (book.penalty) rows.push([g.outcome === 'arrest' ? 'Impound fee' : 'Wreck recovery', -book.penalty])

  // Count the balance up for a little weight.
  const [shown, setShown] = useState(0)
  useEffect(() => {
    sfx.stamp()
    let raf = 0
    const start = performance.now()
    const run = (now: number) => {
      const k = Math.min(1, (now - start - 500) / 700)
      setShown(Math.round(book.balance * Math.max(0, k)))
      if (k < 1) raf = requestAnimationFrame(run)
    }
    raf = requestAnimationFrame(run)
    return () => cancelAnimationFrame(raf)
  }, [book.balance])

  return (
    <section className={'ledger ' + (wide ? 'side' : 'bottom')} ref={panel} aria-labelledby="result-word">
      <div className={'stamp ' + s.tone} id="result-word">
        {s.word}
      </div>
      <p className="verdict">{s.line}</p>
      <ol className="rows">
        {rows.map(([label, amount, id], i) => (
          <li key={label} style={{ animationDelay: 120 + i * 90 + 'ms' }}>
            {id ? <img src={cargoIcon(id as 'cell' | 'crate')} alt="" width={21} height={22} /> : <i />}
            <span>{label}</span>
            <b className={amount > 0 ? 'plus' : amount < 0 ? 'minus' : ''}>
              {amount > 0 ? '+' : amount < 0 ? '−' : ''}
              {Math.abs(amount)}¢
            </b>
          </li>
        ))}
      </ol>
      <div className={'balance' + (book.balance < 0 ? ' neg' : '')}>
        <span>Wallet now</span>
        <b>
          {shown < 0 ? '−' : ''}
          {Math.abs(shown)}¢
        </b>
      </div>
      {book.shortfall > 0 && (
        <p className="debt">
          Syndicate reserve is {rules.debtTarget}¢. You are <b>{book.shortfall}¢ short</b>.
        </p>
      )}
      <button className="go" onClick={() => runner.send({ type: 'restart' })} autoFocus>
        Run it again {!touch && <kbd>R</kbd>}
      </button>
    </section>
  )
}
