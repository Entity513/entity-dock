import { useState } from 'react'
import { useDailyLog } from '../../hooks/useDailyLog'
import { useMeals } from '../../hooks/useMeals'
import { useWorkouts } from '../../hooks/useWorkouts'
import type { Meal, MealType, Workout } from '../../types/db'
import { MealEditorSheet } from '../meals/MealEditorSheet'
import { MealTimeline } from '../meals/MealTimeline'
import { WorkoutEditorSheet } from '../workouts/WorkoutEditorSheet'
import { WorkoutSection } from '../workouts/WorkoutSection'
import { DailyNumbersPanel } from './DailyNumbersPanel'
import { DailyStatusBoard, type DailySheetId } from './DailyStatusBoard'
import { ActivitySheet } from './editors/ActivitySheet'
import { DiarySheet } from './editors/DiarySheet'
import { MindSheet } from './editors/MindSheet'
import { SleepSheet } from './editors/SleepSheet'
import { WeightSheet } from './editors/WeightSheet'

// date はシートを開いた時点で固定する。Today の深夜0時切替で live な date が
// 変わっても、編集中の保存は開いた日の行に入る。
type SheetState =
  | { kind: 'daily'; id: DailySheetId; date: string }
  | { kind: 'meal'; meal: Meal | null; initialType?: MealType; date: string }
  | { kind: 'workout'; workout: Workout | null; date: string }
  | null

/**
 * 1日分の記録ビュー。Today と Log の日別詳細で共通。
 * date だけを受け取り「今日かどうか」を知らない。
 */
export function DayView({ date }: { date: string }) {
  const dailyQ = useDailyLog(date)
  const mealsQ = useMeals(date)
  const workoutsQ = useWorkouts(date)
  const [sheet, setSheet] = useState<SheetState>(null)

  const isLoading = dailyQ.isLoading || mealsQ.isLoading || workoutsQ.isLoading
  // 初回読込の失敗だけを致命扱いにする。バックグラウンド再取得の失敗で
  // キャッシュ済みの表示や編集中のシートを壊さない (isError は使わない)。
  const isFatalError =
    dailyQ.isLoadingError || mealsQ.isLoadingError || workoutsQ.isLoadingError

  const log = dailyQ.data ?? null
  const meals = mealsQ.data ?? []
  const workouts = workoutsQ.data ?? []
  const close = () => setSheet(null)

  // シートは query の状態に依存せず、どの分岐でも描画し続ける
  // （途中でアンマウントすると入力中の内容が消える）。
  const sheets = sheet && (
    <>
      {sheet.kind === 'daily' && sheet.id === 'weight' && (
        <WeightSheet date={sheet.date} current={log} onClose={close} />
      )}
      {sheet.kind === 'daily' && sheet.id === 'sleep' && (
        <SleepSheet date={sheet.date} current={log} onClose={close} />
      )}
      {sheet.kind === 'daily' && sheet.id === 'mind' && (
        <MindSheet date={sheet.date} current={log} onClose={close} />
      )}
      {sheet.kind === 'daily' && sheet.id === 'activity' && (
        <ActivitySheet date={sheet.date} current={log} onClose={close} />
      )}
      {sheet.kind === 'daily' && sheet.id === 'diary' && (
        <DiarySheet date={sheet.date} current={log} onClose={close} />
      )}
      {sheet.kind === 'meal' && (
        <MealEditorSheet
          date={sheet.date}
          meal={sheet.meal}
          initialType={sheet.initialType}
          onClose={close}
        />
      )}
      {sheet.kind === 'workout' && (
        <WorkoutEditorSheet
          date={sheet.date}
          workout={sheet.workout}
          onClose={close}
        />
      )}
    </>
  )

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
      <DailyStatusBoard
        log={log}
        meals={meals}
        workouts={workouts}
        onOpenDaily={(id) => setSheet({ kind: 'daily', id, date })}
        onOpenMeal={(type) =>
          setSheet({ kind: 'meal', meal: null, initialType: type, date })
        }
        onOpenWorkout={() => setSheet({ kind: 'workout', workout: null, date })}
      />

      <DailyNumbersPanel
        log={log}
        onOpenDaily={(id) => setSheet({ kind: 'daily', id, date })}
      />

      <MealTimeline
        meals={meals}
        onEdit={(meal) => setSheet({ kind: 'meal', meal, date })}
        onAdd={(type) =>
          setSheet({ kind: 'meal', meal: null, initialType: type, date })
        }
      />

      <WorkoutSection
        workouts={workouts}
        onEdit={(workout) => setSheet({ kind: 'workout', workout, date })}
        onAdd={() => setSheet({ kind: 'workout', workout: null, date })}
      />

      <section className="panel">
        <header className="flex items-center justify-between border-b border-line px-3 py-2">
          <div className="flex items-baseline gap-2">
            <span className="microlabel">DIARY</span>
            <span className="text-xs text-ink-dim">日記</span>
          </div>
          <button
            type="button"
            className="text-xs text-accent"
            onClick={() => setSheet({ kind: 'daily', id: 'diary', date })}
          >
            {log?.diary ? '編集' : '＋ 書く'}
          </button>
        </header>
        {log?.diary ? (
          <button
            type="button"
            className="w-full px-3 py-3 text-left"
            onClick={() => setSheet({ kind: 'daily', id: 'diary', date })}
          >
            <p className="text-sm leading-relaxed whitespace-pre-wrap">
              {log.diary}
            </p>
          </button>
        ) : (
          <p className="px-3 py-3 text-sm text-ink-dim">まだ書かれていません。</p>
        )}
      </section>

      {sheets}
    </div>
  )
}
