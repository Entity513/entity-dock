import { useState } from 'react'
import { useDaySheets } from '../components/daily/useDaySheets'
import { AnalysisBlock } from '../components/dashboard/AnalysisBlock'
import { TagConditionPanel } from '../components/dashboard/TagConditionPanel'
import { TrendPanel } from '../components/dashboard/TrendPanel'
import { PageHeader } from '../components/layout/PageHeader'
import { MealTimeline } from '../components/meals/MealTimeline'
import { Reveal } from '../components/ui/Reveal'
import { useDailyLog } from '../hooks/useDailyLog'
import { useMeals } from '../hooks/useMeals'
import { formatDateJa, todayStr } from '../lib/date'

const oneDecimal = (v: number) => v.toFixed(1)

/** 食事。今日のタイムライン + タグ別の傾向 */
export function FuelPage() {
  const date = todayStr()
  const [days, setDays] = useState(30)
  const dailyQ = useDailyLog(date)
  const mealsQ = useMeals(date)
  const { openMeal, sheets } = useDaySheets(date, dailyQ.data ?? null)

  return (
    <div className="flex flex-col gap-3">
      <PageHeader
        en="FUEL"
        ja="食事"
        right={<span className="num text-xs text-ink-dim">{formatDateJa(date)}</span>}
      />

      {mealsQ.isLoadingError ? (
        <div className="panel flex flex-col items-center gap-3 p-6">
          <p className="text-sm text-alert">データの取得に失敗しました。</p>
          <button
            type="button"
            className="btn-ghost"
            onClick={() => void mealsQ.refetch()}
          >
            再読み込み
          </button>
        </div>
      ) : mealsQ.isLoading ? (
        <div className="panel h-44 animate-pulse" />
      ) : (
        <Reveal index={0}>
          <MealTimeline
            meals={mealsQ.data ?? []}
            onEdit={(meal) => openMeal(meal)}
            onAdd={(type) => openMeal(null, type)}
          />
        </Reveal>
      )}

      <AnalysisBlock days={days} onDaysChange={setDays} skeletonCount={2}>
        {(data) => (
          <>
            <Reveal index={0}>
              <TagConditionPanel stats={data.mealTagConditions} />
            </Reveal>
            <Reveal index={1}>
              <TrendPanel
                en="WEIGHT TREND"
                ja="体重推移"
                data={data.weight}
                yStep={0.5}
                format={oneDecimal}
                unit="kg"
              />
            </Reveal>
          </>
        )}
      </AnalysisBlock>

      {sheets}
    </div>
  )
}
