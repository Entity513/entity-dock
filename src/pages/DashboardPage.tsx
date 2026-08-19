import { useState } from 'react'
import { RangeSelector } from '../components/dashboard/RangeSelector'
import { ScatterPanel } from '../components/dashboard/ScatterPanel'
import { SummaryPanel } from '../components/dashboard/SummaryPanel'
import { TagConditionPanel } from '../components/dashboard/TagConditionPanel'
import { TrendPanel } from '../components/dashboard/TrendPanel'
import { shortDate } from '../components/dashboard/chartTheme'
import { useRangeData } from '../hooks/useRangeData'
import { addDays, todayStr } from '../lib/date'

const CONDITION_SCALE = {
  domain: [1, 10] as [number, number],
  ticks: [2, 4, 6, 8, 10],
}

const oneDecimal = (v: number) => v.toFixed(1)
const score = (v: number) => (Number.isInteger(v) ? String(v) : v.toFixed(1))

export function DashboardPage() {
  const [days, setDays] = useState(30)
  // 初回読込の失敗だけを致命扱いにする（バックグラウンド再取得の失敗で
  // キャッシュ済みのグラフを消さない）
  const { data, isLoading, isLoadingError, refetch } = useRangeData(days)

  const last = todayStr()
  const first = addDays(last, -(days - 1))

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-end justify-between px-1">
        <div>
          <div className="microlabel">DASHBOARD</div>
          <h1 className="text-lg font-bold">分析</h1>
        </div>
        <span className="num text-xs text-ink-dim">
          {shortDate(first)} – {shortDate(last)}
        </span>
      </div>

      <RangeSelector value={days} onChange={setDays} />

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
          <div className="panel h-20 animate-pulse" />
          <div className="panel h-48 animate-pulse" />
          <div className="panel h-48 animate-pulse" />
          <div className="panel h-48 animate-pulse" />
        </div>
      ) : (
        <>
          <SummaryPanel summary={data.summary} />

          <TrendPanel
            en="WEIGHT TREND"
            ja="体重推移"
            data={data.weight}
            yStep={0.5}
            format={oneDecimal}
            unit="kg"
          />

          <TrendPanel
            en="SLEEP TREND"
            ja="睡眠時間推移"
            data={data.sleep}
            yStep={0.5}
            format={oneDecimal}
            unit="h"
          />

          <TrendPanel
            en="CONDITION TREND"
            ja="コンディション推移"
            data={data.condition}
            yStep={1}
            yFixed={CONDITION_SCALE}
            format={score}
            unit="/10"
          />

          <ScatterPanel
            en="SLEEP × COND"
            ja="睡眠時間 × コンディション"
            points={data.sleepVsCondition}
            xName="睡眠時間"
            xStep={0.5}
            formatX={(v) => `${oneDecimal(v)}h`}
          />

          <ScatterPanel
            en="MEDITATION × COND"
            ja="瞑想 × コンディション"
            points={data.meditationVsCondition}
            xName="瞑想時間"
            xStep={5}
            formatX={(v) => `${Math.round(v)}分`}
          />

          <TagConditionPanel stats={data.mealTagConditions} />
        </>
      )}
    </div>
  )
}
