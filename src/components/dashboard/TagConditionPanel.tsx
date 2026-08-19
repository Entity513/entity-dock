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

export function TagConditionPanel({ stats }: { stats: TagStat[] }) {
  const rows = stats.map((s) => ({
    ...s,
    label: `${truncate(s.tag)} (${s.days}日)`,
  }))

  const tooltip = ({ active, payload }: TooltipContentProps) => {
    if (!active || !payload?.length) return null
    const row = payload[0].payload as (typeof rows)[number]
    return (
      <TooltipShell title={row.tag}>
        <TooltipRow
          label="平均コンディション"
          value={`${row.avg.toFixed(1)}/10`}
        />
        <TooltipRow label="日数" value={`${row.days}日`} />
      </TooltipShell>
    )
  }

  return (
    <DashboardPanel en="MEAL TAGS" ja="食事タグ別の平均コンディション">
      {rows.length === 0 ? (
        <PanelEmpty message="2日以上ついた食事タグがまだありません。" />
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
                domain={[0, 10]}
                ticks={[0, 2, 4, 6, 8, 10]}
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
                isAnimationActive={false}
              >
                <LabelList
                  dataKey="avg"
                  position="right"
                  offset={6}
                  fill={CHART.tick}
                  fontSize={10}
                  fontFamily="var(--font-mono)"
                  formatter={(value) =>
                    typeof value === 'number' ? value.toFixed(1) : value
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
