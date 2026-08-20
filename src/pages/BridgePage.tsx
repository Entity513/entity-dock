import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { RecentStrip } from '../components/daily/RecentStrip'
import { SettingsSheet } from '../components/daily/SettingsSheet'
import { TodayHero, TodaySummary } from '../components/daily/TodaySummary'
import { useDaySheets } from '../components/daily/useDaySheets'
import { AnalysisBlock } from '../components/dashboard/AnalysisBlock'
import { TrendPanel } from '../components/dashboard/TrendPanel'
import { MonthCalendar } from '../components/log/MonthCalendar'
import { Card } from '../components/ui/Card'
import { Reveal } from '../components/ui/Reveal'
import { useDailyLog } from '../hooks/useDailyLog'
import { useMeals } from '../hooks/useMeals'
import { useMonthData } from '../hooks/useMonthData'
import { useRangeData } from '../hooks/useRangeData'
import { useSettings } from '../hooks/useSettings'
import { useWorkouts } from '../hooks/useWorkouts'
import { addMonths, formatDateJa, monthOf, todayStr } from '../lib/date'
import { totalMacros } from '../lib/nutrition'

const CONDITION_SCALE = {
  domain: [1, 10] as [number, number],
  ticks: [2, 4, 6, 8, 10],
}
const oneDecimal = (v: number) => v.toFixed(1)
const score = (v: number) => (Number.isInteger(v) ? String(v) : v.toFixed(1))

/** まとめ（母艦）。今日の状態が一目で分かることを最優先にする */
export function BridgePage() {
  const [date, setDate] = useState(todayStr())
  const [days, setDays] = useState(30)
  const [ym, setYm] = useState(() => monthOf(todayStr()))
  const [settingsOpen, setSettingsOpen] = useState(false)
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
  const settingsQ = useSettings()
  // AnalysisBlock と同じキーなので、リクエストは1回に束ねられる
  const range = useRangeData(days).data

  const log = dailyQ.data ?? null
  const meals = mealsQ.data ?? []
  const workouts = workoutsQ.data ?? []
  const macros = totalMacros(meals)
  const { openDaily, sheets } = useDaySheets(date, log)

  const dayLoading = dailyQ.isLoading || mealsQ.isLoading || workoutsQ.isLoading
  const dayFatal =
    dailyQ.isLoadingError || mealsQ.isLoadingError || workoutsQ.isLoadingError

  // 体重の差分は「直近7日の移動平均」と比べる。前日比だと水分で振れる
  const weightBaseline =
    range?.weight?.[range.weight.length - 1]?.ma ?? null

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-baseline justify-between px-1">
        <div>
          <span className="microlabel">BRIDGE</span>
          <h1 className="text-base font-bold">{formatDateJa(date)}</h1>
        </div>
        <button
          type="button"
          className="microlabel"
          onClick={() => setSettingsOpen(true)}
        >
          TARGETS
        </button>
      </div>

      {dayFatal ? (
        <Card>
          <div className="flex flex-col items-center gap-3 px-4 py-6">
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
        </Card>
      ) : dayLoading ? (
        <div className="panel h-64 animate-pulse" />
      ) : (
        <>
          <Reveal index={0}>
            <div className="pt-1 pb-2">
              <TodayHero
                log={log}
                macros={macros}
                onOpenWeight={() => openDaily('weight')}
              />
            </div>
          </Reveal>

          <Reveal index={1}>
            <TodaySummary
              log={log}
              meals={meals}
              workouts={workouts}
              settings={settingsQ.data ?? null}
              weightBaseline={weightBaseline}
              streak={range?.summary.streak}
              onOpenDaily={openDaily}
              onGoTab={(path) => void navigate(path)}
            />
          </Reveal>
        </>
      )}

      {range && (
        <Reveal index={2}>
          <Card
            en="LAST 14 DAYS"
            ja="直近2週間"
            right={
              <span className="t-sub">
                <span className="num text-ink">{range.summary.loggedDays}</span>
                日 / {range.summary.rangeDays}日
              </span>
            }
          >
            <div className="px-3 pb-3">
              <RecentStrip
                condition={range.condition}
                onSelectDay={(d) => void navigate(`/log/${d}`)}
              />
            </div>
          </Card>
        </Reveal>
      )}

      <Reveal index={3}>
        <MonthCalendar
          ym={ym}
          data={monthQ.data}
          onPrevMonth={() => setYm(addMonths(ym, -1))}
          onNextMonth={() => setYm(addMonths(ym, 1))}
          onSelectDay={(d) => void navigate(`/log/${d}`)}
        />
      </Reveal>

      <AnalysisBlock days={days} onDaysChange={setDays} skeletonCount={2}>
        {(data) => (
          <>
            <Reveal index={0}>
              <TrendPanel
                en="WEIGHT"
                ja="体重推移"
                data={data.weight}
                yStep={0.5}
                format={oneDecimal}
                unit="kg"
              />
            </Reveal>
            <Reveal index={1}>
              <TrendPanel
                en="CONDITION"
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

      {settingsOpen && <SettingsSheet onClose={() => setSettingsOpen(false)} />}
      {sheets}
    </div>
  )
}
