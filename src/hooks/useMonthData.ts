import { useQuery } from '@tanstack/react-query'
import { monthRange } from '../lib/date'
import { supabase } from '../lib/supabase'

export interface DaySummary {
  conditionScore: number | null
  hasWeight: boolean
  hasDiary: boolean
  mealCount: number
  workoutCount: number
}

export type MonthData = Record<string, DaySummary>

const emptyDay = (): DaySummary => ({
  conditionScore: null,
  hasWeight: false,
  hasDiary: false,
  mealCount: 0,
  workoutCount: 0,
})

/** カレンダー表示用。最小カラムの範囲 select を3本並列で投げる */
export function useMonthData(ym: string) {
  return useQuery({
    queryKey: ['month', ym],
    queryFn: async (): Promise<MonthData> => {
      const { first, last } = monthRange(ym)
      const [logsRes, mealsRes, workoutsRes] = await Promise.all([
        supabase
          .from('daily_logs')
          .select('date, condition_score, weight_kg, diary')
          .gte('date', first)
          .lte('date', last),
        supabase.from('meals').select('date').gte('date', first).lte('date', last),
        supabase
          .from('workouts')
          .select('date')
          .gte('date', first)
          .lte('date', last),
      ])
      if (logsRes.error) throw logsRes.error
      if (mealsRes.error) throw mealsRes.error
      if (workoutsRes.error) throw workoutsRes.error

      const days: MonthData = {}
      const day = (date: string) => (days[date] ??= emptyDay())

      for (const row of logsRes.data) {
        const d = day(row.date)
        d.conditionScore = row.condition_score
        d.hasWeight = row.weight_kg != null
        d.hasDiary = !!row.diary
      }
      for (const row of mealsRes.data) day(row.date).mealCount++
      for (const row of workoutsRes.data) day(row.date).workoutCount++
      return days
    },
  })
}
