import type { Meal } from '../types/db'

export interface MacroTotals {
  kcal: number | null
  protein: number | null
  fat: number | null
  carb: number | null
  /** 栄養が1つでも入っている食事の数 */
  withData: number
}

const sum = (values: (number | null)[]): number | null => {
  const present = values.filter((v): v is number => v != null)
  return present.length === 0 ? null : present.reduce((a, b) => a + b, 0)
}

const round1 = (n: number) => Math.round(n * 10) / 10

/** 1日ぶんの合計。1件も入っていない項目は null（0 と区別する） */
export function totalMacros(meals: Meal[]): MacroTotals {
  const protein = sum(meals.map((m) => m.protein_g))
  const fat = sum(meals.map((m) => m.fat_g))
  const carb = sum(meals.map((m) => m.carb_g))
  const kcalRaw = sum(meals.map((m) => m.kcal))
  return {
    kcal: kcalRaw == null ? null : Math.round(kcalRaw),
    protein: protein == null ? null : round1(protein),
    fat: fat == null ? null : round1(fat),
    carb: carb == null ? null : round1(carb),
    withData: meals.filter(
      (m) =>
        m.kcal != null ||
        m.protein_g != null ||
        m.fat_g != null ||
        m.carb_g != null,
    ).length,
  }
}

/** Atwater 係数。P/C は 4、F は 9 kcal/g */
export const KCAL_PER_G = { protein: 4, fat: 9, carb: 4 } as const

/**
 * PFC のカロリー構成比（%）。3つ揃っている場合だけ返す。
 * kcal 列ではなく PFC から計算する — 比率の話なので、合計と
 * 内訳がずれていても構成比としては筋が通る。
 */
export function macroRatio(
  totals: MacroTotals,
): { protein: number; fat: number; carb: number } | null {
  const { protein, fat, carb } = totals
  if (protein == null || fat == null || carb == null) return null
  const p = protein * KCAL_PER_G.protein
  const f = fat * KCAL_PER_G.fat
  const c = carb * KCAL_PER_G.carb
  const total = p + f + c
  if (total <= 0) return null
  return {
    protein: (p / total) * 100,
    fat: (f / total) * 100,
    carb: (c / total) * 100,
  }
}

/**
 * 1食ぶんの PFC 行。'P42 F18 C55'
 * kcal は行の右側に別途大きく出すので、ここには含めない。
 */
export function mealMacroLine(meal: Meal): string | null {
  const macros = [
    meal.protein_g != null ? `P${round1(meal.protein_g)}` : null,
    meal.fat_g != null ? `F${round1(meal.fat_g)}` : null,
    meal.carb_g != null ? `C${round1(meal.carb_g)}` : null,
  ].filter(Boolean)
  return macros.length > 0 ? macros.join('  ') : null
}
