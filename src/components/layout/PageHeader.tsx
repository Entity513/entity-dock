import type { ReactNode } from 'react'

interface Props {
  en: string
  ja: string
  right?: ReactNode
}

/** 各タブの見出し。左に系統名、右に日付や補助情報 */
export function PageHeader({ en, ja, right }: Props) {
  return (
    <div className="flex items-end justify-between px-1">
      <div>
        <div className="microlabel">{en}</div>
        <h1 className="text-lg font-bold">{ja}</h1>
      </div>
      {right}
    </div>
  )
}
