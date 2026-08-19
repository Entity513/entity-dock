import { useEffect, type ReactNode } from 'react'

interface BottomSheetProps {
  title: string
  en?: string
  onClose: () => void
  children: ReactNode
}

/** 画面下からのモーダルシート。エディタは開くたびにマウントし直す前提 */
export function BottomSheet({ title, en, onClose, children }: BottomSheetProps) {
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [])

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <button
        type="button"
        aria-label="閉じる"
        className="absolute inset-0 bg-black/60"
        onClick={onClose}
      />
      <div className="relative max-h-[85dvh] overflow-y-auto border-t border-line bg-panel pb-[max(env(safe-area-inset-bottom),1rem)]">
        <div className="sticky top-0 flex items-center justify-between border-b border-line bg-panel px-4 py-3">
          <div>
            {en && <div className="microlabel">{en}</div>}
            <h2 className="text-base font-bold">{title}</h2>
          </div>
          <button
            type="button"
            className="btn-ghost min-h-9! px-3! py-1! text-sm"
            onClick={onClose}
          >
            閉じる
          </button>
        </div>
        <div className="px-4 py-4">{children}</div>
      </div>
    </div>
  )
}
