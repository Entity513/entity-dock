interface StatusChipProps {
  label: string
  value?: string | null
  done: boolean
  onClick: () => void
}

/** 記録状況チップ。未入力はアンバー枠、入力済みはグリーン + 値 */
export function StatusChip({ label, value, done, onClick }: StatusChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex min-h-[3.25rem] flex-col items-start justify-center rounded-[4px] border px-2.5 py-1.5 text-left ${
        done
          ? 'border-accent/40 bg-accent/8'
          : 'border-dashed border-warn/50 bg-transparent'
      }`}
    >
      <span
        className={`text-[11px] leading-tight ${done ? 'text-ink-dim' : 'text-warn'}`}
      >
        {label}
      </span>
      <span
        className={`num text-sm leading-tight font-semibold ${
          done ? 'text-accent' : 'text-warn/70'
        }`}
      >
        {done ? (value ?? '✓') : '未入力'}
      </span>
    </button>
  )
}
