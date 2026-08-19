import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MonthCalendar } from '../components/log/MonthCalendar'
import { useMonthData } from '../hooks/useMonthData'
import { addMonths, monthOf, todayStr } from '../lib/date'

export function LogPage() {
  const [ym, setYm] = useState(() => monthOf(todayStr()))
  // 初回読込の失敗だけを致命扱いにする（バックグラウンド再取得の失敗で
  // キャッシュ済みカレンダーを消さない）
  const { data, isLoadingError, refetch } = useMonthData(ym)
  const navigate = useNavigate()

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-end justify-between px-1">
        <div>
          <div className="microlabel">LOG</div>
          <h1 className="text-lg font-bold">記録カレンダー</h1>
        </div>
        {ym !== monthOf(todayStr()) && (
          <button
            type="button"
            className="text-xs text-accent"
            onClick={() => setYm(monthOf(todayStr()))}
          >
            今月へ
          </button>
        )}
      </div>

      {isLoadingError ? (
        <div className="panel flex flex-col items-center gap-3 p-6">
          <p className="text-sm text-alert">データの取得に失敗しました。</p>
          <button
            type="button"
            className="btn-ghost"
            onClick={() => void refetch()}
          >
            再読み込み
          </button>
        </div>
      ) : (
        <MonthCalendar
          ym={ym}
          data={data}
          onPrevMonth={() => setYm(addMonths(ym, -1))}
          onNextMonth={() => setYm(addMonths(ym, 1))}
          onSelectDay={(date) => void navigate(`/log/${date}`)}
        />
      )}
    </div>
  )
}
