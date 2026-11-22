import { searchStops } from '../game/content'
import {
  cargo,
  cargoIds,
  rules,
  ship,
  slotIds,
  slots,
  type CargoId,
} from '../game/content'
import { position, type Game } from '../game/simulation'

type Ctx = CanvasRenderingContext2D
type XY = [number, number]
export const width = 480,
  height = 216
const ink = '#161826'
function rect(
  c: Ctx,
  color: string,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  c.fillStyle = color
  c.fillRect(Math.round(x), Math.round(y), w, h)
}
function poly(c: Ctx, color: string, points: XY[]) {
  c.fillStyle = color
  c.beginPath()
  points.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)))
  c.closePath()
  c.fill()
}
function label(c: Ctx, str: string, x: number, y: number, color = '#bab7b6') {
  c.font = 'bold 5px monospace'
  c.fillStyle = color
  c.fillText(str, x, y)
}
function sky(c: Ctx) {
  const gradient = c.createLinearGradient(0, 0, width, height)
  gradient.addColorStop(0, '#1a172f')
  gradient.addColorStop(0.6, '#30233e')
  gradient.addColorStop(1, '#19192d')
  c.fillStyle = gradient
  c.fillRect(0, 0, width, height)
  let s = 1189
  const rand = () =>
    (s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296
  for (let i = 0; i < 290; i++) {
    const x = Math.floor(rand() * width),
      y = Math.floor(rand() * height)
    rect(
      c,
      ['#5a4763', '#977d8c', '#55485b', '#a396aa'][i % 4],
      x,
      y,
      i % 23 === 0 ? 2 : 1,
      1,
    )
    if (i % 45 === 0) {
      rect(c, '#d1bac6', x - 2, y, 5, 1)
      rect(c, '#c0a7bc', x, y - 2, 1, 5)
    }
  }
  // A banded, dithered moon and a tilted ring, all drawn at native pixel resolution.
  const cx = 377,
    cy = 32,
    r = 14
  c.save()
  c.translate(cx, cy)
  c.rotate(-0.28)
  c.strokeStyle = '#86657c'
  c.lineWidth = 2
  c.beginPath()
  c.ellipse(0, 0, 27, 4, 0, 0, Math.PI * 2)
  c.stroke()
  c.restore()
  for (let y = -r; y <= r; y++) {
    const span = Math.floor(Math.sqrt(r * r - y * y)),
      colors = ['#a27689', '#b48291', '#966c83', '#8b647f', '#71576f']
    rect(
      c,
      colors[Math.min(4, Math.floor((y + r) / 6))],
      cx - span,
      cy + y,
      span * 2,
      1,
    )
    if (y % 4 === 0) rect(c, '#715672', cx - span + 2, cy + y, span, 1)
  }
  c.save()
  c.translate(cx, cy)
  c.rotate(-0.28)
  c.strokeStyle = '#b9939e'
  c.lineWidth = 2
  c.beginPath()
  c.ellipse(0, 0, 27, 4, 0, 0, Math.PI)
  c.stroke()
  c.restore()
}
const ground = (floor: number) => (floor ? 119 : 156)
function hull(c: Ctx) {
  // Outer armor, stepped bow, drive pylons and undercarriage.
  poly(c, ink, [
    [39, 102],
    [60, 102],
    [60, 90],
    [80, 90],
    [80, 79],
    [108, 79],
    [108, 70],
    [148, 70],
    [148, 64],
    [184, 64],
    [184, 72],
    [297, 72],
    [297, 68],
    [339, 68],
    [339, 75],
    [377, 75],
    [377, 81],
    [398, 81],
    [398, 90],
    [413, 90],
    [413, 102],
    [426, 102],
    [426, 117],
    [442, 126],
    [442, 149],
    [429, 149],
    [422, 159],
    [395, 169],
    [351, 169],
    [342, 180],
    [290, 180],
    [286, 172],
    [195, 172],
    [190, 181],
    [143, 181],
    [134, 171],
    [82, 171],
    [70, 160],
    [49, 160],
    [49, 148],
    [36, 148],
  ])
  poly(c, '#73737f', [
    [52, 101],
    [79, 98],
    [86, 83],
    [113, 83],
    [113, 75],
    [149, 75],
    [149, 69],
    [181, 69],
    [181, 77],
    [303, 77],
    [303, 72],
    [336, 72],
    [336, 79],
    [375, 79],
    [375, 85],
    [394, 85],
    [394, 94],
    [409, 94],
    [409, 106],
    [421, 106],
    [421, 120],
    [437, 129],
    [437, 145],
    [421, 151],
    [393, 164],
    [82, 164],
    [71, 155],
    [52, 154],
  ])
  rect(c, '#434352', 78, 91, 319, 69)
  rect(c, '#bbb3ad', 89, 82, 279, 3)
  for (let i = 0; i < 16; i++) {
    const x = 100 + i * 17
    rect(c, '#4a4757', x, 78, 2, 5)
    rect(c, '#b8b2ac', x, 161, 7, 1)
  }
  for (const x of [88, 153, 204, 264, 326, 372]) {
    rect(c, '#a6a0a0', x, 84, 13, 2)
    rect(c, ink, x, 86, 2, 3)
  }
  // Generator fins, dorsal aerial and belly clamps.
  for (let i = 0; i < 7; i++) {
    rect(c, '#222332', 115 + i * 4, 69, 3, 6)
    rect(c, '#a8a0a6', 115 + i * 4, 68, 3, 2)
  }
  rect(c, ink, 177, 50, 2, 17)
  rect(c, '#e5ac74', 175, 49, 5, 2)
  rect(c, '#9c969a', 156, 62, 17, 3)
  rect(c, '#5c626e', 305, 66, 27, 5)
  for (const x of [144, 294]) {
    poly(c, '#555564', [
      [x, 166],
      [x + 48, 166],
      [x + 43, 177],
      [x + 6, 177],
    ])
    rect(c, '#b69b86', x + 11, 170, 19, 2)
  }
  // Two inset decks run continuously through three structural bays.
  for (const [i, y] of [88, 125].entries()) {
    rect(c, ink, 81, y - 2, 315, 34)
    for (let j = 0; j < 3; j++) {
      const x = 85 + j * 103
      rect(c, ['#344047', '#383744', '#354348'][(i + j) % 3], x, y, 101, 28)
      rect(c, '#202732', x + 2, y + 2, 96, 3)
      for (let k = 0; k < 5; k++) {
        rect(c, '#494953', x + 4 + k * 19, y + 5, 1, 20)
        rect(c, '#5c5961', x + 7 + k * 19, y + 23, 6, 1)
      }
      rect(c, '#766746', x + 3, y + 6, 1, 15)
      rect(c, '#b18a65', x + 3, y + 6, 26, 1)
      rect(c, '#6c6352', x + 27, y + 6, 1, 6)
      rect(c, '#648480', x + 52, y + 2, 18, 2)
      rect(c, '#b6e0c9', x + 55, y + 2, 11, 1)
      rect(c, ink, x + 97, y, 4, 29)
      rect(c, '#656473', x + 97, y + 2, 2, 24)
      rect(c, '#515b64', x + 7, y + 15, 13, 8)
      for (let n = 0; n < 3; n++)
        rect(c, '#252b35', x + 9, y + 16 + n * 2, 9, 1)
      rect(c, '#222630', x + 72, y + 9, 13, 11)
      rect(c, '#58646d', x + 74, y + 11, 9, 6)
      rect(c, '#c7ab79', x + 75, y + 12, 2, 2)
    }
    rect(c, '#a3988c', 81, y + 30, 315, 2)
    rect(c, '#535461', 81, y + 32, 315, 3)
    for (let x = 83; x < 392; x += 15) rect(c, '#393b47', x, y + 32, 4, 2)
  }
  // Cabin glazing with angular nose armor.
  poly(c, ink, [
    [396, 97],
    [405, 97],
    [419, 117],
    [419, 124],
    [397, 124],
  ])
  poly(c, '#6bb5b4', [
    [398, 100],
    [404, 100],
    [414, 115],
    [398, 115],
  ])
  rect(c, '#afd6c3', 399, 101, 5, 2)
  poly(c, '#d08058', [
    [397, 130],
    [430, 130],
    [436, 135],
    [436, 142],
    [406, 151],
    [397, 151],
  ])
  rect(c, '#e8af81', 399, 130, 31, 2)
  rect(c, '#9d5d47', 399, 141, 22, 3)
  label(c, '07', 402, 140, '#2c2d36')
  // Exhaust assemblies and pale plasma.
  for (const y of [97, 132]) {
    poly(c, '#30595e', [
      [17, y + 7],
      [42, y + 3],
      [48, y + 4],
      [48, y + 20],
      [29, y + 18],
      [34, y + 14],
      [11, y + 13],
      [26, y + 10],
    ])
    poly(c, '#66b8ad', [
      [23, y + 10],
      [47, y + 5],
      [47, y + 17],
      [35, y + 14],
      [18, y + 13],
      [37, y + 11],
    ])
    rect(c, '#bbe5c8', 35, y + 10, 11, 3)
    rect(c, ink, 44, y, 33, 23)
    rect(c, '#707480', 48, y + 2, 25, 18)
    rect(c, '#bc8865', 53, y + 4, 15, 13)
    for (let i = 0; i < 4; i++) {
      rect(c, '#484351', 47 + i * 6, y + 2, 3, 18)
      rect(c, '#b3a29b', 47 + i * 6, y + 2, 3, 2)
    }
    rect(c, '#383948', 68, y + 5, 11, 11)
  }
  // The engine room has copper risers, bridge glazing and the hold has recessed tanks.
  for (let i = 0; i < 3; i++) {
    const x = 90 + i * 8
    rect(c, '#252833', x, 93, 6, 20)
    rect(c, '#97604f', x + 1, 94, 4, 18)
    rect(c, '#d39870', x + 1, 95, 1, 15)
    rect(c, '#545865', x, 98, 6, 2)
    rect(c, '#4d515a', x, 108, 6, 2)
  }
  for (const x of [157, 170]) {
    rect(c, '#1b2430', x, 94, 11, 14)
    rect(c, '#42626a', x + 1, 95, 9, 11)
    rect(c, '#8cb8aa', x + 2, 96, 6, 2)
    rect(c, '#486669', x, 110, 10, 3)
  }
  rect(c, '#252734', 201, 94, 18, 18)
  rect(c, '#606473', 203, 96, 14, 14)
  rect(c, '#2a303f', 209, 96, 2, 14)
  rect(c, '#b68a66', 205, 101, 2, 3)
  for (let x = 353; x < 392; x += 13) {
    poly(c, '#202735', [
      [x, 91],
      [x + 10, 91],
      [x + 10, 102],
      [x + 2, 104],
      [x, 103],
    ])
    poly(c, '#598187', [
      [x + 1, 92],
      [x + 9, 92],
      [x + 9, 100],
      [x + 1, 102],
    ])
    rect(c, '#8bb4b0', x + 2, 93, 4, 1)
  }
  // Ribbed tanks in the machine bay and a hoist over the shield cradle.
  for (const x of [89, 104, 270, 284]) {
    rect(c, '#242936', x, 134, 10, 19)
    rect(c, '#536276', x + 1, 135, 8, 16)
    rect(c, '#78838d', x + 2, 135, 2, 13)
    rect(c, '#444b59', x, 138, 10, 2)
    rect(c, '#af866c', x, 147, 10, 2)
  }
  rect(c, '#a18360', 318, 127, 33, 2)
  rect(c, '#3c4249', 318, 129, 33, 2)
  for (let x = 319; x < 349; x += 6) rect(c, '#ddba87', x, 127, 2, 2)
  rect(c, '#697984', 169, 140, 12, 12)
  rect(c, '#353848', 170, 141, 10, 2)
  rect(c, '#8e675e', 370, 138, 14, 12)
  rect(c, '#b48772', 371, 140, 3, 8)
  // Weathered ochre armor wraps the stern and the forward pressure door.
  for (const [x, y, w] of [
    [83, 82, 26],
    [113, 75, 23],
    [150, 70, 26],
    [303, 74, 29],
    [348, 80, 24],
    [78, 158, 43],
    [345, 159, 35],
  ]) {
    rect(c, '#ba7957', x, y, w, 3)
    rect(c, '#de9b6c', x + 2, y, w - 5, 1)
    rect(c, '#575362', x + w - 7, y, 2, 3)
  }
  for (const x of [76, 399]) {
    rect(c, '#4d4650', x, 119, 9, 7)
    for (let k = 0; k < 3; k++) rect(c, '#d6a66d', x + 1 + k * 3, 120, 2, 4)
  }
  rect(c, '#535967', 254, 69, 18, 7)
  rect(c, '#9a96a0', 254, 68, 19, 2)
  poly(c, '#8a8390', [
    [263, 67],
    [258, 56],
    [277, 59],
    [272, 65],
  ])
  rect(c, '#c5a895', 261, 57, 12, 1)
  // Ladder, power console, and cargo cradles.
  rect(c, ink, ship.ladder - 7, 86, 15, 70)
  for (const x of [ship.ladder - 6, ship.ladder + 5])
    rect(c, '#c08f58', x, 86, 2, 70)
  for (let y = 89; y < 155; y += 6) rect(c, '#e8b675', ship.ladder - 4, y, 9, 2)
  rect(c, ink, ship.station.x - 12, 99, 24, 19)
  rect(c, '#656570', 127, 100, 21, 17)
  rect(c, '#25353e', 129, 102, 16, 8)
  rect(c, '#78d2b6', 131, 104, 8, 2)
  rect(c, '#d9b47c', 132, 112, 3, 2)
  for (const id of slotIds) {
    const sl = slots[id],
      y = ground(sl.floor)
    rect(c, sl.shielded ? '#507e78' : '#8a7863', sl.x - 13, y - 3, 27, 3)
    for (const x of [sl.x - 14, sl.x + 11]) {
      rect(c, ink, x, y - 11, 4, 11)
      rect(c, sl.shielded ? '#77d8c7' : '#c3ab82', x, y - 12, 4, 4)
    }
    if (sl.shielded) {
      rect(c, '#5a9493', sl.x - 13, y - 25, 26, 2)
      rect(c, '#496b70', sl.x - 13, y - 23, 2, 12)
    }
  }
}
export function drawItem(c: Ctx, id: CargoId, x: number, y: number) {
  c.save()
  c.translate(Math.round(x), Math.round(y))
  const color = cargo[id].color
  if (cargo[id].kind === 'thermal') {
    rect(c, ink, -6, -16, 12, 16)
    rect(c, '#a16748', -4, -15, 8, 13)
    rect(c, color, -5, -12, 10, 8)
    rect(c, '#ffd496', -3, -11, 3, 6)
    rect(c, '#8b8b88', -5, -16, 10, 3)
    rect(c, '#bbad93', -5, -3, 10, 2)
  } else {
    rect(c, ink, -9, -14, 18, 14)
    rect(c, '#397e80', -8, -13, 16, 11)
    rect(c, color, -6, -12, 12, 2)
    rect(c, '#86b5a9', -6, -10, 2, 7)
    rect(c, '#232f3a', -1, -9, 7, 5)
    rect(c, color, 1, -7, 3, 1)
  }
  c.restore()
}
export function draw(c: Ctx, g: Game) {
  c.imageSmoothingEnabled = false
  sky(c)
  hull(c)
  if (g.fault) {
    rect(c, '#ab5646', 127, 101, 20, 7)
    rect(c, '#ffd278', 133, 102, 4, 4)
    label(c, '!', 143, 107, '#fff0a5')
  }
  if (g.phase === 'search') {
    const stop = searchStops[g.stop].id
    const slot = stop === 'lower' || stop === 'top' ? undefined : slots[stop]
    const x = slot ? slot.x - 16 : 81,
      y = ground(slot ? slot.floor : stop === 'top' ? 1 : 0)
    const w = slot ? 32 : 314
    rect(c, '#e8b880', x, y + 1, w, 2)
    for (const edge of [x, x + w - 2]) rect(c, '#e8b880', edge, y - 6, 2, 7)
  }
  let py = ground(g.player.floor)
  if (g.climb)
    py += ((ground(g.climb.to) - py) * g.climb.ticks) / rules.climbTicks
  const px = Math.round(g.player.x)
  for (const id of cargoIds) {
    const p = position(g, id)
    if (p && g.items[id].location.kind !== 'held')
      drawItem(c, id, p.x, ground(p.floor))
  }
  // Courier in a patched orange pressure suit with an oversized bubble helmet.
  c.save()
  c.translate(px, Math.round(py))
  rect(c, ink, -5, -21, 10, 10)
  rect(c, '#e7c8a4', -4, -20, 8, 8)
  rect(c, '#273c4c', -2, -18, 7, 4)
  rect(c, '#88ded4', 0, -18, 4, 2)
  rect(c, '#ad6446', -6, -11, 11, 8)
  rect(c, '#eca26b', -3, -11, 7, 7)
  rect(c, '#887e78', -8, -12, 3, 8)
  rect(c, ink, -5, -4, 4, 4)
  rect(c, ink, 1, -4, 4, 4)
  rect(c, '#a6a3a1', -6, -1, 5, 1)
  rect(c, '#a6a3a1', 1, -1, 5, 1)
  c.restore()
  if (g.phase === 'highway' || g.phase === 'prep') {
    poly(c, '#ffcf8e', [
      [px - 3, py - 27],
      [px + 3, py - 27],
      [px, py - 24],
    ])
  }
  for (const id of cargoIds)
    if (g.items[id].location.kind === 'held') drawItem(c, id, px + 9, py - 4)
}
