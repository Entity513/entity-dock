import { NavLink, Outlet } from 'react-router-dom'

const tabClass = ({ isActive }: { isActive: boolean }) =>
  `flex flex-1 flex-col items-center gap-0.5 py-2 ${
    isActive ? 'text-accent' : 'text-ink-dim'
  }`

export function AppShell() {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-lg flex-col">
      <header className="sticky top-0 z-40 border-b border-line bg-bg/90 pt-[env(safe-area-inset-top)] backdrop-blur">
        <div className="flex h-11 items-center justify-between px-4">
          <span className="num text-sm font-semibold tracking-[0.25em] text-ink">
            ENTITY DOCK
          </span>
          <span className="microlabel">あなたの夢を、目的地へ。</span>
        </div>
      </header>

      <main className="flex-1 px-3 py-3 pb-28">
        <Outlet />
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-panel/95 backdrop-blur">
        <div className="mx-auto flex max-w-lg pb-[env(safe-area-inset-bottom)]">
          <NavLink to="/" end className={tabClass}>
            <span className="microlabel text-inherit!">TODAY</span>
            <span className="text-xs font-medium">今日</span>
          </NavLink>
          <NavLink to="/log" className={tabClass}>
            <span className="microlabel text-inherit!">LOG</span>
            <span className="text-xs font-medium">ログ</span>
          </NavLink>
        </div>
      </nav>
    </div>
  )
}
