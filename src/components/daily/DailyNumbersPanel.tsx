import { formatHM, sleepDurationLabel } from '../../lib/date'
import type { DailyLog } from '../../types/db'
import type { DailySheetId } from './DailyStatusBoard'

interface CellProps {
  en: string
  ja: string
  value: string | null
  unit?: string
  sub?: string | null
  onClick: () => void
}

function Cell({ en, ja, value, unit, sub, onClick }: CellProps) {
  return (
    <button
      type="button"
      className="flex flex-col items-start border border-line bg-panel px-2.5 py-2 text-left"
      onClick={onClick}
    >
      <span className="microlabel">
        {en} <span className="normal-case">{ja}</span>
      </span>
      <span className="mt-0.5 flex items-baseline gap-1">
        <span
          className={`num text-xl font-semibold ${value != null ? 'text-ink' : 'text-ink-dim/50'}`}
        >
          {value ?? '--'}
        </span>
        {unit && value != null && (
          <span className="num text-[11px] text-ink-dim">{unit}</span>
        )}
      </span>
      {sub && <span className="num text-[11px] text-ink-dim">{sub}</span>}
    </button>
  )
}

interface Props {
  log: DailyLog | null
  onOpenDaily: (id: DailySheetId) => void
}

/** daily_logs の数値を高密度で並べる計器盤 */
export function DailyNumbersPanel({ log, onOpenDaily }: Props) {
  const sleepValue =
    log?.sleep_start && log.sleep_end
      ? sleepDurationLabel(log.sleep_start, log.sleep_end)
      : null
  const sleepSub =
    log?.sleep_start && log.sleep_end
      ? `${formatHM(log.sleep_start)}-${formatHM(log.sleep_end)}`
      : null

  return (
    <section className="grid grid-cols-2 gap-1.5">
      <Cell
        en="WEIGHT"
        ja="体重"
        value={log?.weight_kg != null ? String(log.weight_kg) : null}
        unit="kg"
        onClick={() => onOpenDaily('weight')}
      />
      <Cell
        en="SLEEP"
        ja="睡眠"
        value={sleepValue}
        sub={sleepSub}
        onClick={() => onOpenDaily('sleep')}
      />
      <Cell
        en="CONDITION"
        ja="体調"
        value={log?.condition_score != null ? String(log.condition_score) : null}
        unit="/10"
        onClick={() => onOpenDaily('mind')}
      />
      <Cell
        en="MOOD"
        ja="気分"
        value={log?.mood != null ? String(log.mood) : null}
        unit="/10"
        onClick={() => onOpenDaily('mind')}
      />
      <Cell
        en="MEDITATION"
        ja="瞑想"
        value={log?.meditation_min != null ? String(log.meditation_min) : null}
        unit="分"
        onClick={() => onOpenDaily('mind')}
      />
      <Cell
        en="SLEEP SCORE"
        ja="睡眠スコア"
        value={log?.sleep_score != null ? String(log.sleep_score) : null}
        unit="/100"
        onClick={() => onOpenDaily('sleep')}
      />
      <Cell
        en="STEPS"
        ja="歩数"
        value={log?.steps != null ? log.steps.toLocaleString() : null}
        unit="歩"
        onClick={() => onOpenDaily('activity')}
      />
      <Cell
        en="ACTIVE"
        ja="アクティブ"
        value={log?.active_kcal != null ? log.active_kcal.toLocaleString() : null}
        unit="kcal"
        onClick={() => onOpenDaily('activity')}
      />
      <Cell
        en="EXERCISE"
        ja="エクササイズ"
        value={log?.exercise_min != null ? String(log.exercise_min) : null}
        unit="分"
        onClick={() => onOpenDaily('activity')}
      />
      <Cell
        en="STAND"
        ja="スタンド"
        value={log?.stand_hours != null ? String(log.stand_hours) : null}
        unit="時間"
        onClick={() => onOpenDaily('activity')}
      />
    </section>
  )
}
