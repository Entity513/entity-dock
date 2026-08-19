import { NavLink, Outlet, useLocation } from 'react-router-dom'

interface Tab {
  to: string
  en: string
  ja: string
  /** 中央の母艦タブ。一段大きく見せる */
  primary?: boolean
}

// 左から: 運動量 / 食事 / まとめ / マインドフルネス / 睡眠
const TABS: Tab[] = [
  { to: '/drive', en: 'DRIVE', ja: '運動量' },
  { to: '/fuel', en: 'FUEL', ja: '食事' },
  { to: '/', en: 'BRIDGE', ja: 'まとめ', primary: true },
  { to: '/mind', en: 'MIND', ja: 'マインド' },
  { to: '/rest', en: 'REST', ja: '睡眠' },
]

export function AppShell() {
  // パスが変わるたびに main を作り直して、切り替わりをフェードで見せる
  const { pathname } = useLocation()

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-lg flex-col">
      <header className="scanline sticky top-0 z-40 border-b border-line bg-bg/90 pt-[env(safe-area-inset-top)] backdrop-blur">
        <div className="flex h-11 items-center justify-between px-4">
          <span className="num text-sm font-semibold tracking-[0.25em] text-ink">
            ENTITY DOCK
          </span>
          <span className="text-[10px] tracking-[0.2em] text-ink-dim">
            あなたの夢を、目的地へ。
          </span>
        </div>
      </header>

      <main key={pathname} className="page-enter flex-1 px-3 py-3 pb-28">
        <Outlet />
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-panel/95 backdrop-blur">
        <div className="mx-auto flex max-w-lg items-stretch pb-[env(safe-area-inset-bottom)]">
          {TABS.map((tab) => (
            <NavLink
              key={tab.to}
              to={tab.to}
              end={tab.to === '/'}
              className={({ isActive }) =>
                `relative flex flex-1 flex-col items-center justify-center gap-0.5 ${
                  tab.primary ? 'py-2.5' : 'py-2'
                } ${isActive ? 'text-accent' : 'text-ink-dim'}`
              }
            >
              {({ isActive }) => (
                <>
                  {/* アクティブタブの上辺に灯りを入れる */}
                  <span
                    className={`absolute inset-x-3 top-0 h-px transition-opacity duration-200 ${
                      isActive ? 'bg-accent opacity-100' : 'opacity-0'
                    }`}
                  />
                  <span
                    className={`num tracking-[0.12em] ${
                      tab.primary
                        ? 'text-[10px] font-semibold'
                        : 'text-[9px]'
                    }`}
                  >
                    {tab.en}
                  </span>
                  <span
                    className={`${tab.primary ? 'text-[11px] font-semibold' : 'text-[10px]'}`}
                  >
                    {tab.ja}
                  </span>
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
