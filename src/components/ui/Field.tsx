import type { ReactNode } from 'react'

interface FieldProps {
  label: string
  en?: string
  children: ReactNode
}

export function Field({ label, en, children }: FieldProps) {
  return (
    <div>
      <div className="mb-1.5 flex items-baseline gap-2">
        {en && <span className="microlabel">{en}</span>}
        <span className="text-xs text-ink-dim">{label}</span>
      </div>
      {children}
    </div>
  )
}
