import { formatHM, sleepDurationLabel } from '../../lib/date'
import { totalMacros } from '../../lib/nutrition'
import {
  MEAL_TYPE_LABELS,
  type DailyLog,
  type Meal,
  type Settings,
  type Workout,
} from '../../types/db'
import { AnimatedNumber } from '../ui/AnimatedNumber'
import { Card } from '../ui/Card'

export type DailySheetId = 'weight' | 'sleep' | 'mind' | 'activity' | 'diary'

interface Row {
  ja: string
  en: string
  /** 主たる値。null なら未記録 */
  value: string | null
  unit?: string
  /** 中身の要約。「何が入っているか」を見せる行 */
  detail?: string | null
  onClick: () => void
}

interface Props {
  log: DailyLog | null
  meals: Meal[]
  workouts: Workout[]
  settings: Settings | null
  /** 直近7日の平均体重。差分表示に使う */
  weightBaseline?: number | null
  streak?: number
  onOpenDaily: (id: DailySheetId) => void
  onOpenMeal: () => void
  onOpenWorkout: () => void
}

/** 未記録は「—」だけ。文言でも色でも咎めない */
function Value({ value, unit }: { value: string | null; unit?: string }) {
  if (value == null) return <span className="t-empty">—</span>
  return (
    <span className="flex items-baseline gap-1">
      <span className="t-value">{value}</span>
      {unit && <span className="t-unit">{unit}</span>}
    </span>
  )
}

/**
 * 今日の状態。
 * 主役は「入っている内容」。件数や「記録済み」ではなく、
 * 体重の実測値・睡眠時間・食べたもの・やった種目を直接出す。
 */
export function TodaySummary({
  log,
  meals,
  workouts,
  settings,
  weightBaseline,
  streak,
  onOpenDaily,
  onOpenMeal,
  onOpenWorkout,
}: Props) {
  const macros = totalMacros(meals)

  // 直近の食事を1つだけ拾って「夜: ステーキ」の形で見せる
  const lastMeal = meals[meals.length - 1]
  const mealDetail = (() => {
    if (meals.length === 0) return null
    const head = lastMeal?.description?.split(/[、,。\n]/)[0]?.trim()
    const label = lastMeal ? MEAL_TYPE_LABELS[lastMeal.meal_type] : null
    const kcal = macros.kcal != null ? `${macros.kcal.toLocaleString()} kcal` : null
    return [kcal, head && label ? `${label}: ${head}` : null]
      .filter(Boolean)
      .join(' · ')
  })()

  const workoutDetail =
    workouts.length > 0
      ? (workouts.flatMap((w) => w.tags).slice(0, 3).join(' · ') ||
        workouts[0].menu?.split('\n')[0]?.trim() ||
        `${workouts.length}件`)
      : null

  const weightDelta =
    log?.weight_kg != null && weightBaseline != null
      ? log.weight_kg - weightBaseline
      : null

  const rows: Row[] = [
    {
      ja: '体重',
      en: 'WEIGHT',
      value: log?.weight_kg != null ? log.weight_kg.toFixed(1) : null,
      unit: 'kg',
      detail:
        weightDelta != null
          ? `7日平均比 ${weightDelta >= 0 ? '+' : ''}${weightDelta.toFixed(1)}kg`
          : settings?.target_weight_kg != null && log?.weight_kg != null
            ? `目標まで ${(log.weight_kg - settings.target_weight_kg).toFixed(1)}kg`
            : null,
      onClick: () => onOpenDaily('weight'),
    },
    {
      ja: '睡眠',
      en: 'SLEEP',
      value:
        log?.sleep_start && log.sleep_end
          ? sleepDurationLabel(log.sleep_start, log.sleep_end)
          : null,
      detail:
        log?.sleep_start && log.sleep_end
          ? `${formatHM(log.sleep_start)} → ${formatHM(log.sleep_end)}${
              log.sleep_score != null ? ` · スコア ${log.sleep_score}` : ''
            }`
          : null,
      onClick: () => onOpenDaily('sleep'),
    },
    {
      ja: '食事',
      en: 'FUEL',
      value: meals.length > 0 ? String(meals.length) : null,
      unit: '件',
      detail: mealDetail,
      onClick: onOpenMeal,
    },
    {
      ja: '運動',
      en: 'DRIVE',
      value: log?.steps != null ? log.steps.toLocaleString() : null,
      unit: '歩',
      detail: workoutDetail && `筋トレ ${workoutDetail}`,
      onClick: onOpenWorkout,
    },
    {
      ja: '心身',
      en: 'MIND',
      value: log?.condition_score != null ? `${log.condition_score}` : null,
      unit: '/10',
      detail: [
        log?.mood != null ? `気分 ${log.mood}` : null,
        log?.meditation_min != null ? `瞑想 ${log.meditation_min}分` : null,
      ]
        .filter(Boolean)
        .join(' · '),
      onClick: () => onOpenDaily('mind'),
    },
  ]

  const done = rows.filter((r) => r.value != null).length

  return (
    <Card
      en="TODAY"
      ja="今日の状態"
      right={
        <span className="flex items-baseline gap-3">
          {streak != null && streak > 0 && (
            <span className="t-sub">
              連続 <span className="num text-accent">{streak}</span> 日
            </span>
          )}
          <span className="num text-xs text-ink-dim">
            <span className="text-ink">{done}</span>/{rows.length}
          </span>
        </span>
      }
    >
      {/* 進捗。満たない区間は罫線色のまま＝減点に見せない */}
      <div className="mx-4 mb-1 flex h-[3px] gap-px overflow-hidden rounded-full bg-line/50">
        {rows.map((r) => (
          <span
            key={r.en}
            className={`h-full flex-1 transition-colors duration-500 ${
              r.value != null ? 'bg-accent' : 'bg-transparent'
            }`}
          />
        ))}
      </div>

      <ul className="divide-y divide-line/70">
        {rows.map((row) => (
          <li key={row.en}>
            <button
              type="button"
              onClick={row.onClick}
              className="flex w-full items-center justify-between gap-4 px-4 py-3 text-left"
            >
              <span className="min-w-0">
                <span className="t-label block">{row.ja}</span>
                {row.detail && (
                  <span className="t-sub mt-0.5 block truncate">
                    {row.detail}
                  </span>
                )}
              </span>
              <Value value={row.value} unit={row.unit} />
            </button>
          </li>
        ))}
      </ul>
    </Card>
  )
}

