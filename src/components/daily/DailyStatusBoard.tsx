import { sleepDurationLabel } from '../../lib/date'
import type { DailyLog, Meal, Workout } from '../../types/db'

export type DailySheetId = 'weight' | 'sleep' | 'mind' | 'activity' | 'diary'

interface Row {
  ja: string
  en: string
  /** 記録済みなら表示する値。null なら未記録 */
  value: string | null
  onClick: () => void
}

interface Props {
  log: DailyLog | null
  meals: Meal[]
  workouts: Workout[]
  streak?: number
  onOpenDaily: (id: DailySheetId) => void
  /** 複数項目をまとめた行は、その系統のタブへ送る */
  onGoTab: (path: string) => void
}

/**
 * 今日の記録状況。
 * 未記録を警告色で塗らないこと（12個の「未入力」が並ぶと、
 * 記録がない日ほど画面が咎めてくる作りになり、続かなくなる）。
 * 空欄は静かに引っ込め、できている項目だけを光らせる。
 */
export function DailyStatusBoard({
  log,
  meals,
  workouts,
  streak,
  onOpenDaily,
  onGoTab,
}: Props) {
  const activity = [
    log?.steps != null ? `${log.steps.toLocaleString()}歩` : null,
    workouts.length > 0 ? `筋トレ${workouts.length}件` : null,
  ].filter(Boolean)

  const mind = [
    log?.condition_score != null ? `体調${log.condition_score}` : null,
    log?.mood != null ? `気分${log.mood}` : null,
  ].filter(Boolean)

  const rows: Row[] = [
    {
      ja: '体重',
      en: 'WEIGHT',
      value: log?.weight_kg != null ? `${log.weight_kg} kg` : null,
      onClick: () => onOpenDaily('weight'),
    },
    {
      ja: '睡眠',
      en: 'SLEEP',
      value:
        log?.sleep_start && log.sleep_end
          ? sleepDurationLabel(log.sleep_start, log.sleep_end)
          : null,
      onClick: () => onOpenDaily('sleep'),
    },
    {
      ja: '運動',
      en: 'DRIVE',
      value: activity.length > 0 ? activity.join(' · ') : null,
      onClick: () => onGoTab('/drive'),
    },
    {
      ja: '食事',
      en: 'FUEL',
      value: meals.length > 0 ? `${meals.length}件` : null,
      onClick: () => onGoTab('/fuel'),
    },
    {
      ja: '体調',
      en: 'MIND',
      value: mind.length > 0 ? mind.join(' · ') : null,
      onClick: () => onOpenDaily('mind'),
    },
  ]

  const done = rows.filter((r) => r.value != null).length

  return (
    <section className="panel">
      <header className="flex items-center justify-between border-b border-line px-3 py-2">
        <div className="flex items-baseline gap-2">
          <span className="microlabel">TODAY</span>
          <span className="text-xs text-ink-dim">今日の記録</span>
        </div>
        <div className="flex items-baseline gap-3">
          {streak != null && streak > 0 && (
            <span className="num text-[11px] text-ink-dim">
              連続 <span className="text-accent">{streak}</span>日
            </span>
          )}
          <span className="num text-xs text-ink-dim">
            <span className="text-ink">{done}</span>/{rows.length}
          </span>
        </div>
      </header>

      {/* 進捗バー。満たない部分は罫線色のまま＝咎めない */}
      <div className="flex h-0.5 gap-px bg-line/40">
        {rows.map((r) => (
          <span
            key={r.en}
            className={`h-full flex-1 transition-colors duration-300 ${
              r.value != null ? 'bg-accent' : 'bg-transparent'
            }`}
          />
        ))}
      </div>

      <ul className="divide-y divide-line">
        {rows.map((row) => (
          <li key={row.en}>
            <button
              type="button"
              onClick={row.onClick}
              className="flex w-full items-center justify-between gap-3 px-3 py-3 text-left"
            >
              <span className="flex items-baseline gap-2">
                <span
                  className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                    row.value != null ? 'bg-accent' : 'bg-line'
                  }`}
                />
                <span className="text-sm">{row.ja}</span>
              </span>
              {row.value != null ? (
                <span className="num truncate text-sm font-semibold text-accent">
                  {row.value}
                </span>
              ) : (
                <span className="text-xs text-ink-dim/70">＋ 記録</span>
              )}
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}
