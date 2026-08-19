import { useState } from 'react'
import { useUpsertDailyLog } from '../../../hooks/useDailyLog'
import {
  combineSleepTimes,
  formatHM,
  sleepDurationLabel,
} from '../../../lib/date'
import type { DailyLog } from '../../../types/db'
import { BottomSheet } from '../../ui/BottomSheet'
import { Field } from '../../ui/Field'
import { NumberInput } from '../../ui/NumberInput'

interface Props {
  date: string
  current: DailyLog | null
  onClose: () => void
}

export function SleepSheet({ date, current, onClose }: Props) {
  const [startHM, setStartHM] = useState(
    current?.sleep_start ? formatHM(current.sleep_start) : '',
  )
  const [endHM, setEndHM] = useState(
    current?.sleep_end ? formatHM(current.sleep_end) : '',
  )
  const [score, setScore] = useState<number | null>(
    current?.sleep_score ?? null,
  )
  const upsert = useUpsertDailyLog(date)

  const bothSet = startHM !== '' && endHM !== ''
  const sameTime = bothSet && startHM === endHM
  const oneMissing = (startHM === '') !== (endHM === '')

  const combined =
    bothSet && !sameTime ? combineSleepTimes(date, startHM, endHM) : null

  const save = () => {
    const patch = combined
      ? {
          sleep_start: combined.sleepStart,
          sleep_end: combined.sleepEnd,
          sleep_score: score,
        }
      : { sleep_start: null, sleep_end: null, sleep_score: score }
    upsert.mutate(patch, { onSuccess: onClose })
  }

  return (
    <BottomSheet title="睡眠" en="SLEEP" onClose={onClose}>
      <div className="flex flex-col gap-4">
        <p className="text-xs text-ink-dim">
          この日の起床に対応する睡眠を記録します（就寝が起床時刻より遅い場合は前日の就寝として扱います）。
        </p>
        <div className="grid grid-cols-2 gap-3">
          <Field label="就寝" en="BED">
            <input
              type="time"
              className="input num"
              value={startHM}
              onChange={(e) => setStartHM(e.target.value)}
            />
          </Field>
          <Field label="起床" en="WAKE">
            <input
              type="time"
              className="input num"
              value={endHM}
              onChange={(e) => setEndHM(e.target.value)}
            />
          </Field>
        </div>

        {combined && (
          <div className="panel flex items-center justify-between px-3 py-2">
            <span className="microlabel">DURATION 睡眠時間</span>
            <span className="num text-lg font-semibold text-accent">
              {sleepDurationLabel(combined.sleepStart, combined.sleepEnd)}
            </span>
          </div>
        )}
        {sameTime && (
          <p className="text-sm text-warn">
            就寝と起床が同時刻です。どちらかを修正してください。
          </p>
        )}
        {oneMissing && (
          <p className="text-sm text-warn">
            就寝・起床の両方を入力してください（両方空にすると記録を消去します）。
          </p>
        )}

        <Field label="睡眠スコア (Apple Watch などの 0-100)" en="SLEEP SCORE">
          <NumberInput
            value={score}
            onChange={setScore}
            step={1}
            min={0}
            max={100}
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
          disabled={upsert.isPending || sameTime || oneMissing}
          onClick={save}
        >
          {upsert.isPending ? '保存中…' : '保存'}
        </button>
      </div>
    </BottomSheet>
  )
}
