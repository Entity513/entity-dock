import type { ReactNode } from 'react'
import { parseDateStr } from '../../lib/date'

/** Recharts をコックピットの配色に合わせる。値は index.css の @theme と同じ */
export const CHART = {
  grid: '#1f2a35',
  tick: '#6b7d8f',
  raw: '#3ef58f', // --color-accent: 実測
  ma: '#8ea4b6', // 実測より一段沈めた移動平均（破線と併用）
  point: '#4cc3ff', // --color-data: 散布図
  cursor: '#33465a',
  cursorFill: '#161e27', // --color-panel2
} as const

export const AXIS_TICK = {
  fill: CHART.tick,
  fontSize: 10,
  fontFamily: 'var(--font-mono)',
} as const

export const AXIS_LINE = { stroke: CHART.grid } as const

/** 'YYYY-MM-DD' → '8/19'（軸ラベル用） */
export function shortDate(dateStr: string): string {
  const d = parseDateStr(dateStr)
  return `${d.getMonth() + 1}/${d.getDate()}`
}

/** 端を含む等間隔の目盛り。日数が変わっても本数を一定に保つ */
export function pickTicks(dates: string[], count = 4): string[] {
  if (dates.length <= count) return dates
  const step = (dates.length - 1) / (count - 1)
  return Array.from({ length: count }, (_, i) => dates[Math.round(i * step)])
}

/**
 * step の倍数に丸めた軸レンジと目盛り。Recharts の自動目盛りは
 * 70.3 / 6.7h のような半端な値を出すので自前で刻む。
 */
export function niceScale(
  values: number[],
  step: number,
  maxTicks = 5,
): { domain: [number, number]; ticks: number[] } {
  if (values.length === 0) return { domain: [0, step], ticks: [0, step] }
  const lo = Math.floor(Math.min(...values) / step) * step
  const hi = Math.ceil(Math.max(...values) / step) * step
  const domain: [number, number] = lo === hi ? [lo - step, hi + step] : [lo, hi]
  let tickStep = step
  while ((domain[1] - domain[0]) / tickStep > maxTicks - 1) tickStep += step
  const ticks: number[] = []
  for (
    let v = Math.ceil(domain[0] / tickStep) * tickStep;
    v <= domain[1] + 1e-9;
    v += tickStep
  ) {
    ticks.push(Math.round(v * 1000) / 1000)
  }
  return { domain, ticks }
}

export function TooltipShell({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) {
  return (
    <div className="border border-line bg-panel px-2 py-1.5">
      <div className="microlabel whitespace-nowrap">{title}</div>
      <div className="mt-0.5 flex flex-col gap-0.5">{children}</div>
    </div>
  )
}

export function TooltipRow({
  color,
  label,
  value,
}: {
  color?: string
  label: string
  value: string
}) {
  return (
    <div className="flex items-baseline gap-3 text-[11px] whitespace-nowrap">
      <span className="flex items-center gap-1 text-ink-dim">
        {color && (
          <span
            className="inline-block h-[3px] w-2.5"
            style={{ backgroundColor: color }}
          />
        )}
        {label}
      </span>
      <span className="num ml-auto text-ink">{value}</span>
    </div>
  )
}

interface LegendItem {
  color: string
  label: string
  dashed?: boolean
}

/** Recharts の <Legend> は使わず、パネルヘッダーに寄せる */
export function SeriesLegend({ items }: { items: LegendItem[] }) {
  return (
    <div className="flex items-center gap-2.5">
      {items.map((item) => (
        <span
          key={item.label}
          className="flex items-center gap-1 text-[10px] text-ink-dim"
        >
          <span
            className="h-[3px] w-3"
            style={
              item.dashed
                ? {
                    backgroundImage: `repeating-linear-gradient(90deg, ${item.color} 0 4px, transparent 4px 7px)`,
                  }
                : { backgroundColor: item.color }
            }
          />
          {item.label}
        </span>
      ))}
    </div>
  )
}
