import type { ReactNode } from 'react'

interface Props {
  /** 表示順。上から順に少しずつ遅らせて立ち上げる */
  index?: number
  className?: string
  children: ReactNode
}

const STEP_MS = 55
const MAX_DELAY_MS = 400

/**
 * パネルの段階的な立ち上がり。
 * prefers-reduced-motion のときは index.css 側でアニメーションを無効化する。
 */
export function Reveal({ index = 0, className, children }: Props) {
  return (
    <div
      className={`reveal ${className ?? ''}`}
      style={{ animationDelay: `${Math.min(index * STEP_MS, MAX_DELAY_MS)}ms` }}
    >
      {children}
    </div>
  )
}
