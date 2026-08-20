import { useState } from 'react'
import { useDaySheets } from '../components/daily/useDaySheets'
import { AnalysisBlock } from '../components/dashboard/AnalysisBlock'
import { TagConditionPanel } from '../components/dashboard/TagConditionPanel'
import { TrendPanel } from '../components/dashboard/TrendPanel'
import { MealTimeline } from '../components/meals/MealTimeline'
import { NutritionPanel } from '../components/meals/NutritionPanel'
import { Card } from '../components/ui/Card'
import { Reveal } from '../components/ui/Reveal'
import { useDailyLog } from '../hooks/useDailyLog'
import { useMeals } from '../hooks/useMeals'
import { useSettings } from '../hooks/useSettings'
import { formatDateJa, todayStr } from '../lib/date'
import { totalMacros } from '../lib/nutrition'

const oneDecimal = (v: number) => v.toFixed(1)

/** 食事。単なるログではなく、今日どれだけ何を摂ったかを見せる */
export function FuelPage() {
  const date = todayStr()
  const [days, setDays] = useState(30)
  const dailyQ = useDailyLog(date)
  const mealsQ = useMeals(date)
  const settingsQ = useSettings()
  const { openMeal, sheets } = useDaySheets(date, dailyQ.data ?? null)

  const meals = mealsQ.data ?? []
  const macros = totalMacros(meals)

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-baseline justify-between px-1">
        <div>
          <span className="microlabel">FUEL</span>
          <h1 className="text-base font-bold">食事</h1>
        </div>
        <span className="t-sub">{formatDateJa(date)}</span>
      </div>

      {mealsQ.isLoadingError ? (
        <Card>
          <div className="flex flex-col items-center gap-3 px-4 py-6">
            <p className="text-sm text-alert">データの取得に失敗しました。</p>
            <button
              type="button"
              className="btn-ghost"
              onClick={() => void mealsQ.refetch()}
            >
              再読み込み
            </button>
          </div>
        </Card>
      ) : mealsQ.isLoading ? (
        <>
          <div className="panel h-52 animate-pulse" />
          <div className="panel h-44 animate-pulse" />
        </>
      ) : (
        <>
          <Reveal index={0}>
            <NutritionPanel
              totals={macros}
              settings={settingsQ.data ?? null}
              mealCount={meals.length}
            />
          </Reveal>
          <Reveal index={1}>
            <MealTimeline
              meals={meals}
              onEdit={(meal) => openMeal(meal)}
              onAdd={(type) => openMeal(null, type)}
            />
          </Reveal>
        </>
      )}

      <AnalysisBlock days={days} onDaysChange={setDays} skeletonCount={2}>
        {(data) => (
          <>
            <Reveal index={0}>
              <TagConditionPanel stats={data.mealTagConditions} />
            </Reveal>
            <Reveal index={1}>
              <TrendPanel
                en="WEIGHT"
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
