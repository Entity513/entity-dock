import { useEffect, useState } from 'react'
import { DayView } from '../components/daily/DayView'
import { formatDateJa, todayStr } from '../lib/date'

/** ヘッダーの時計だけを1秒ごとに再描画する */
function Clock() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])
  const pad = (n: number) => String(n).padStart(2, '0')
  return (
    <span className="num text-2xl font-semibold text-accent">
      {pad(now.getHours())}:{pad(now.getMinutes())}
      <span className="text-base text-accent/60">:{pad(now.getSeconds())}</span>
    </span>
  )
}

export function TodayPage() {
  const [date, setDate] = useState(todayStr())

  // 深夜0時をまたいだら「今日」を切り替える
  useEffect(() => {
    const id = setInterval(() => {
      const t = todayStr()
      setDate((prev) => (prev === t ? prev : t))
    }, 30_000)
    return () => clearInterval(id)
  }, [])

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-end justify-between px-1">
        <div>
          <div className="microlabel">TODAY</div>
          <h1 className="text-lg font-bold">{formatDateJa(date)}</h1>
        </div>
        <Clock />
      </div>
      <DayView date={date} />
    </div>
  )
}
