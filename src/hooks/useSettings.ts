import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { Settings } from '../types/db'

const COLUMNS =
  'target_weight_kg, target_sleep_hours, target_kcal, target_protein_g, target_fat_g, target_carb_g'

export function useSettings() {
  return useQuery({
    queryKey: ['settings'],
    // 目標値はめったに変わらないので、毎回取りに行かない
    staleTime: 10 * 60 * 1000,
    queryFn: async (): Promise<Settings | null> => {
      const { data, error } = await supabase
        .from('settings')
        .select(COLUMNS)
        .eq('id', true)
        .maybeSingle()
      if (error) throw error
      return data
    },
  })
}

export function useSaveSettings() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (patch: Partial<Settings>) => {
      const { error } = await supabase
        .from('settings')
        .upsert({ id: true, ...patch }, { onConflict: 'id' })
      if (error) throw error
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['settings'] })
    },
  })
}
