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

export function WeightSheet({ date, current, onClose }: Props) {
  const [weight, setWeight] = useState<number | null>(
    current?.weight_kg ?? null,
  )
  const upsert = useUpsertDailyLog(date)

  return (
    <BottomSheet title="体重" en="WEIGHT" onClose={onClose}>
      <div className="flex flex-col gap-4">
        <Field label="体重" en="WEIGHT">
          <NumberInput
            value={weight}
            onChange={setWeight}
            step={0.1}
            min={20}
            max={299}
            decimal
            unit="kg"
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
            upsert.mutate({ weight_kg: weight }, { onSuccess: onClose })
          }
        >
          {upsert.isPending ? '保存中…' : '保存'}
        </button>
      </div>
    </BottomSheet>
  )
}
