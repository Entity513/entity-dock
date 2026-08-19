import { useDailyLog } from '../../hooks/useDailyLog'
import { useMeals } from '../../hooks/useMeals'
import { useWorkouts } from '../../hooks/useWorkouts'
import { MealTimeline } from '../meals/MealTimeline'
import { Reveal } from '../ui/Reveal'
import { WorkoutSection } from '../workouts/WorkoutSection'
import { DailyNumbersPanel } from './DailyNumbersPanel'
import { DailyStatusBoard } from './DailyStatusBoard'
import { useDaySheets } from './useDaySheets'

/**
 * 1日ぶんの記録ビュー。カレンダーから開く日別詳細で使う。
 * date だけを受け取り「今日かどうか」を知らない。
 */
export function DayView({ date }: { date: string }) {
  const dailyQ = useDailyLog(date)
  const mealsQ = useMeals(date)
  const workoutsQ = useWorkouts(date)

  const log = dailyQ.data ?? null
  const meals = mealsQ.data ?? []
  const workouts = workoutsQ.data ?? []
  const { openDaily, openMeal, openWorkout, sheets } = useDaySheets(date, log)

  const isLoading = dailyQ.isLoading || mealsQ.isLoading || workoutsQ.isLoading
  // 初回読込の失敗だけを致命扱いにする。バックグラウンド再取得の失敗で
  // キャッシュ済みの表示や編集中のシートを壊さない (isError は使わない)。
  const isFatalError =
    dailyQ.isLoadingError || mealsQ.isLoadingError || workoutsQ.isLoadingError

  if (isLoading) {
    return (
      <>
        <div className="flex flex-col gap-3">
          <div className="panel h-48 animate-pulse" />
          <div className="panel h-32 animate-pulse" />
        </div>
        {sheets}
      </>
    )
  }

  if (isFatalError) {
    return (
      <>
        <div className="panel flex flex-col items-center gap-3 p-6">
          <p className="text-sm text-alert">データの取得に失敗しました。</p>
          <button
            type="button"
            className="btn-ghost"
            onClick={() => {
              void dailyQ.refetch()
              void mealsQ.refetch()
              void workoutsQ.refetch()
            }}
          >
            再読み込み
          </button>
        </div>
        {sheets}
      </>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <Reveal index={0}>
        <DailyStatusBoard
          log={log}
          meals={meals}
          workouts={workouts}
          onOpenDaily={openDaily}
          onOpenMeal={(type) => openMeal(null, type)}
          onOpenWorkout={() => openWorkout(null)}
        />
      </Reveal>

      <Reveal index={1}>
        <DailyNumbersPanel log={log} onOpenDaily={openDaily} />
      </Reveal>

      <Reveal index={2}>
        <MealTimeline
          meals={meals}
          onEdit={(meal) => openMeal(meal)}
          onAdd={(type) => openMeal(null, type)}
        />
      </Reveal>

      <Reveal index={3}>
        <WorkoutSection
          workouts={workouts}
          onEdit={(workout) => openWorkout(workout)}
          onAdd={() => openWorkout(null)}
        />
      </Reveal>

      <Reveal index={4}>
        <section className="panel">
          <header className="flex items-center justify-between border-b border-line px-3 py-2">
            <div className="flex items-baseline gap-2">
              <span className="microlabel">DIARY</span>
              <span className="text-xs text-ink-dim">日記</span>
            </div>
            <button
              type="button"
              className="text-xs text-accent"
              onClick={() => openDaily('diary')}
            >
              {log?.diary ? '編集' : '＋ 書く'}
            </button>
          </header>
          {log?.diary ? (
            <button
              type="button"
              className="w-full px-3 py-3 text-left"
              onClick={() => openDaily('diary')}
            >
              <p className="text-sm leading-relaxed whitespace-pre-wrap">
                {log.diary}
              </p>
            </button>
          ) : (
            <p className="px-3 py-3 text-sm text-ink-dim">
              まだ書かれていません。
            </p>
          )}
        </section>
      </Reveal>

      {sheets}
    </div>
  )
}
