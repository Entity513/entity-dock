import type { TrendPoint } from '../../hooks/useRangeData'
import { parseDateStr, todayStr } from '../../lib/date'

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'] as const
const SHOWN_DAYS = 14

interface Props {
  /** コンディションの系列。末尾が今日 */
  condition: TrendPoint[]
  /** 記録があった日（コンディション未入力でも記録扱いにする） */
  recordedDates?: Set<string>
  onSelectDay: (date: string) => void
}

/**
 * 直近14日の積み上がり。
 * 数字を読む場所ではなく「続いている形」を見る場所なので、
 * 高さと明度だけで表す。空いた日は罫線色の低い棒にして、
 * 穴ではなく地面に見せる（欠けが咎めに見えないように）。
 */
export function RecentStrip({
  condition,
  recordedDates,
  onSelectDay,
}: Props) {
  const days = condition.slice(-SHOWN_DAYS)
  if (days.length === 0) return null

  const today = todayStr()

  return (
    <div className="flex items-end gap-1 px-1">
      {days.map((point) => {
        const score = point.value
        const recorded = score != null || recordedDates?.has(point.date)
        // 1-10 を 22%-100% の高さに写す。1でも棒が見える下限を作る
        const heightPct = score != null ? 16 + (score / 10) * 84 : 10
        const isToday = point.date === today
        const weekday = WEEKDAYS[parseDateStr(point.date).getDay()]

        return (
          <button
            key={point.date}
            type="button"
            aria-label={`${point.date}${score != null ? ` コンディション${score}` : ''}`}
            className="group flex flex-1 flex-col items-center gap-1"
            onClick={() => onSelectDay(point.date)}
          >
            <span className="flex h-12 w-full items-end justify-center">
              <span
                className={`w-full rounded-[2px] transition-[height,background-color] duration-500 ease-out ${
                  score != null
                    ? 'bg-accent'
                    : recorded
                      ? 'bg-accent/25'
                      : 'bg-line/70'
                }`}
                style={{
                  height: `${heightPct}%`,
                  // 高いスコアほど濃く。全部同じ緑だと積み上がりが読めない
                  opacity: score != null ? 0.3 + (score / 10) * 0.5 : 1,
                }}
              />
            </span>
            <span
              className={`num text-[9px] ${
                isToday ? 'text-accent' : 'text-ink-dim/50'
              }`}
            >
              {weekday}
            </span>
          </button>
        )
      })}
    </div>
  )
}
