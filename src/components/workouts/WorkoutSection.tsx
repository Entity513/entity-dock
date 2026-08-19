import type { Workout } from '../../types/db'
import { SignedImage } from '../ui/SignedImage'

interface Props {
  workouts: Workout[]
  onEdit: (workout: Workout) => void
  onAdd: () => void
}

export function WorkoutSection({ workouts, onEdit, onAdd }: Props) {
  return (
    <section className="panel">
      <header className="flex items-center justify-between border-b border-line px-3 py-2">
        <div className="flex items-baseline gap-2">
          <span className="microlabel">WORKOUT</span>
          <span className="text-xs text-ink-dim">筋トレ</span>
        </div>
        <span className="num text-xs text-ink-dim">{workouts.length}件</span>
      </header>

      {workouts.length > 0 && (
        <ul className="divide-y divide-line">
          {workouts.map((w) => (
            <li key={w.id}>
              <button
                type="button"
                className="flex w-full items-stretch gap-3 px-3 py-2.5 text-left"
                onClick={() => onEdit(w)}
              >
                {w.photo_url ? (
                  <SignedImage
                    path={w.photo_url}
                    alt="トレーニングノート"
                    className="h-16 w-16 shrink-0 rounded-[4px] border border-line object-cover"
                  />
                ) : (
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[4px] border border-line bg-panel2">
                    <span className="microlabel">NO IMG</span>
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  {w.menu ? (
                    <p className="num text-sm whitespace-pre-line text-ink">
                      {w.menu.split('\n').slice(0, 3).join('\n')}
                    </p>
                  ) : (
                    <p className="text-sm text-ink-dim">（メニュー未記入）</p>
                  )}
                  {w.tags.length > 0 && (
                    <p className="num mt-0.5 truncate text-[11px] text-ink-dim">
                      {w.tags.map((t) => `#${t}`).join(' ')}
                    </p>
                  )}
                  {w.source === 'entity' && (
                    <span className="microlabel text-data">ENTITY</span>
                  )}
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="p-2">
        <button
          type="button"
          className="flex h-10 w-full items-center justify-center rounded-[4px] border border-dashed border-line text-xs text-ink-dim"
          onClick={onAdd}
        >
          ＋ 筋トレを記録
        </button>
      </div>
    </section>
  )
}
