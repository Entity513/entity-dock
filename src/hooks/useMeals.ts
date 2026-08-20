import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { monthOf } from '../lib/date'
import { deletePhoto } from '../lib/storage'
import { supabase } from '../lib/supabase'
import type { Meal, MealType } from '../types/db'

export function useMeals(date: string) {
  return useQuery({
    queryKey: ['meals', date],
    queryFn: async (): Promise<Meal[]> => {
      const { data, error } = await supabase
        .from('meals')
        .select('*')
        .eq('date', date)
        .order('time', { ascending: true, nullsFirst: false })
        .order('created_at', { ascending: true })
      if (error) throw error
      return data
    },
  })
}

export interface MealInput {
  id?: string
  date: string
  time: string | null // 'HH:MM'
  meal_type: MealType
  /** undefined = 既存の写真を変更しない（update 時のみ有効） */
  photo_url?: string | null
  description: string | null
  tags: string[]
  kcal: number | null
  protein_g: number | null
  fat_g: number | null
  carb_g: number | null
}

export function useSaveMeal() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: MealInput) => {
      if (input.id) {
        const { id, ...fields } = input
        // photo_url が undefined のときは JSON 化で落ちる → 列は更新されない
        const { error } = await supabase.from('meals').update(fields).eq('id', id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('meals').insert({
          ...input,
          photo_url: input.photo_url ?? null,
          source: 'web',
        })
        if (error) throw error
      }
    },
    onSuccess: (_data, input) => {
      void qc.invalidateQueries({ queryKey: ['meals', input.date] })
      void qc.invalidateQueries({ queryKey: ['month', monthOf(input.date)] })
    },
  })
}

export function useDeleteMeal() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (meal: Meal) => {
      // 行を先に消す（写真の削除はベストエフォート。孤児オブジェクトは許容、
      // 消えた写真を指す行は許容しない — 順序が重要）
      const { error } = await supabase.from('meals').delete().eq('id', meal.id)
      if (error) throw error
      if (meal.photo_url) {
        await deletePhoto(meal.photo_url).catch(() => {})
      }
    },
    onSuccess: (_data, meal) => {
      void qc.invalidateQueries({ queryKey: ['meals', meal.date] })
      void qc.invalidateQueries({ queryKey: ['month', monthOf(meal.date)] })
    },
  })
}
