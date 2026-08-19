import { useState } from 'react'
import { TodayCard } from '../components/daily/TodayCard'
import { useDaySheets } from '../components/daily/useDaySheets'
import { AnalysisBlock } from '../components/dashboard/AnalysisBlock'
import { ScatterPanel } from '../components/dashboard/ScatterPanel'
import { TagConditionPanel } from '../components/dashboard/TagConditionPanel'
import { TrendPanel } from '../components/dashboard/TrendPanel'
import { PageHeader } from '../components/layout/PageHeader'
import { Reveal } from '../components/ui/Reveal'
import { WorkoutSection } from '../components/workouts/WorkoutSection'
import { useDailyLog } from '../hooks/useDailyLog'
import { useWorkouts } from '../hooks/useWorkouts'
import { formatDateJa, todayStr } from '../lib/date'

const integer = (v: number) => Math.round(v).toLocaleString()

/** 運動量。Apple Watch の活動量 + 筋トレ */
export function DrivePage() {
  const date = todayStr()
  const [days, setDays] = useState(30)
  const dailyQ = useDailyLog(date)
  const workoutsQ = useWorkouts(date)
  const log = dailyQ.data ?? null
  const { openDaily, openWorkout, sheets } = useDaySheets(date, log)

  return (
    <div className="flex flex-col gap-3">
      <PageHeader
        en="DRIVE"
        ja="運動量"
        right={<span className="num text-xs text-ink-dim">{formatDateJa(date)}</span>}
      />

      <Reveal index={0}>
        <TodayCard
          en="TODAY"
          ja="今日の活動"
          actionLabel={log?.steps != null ? '編集' : '＋ 記録'}
          onAction={() => openDaily('activity')}
          metrics={[
            { en: 'STEPS', ja: '歩数', value: log?.steps ?? null, format: integer },
            {
              en: 'ACTIVE',
              ja: 'アクティブ',
              value: log?.active_kcal ?? null,
              unit: 'kcal',
              format: integer,
            },
            {
              en: 'EXERCISE',
              ja: 'エクササイズ',
              value: log?.exercise_min ?? null,
              unit: '分',
              format: integer,
            },
            {
              en: 'STAND',
              ja: 'スタンド',
              value: log?.stand_hours ?? null,
              unit: 'h',
              format: integer,
            },
          ]}
        />
      </Reveal>

      <Reveal index={1}>
        <WorkoutSection
          workouts={workoutsQ.data ?? []}
          onEdit={(w) => openWorkout(w)}
          onAdd={() => openWorkout(null)}
        />
      </Reveal>

      <AnalysisBlock days={days} onDaysChange={setDays} skeletonCount={3}>
        {(data) => (
          <>
            <Reveal index={0}>
              <TrendPanel
                en="STEPS TREND"
                ja="歩数推移"
                data={data.steps}
                yStep={1000}
                format={integer}
                unit="歩"
              />
            </Reveal>
            <Reveal index={1}>
              <TrendPanel
                en="ACTIVE TREND"
                ja="アクティブカロリー推移"
                data={data.activeKcal}
                yStep={100}
                format={integer}
                unit="kcal"
              />
            </Reveal>
            <Reveal index={2}>
              <TrendPanel
                en="EXERCISE TREND"
                ja="エクササイズ推移"
                data={data.exerciseMin}
                yStep={10}
                format={integer}
                unit="分"
              />
            </Reveal>
            <Reveal index={3}>
              <ScatterPanel
                en="STEPS × COND"
                ja="歩数 × コンディション"
                points={data.stepsVsCondition}
                xName="歩数"
                xStep={2000}
                formatX={(v) => integer(v)}
              />
            </Reveal>
            <Reveal index={4}>
              <TagConditionPanel
                stats={data.workoutTagDays}
                en="BODY PARTS"
                ja="部位別の実施日数"
                unit="日"
                emptyMessage="筋トレのタグがまだありません。"
              />
            </Reveal>
          </>
        )}
      </AnalysisBlock>

      {sheets}
    </div>
  )
}
