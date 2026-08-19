interface ScoreDialProps {
  value: number | null
  onChange: (v: number | null) => void
}

/** 1〜10 のスコアピッカー。選択中の値を再タップで解除（null） */
export function ScoreDial({ value, onChange }: ScoreDialProps) {
  return (
    <div className="grid grid-cols-10 gap-1">
      {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => {
        const active = value === n
        return (
          <button
            key={n}
            type="button"
            className={`num flex h-11 items-center justify-center rounded-[4px] border text-sm ${
              active
                ? 'border-accent bg-accent/15 font-semibold text-accent'
                : 'border-line bg-panel2 text-ink-dim'
            }`}
            onClick={() => onChange(active ? null : n)}
          >
            {n}
          </button>
        )
      })}
    </div>
  )
}
