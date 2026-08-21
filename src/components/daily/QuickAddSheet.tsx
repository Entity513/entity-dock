import { MEAL_TYPES, MEAL_TYPE_LABELS, type MealType } from '../../types/db'
import { BottomSheet } from '../ui/BottomSheet'
import type { DailySheetId } from './TodaySummary'

interface Props {
  onPickDaily: (id: DailySheetId) => void
  onPickMeal: (type: MealType) => void
  onPickWorkout: () => void
  onClose: () => void
}

const DAILY_ITEMS: { id: DailySheetId; ja: string; en: string }[] = [
  { id: 'weight', ja: '体重', en: 'WEIGHT' },
  { id: 'sleep', ja: '睡眠', en: 'SLEEP' },
  { id: 'mind', ja: '体調・気分・瞑想', en: 'MIND' },
  { id: 'activity', ja: '活動量', en: 'ACTIVITY' },
  { id: 'diary', ja: '日記', en: 'DIARY' },
]

function Row({
  ja,
  en,
  onClick,
}: {
  ja: string
  en: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center justify-between rounded-[4px] border border-line bg-panel2 px-4 py-3.5 text-left"
    >
      <span className="t-label">{ja}</span>
      <span className="microlabel">{en}</span>
    </button>
  )
}

/** どこからでも開ける記録メニュー。ここから各エディタに入る */
export function QuickAddSheet({
  onPickDaily,
  onPickMeal,
  onPickWorkout,
  onClose,
}: Props) {
  return (
    <BottomSheet title="記録する" en="QUICK ADD" onClose={onClose}>
      <div className="flex flex-col gap-4">
        <div>
          <span className="microlabel mb-2 block">食事</span>
          <div className="grid grid-cols-4 gap-1.5">
            {MEAL_TYPES.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => onPickMeal(t)}
                className="flex h-12 items-center justify-center rounded-[4px] border border-accent/45 bg-accent/10 text-sm font-medium text-accent"
              >
                {MEAL_TYPE_LABELS[t]}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="microlabel">その他</span>
          <Row ja="筋トレ" en="WORKOUT" onClick={onPickWorkout} />
          {DAILY_ITEMS.map((item) => (
            <Row
              key={item.id}
              ja={item.ja}
              en={item.en}
              onClick={() => onPickDaily(item.id)}
            />
          ))}
        </div>
      </div>
    </BottomSheet>
  )
}
