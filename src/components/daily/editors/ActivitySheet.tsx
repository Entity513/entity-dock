import { useState } from 'react'
import { useUpsertDailyLog } from '../../../hooks/useDailyLog'
import type { DailyLog } from '../../../types/db'
import { BottomSheet } from '../../ui/BottomSheet'
import { Field } from '../../ui/Field'
import { NumberInput } from '../../ui/NumberInput'

interface Props {
  date: string
  current: DailyLog | null
  onClose: () => void
}

/** Apple Watch の活動データ（当面は手入力） */
export function ActivitySheet({ date, current, onClose }: Props) {
  const [steps, setSteps] = useState<number | null>(current?.steps ?? null)
  const [activeKcal, setActiveKcal] = useState<number | null>(
    current?.active_kcal ?? null,
  )
  const [exerciseMin, setExerciseMin] = useState<number | null>(
    current?.exercise_min ?? null,
  )
  const [standHours, setStandHours] = useState<number | null>(
    current?.stand_hours ?? null,
  )
  const upsert = useUpsertDailyLog(date)

  return (
    <BottomSheet title="活動量" en="ACTIVITY" onClose={onClose}>
      <div className="flex flex-col gap-4">
        <Field label="歩数" en="STEPS">
          <NumberInput
            value={steps}
            onChange={setSteps}
            step={500}
            min={0}
            max={200000}
            unit="歩"
          />
        </Field>
        <Field label="アクティブカロリー" en="ACTIVE">
          <NumberInput
            value={activeKcal}
            onChange={setActiveKcal}
            step={50}
            min={0}
            max={20000}
            unit="kcal"
          />
        </Field>
        <Field label="エクササイズ" en="EXERCISE">
          <NumberInput
            value={exerciseMin}
            onChange={setExerciseMin}
            step={5}
            min={0}
            max={1440}
            unit="分"
          />
        </Field>
        <Field label="スタンド" en="STAND">
          <NumberInput
            value={standHours}
            onChange={setStandHours}
            step={1}
            min={0}
            max={24}
            unit="時間"
          />
        </Field>
        {upsert.isError && (
          <p className="text-sm text-alert">
            保存に失敗しました: {upsert.error.message}
          </p>
        )}
        <button
          type="button"
          className="btn-primary"
          disabled={upsert.isPending}
          onClick={() =>
            upsert.mutate(
              {
                steps,
                active_kcal: activeKcal,
                exercise_min: exerciseMin,
                stand_hours: standHours,
              },
              { onSuccess: onClose },
            )
          }
        >
          {upsert.isPending ? '保存中…' : '保存'}
        </button>
      </div>
    </BottomSheet>
  )
}
