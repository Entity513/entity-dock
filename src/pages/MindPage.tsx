import { useState } from 'react'
import { TodayCard } from '../components/daily/TodayCard'
import { useDaySheets } from '../components/daily/useDaySheets'
import { AnalysisBlock } from '../components/dashboard/AnalysisBlock'
import { ScatterPanel } from '../components/dashboard/ScatterPanel'
import { TrendPanel } from '../components/dashboard/TrendPanel'
import { PageHeader } from '../components/layout/PageHeader'
import { Reveal } from '../components/ui/Reveal'
import { useDailyLog } from '../hooks/useDailyLog'
import { formatDateJa, todayStr } from '../lib/date'

const CONDITION_SCALE = {
  domain: [1, 10] as [number, number],
  ticks: [2, 4, 6, 8, 10],
}
const integer = (v: number) => String(Math.round(v))
const score = (v: number) => (Number.isInteger(v) ? String(v) : v.toFixed(1))

/** マインドフルネス。瞑想・体調・気分・日記 */
export function MindPage() {
  const date = todayStr()
  const [days, setDays] = useState(30)
  const dailyQ = useDailyLog(date)
  const log = dailyQ.data ?? null
  const { openDaily, sheets } = useDaySheets(date, log)

  return (
    <div className="flex flex-col gap-3">
      <PageHeader
        en="MIND"
        ja="マインドフルネス"
        right={<span className="num text-xs text-ink-dim">{formatDateJa(date)}</span>}
      />

      <Reveal index={0}>
        <TodayCard
          en="TODAY"
          ja="今日の状態"
          actionLabel={log?.condition_score != null ? '編集' : '＋ 記録'}
          onAction={() => openDaily('mind')}
          metrics={[
            {
              en: 'COND',
              ja: '体調',
              value: log?.condition_score ?? null,
              unit: '/10',
              format: integer,
            },
            {
              en: 'MOOD',
              ja: '気分',
              value: log?.mood ?? null,
              unit: '/10',
              format: integer,
            },
            {
              en: 'MEDIT',
              ja: '瞑想',
              value: log?.meditation_min ?? null,
              unit: '分',
              format: integer,
            },
          ]}
        />
      </Reveal>

      <Reveal index={1}>
        <section className="panel">
          <header className="flex items-center justify-between border-b border-line px-3 py-2">
            <div className="flex items-baseline gap-2">
              <span className="microlabel">DIARY</span>
              <span className="text-xs text-ink-dim">日記</span>
            </div>
            <button
              type="button"
              className="text-xs text-accent"
              onClick={() => openDaily('diary')}
            >
              {log?.diary ? '編集' : '＋ 書く'}
            </button>
          </header>
          {log?.diary ? (
            <button
              type="button"
              className="w-full px-3 py-3 text-left"
              onClick={() => openDaily('diary')}
            >
              <p className="text-sm leading-relaxed whitespace-pre-wrap">
                {log.diary}
              </p>
            </button>
          ) : (
            <p className="px-3 py-3 text-sm text-ink-dim">
              まだ書かれていません。
            </p>
          )}
        </section>
      </Reveal>

      <AnalysisBlock days={days} onDaysChange={setDays} skeletonCount={4}>
        {(data) => (
          <>
            <Reveal index={0}>
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
            <Reveal index={1}>
              <TrendPanel
                en="MOOD TREND"
                ja="気分推移"
                data={data.mood}
                yStep={1}
                yFixed={CONDITION_SCALE}
                format={score}
                unit="/10"
              />
            </Reveal>
            <Reveal index={2}>
              <TrendPanel
                en="MEDITATION TREND"
                ja="瞑想時間推移"
                data={data.meditation}
                yStep={5}
                format={integer}
                unit="分"
              />
            </Reveal>
            <Reveal index={3}>
              <ScatterPanel
                en="MEDITATION × COND"
                ja="瞑想 × コンディション"
                points={data.meditationVsCondition}
                xName="瞑想時間"
                xStep={5}
                formatX={(v) => `${Math.round(v)}分`}
              />
            </Reveal>
          </>
        )}
      </AnalysisBlock>

      {sheets}
    </div>
  )
}
