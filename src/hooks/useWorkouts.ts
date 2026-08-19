import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { monthOf } from '../lib/date'
import { deletePhoto } from '../lib/storage'
import { supabase } from '../lib/supabase'
import type { Workout } from '../types/db'

export function useWorkouts(date: string) {
  return useQuery({
    queryKey: ['workouts', date],
    queryFn: async (): Promise<Workout[]> => {
      const { data, error } = await supabase
        .from('workouts')
        .select('*')
        .eq('date', date)
        .order('created_at', { ascending: true })
      if (error) throw error
      return data
    },
  })
}

export interface WorkoutInput {
  id?: string
  date: string
  /** undefined = 既存の写真を変更しない（update 時のみ有効） */
  photo_url?: string | null
  menu: string | null
  notes: string | null
  tags: string[]
}

export function useSaveWorkout() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: WorkoutInput) => {
      if (input.id) {
        const { id, ...fields } = input
        const { error } = await supabase
          .from('workouts')
          .update(fields)
          .eq('id', id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('workouts').insert({
          ...input,
          photo_url: input.photo_url ?? null,
          source: 'web',
        })
        if (error) throw error
      }
    },
    onSuccess: (_data, input) => {
      void qc.invalidateQueries({ queryKey: ['workouts', input.date] })
      void qc.invalidateQueries({ queryKey: ['month', monthOf(input.date)] })
    },
  })
}

export function useDeleteWorkout() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (workout: Workout) => {
      const { error } = await supabase
        .from('workouts')
        .delete()
        .eq('id', workout.id)
      if (error) throw error
      if (workout.photo_url) {
        await deletePhoto(workout.photo_url).catch(() => {})
      }
    },
    onSuccess: (_data, workout) => {
      void qc.invalidateQueries({ queryKey: ['workouts', workout.date] })
      void qc.invalidateQueries({ queryKey: ['month', monthOf(workout.date)] })
    },
  })
}
