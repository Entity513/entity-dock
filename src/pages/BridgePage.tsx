import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { DailyStatusBoard } from '../components/daily/DailyStatusBoard'
import { useDaySheets } from '../components/daily/useDaySheets'
import { AnalysisBlock } from '../components/dashboard/AnalysisBlock'
import { SummaryPanel } from '../components/dashboard/SummaryPanel'
import { TrendPanel } from '../components/dashboard/TrendPanel'
import { PageHeader } from '../components/layout/PageHeader'
import { MonthCalendar } from '../components/log/MonthCalendar'
import { Reveal } from '../components/ui/Reveal'
import { useDailyLog } from '../hooks/useDailyLog'
import { useMeals } from '../hooks/useMeals'
import { useMonthData } from '../hooks/useMonthData'
import { useRangeData } from '../hooks/useRangeData'
import { useWorkouts } from '../hooks/useWorkouts'
import { addMonths, formatDateJa, monthOf, todayStr } from '../lib/date'

const CONDITION_SCALE = {
  domain: [1, 10] as [number, number],
  ticks: [2, 4, 6, 8, 10],
}
const oneDecimal = (v: number) => v.toFixed(1)
const score = (v: number) => (Number.isInteger(v) ? String(v) : v.toFixed(1))

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

/** まとめ（母艦）。今日の全体状況・カレンダー・主要な推移 */
export function BridgePage() {
  const [date, setDate] = useState(todayStr())
  const [days, setDays] = useState(30)
  const [ym, setYm] = useState(() => monthOf(todayStr()))
  const navigate = useNavigate()

  // 深夜0時をまたいだら「今日」を切り替える
  useEffect(() => {
    const id = setInterval(() => {
      const t = todayStr()
      setDate((prev) => (prev === t ? prev : t))
    }, 30_000)
    return () => clearInterval(id)
  }, [])

  const dailyQ = useDailyLog(date)
  const mealsQ = useMeals(date)
  const workoutsQ = useWorkouts(date)
  const monthQ = useMonthData(ym)

  const log = dailyQ.data ?? null
  const { openDaily, sheets } = useDaySheets(date, log)
  // AnalysisBlock と同じキーなので、リクエストは1回に束ねられる
  const streak = useRangeData(days).data?.summary.streak

  const dayLoading =
    dailyQ.isLoading || mealsQ.isLoading || workoutsQ.isLoading
  const dayFatal =
    dailyQ.isLoadingError || mealsQ.isLoadingError || workoutsQ.isLoadingError

  return (
    <div className="flex flex-col gap-3">
      <PageHeader en="BRIDGE" ja={formatDateJa(date)} right={<Clock />} />

      {dayFatal ? (
        <div className="panel flex flex-col items-center gap-3 p-6">
          <p className="text-sm text-alert">データの取得に失敗しました。</p>
          <button
            type="button"
            className="btn-ghost"
            onClick={() => {
              void dailyQ.refetch()
              void mealsQ.refetch()
              void workoutsQ.refetch()
            }}
          >
            再読み込み
          </button>
        </div>
      ) : dayLoading ? (
        <div className="panel h-48 animate-pulse" />
      ) : (
        <Reveal index={0}>
          <DailyStatusBoard
            log={log}
            meals={mealsQ.data ?? []}
            workouts={workoutsQ.data ?? []}
            streak={streak}
            onOpenDaily={openDaily}
            onGoTab={(path) => void navigate(path)}
          />
        </Reveal>
      )}

      <Reveal index={2}>
        <MonthCalendar
          ym={ym}
          data={monthQ.data}
          onPrevMonth={() => setYm(addMonths(ym, -1))}
          onNextMonth={() => setYm(addMonths(ym, 1))}
          onSelectDay={(d) => void navigate(`/log/${d}`)}
        />
      </Reveal>

      <AnalysisBlock days={days} onDaysChange={setDays} skeletonCount={3}>
        {(data) => (
          <>
            <Reveal index={0}>
              <SummaryPanel summary={data.summary} />
            </Reveal>
            <Reveal index={1}>
              <TrendPanel
                en="WEIGHT TREND"
                ja="体重推移"
                data={data.weight}
                yStep={0.5}
                format={oneDecimal}
                unit="kg"
              />
            </Reveal>
            <Reveal index={2}>
              <TrendPanel
                en="CONDITION TREND"
                ja="コンディション推移"
                data={data.condition}
                yStep={1}
                yFixed={CONDITION_SCALE}
                format={score}
                unit="/10"
              />
            </Reveal>
          </>
        )}
      </AnalysisBlock>

      {sheets}
    </div>
  )
}
