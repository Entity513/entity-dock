import { useEffect, useRef, useState } from 'react'

interface Props {
  value: number | null
  /** 表示整形。カウントアップ中の途中値にも適用される */
  format?: (v: number) => string
  durationMs?: number
  className?: string
}

const DEFAULT_DURATION = 650
// 終盤ほどゆっくり止まる。計器の針が落ち着く感じ
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3)

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

/** 数値のカウントアップ。null のときは '--' を出す */
export function AnimatedNumber({
  value,
  format = (v) => String(Math.round(v)),
  durationMs = DEFAULT_DURATION,
  className,
}: Props) {
  const [shown, setShown] = useState(value ?? 0)
  const fromRef = useRef(0)
  const frameRef = useRef(0)

  useEffect(() => {
    if (value == null) return
    if (prefersReducedMotion()) {
      setShown(value)
      return
    }
    const from = fromRef.current
    const start = performance.now()
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs)
      const current = from + (value - from) * easeOut(t)
      setShown(current)
      if (t < 1) {
        frameRef.current = requestAnimationFrame(tick)
      } else {
        fromRef.current = value
      }
    }
    frameRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frameRef.current)
  }, [value, durationMs])

  if (value == null) return <span className={className}>--</span>
  return <span className={className}>{format(shown)}</span>
}
