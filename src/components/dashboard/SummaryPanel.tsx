import type { RangeSummary } from '../../hooks/useRangeData'
import { DashboardPanel } from './DashboardPanel'

interface CellProps {
  en: string
  ja: string
  value: string | null
  unit?: string
}

function Cell({ en, ja, value, unit }: CellProps) {
  return (
    <div className="flex flex-col items-start gap-0.5 px-2 py-2">
      <span className="microlabel">{en}</span>
      <span className="flex items-baseline gap-0.5">
        <span
          className={`num text-lg font-semibold ${value != null ? 'text-ink' : 'text-ink-dim/50'}`}
        >
          {value ?? '--'}
        </span>
        {unit && value != null && (
          <span className="num text-[10px] text-ink-dim">{unit}</span>
        )}
      </span>
      <span className="text-[10px] leading-tight text-ink-dim">{ja}</span>
    </div>
  )
}

/** 小数時間 7.4 → '7h24m' */
function formatHours(hours: number): string {
  const totalMin = Math.round(hours * 60)
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  return `${h}h${String(m).padStart(2, '0')}m`
}

export function SummaryPanel({ summary }: { summary: RangeSummary }) {
  return (
    <DashboardPanel en="SUMMARY" ja="サマリー">
      <div className="grid grid-cols-4 divide-x divide-line">
        <Cell
          en="COND"
          ja="平均体調"
          value={
            summary.avgCondition != null ? String(summary.avgCondition) : null
          }
          unit="/10"
        />
        <Cell
          en="SLEEP"
          ja="平均睡眠"
          value={
            summary.avgSleepHours != null
              ? formatHours(summary.avgSleepHours)
              : null
          }
        />
        <Cell
          en="WEIGHT"
          ja="平均体重"
          value={
            summary.avgWeight != null ? summary.avgWeight.toFixed(1) : null
          }
          unit="kg"
        />
        <Cell
          en="DAYS"
          ja="記録日数"
          value={String(summary.loggedDays)}
          unit={`/${summary.rangeDays}`}
        />
      </div>
    </DashboardPanel>
  )
}