/** 今日の主要数値を大きく出すヒーロー。体重を主役に置く */
export function TodayHero({
  log,
  macros,
  onOpenWeight,
}: {
  log: DailyLog | null
  macros: ReturnType<typeof totalMacros>
  onOpenWeight: () => void
}) {
  return (
    <div className="flex items-end justify-between gap-4 px-1">
      <button type="button" onClick={onOpenWeight} className="text-left">
        <span className="microlabel">WEIGHT</span>
        <span className="mt-0.5 flex items-baseline gap-1.5">
          {log?.weight_kg != null ? (
            <>
              <AnimatedNumber
                value={log.weight_kg}
                format={(v) => v.toFixed(1)}
                className="t-display"
              />
              <span className="t-unit">kg</span>
            </>
          ) : (
            <span className="t-display text-ink-dim/40">—</span>
          )}
        </span>
      </button>

      <div className="flex items-end gap-5">
        <div className="text-right">
          <span className="microlabel">INTAKE</span>
          <span className="mt-0.5 flex items-baseline justify-end gap-1">
            {macros.kcal != null ? (
              <>
                <AnimatedNumber
                  value={macros.kcal}
                  format={(v) => Math.round(v).toLocaleString()}
                  className="t-metric"
                />
                <span className="t-unit">kcal</span>
              </>
            ) : (
              <span className="t-metric text-ink-dim/40">—</span>
            )}
          </span>
        </div>
        <div className="text-right">
          <span className="microlabel">COND</span>
          <span className="mt-0.5 flex items-baseline justify-end gap-1">
            {log?.condition_score != null ? (
              <>
                <AnimatedNumber
                  value={log.condition_score}
                  className="t-metric"
                />
                <span className="t-unit">/10</span>
              </>
            ) : (
              <span className="t-metric text-ink-dim/40">—</span>
            )}
          </span>
        </div>
      </div>
    </div>
  )
}
