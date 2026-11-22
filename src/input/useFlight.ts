import { useCallback, useEffect, useRef, useState } from 'react'
import { rules, type Floor } from '../game/content'
import {
  command,
  initial,
  mobile,
  tick,
  type Command,
  type Direction,
  type Game,
} from '../game/simulation'

type Shortcut = (g: Game, key: string) => Command | undefined
export function useFlight(shortcut: Shortcut) {
  const [game, show] = useState<Game>(() => initial())
  const live = useRef(game)
  const held = useRef(new Map<string, Direction>())
  const send = useCallback((cmd: Command) => {
    const next = command(live.current, cmd)
    if (next !== live.current) {
      live.current = next
      show(next)
    }
  }, [])
  useEffect(() => {
    let frame = 0,
      last = performance.now(),
      bank = 0
    const reset = () => {
      held.current.clear()
      last = performance.now()
      bank = 0
    }
    const step = (now: number) => {
      const slice = 1000 / rules.hz
      if (!document.hidden)
        bank += Math.max(0, Math.min(now - last, rules.maxFrameMs))
      last = now
      let next = live.current
      const direction = [...held.current.values()].at(-1) ?? 0
      while (bank >= slice) {
        next = tick(next, direction)
        bank -= slice
      }
      if (next !== live.current) {
        live.current = next
        show(next)
      }
      frame = requestAnimationFrame(step)
    }
    const movement: Record<string, Direction> = {
      a: -1,
      arrowleft: -1,
      d: 1,
      arrowright: 1,
    }
    const ladder: Record<string, Floor> = {
      w: 1,
      arrowup: 1,
      s: 0,
      arrowdown: 0,
    }
    const down = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || !mobile(live.current)) return
      const k = e.key.toLowerCase()
      if (k in movement) {
        e.preventDefault()
        held.current.set(k, movement[k])
        return
      }
      const cmd =
        k in ladder
          ? { type: 'climb' as const, to: ladder[k] }
          : shortcut(live.current, k)
      if (cmd) {
        e.preventDefault()
        if (!e.repeat) send(cmd)
      }
    }
    const up = (e: KeyboardEvent) => {
      held.current.delete(e.key.toLowerCase())
    }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    window.addEventListener('blur', reset)
    document.addEventListener('visibilitychange', reset)
    frame = requestAnimationFrame(step)
    return () => {
      cancelAnimationFrame(frame)
      reset()
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
      window.removeEventListener('blur', reset)
      document.removeEventListener('visibilitychange', reset)
    }
  }, [send, shortcut])
  const hold = (id: number, dir: Direction) => {
    if (dir) held.current.set('p' + id, dir)
    else held.current.delete('p' + id)
  }
  return { game, send, hold }
}
