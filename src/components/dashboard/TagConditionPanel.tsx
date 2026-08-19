import type { SVGProps } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipContentProps,
} from 'recharts'
import type { TagStat } from '../../hooks/useRangeData'
import {
  AXIS_LINE,
  AXIS_TICK,
  CHART,
  TooltipRow,
  TooltipShell,
} from './chartTheme'
import { DashboardPanel, PanelEmpty } from './DashboardPanel'

const ROW_HEIGHT = 28
const LABEL_WIDTH = 120
const MAX_TAG_CHARS = 6

const truncate = (tag: string) =>
  tag.length > MAX_TAG_CHARS ? `${tag.slice(0, MAX_TAG_CHARS - 1)}…` : tag

interface TickProps {
  x?: number
  y?: number
  textAnchor?: SVGProps<SVGTextElement>['textAnchor']
  payload?: { value?: string | number }
}

/** 既定の tick は width で折り返してしまうので、1行で描く */
function TagTick({ x, y, textAnchor, payload }: TickProps) {
  return (
    <text
      x={x}
      y={y}
      dy={3.5}
      textAnchor={textAnchor}
      fill={CHART.tick}
      fontSize={10}
    >
      {payload?.value}
    </text>
  )
}

interface Props {
  stats: TagStat[]
  en?: string
  ja?: string
  /** 棒の値の単位。省略時はコンディション (0-10 固定軸) として扱う */
  unit?: string
  emptyMessage?: string
}

export function TagConditionPanel({
  stats,
  en = 'MEAL TAGS',
  ja = '食事タグ別の平均コンディション',
  unit,
  emptyMessage = '2日以上ついた食事タグがまだありません。',
}: Props) {
  // コンディション以外（部位別の日数など）は軸を実データに合わせる
  const isScore = unit == null
  const maxValue = Math.max(1, ...stats.map((s) => s.avg))
  const rows = stats.map((s) => ({
    ...s,
    label: isScore ? `${truncate(s.tag)} (${s.days}日)` : truncate(s.tag),
  }))

  const tooltip = ({ active, payload }: TooltipContentProps) => {
    if (!active || !payload?.length) return null
    const row = payload[0].payload as (typeof rows)[number]
    return (
      <TooltipShell title={row.tag}>
        {isScore ? (
          <>
            <TooltipRow
              label="平均コンディション"
              value={`${row.avg.toFixed(1)}/10`}
            />
            <TooltipRow label="日数" value={`${row.days}日`} />
          </>
        ) : (
          <TooltipRow label="実施日数" value={`${row.days}${unit}`} />
        )}
      </TooltipShell>
    )
  }

  return (
    <DashboardPanel en={en} ja={ja}>
      {rows.length === 0 ? (
        <PanelEmpty message={emptyMessage} />
      ) : (
        <div className="py-2 pr-1">
          <ResponsiveContainer
            width="100%"
            height={rows.length * ROW_HEIGHT + 28}
          >
            <BarChart
              layout="vertical"
              data={rows}
              margin={{ top: 0, right: 26, bottom: 0, left: 0 }}
              barCategoryGap="24%"
            >
              <CartesianGrid
                stroke={CHART.grid}
                strokeDasharray="2 4"
                horizontal={false}
              />
              <XAxis
                type="number"
                domain={isScore ? [0, 10] : [0, Math.ceil(maxValue)]}
                ticks={isScore ? [0, 2, 4, 6, 8, 10] : undefined}
                allowDecimals={false}
                tick={AXIS_TICK}
                tickLine={false}
                tickMargin={4}
                axisLine={AXIS_LINE}
                height={22}
              />
              <YAxis
                type="category"
                dataKey="label"
                width={LABEL_WIDTH}
                tick={<TagTick />}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip content={tooltip} cursor={{ fill: CHART.cursorFill }} />
              <Bar
                dataKey="avg"
                fill={CHART.raw}
                fillOpacity={0.75}
                barSize={12}
                radius={[0, 2, 2, 0]}
                animationDuration={520}
                animationEasing="ease-out"
              >
                <LabelList
                  dataKey="avg"
                  position="right"
                  offset={6}
                  fill={CHART.tick}
                  fontSize={10}
                  fontFamily="var(--font-mono)"
                  formatter={(value) =>
                    typeof value !== 'number'
                      ? value
                      : isScore
                        ? value.toFixed(1)
                        : String(value)
                  }
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </DashboardPanel>
  )
}
