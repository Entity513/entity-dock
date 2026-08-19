import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipContentProps,
} from 'recharts'
import type { TrendPoint } from '../../hooks/useRangeData'
import { formatDateJa } from '../../lib/date'
import {
  AXIS_LINE,
  AXIS_TICK,
  CHART,
  niceScale,
  pickTicks,
  SeriesLegend,
  shortDate,
  TooltipRow,
  TooltipShell,
} from './chartTheme'
import { DashboardPanel, PanelEmpty } from './DashboardPanel'

const CHART_HEIGHT = 150
/** これを超える日数では実測が団子になるので、移動平均を主役にする */
const DENSE_DAYS = 60

interface Props {
  en: string
  ja: string
  data: TrendPoint[]
  /** y 軸の丸め幅。体重なら 0.5kg */
  yStep: number
  /** 意味のある上下限があるとき（コンディションの 1-10）だけ渡す */
  yFixed?: { domain: [number, number]; ticks: number[] }
  /** y 軸の目盛りの書式。ツールチップでは末尾に unit が付く */
  format: (value: number) => string
  unit: string
}

export function TrendPanel({
  en,
  ja,
  data,
  yStep,
  yFixed,
  format,
  unit,
}: Props) {
  const measured = data.filter(
    (p): p is TrendPoint & { value: number } => p.value != null,
  )
  const scale =
    yFixed ??
    niceScale(
      measured.map((p) => p.value),
      yStep,
    )
  const dense = data.length > DENSE_DAYS
  const label = (value: number | null) =>
    value == null ? '--' : `${format(value)}${unit}`

  const tooltip = ({ active, payload, label: date }: TooltipContentProps) => {
    if (!active || !payload?.length) return null
    const point = payload[0].payload as TrendPoint
    return (
      <TooltipShell title={formatDateJa(String(date))}>
        <TooltipRow color={CHART.raw} label="実測" value={label(point.value)} />
        <TooltipRow color={CHART.ma} label="7日平均" value={label(point.ma)} />
      </TooltipShell>
    )
  }

  return (
    <DashboardPanel
      en={en}
      ja={ja}
      right={
        measured.length >= 2 ? (
          <SeriesLegend
            items={[
              { color: CHART.raw, label: '実測' },
              { color: CHART.ma, label: '7日平均', dashed: true },
            ]}
          />
        ) : undefined
      }
    >
      {measured.length < 2 ? (
        <PanelEmpty
          message={
            measured.length === 0
              ? 'データがまだありません。'
              : '記録が2日ぶん以上たまるとグラフが出ます。'
          }
        />
      ) : (
        <div className="py-2 pr-1">
          <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
            <LineChart
              data={data}
              margin={{ top: 4, right: 12, bottom: 0, left: 0 }}
            >
              <CartesianGrid
                stroke={CHART.grid}
                strokeDasharray="2 4"
                vertical={false}
              />
              <XAxis
                dataKey="date"
                ticks={pickTicks(data.map((p) => p.date))}
                interval={0}
                tickFormatter={shortDate}
                tick={AXIS_TICK}
                tickLine={false}
                tickMargin={6}
                axisLine={AXIS_LINE}
              />
              <YAxis
                domain={scale.domain}
                ticks={scale.ticks}
                width={34}
                tick={AXIS_TICK}
                tickLine={false}
                axisLine={false}
                tickFormatter={format}
              />
              <Tooltip
                content={tooltip}
                cursor={{ stroke: CHART.cursor, strokeDasharray: '2 3' }}
              />
              <Line
                type="linear"
                dataKey="value"
                stroke={CHART.raw}
                strokeWidth={dense ? 1 : 1.5}
                strokeOpacity={dense ? 0.4 : 1}
                dot={false}
                activeDot={{ r: 2.5, fill: CHART.raw, stroke: 'none' }}
                connectNulls
                isAnimationActive={false}
              />
              <Line
                type="monotone"
                dataKey="ma"
                stroke={CHART.ma}
                strokeWidth={dense ? 1.75 : 1.5}
                strokeDasharray="4 3"
                dot={false}
                activeDot={false}
                connectNulls={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </DashboardPanel>
  )
}
