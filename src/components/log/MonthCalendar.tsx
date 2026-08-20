import type { MonthData } from '../../hooks/useMonthData'
import { formatMonthJa, monthGrid, todayStr } from '../../lib/date'

const WEEKDAY_HEADER = ['月', '火', '水', '木', '金', '土', '日']

interface Props {
  ym: string // 'YYYY-MM'
  data: MonthData | undefined
  onPrevMonth: () => void
  onNextMonth: () => void
  onSelectDay: (date: string) => void
}

export function MonthCalendar({
  ym,
  data,
  onPrevMonth,
  onNextMonth,
  onSelectDay,
}: Props) {
  const today = todayStr()
  const weeks = monthGrid(ym)

  return (
    <section className="rounded-[4px] border border-line bg-panel">
      <header className="flex items-center justify-between px-2 pt-2 pb-1">
        <button
          type="button"
          aria-label="前の月"
          className="btn-ghost min-h-9! border-0! px-3!"
          onClick={onPrevMonth}
        >
          ‹
        </button>
        <div className="text-center">
          <div className="microlabel">CALENDAR</div>
          <div className="num text-sm font-semibold">{formatMonthJa(ym)}</div>
        </div>
        <button
          type="button"
          aria-label="次の月"
          className="btn-ghost min-h-9! border-0! px-3!"
          onClick={onNextMonth}
        >
          ›
        </button>
      </header>

      <div className="grid grid-cols-7 border-b border-line/70">
        {WEEKDAY_HEADER.map((w) => (
          <div key={w} className="microlabel py-1 text-center">
            {w}
          </div>
        ))}
      </div>

      <div>
        {weeks.map((week, wi) => (
          <div key={wi} className="grid grid-cols-7">
            {week.map((dateStr, di) =>
              dateStr === null ? (
                <div key={di} className="aspect-square" />
              ) : (
                <DayCell
                  key={dateStr}
                  dateStr={dateStr}
                  isToday={dateStr === today}
                  isFuture={dateStr > today}
                  summary={data?.[dateStr]}
                  onClick={() => onSelectDay(dateStr)}
                />
              ),
            )}
          </div>
        ))}
      </div>

      <footer className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-line/70 px-3 py-2">
        <Legend colorClass="bg-accent" label="食事" />
        <Legend colorClass="bg-data" label="筋トレ" />
        <Legend colorClass="bg-ink-dim" label="日記" />
      </footer>
    </section>
  )
}

function Legend({ colorClass, label }: { colorClass: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5 text-[10px] text-ink-dim/70">
      <span className={`h-1.5 w-1.5 rounded-full ${colorClass}`} />
      {label}
    </span>
  )
}

interface DayCellProps {
  dateStr: string
  isToday: boolean
  isFuture: boolean
  summary: MonthData[string] | undefined
  onClick: () => void
}

function DayCell({ dateStr, isToday, isFuture, summary, onClick }: DayCellProps) {
  const day = Number(dateStr.slice(8))
  // condition_score をセルの淡い色付けに（1-10 → 透明度）
  const tint =
    summary?.conditionScore != null
      ? { backgroundColor: `rgba(62, 245, 143, ${0.02 + (summary.conditionScore / 10) * 0.1})` }
      : undefined

  return (
    <button
      type="button"
      style={tint}
      className={`flex aspect-square flex-col items-center justify-between border-[0.5px] border-line/40 py-1 ${
        isToday ? 'outline outline-1 -outline-offset-1 outline-accent' : ''
      } ${isFuture ? 'opacity-35' : ''}`}
      onClick={onClick}
    >
      <span
        className={`num text-xs ${isToday ? 'font-bold text-accent' : 'text-ink'}`}
      >
        {day}
      </span>
      <span className="flex h-1.5 items-center gap-0.5">
        {summary && summary.mealCount > 0 && (
          <span className="h-1.5 w-1.5 rounded-full bg-accent" />
        )}
        {summary && summary.workoutCount > 0 && (
          <span className="h-1.5 w-1.5 rounded-full bg-data" />
        )}
        {summary?.hasDiary && (
          <span className="h-1.5 w-1.5 rounded-full bg-ink-dim" />
        )}
      </span>
    </button>
  )
}
