import { formatTimeCol } from '../../lib/date'
import {
  MEAL_TYPES,
  MEAL_TYPE_LABELS,
  type Meal,
  type MealType,
} from '../../types/db'
import { SignedImage } from '../ui/SignedImage'

interface Props {
  meals: Meal[]
  onEdit: (meal: Meal) => void
  onAdd: (type: MealType) => void
}

export function MealTimeline({ meals, onEdit, onAdd }: Props) {
  return (
    <section className="panel">
      <header className="flex items-center justify-between border-b border-line px-3 py-2">
        <div className="flex items-baseline gap-2">
          <span className="microlabel">MEALS</span>
          <span className="text-xs text-ink-dim">食事</span>
        </div>
        <span className="num text-xs text-ink-dim">{meals.length}件</span>
      </header>

      {meals.length > 0 && (
        <ul className="divide-y divide-line">
          {meals.map((meal) => (
            <li key={meal.id}>
              <button
                type="button"
                className="flex w-full items-stretch gap-3 px-3 py-2.5 text-left"
                onClick={() => onEdit(meal)}
              >
                {meal.photo_url ? (
                  <SignedImage
                    path={meal.photo_url}
                    alt={MEAL_TYPE_LABELS[meal.meal_type]}
                    className="h-16 w-16 shrink-0 rounded-[4px] border border-line object-cover"
                  />
                ) : (
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[4px] border border-line bg-panel2">
                    <span className="microlabel">NO IMG</span>
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="rounded-[3px] border border-accent/40 px-1.5 py-0.5 text-[11px] text-accent">
                      {MEAL_TYPE_LABELS[meal.meal_type]}
                    </span>
                    {meal.time && (
                      <span className="num text-xs text-ink-dim">
                        {formatTimeCol(meal.time)}
                      </span>
                    )}
                    {meal.source === 'entity' && (
                      <span className="microlabel text-data">ENTITY</span>
                    )}
                  </div>
                  {meal.description && (
                    <p className="mt-1 truncate text-sm text-ink">
                      {meal.description}
                    </p>
                  )}
                  {meal.tags.length > 0 && (
                    <p className="num mt-0.5 truncate text-[11px] text-ink-dim">
                      {meal.tags.map((t) => `#${t}`).join(' ')}
                    </p>
                  )}
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="grid grid-cols-4 gap-1.5 p-2">
        {MEAL_TYPES.map((t) => (
          <button
            key={t}
            type="button"
            className="flex h-10 items-center justify-center rounded-[4px] border border-dashed border-line text-xs text-ink-dim"
            onClick={() => onAdd(t)}
          >
            ＋{MEAL_TYPE_LABELS[t]}
          </button>
        ))}
      </div>
    </section>
  )
}
