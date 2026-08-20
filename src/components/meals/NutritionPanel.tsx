import { macroRatio, type MacroTotals } from '../../lib/nutrition'
import type { Settings } from '../../types/db'
import { AnimatedNumber } from '../ui/AnimatedNumber'
import { Card } from '../ui/Card'

const MACRO_COLORS = {
  protein: 'var(--color-accent)',
  fat: 'var(--color-warn)',
  carb: 'var(--color-data)',
} as const

interface MacroRowProps {
  label: string
  short: string
  grams: number | null
  target: number | null
  color: string
}

function MacroRow({ label, short, grams, target, color }: MacroRowProps) {
  const pct =
    grams != null && target != null && target > 0
      ? Math.min(100, (grams / target) * 100)
      : null

  return (
    <div className="flex items-center gap-3 px-4 py-2">
      <span className="num w-4 shrink-0 text-xs" style={{ color }}>
        {short}
      </span>
      <span className="t-sub w-16 shrink-0">{label}</span>

      <span className="h-[3px] flex-1 overflow-hidden rounded-full bg-line/60">
        {pct != null && (
          <span
            className="block h-full rounded-full transition-[width] duration-700 ease-out"
            style={{ width: `${pct}%`, backgroundColor: color }}
          />
        )}
      </span>

      <span className="flex w-24 shrink-0 items-baseline justify-end gap-1">
        {grams != null ? (
          <>
            <AnimatedNumber
              value={grams}
              format={(v) => String(Math.round(v))}
              className="t-value"
            />
            <span className="t-unit">
              g{target != null && ` / ${target}`}
            </span>
          </>
        ) : (
          <span className="t-empty">—</span>
        )}
      </span>
    </div>
  )
}

interface Props {
  totals: MacroTotals
  settings: Settings | null
  mealCount: number
}

/** 1日ぶんの栄養。合計 kcal を主役に、PFC を目標比のバーで見せる */
export function NutritionPanel({ totals, settings, mealCount }: Props) {
  const ratio = macroRatio(totals)
  const targetKcal = settings?.target_kcal ?? null
  const kcalPct =
    totals.kcal != null && targetKcal != null && targetKcal > 0
      ? Math.min(100, (totals.kcal / targetKcal) * 100)
      : null

  const untracked = mealCount - totals.withData

  return (
    <Card
      en="NUTRITION"
      ja="今日の栄養"
      right={
        untracked > 0 ? (
          <span className="t-sub">{untracked}件が栄養未算出</span>
        ) : undefined
      }
    >
      <div className="px-4 pb-1">
        <div className="flex items-end justify-between gap-4">
          <span className="flex items-baseline gap-1.5">
            {totals.kcal != null ? (
              <>
                <AnimatedNumber
                  value={totals.kcal}
                  format={(v) => Math.round(v).toLocaleString()}
                  className="t-display"
                />
                <span className="t-unit">kcal</span>
              </>
            ) : (
              <span className="t-display text-ink-dim/40">—</span>
            )}
          </span>
          {targetKcal != null && (
            <span className="t-sub">
              目標 <span className="num">{targetKcal.toLocaleString()}</span>
              {totals.kcal != null && (
                <span className="num ml-2 text-ink">
                  {totals.kcal - targetKcal >= 0 ? '+' : ''}
                  {(totals.kcal - targetKcal).toLocaleString()}
                </span>
              )}
            </span>
          )}
        </div>

        {kcalPct != null && (
          <span className="mt-2 block h-[3px] overflow-hidden rounded-full bg-line/60">
            <span
              className="block h-full rounded-full bg-accent transition-[width] duration-700 ease-out"
              style={{ width: `${kcalPct}%` }}
            />
          </span>
        )}

        {/* PFC の構成比。目標が無くてもバランスは見える */}
        {ratio && (
          <div className="mt-3">
            <span className="flex h-1.5 overflow-hidden rounded-full">
              <span
                style={{
                  width: `${ratio.protein}%`,
                  backgroundColor: MACRO_COLORS.protein,
                }}
              />
              <span
                style={{
                  width: `${ratio.fat}%`,
                  backgroundColor: MACRO_COLORS.fat,
                }}
              />
              <span
                style={{
                  width: `${ratio.carb}%`,
                  backgroundColor: MACRO_COLORS.carb,
                }}
              />
            </span>
            <span className="num mt-1.5 block text-[11px] text-ink-dim">
              P {Math.round(ratio.protein)}% · F {Math.round(ratio.fat)}% · C{' '}
              {Math.round(ratio.carb)}%
            </span>
          </div>
        )}
      </div>

      <div className="mt-2 border-t border-line/70 pt-1 pb-2">
        <MacroRow
          short="P"
          label="たんぱく質"
          grams={totals.protein}
          target={settings?.target_protein_g ?? null}
          color={MACRO_COLORS.protein}
        />
        <MacroRow
          short="F"
          label="脂質"
          grams={totals.fat}
          target={settings?.target_fat_g ?? null}
          color={MACRO_COLORS.fat}
        />
        <MacroRow
          short="C"
          label="炭水化物"
          grams={totals.carb}
          target={settings?.target_carb_g ?? null}
          color={MACRO_COLORS.carb}
        />
      </div>
    </Card>
  )
}
