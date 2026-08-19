import type { ReactNode } from 'react'
import { useRangeData, type RangeData } from '../../hooks/useRangeData'
import { Reveal } from '../ui/Reveal'
import { RangeSelector } from './RangeSelector'

interface Props {
  days: number
  onDaysChange: (days: number) => void
  /** パネル数ぶんのスケルトンを出すため */
  skeletonCount?: number
  children: (data: RangeData) => ReactNode
}

/**
 * 期間セレクタ + 読込・エラー処理をまとめる。
 * 各系統タブが同じ待ち方・同じ失敗の見せ方をするようにするための入れ物。
 */
export function AnalysisBlock({
  days,
  onDaysChange,
  skeletonCount = 3,
  children,
}: Props) {
  // 初回読込の失敗だけを致命扱いにする（再取得の失敗でグラフを消さない）
  const { data, isLoading, isLoadingError, refetch } = useRangeData(days)

  return (
    <>
      <RangeSelector value={days} onChange={onDaysChange} />

      {isLoadingError ? (
        <div className="panel flex flex-col items-center gap-3 p-6">
          <p className="text-sm text-alert">データの取得に失敗しました。</p>
          <button
            type="button"
            className="btn-ghost"
            onClick={() => void refetch()}
          >
            再読み込み
          </button>
        </div>
      ) : isLoading || !data ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: skeletonCount }, (_, i) => (
            <div key={i} className="panel h-44 animate-pulse" />
          ))}
        </div>
      ) : (
        <>{children(data)}</>
      )}
    </>
  )
}

/** 各パネルを順に立ち上げる。index は上からの並び順 */
export function RevealList({ children }: { children: ReactNode[] }) {
  return (
    <>
      {children.map((child, i) => (
        <Reveal key={i} index={i}>
          {child}
        </Reveal>
      ))}
    </>
  )
}
