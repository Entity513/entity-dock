import { useState } from 'react'
import { useUpsertDailyLog } from '../../../hooks/useDailyLog'
import type { DailyLog } from '../../../types/db'
import { BottomSheet } from '../../ui/BottomSheet'
import { Field } from '../../ui/Field'
import { NumberInput } from '../../ui/NumberInput'
import { ScoreDial } from '../../ui/ScoreDial'

interface Props {
  date: string
  current: DailyLog | null
  onClose: () => void
}

export function MindSheet({ date, current, onClose }: Props) {
  const [meditation, setMeditation] = useState<number | null>(
    current?.meditation_min ?? null,
  )
  const [condition, setCondition] = useState<number | null>(
    current?.condition_score ?? null,
  )
  const [mood, setMood] = useState<number | null>(current?.mood ?? null)
  const upsert = useUpsertDailyLog(date)

  return (
    <BottomSheet title="体調・気分・瞑想" en="CONDITION" onClose={onClose}>
      <div className="flex flex-col gap-5">
        <Field label="体調 (1-10)" en="CONDITION">
          <ScoreDial value={condition} onChange={setCondition} />
        </Field>
        <Field label="気分 (1-10)" en="MOOD">
          <ScoreDial value={mood} onChange={setMood} />
        </Field>
        <Field label="瞑想" en="MEDITATION">
          <NumberInput
            value={meditation}
            onChange={setMeditation}
            step={5}
            min={0}
            max={999}
            unit="分"
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
                meditation_min: meditation,
                condition_score: condition,
                mood,
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
