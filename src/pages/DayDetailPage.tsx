import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { DayView } from '../components/daily/DayView'
import { addDays, formatDateJa, isValidDateStr, todayStr } from '../lib/date'

export function DayDetailPage() {
  const { date } = useParams<{ date: string }>()
  const navigate = useNavigate()

  if (!date || !isValidDateStr(date)) {
    return <Navigate to="/log" replace />
  }

  const isToday = date === todayStr()

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between px-1">
        <Link to="/log" className="text-sm text-ink-dim">
          ‹ カレンダー
        </Link>
        {isToday && (
          <span className="rounded-[3px] border border-accent/40 px-1.5 py-0.5 text-[11px] text-accent">
            今日
          </span>
        )}
      </div>

      <div className="flex items-center justify-between px-1">
        <button
          type="button"
          aria-label="前の日"
          className="btn-ghost min-h-9! px-3!"
          onClick={() => void navigate(`/log/${addDays(date, -1)}`)}
        >
          ‹
        </button>
        <h1 className="text-lg font-bold">{formatDateJa(date)}</h1>
        <button
          type="button"
          aria-label="次の日"
          className="btn-ghost min-h-9! px-3!"
          onClick={() => void navigate(`/log/${addDays(date, 1)}`)}
        >
          ›
        </button>
      </div>

      <DayView date={date} />
    </div>
  )
}
