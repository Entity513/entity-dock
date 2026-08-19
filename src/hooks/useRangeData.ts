import { useQuery } from '@tanstack/react-query'
import { addDays, todayStr } from '../lib/date'
import { supabase } from '../lib/supabase'

/** 折れ線1本ぶんの点。value は実測（欠測日は null）、ma は7日移動平均 */
export interface TrendPoint {
  date: string
  value: number | null
  ma: number | null
}

export interface ScatterPoint {
  date: string
  x: number
  y: number
}

export interface TagStat {
  tag: string
  avg: number
  days: number
}

export interface RangeSummary {
  avgCondition: number | null
  avgSleepHours: number | null
  avgWeight: number | null
  loggedDays: number
  rangeDays: number
  /** 系統別タブのヘッダー用 */
  avgSteps: number | null
  avgMeditation: number | null
  avgSleepScore: number | null
  workoutDays: number
  mealDays: number
}

export interface RangeData {
  weight: TrendPoint[]
  sleep: TrendPoint[]
  condition: TrendPoint[]
  mood: TrendPoint[]
  steps: TrendPoint[]
  activeKcal: TrendPoint[]
  exerciseMin: TrendPoint[]
  meditation: TrendPoint[]
  sleepScore: TrendPoint[]
  sleepVsCondition: ScatterPoint[]
  meditationVsCondition: ScatterPoint[]
  stepsVsCondition: ScatterPoint[]
  mealTagConditions: TagStat[]
  workoutTagDays: TagStat[]
  summary: RangeSummary
}

interface LogRow {
  date: string
  weight_kg: number | null
  sleep_start: string | null
  sleep_end: string | null
  sleep_score: number | null
  meditation_min: number | null
  condition_score: number | null
  mood: number | null
  steps: number | null
  active_kcal: number | null
  exercise_min: number | null
  stand_hours: number | null
}

interface MealRow {
  date: string
  meal_type: string
  tags: string[] | null
}

interface WorkoutRow {
  date: string
  tags: string[] | null
}

const HOUR_MS = 3_600_000
const MA_WINDOW = 7
/** 窓内の実測が1日しかない「平均」は出さない */
const MA_MIN_SAMPLES = 2
/** コンディションが揃った日が2日未満のタグは平均を出さない */
const TAG_MIN_DAYS = 2

const round1 = (n: number) => Math.round(n * 10) / 10
const round2 = (n: number) => Math.round(n * 100) / 100

/** 睡眠の timestamptz ペア → 小数時間（7.5 など） */
function sleepHours(start: string | null, end: string | null): number | null {
  if (!start || !end) return null
  const ms = new Date(end).getTime() - new Date(start).getTime()
  if (ms <= 0) return null
  return round2(ms / HOUR_MS)
}

function mean(values: number[]): number | null {
  if (values.length === 0) return null
  return values.reduce((a, b) => a + b, 0) / values.length
}

const defined = (values: (number | null)[]): number[] =>
  values.filter((v): v is number => v != null)

/**
 * 日付スパイン上に実測を並べ、7日移動平均を添える。
 * 欠測日は 0 埋めせず窓のサンプルから除外する（0 埋めすると平均が沈む）。
 */
function toTrend(
  dates: string[],
  valueOf: (date: string) => number | null,
): TrendPoint[] {
  const values = dates.map(valueOf)
  return dates.map((date, i) => {
    const window = defined(values.slice(Math.max(0, i - MA_WINDOW + 1), i + 1))
    const avg = window.length >= MA_MIN_SAMPLES ? mean(window) : null
    return { date, value: values[i], ma: avg == null ? null : round2(avg) }
  })
}

/** エディタが作っただけの空行を「記録あり」に数えない */
function hasContent(row: LogRow): boolean {
  return (
    row.weight_kg != null ||
    row.sleep_start != null ||
    row.sleep_score != null ||
    row.meditation_min != null ||
    row.condition_score != null ||
    row.mood != null ||
    row.steps != null ||
    row.active_kcal != null ||
    row.exercise_min != null ||
    row.stand_hours != null
  )
}

