import {
  CartesianGrid,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipContentProps,
} from 'recharts'
import type { ScatterPoint } from '../../hooks/useRangeData'
import { formatDateJa } from '../../lib/date'
import {
  AXIS_LINE,
  AXIS_TICK,
  CHART,
  niceScale,
  TooltipRow,
  TooltipShell,
} from './chartTheme'
import { DashboardPanel, PanelEmpty } from './DashboardPanel'

const CHART_HEIGHT = 168
const MIN_POINTS = 3
/** これを超える点数では重なりが潰れるので、点を小さく薄くする */
const DENSE_POINTS = 60
const CONDITION_TICKS = [2, 4, 6, 8, 10]

interface Props {
  en: string
  ja: string
  points: ScatterPoint[]
  xName: string
  /** x 軸の丸め幅。睡眠時間なら 0.5、瞑想なら 5 分 */
  xStep: number
  formatX: (value: number) => string
}

export function ScatterPanel({ en, ja, points, xName, xStep, formatX }: Props) {
  const xScale = niceScale(
    points.map((p) => p.x),
    xStep,
  )
  const dense = points.length > DENSE_POINTS
  // Symbols の size は面積(px²)。ZAxis を置くより shape 直指定のほうが確実
  const dotSize = dense ? 12 : 26

  const tooltip = ({ active, payload }: TooltipContentProps) => {
    if (!active || !payload?.length) return null
    const point = payload[0].payload as ScatterPoint
    return (
      <TooltipShell title={formatDateJa(point.date)}>
        <TooltipRow label={xName} value={formatX(point.x)} />
        <TooltipRow label="コンディション" value={`${point.y}/10`} />
      </TooltipShell>
    )
  }

  return (
    <DashboardPanel
      en={en}
      ja={ja}
      right={
        points.length >= MIN_POINTS ? (
          <span className="num text-[10px] text-ink-dim">
            n={points.length}
          </span>
        ) : undefined
      }
    >
      {points.length < MIN_POINTS ? (
        <PanelEmpty
          message={
            points.length === 0
              ? 'データがまだありません。'
              : '両方そろった日が3日ぶん以上たまると出ます。'
          }
        />
      ) : (
        <>
          <div className="py-2 pr-1">
            <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
              <ScatterChart margin={{ top: 4, right: 12, bottom: 0, left: 0 }}>
                <CartesianGrid stroke={CHART.grid} strokeDasharray="2 4" />
                <XAxis
                  type="number"
                  dataKey="x"
                  domain={xScale.domain}
                  ticks={xScale.ticks}
                  tick={AXIS_TICK}
                  tickLine={false}
                  tickMargin={6}
                  axisLine={AXIS_LINE}
                  tickFormatter={formatX}
                />
                <YAxis
                  type="number"
                  dataKey="y"
                  domain={[1, 10]}
                  ticks={CONDITION_TICKS}
                  width={34}
                  tick={AXIS_TICK}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  content={tooltip}
                  cursor={{ stroke: CHART.cursor, strokeDasharray: '2 3' }}
                />
                <Scatter
                  data={points}
                  shape={{ size: dotSize }}
                  fill={CHART.point}
                  fillOpacity={dense ? 0.35 : 0.55}
                  stroke={CHART.point}
                  strokeOpacity={dense ? 0.55 : 0.9}
                  isAnimationActive={false}
                />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
          <div className="microlabel border-t border-line px-3 py-1.5">
            X = {xName} / Y = コンディション
          </div>
        </>
      )}
    </DashboardPanel>
  )
}
