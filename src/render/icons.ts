// Pixel sprites rendered to data URLs so DOM screens reuse the in-game art.
import type { CargoId } from '../game/content'
import { cell, courier, crate, officer, specimen } from './sprites'

const cache = new Map<string, string>()

function render(key: string, w: number, h: number, scale: number, draw: (c: CanvasRenderingContext2D) => void) {
  const hit = cache.get(key)
  if (hit) return hit
  const small = document.createElement('canvas')
  small.width = w
  small.height = h
  const sc = small.getContext('2d')!
  sc.imageSmoothingEnabled = false
  draw(sc)
  const big = document.createElement('canvas')
  big.width = w * scale
  big.height = h * scale
  const bc = big.getContext('2d')!
  bc.imageSmoothingEnabled = false
  bc.drawImage(small, 0, 0, w * scale, h * scale)
  const url = big.toDataURL()
  cache.set(key, url)
  return url
}

export function cargoIcon(id: CargoId) {
  return render('cargo-' + id, 28, 30, 4, (c) =>
    id === 'cell'
      ? cell(c, 14, 27, { heat: 30, condition: 100, t: 0.4, shake: false })
      : id === 'specimen'
        ? specimen(c, 14, 28, { agitation: 10, condition: 100, t: 0.3 })
        : crate(c, 13, 27, { t: 0.1, exposed: true, condition: 100 }),
  )
}

export function officerPortrait() {
  return render('officer', 26, 22, 5, (c) => {
    c.fillStyle = '#2a0f1a'
    c.fillRect(0, 0, 26, 22)
    officer(c, { x: 12, y: 40, face: 1, step: 0, walking: false, scanning: false, t: 0 })
  })
}

export function courierIcon() {
  return render('courier', 20, 34, 4, (c) =>
    courier(c, { x: 10, y: 33, face: 1, pose: 'idle', step: 0, t: 0, carrying: false, panic: false }),
  )
}
