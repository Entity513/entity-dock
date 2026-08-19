import { sleepDurationLabel } from '../../lib/date'
import {
  MEAL_TYPES,
  MEAL_TYPE_LABELS,
  type DailyLog,
  type Meal,
  type MealType,
  type Workout,
} from '../../types/db'
import { StatusChip } from '../ui/StatusChip'

export type DailySheetId = 'weight' | 'sleep' | 'mind' | 'activity' | 'diary'

interface Props {
  log: DailyLog | null
  meals: Meal[]
  workouts: Workout[]
  onOpenDaily: (id: DailySheetId) => void
  onOpenMeal: (type: MealType) => void
  onOpenWorkout: () => void
}

/** 今日なにが未入力かを一目で見せるチップグリッド。タップで該当エディタへ */
export function DailyStatusBoard({
  log,
  meals,
  workouts,
  onOpenDaily,
  onOpenMeal,
  onOpenWorkout,
}: Props) {
  const mealCount = (type: MealType) =>
    meals.filter((m) => m.meal_type === type).length

  const filledCount =
    [
      log?.weight_kg != null,
      !!(log?.sleep_start && log.sleep_end),
      log?.meditation_min != null,
      log?.condition_score != null,
      log?.mood != null,
      log?.steps != null ||
        log?.active_kcal != null ||
        log?.exercise_min != null ||
        log?.stand_hours != null,
      ...MEAL_TYPES.map((t) => mealCount(t) > 0),
      workouts.length > 0,
      !!log?.diary,
    ].filter(Boolean).length

  return (
    <section className="panel">
      <header className="flex items-center justify-between border-b border-line px-3 py-2">
        <div className="flex items-baseline gap-2">
          <span className="microlabel">RECORD STATUS</span>
          <span className="text-xs text-ink-dim">記録状況</span>
        </div>
        <span className="num text-xs text-ink-dim">{filledCount}/12</span>
      </header>
      <div className="grid grid-cols-3 gap-1.5 p-2">
        <StatusChip
          label="体重"
          done={log?.weight_kg != null}
          value={log?.weight_kg != null ? `${log.weight_kg}kg` : null}
          onClick={() => onOpenDaily('weight')}
        />
        <StatusChip
          label="睡眠"
          done={!!(log?.sleep_start && log.sleep_end)}
          value={
            log?.sleep_start && log.sleep_end
              ? sleepDurationLabel(log.sleep_start, log.sleep_end)
              : null
          }
          onClick={() => onOpenDaily('sleep')}
        />
        <StatusChip
          label="瞑想"
          done={log?.meditation_min != null}
          value={
            log?.meditation_min != null ? `${log.meditation_min}分` : null
          }
          onClick={() => onOpenDaily('mind')}
        />
        <StatusChip
          label="体調"
          done={log?.condition_score != null}
          value={
            log?.condition_score != null ? `${log.condition_score}/10` : null
          }
          onClick={() => onOpenDaily('mind')}
        />
        <StatusChip
          label="気分"
          done={log?.mood != null}
          value={log?.mood != null ? `${log.mood}/10` : null}
          onClick={() => onOpenDaily('mind')}
        />
        <StatusChip
          label="活動量"
          done={
            log?.steps != null ||
            log?.active_kcal != null ||
            log?.exercise_min != null ||
            log?.stand_hours != null
          }
          value={
            log?.steps != null ? `${log.steps.toLocaleString()}歩` : '記録済'
          }
          onClick={() => onOpenDaily('activity')}
        />
        {MEAL_TYPES.map((t) => {
          const count = mealCount(t)
          return (
            <StatusChip
              key={t}
              label={MEAL_TYPE_LABELS[t]}
              done={count > 0}
              value={count > 1 ? `${count}件` : '記録済'}
              onClick={() => onOpenMeal(t)}
            />
          )
        })}
        <StatusChip
          label="筋トレ"
          done={workouts.length > 0}
          value={workouts.length > 0 ? `${workouts.length}件` : null}
          onClick={onOpenWorkout}
        />
        <StatusChip
          label="日記"
          done={!!log?.diary}
          value="記録済"
          onClick={() => onOpenDaily('diary')}
        />
      </div>
    </section>
  )
}