/** ダッシュボード用。直近 days 日ぶんを3本並列 select し、集計まで済ませて返す */
export function useRangeData(days: number) {
  return useQuery({
    queryKey: ['range', days],
    queryFn: async (): Promise<RangeData> => {
      const last = todayStr()
      const first = addDays(last, -(days - 1))
      const [logsRes, mealsRes, workoutsRes] = await Promise.all([
        supabase
          .from('daily_logs')
          .select(
            'date, weight_kg, sleep_start, sleep_end, sleep_score, meditation_min, condition_score, mood, steps, active_kcal, exercise_min, stand_hours',
          )
          .gte('date', first)
          .lte('date', last),
        supabase
          .from('meals')
          .select('date, meal_type, tags')
          .gte('date', first)
          .lte('date', last),
        supabase
          .from('workouts')
          .select('date, tags')
          .gte('date', first)
          .lte('date', last),
      ])
      if (logsRes.error) throw logsRes.error
      if (mealsRes.error) throw mealsRes.error
      if (workoutsRes.error) throw workoutsRes.error

      const logRows: LogRow[] = logsRes.data
      const mealRows: MealRow[] = mealsRes.data
      const workoutRows: WorkoutRow[] = workoutsRes.data

      const byDate = new Map<string, LogRow>()
      for (const row of logRows) byDate.set(row.date, row)

      const dates: string[] = []
      for (let d = first; d <= last; d = addDays(d, 1)) dates.push(d)

      const weight = toTrend(dates, (d) => byDate.get(d)?.weight_kg ?? null)
      const sleep = toTrend(dates, (d) => {
        const row = byDate.get(d)
        return row ? sleepHours(row.sleep_start, row.sleep_end) : null
      })
      const condition = toTrend(
        dates,
        (d) => byDate.get(d)?.condition_score ?? null,
      )

      const mood = toTrend(dates, (d) => byDate.get(d)?.mood ?? null)
      const steps = toTrend(dates, (d) => byDate.get(d)?.steps ?? null)
      const activeKcal = toTrend(dates, (d) => byDate.get(d)?.active_kcal ?? null)
      const exerciseMin = toTrend(
        dates,
        (d) => byDate.get(d)?.exercise_min ?? null,
      )
      const meditation = toTrend(
        dates,
        (d) => byDate.get(d)?.meditation_min ?? null,
      )
      const sleepScore = toTrend(dates, (d) => byDate.get(d)?.sleep_score ?? null)

      const sleepVsCondition: ScatterPoint[] = []
      const meditationVsCondition: ScatterPoint[] = []
      const stepsVsCondition: ScatterPoint[] = []
      for (const row of logRows) {
        const y = row.condition_score
        if (y == null) continue
        const hours = sleepHours(row.sleep_start, row.sleep_end)
        if (hours != null)
          sleepVsCondition.push({ date: row.date, x: hours, y })
        if (row.meditation_min != null) {
          meditationVsCondition.push({
            date: row.date,
            x: row.meditation_min,
            y,
          })
        }
        if (row.steps != null) {
          stepsVsCondition.push({ date: row.date, x: row.steps, y })
        }
      }

      // 同じ日に同じタグが複数の食事に付いても、その日は1回として数える
      const tagDates = new Map<string, Set<string>>()
      for (const row of mealRows) {
        for (const tag of row.tags ?? []) {
          const dateSet = tagDates.get(tag) ?? new Set<string>()
          dateSet.add(row.date)
          tagDates.set(tag, dateSet)
        }
      }
      const mealTagConditions: TagStat[] = []
      for (const [tag, dateSet] of tagDates) {
        // 日数は平均の母数（コンディションが記録された日）に合わせる
        const scores = defined(
          [...dateSet].map((d) => byDate.get(d)?.condition_score ?? null),
        )
        if (scores.length < TAG_MIN_DAYS) continue
        const avg = mean(scores)
        if (avg == null) continue
        mealTagConditions.push({ tag, avg: round1(avg), days: scores.length })
      }
      mealTagConditions.sort((a, b) => b.avg - a.avg || b.days - a.days)

      // 部位タグは「何日やったか」が知りたいので、平均ではなく日数で並べる
      const workoutTagDates = new Map<string, Set<string>>()
      for (const row of workoutRows) {
        for (const tag of row.tags ?? []) {
          const dateSet = workoutTagDates.get(tag) ?? new Set<string>()
          dateSet.add(row.date)
          workoutTagDates.set(tag, dateSet)
        }
      }
      const workoutTagDays: TagStat[] = [...workoutTagDates]
        .map(([tag, dateSet]) => ({
          tag,
          avg: dateSet.size,
          days: dateSet.size,
        }))
        .sort((a, b) => b.days - a.days)

      const recorded = new Set<string>()
      for (const row of logRows) if (hasContent(row)) recorded.add(row.date)
      for (const row of mealRows) recorded.add(row.date)
      for (const row of workoutRows) recorded.add(row.date)

      const avgCondition = mean(defined(logRows.map((r) => r.condition_score)))
      const avgSleepHours = mean(
        defined(logRows.map((r) => sleepHours(r.sleep_start, r.sleep_end))),
      )
      const avgWeight = mean(defined(logRows.map((r) => r.weight_kg)))
      const avgSteps = mean(defined(logRows.map((r) => r.steps)))
      const avgMeditation = mean(defined(logRows.map((r) => r.meditation_min)))
      const avgSleepScore = mean(defined(logRows.map((r) => r.sleep_score)))

      const workoutDays = new Set(workoutRows.map((r) => r.date)).size
      const mealDays = new Set(mealRows.map((r) => r.date)).size

      return {
        weight,
        sleep,
        condition,
        mood,
        steps,
        activeKcal,
        exerciseMin,
        meditation,
        sleepScore,
        sleepVsCondition,
        meditationVsCondition,
        stepsVsCondition,
        mealTagConditions,
        workoutTagDays,
        summary: {
          avgCondition: avgCondition == null ? null : round1(avgCondition),
          avgSleepHours: avgSleepHours == null ? null : round2(avgSleepHours),
          avgWeight: avgWeight == null ? null : round1(avgWeight),
          loggedDays: recorded.size,
          rangeDays: dates.length,
          avgSteps: avgSteps == null ? null : Math.round(avgSteps),
          avgMeditation: avgMeditation == null ? null : round1(avgMeditation),
          avgSleepScore: avgSleepScore == null ? null : Math.round(avgSleepScore),
          workoutDays,
          mealDays,
        },
      }
    },
  })
}
