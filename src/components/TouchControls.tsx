import { useRef, type PointerEvent } from 'react'
import { canClimb, heldItem, type Direction, type Game } from '../game/simulation'
import type { Runner } from '../app/runner'
import { nearest } from '../app/interact'
import { useReserve } from './reserve'

export function TouchControls({ g, runner }: { g: Game; runner: Runner }) {
  const ref = useRef<HTMLDivElement>(null)
  const portrait = window.innerHeight > window.innerWidth
  useReserve(ref, 'touch', 'bottom', portrait)
  const hold = (dir: Direction) => ({
    onPointerDown: (e: PointerEvent<HTMLButtonElement>) => {
      runner.hold('p' + e.pointerId, dir)
      try {
        e.currentTarget.setPointerCapture(e.pointerId)
      } catch {
        /* capture unavailable; pointerup/cancel still release the hold */
      }
    },
    onPointerUp: (e: PointerEvent) => runner.hold('p' + e.pointerId, 0),
    onPointerCancel: (e: PointerEvent) => runner.hold('p' + e.pointerId, 0),
    onLostPointerCapture: (e: PointerEvent) => runner.hold('p' + e.pointerId, 0),
  })
  const repairing = g.repairTicks !== null
  const act = nearest(g)
  const held = heldItem(g)
  const up = canClimb(g, 1),
    down = canClimb(g, 0)
  const label = repairing ? 'LOCK' : act ? (act.cmd.type === 'stow' && act.cmd.slot === 'vault' ? 'SHIELD' : act.verb.toUpperCase()) : 'USE'
  return (
    <div className={'touch ' + (portrait ? 'portrait' : 'landscape')} ref={ref}>
      <div className="pad">
        <button aria-label="Walk left" disabled={!!g.climb} {...hold(-1)}>
          ◀
        </button>
        <button aria-label="Walk right" disabled={!!g.climb} {...hold(1)}>
          ▶
        </button>
      </div>
      <div className="acts">
        <div className="stack">
        {(up || down) && (
          <button className="ladder" onClick={() => runner.climb(up ? 1 : 0)} aria-label={up ? 'Climb up' : 'Climb down'}>
            {up ? '▲' : '▼'}
          </button>
        )}
        {repairing ? (
          <button className="small" onClick={() => runner.send({ type: 'leave' })}>
            LEAVE
          </button>
        ) : (
          held && (
            <button className="small" onClick={runner.drop}>
              DROP
            </button>
          )
        )}
        </div>
        <button className={'use' + (repairing || (act && act.verb !== 'Take') ? ' ready' : '')} disabled={!repairing && !act} onClick={runner.interact}>
          {label}
        </button>
      </div>
    </div>
  )
}
