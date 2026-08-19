import { AnimatedNumber } from '../ui/AnimatedNumber'

export interface TodayMetric {
  en: string
  ja: string
  /** 数値ならカウントアップする。文字列（7h30m など）はそのまま出す */
  value: number | string | null
  unit?: string
  format?: (v: number) => string
}

interface Props {
  en: string
  ja: string
  metrics: TodayMetric[]
  actionLabel: string
  onAction: () => void
}

/** 各系統タブの先頭に置く「今日の値 + 記録する」カード */
export function TodayCard({ en, ja, metrics, actionLabel, onAction }: Props) {
  return (
    <section className="panel">
      <header className="flex items-center justify-between border-b border-line px-3 py-2">
        <div className="flex items-baseline gap-2">
          <span className="microlabel">{en}</span>
          <span className="text-xs text-ink-dim">{ja}</span>
        </div>
        <button type="button" className="text-xs text-accent" onClick={onAction}>
          {actionLabel}
        </button>
      </header>

      <div
        className="grid divide-x divide-line"
        style={{ gridTemplateColumns: `repeat(${metrics.length}, minmax(0, 1fr))` }}
      >
        {metrics.map((m) => (
          <button
            key={m.en}
            type="button"
            className="flex flex-col items-start gap-0.5 px-2.5 py-2.5 text-left"
            onClick={onAction}
          >
            <span className="microlabel">{m.en}</span>
            <span className="flex items-baseline gap-0.5">
              <span
                className={`num text-xl font-semibold ${
                  m.value != null ? 'text-ink' : 'text-ink-dim/50'
                }`}
              >
                {typeof m.value === 'number' ? (
                  <AnimatedNumber value={m.value} format={m.format} />
                ) : (
                  (m.value ?? '--')
                )}
              </span>
              {m.unit && m.value != null && (
                <span className="num text-[10px] text-ink-dim">{m.unit}</span>
              )}
            </span>
            <span className="text-[10px] leading-tight text-ink-dim">{m.ja}</span>
          </button>
        ))}
      </div>
    </section>
  )
}
