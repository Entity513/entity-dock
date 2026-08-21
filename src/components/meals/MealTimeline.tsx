import { formatTimeCol } from '../../lib/date'
import { mealMacroLine } from '../../lib/nutrition'
import {
  MEAL_TYPES,
  MEAL_TYPE_LABELS,
  type Meal,
  type MealType,
} from '../../types/db'
import { Card } from '../ui/Card'
import { SignedImage } from '../ui/SignedImage'

interface Props {
  meals: Meal[]
  onEdit: (meal: Meal) => void
  onAdd: (type: MealType) => void
}

/** 1食ぶんの行。写真・内容・栄養を1行にまとめる */
function MealRow({ meal, onClick }: { meal: Meal; onClick: () => void }) {
  const macro = mealMacroLine(meal)

  return (
    <button
      type="button"
      className="flex w-full items-start gap-3 px-4 py-3 text-left"
      onClick={onClick}
    >
      {meal.photo_url ? (
        <SignedImage
          path={meal.photo_url}
          alt={MEAL_TYPE_LABELS[meal.meal_type]}
          className="h-14 w-14 shrink-0 rounded-[3px] border border-line object-cover"
        />
      ) : (
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[3px] border border-line/70 bg-panel2">
          <span className="num text-[10px] text-ink-dim/50">
            {MEAL_TYPE_LABELS[meal.meal_type].slice(0, 1)}
          </span>
        </span>
      )}

      <span className="min-w-0 flex-1">
        <span className="flex items-baseline gap-2">
          <span className="t-label">{MEAL_TYPE_LABELS[meal.meal_type]}</span>
          {meal.time && (
            <span className="num text-[11px] text-ink-dim">
              {formatTimeCol(meal.time)}
            </span>
          )}
          {meal.source === 'entity' && (
            <span className="microlabel text-data/70">ENTITY</span>
          )}
        </span>

        {meal.description && (
          <span className="mt-1 block truncate text-sm text-ink">
            {meal.description}
          </span>
        )}

        {macro ? (
          <span className="num mt-1 block text-[11px] text-ink-dim">
            {macro}
          </span>
        ) : (
          meal.tags.length > 0 && (
            <span className="num mt-1 block truncate text-[11px] text-ink-dim/70">
              {meal.tags.map((t) => `#${t}`).join(' ')}
            </span>
          )
        )}
      </span>

      {meal.kcal != null && (
        <span className="flex shrink-0 items-baseline gap-0.5">
          <span className="t-value">{meal.kcal.toLocaleString()}</span>
          <span className="t-unit">kcal</span>
        </span>
      )}
    </button>
  )
}

export function MealTimeline({ meals, onEdit, onAdd }: Props) {
  return (
    <Card
      en="MEALS"
      ja="食事"
      right={
        meals.length > 0 ? (
          <span className="num text-xs text-ink-dim">{meals.length}件</span>
        ) : undefined
      }
    >
      {meals.length > 0 ? (
        <ul className="divide-y divide-line/70 border-t border-line/70">
          {meals.map((meal) => (
            <li key={meal.id}>
              <MealRow meal={meal} onClick={() => onEdit(meal)} />
            </li>
          ))}
        </ul>
      ) : (
        <p className="px-4 pb-4 text-sm text-ink-dim/60">
          今日はまだ記録がありません
        </p>
      )}

      <div className="grid grid-cols-4 gap-1.5 border-t border-line/70 p-2.5">
        {MEAL_TYPES.map((t) => (
          <button
            key={t}
            type="button"
            className="flex h-10 items-center justify-center rounded-[3px] border border-accent/40 bg-accent/8 text-xs font-medium text-accent"
            onClick={() => onAdd(t)}
          >
            ＋{MEAL_TYPE_LABELS[t]}
          </button>
        ))}
      </div>
    </Card>
  )
}
