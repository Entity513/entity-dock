import { useState } from 'react'
import { TodayCard } from '../components/daily/TodayCard'
import { useDaySheets } from '../components/daily/useDaySheets'
import { AnalysisBlock } from '../components/dashboard/AnalysisBlock'
import { ScatterPanel } from '../components/dashboard/ScatterPanel'
import { TrendPanel } from '../components/dashboard/TrendPanel'
import { PageHeader } from '../components/layout/PageHeader'
import { Reveal } from '../components/ui/Reveal'
import { useDailyLog } from '../hooks/useDailyLog'
import { formatDateJa, formatHM, sleepDurationLabel, todayStr } from '../lib/date'

const oneDecimal = (v: number) => v.toFixed(1)
const integer = (v: number) => String(Math.round(v))

/** 睡眠。就寝・起床・スコアと、コンディションとの相関 */
export function RestPage() {
  const date = todayStr()
  const [days, setDays] = useState(30)
  const dailyQ = useDailyLog(date)
  const log = dailyQ.data ?? null
  const { openDaily, sheets } = useDaySheets(date, log)

  const hasSleep = !!(log?.sleep_start && log.sleep_end)

  return (
    <div className="flex flex-col gap-3">
      <PageHeader
        en="REST"
        ja="睡眠"
        right={<span className="num text-xs text-ink-dim">{formatDateJa(date)}</span>}
      />

      <Reveal index={0}>
        <TodayCard
          en="LAST NIGHT"
          ja="昨夜の睡眠"
          actionLabel={hasSleep ? '編集' : '＋ 記録'}
          onAction={() => openDaily('sleep')}
          metrics={[
            {
              en: 'DURATION',
              ja: '睡眠時間',
              value:
                log?.sleep_start && log.sleep_end
                  ? sleepDurationLabel(log.sleep_start, log.sleep_end)
                  : null,
            },
            {
              en: 'BED',
              ja: '就寝',
              value: log?.sleep_start ? formatHM(log.sleep_start) : null,
            },
            {
              en: 'WAKE',
              ja: '起床',
              value: log?.sleep_end ? formatHM(log.sleep_end) : null,
            },
            {
              en: 'SCORE',
              ja: 'スコア',
              value: log?.sleep_score ?? null,
              unit: '/100',
              format: integer,
            },
          ]}
        />
      </Reveal>

      <AnalysisBlock days={days} onDaysChange={setDays} skeletonCount={3}>
        {(data) => (
          <>
            <Reveal index={0}>
              <TrendPanel
                en="SLEEP TREND"
                ja="睡眠時間推移"
                data={data.sleep}
                yStep={0.5}
                format={oneDecimal}
                unit="h"
              />
            </Reveal>
            <Reveal index={1}>
              <TrendPanel
                en="SLEEP SCORE"
                ja="睡眠スコア推移"
                data={data.sleepScore}
                yStep={10}
                format={integer}
                unit="/100"
              />
            </Reveal>
            <Reveal index={2}>
              <ScatterPanel
                en="SLEEP × COND"
                ja="睡眠時間 × コンディション"
                points={data.sleepVsCondition}
                xName="睡眠時間"
                xStep={0.5}
                formatX={(v) => `${oneDecimal(v)}h`}
              />
            </Reveal>
          </>
        )}
      </AnalysisBlock>

      {sheets}
    </div>
  )
}
