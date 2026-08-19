import { useState } from 'react'
import { useUpsertDailyLog } from '../../../hooks/useDailyLog'
import type { DailyLog } from '../../../types/db'
import { BottomSheet } from '../../ui/BottomSheet'

interface Props {
  date: string
  current: DailyLog | null
  onClose: () => void
}

export function DiarySheet({ date, current, onClose }: Props) {
  const [text, setText] = useState(current?.diary ?? '')
  const upsert = useUpsertDailyLog(date)

  return (
    <BottomSheet title="日記" en="DIARY" onClose={onClose}>
      <div className="flex flex-col gap-4">
        <textarea
          className="input min-h-48 leading-relaxed"
          placeholder="今日あったこと、気づいたこと"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
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
            upsert.mutate({ diary: text.trim() || null }, { onSuccess: onClose })
          }
        >
          {upsert.isPending ? '保存中…' : '保存'}
        </button>
      </div>
    </BottomSheet>
  )
}
