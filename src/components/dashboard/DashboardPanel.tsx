import type { ReactNode } from 'react'

interface Props {
  en: string
  ja: string
  right?: ReactNode
  children: ReactNode
}

export function DashboardPanel({ en, ja, right, children }: Props) {
  return (
    <section className="panel">
      <header className="flex items-center justify-between gap-2 border-b border-line px-3 py-2">
        <div className="flex items-baseline gap-2">
          <span className="microlabel whitespace-nowrap">{en}</span>
          <span className="text-xs whitespace-nowrap text-ink-dim">{ja}</span>
        </div>
        {right}
      </header>
      {children}
    </section>
  )
}

export function PanelEmpty({ message }: { message?: string }) {
  return (
    <p className="px-3 py-8 text-center text-sm text-ink-dim">
      {message ?? 'データがまだありません。'}
    </p>
  )
}
