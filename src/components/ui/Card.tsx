import type { ReactNode } from 'react'

interface CardProps {
  en?: string
  ja?: string
  right?: ReactNode
  /** ヘッダーと本文の間に罫線を引く。行が並ぶカードだけ true */
  divided?: boolean
  className?: string
  children: ReactNode
}

/**
 * 全画面共通のカード。
 * ヘッダーは罫線で囲わず余白で分ける（罫線だらけだと密度ばかり上がって
 * どこを見ればいいか分からなくなる）。
 */
export function Card({
  en,
  ja,
  right,
  divided = false,
  className,
  children,
}: CardProps) {
  return (
    <section
      className={`rounded-[4px] border border-line bg-panel ${className ?? ''}`}
    >
      {(en || ja || right) && (
        <header
          className={`flex items-baseline justify-between gap-3 px-4 pt-3.5 pb-2.5 ${
            divided ? 'border-b border-line' : ''
          }`}
        >
          <div className="flex items-baseline gap-2">
            {en && <span className="microlabel whitespace-nowrap">{en}</span>}
            {ja && <span className="t-sub whitespace-nowrap">{ja}</span>}
          </div>
          {right}
        </header>
      )}
      {children}
    </section>
  )
}

export function CardEmpty({ message }: { message?: string }) {
  return (
    <p className="px-4 pb-5 text-center text-sm text-ink-dim/60">
      {message ?? 'まだデータがありません'}
    </p>
  )
}
