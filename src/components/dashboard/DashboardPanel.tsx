import type { ReactNode } from 'react'
import { Card, CardEmpty } from '../ui/Card'

interface Props {
  en: string
  ja: string
  right?: ReactNode
  children: ReactNode
}

/** グラフ用カード。見た目は Card に一本化してある */
export function DashboardPanel({ en, ja, right, children }: Props) {
  return (
    <Card en={en} ja={ja} right={right}>
      {children}
    </Card>
  )
}

export function PanelEmpty({ message }: { message?: string }) {
  return <CardEmpty message={message ?? 'データがまだありません'} />
}
