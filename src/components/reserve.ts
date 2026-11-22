import { createContext, useContext, useLayoutEffect, type RefObject } from 'react'

export type Side = 'top' | 'right' | 'bottom' | 'left'
type Reserve = (key: string, side: Side, px: number | null) => void
export const ReserveContext = createContext<Reserve>(() => {})

/**
 * Tells the camera that an overlay occupies one edge of the screen so the ship
 * is framed in the space that remains visible.
 */
export function useReserve(ref: RefObject<HTMLElement | null>, key: string, side: Side, active = true) {
  const reserve = useContext(ReserveContext)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el || !active) {
      reserve(key, side, null)
      return
    }
    const measure = () => {
      const r = el.getBoundingClientRect()
      const W = window.innerWidth,
        H = window.innerHeight
      const px = side === 'top' ? r.bottom : side === 'bottom' ? H - r.top : side === 'right' ? W - r.left : r.right
      reserve(key, side, Math.max(0, px))
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    window.addEventListener('resize', measure)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', measure)
      reserve(key, side, null)
    }
  }, [ref, key, side, active, reserve])
}
