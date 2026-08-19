import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { monthOf } from '../lib/date'
import { supabase } from '../lib/supabase'
import type { DailyLog, DailyLogPatch } from '../types/db'

export function useDailyLog(date: string) {
  return useQuery({
    queryKey: ['daily_log', date],
    queryFn: async (): Promise<DailyLog | null> => {
      const { data, error } = await supabase
        .from('daily_logs')
        .select('*')
        .eq('date', date)
        .maybeSingle()
      if (error) throw error
      return data
    },
  })
}

/**
 * daily_logs の部分 UPSERT。
 * 各エディタは自分のカラムだけを patch として送ること。
 * PostgREST の upsert はペイロードに含まれる列だけを更新するので、
 * エディタ同士が互いの値を消し合わない。
 * （キャッシュ済みの行を丸ごとスプレッドして送るのは禁止）
 */
export function useUpsertDailyLog(date: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (patch: DailyLogPatch) => {
      const { error } = await supabase
        .from('daily_logs')
        .upsert({ date, ...patch }, { onConflict: 'date' })
      if (error) throw error
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['daily_log', date] })
      void qc.invalidateQueries({ queryKey: ['month', monthOf(date)] })
    },
  })
}
