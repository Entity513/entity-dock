export const RANGE_OPTIONS = [30, 90, 180] as const

interface Props {
  value: number
  onChange: (days: number) => void
}

export function RangeSelector({ value, onChange }: Props) {
  return (
    <div className="grid grid-cols-3 gap-1.5">
      {RANGE_OPTIONS.map((days) => (
        <button
          key={days}
          type="button"
          className={`flex h-11 items-center justify-center rounded-[4px] border text-sm ${
            value === days
              ? 'border-accent bg-accent/15 font-semibold text-accent'
              : 'border-line bg-panel2 text-ink-dim'
          }`}
          onClick={() => onChange(days)}
        >
          <span>
            <span className="num">{days}</span>日
          </span>
        </button>
      ))}
    </div>
  )
}
