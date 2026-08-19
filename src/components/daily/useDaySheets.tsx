import { useState } from 'react'
import type { DailyLog, Meal, MealType, Workout } from '../../types/db'
import { MealEditorSheet } from '../meals/MealEditorSheet'
import { WorkoutEditorSheet } from '../workouts/WorkoutEditorSheet'
import type { DailySheetId } from './DailyStatusBoard'
import { ActivitySheet } from './editors/ActivitySheet'
import { DiarySheet } from './editors/DiarySheet'
import { MindSheet } from './editors/MindSheet'
import { SleepSheet } from './editors/SleepSheet'
import { WeightSheet } from './editors/WeightSheet'

// date はシートを開いた時点で固定する。Today の深夜0時切替で表示中の
// 日付が変わっても、保存先は開いた日のままになる。
type SheetState =
  | { kind: 'daily'; id: DailySheetId; date: string }
  | { kind: 'meal'; meal: Meal | null; initialType?: MealType; date: string }
  | { kind: 'workout'; workout: Workout | null; date: string }
  | null

/**
 * 1日ぶんの編集シートをまとめて面倒みる。
 * 返す `sheets` は query の読込・エラー状態に関係なく常に描画すること
 * （途中でアンマウントすると入力中の内容が消える）。
 */
export function useDaySheets(date: string, log: DailyLog | null) {
  const [sheet, setSheet] = useState<SheetState>(null)
  const close = () => setSheet(null)

  const openDaily = (id: DailySheetId) => setSheet({ kind: 'daily', id, date })
  const openMeal = (meal: Meal | null, initialType?: MealType) =>
    setSheet({ kind: 'meal', meal, initialType, date })
  const openWorkout = (workout: Workout | null) =>
    setSheet({ kind: 'workout', workout, date })

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

  return { openDaily, openMeal, openWorkout, sheets }
}
