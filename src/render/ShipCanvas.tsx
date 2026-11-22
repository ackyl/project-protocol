import { useEffect, useRef } from 'react'
import { draw, height, width } from './draw'
import { deckName } from '../game/content'
import type { Game } from '../game/simulation'
export function ShipCanvas({ game }: { game: Game }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const c = ref.current?.getContext('2d')
    if (c) draw(c, game)
  }, [game])
  return (
    <canvas
      ref={ref}
      width={width}
      height={height}
      aria-label={`Mule-07 cutaway. Courier on ${deckName(game.player.floor)}, position ${Math.round(game.player.x)}. Ladder in center, power console upper left, shield bay lower right.`}
    />
  )
}
