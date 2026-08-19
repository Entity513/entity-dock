export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack'
export type Source = 'entity' | 'web'

export interface DailyLog {
  date: string // YYYY-MM-DD
  user_id: string
  weight_kg: number | null
  sleep_start: string | null // timestamptz ISO
  sleep_end: string | null // timestamptz ISO
  sleep_score: number | null
  meditation_min: number | null
  condition_score: number | null
  mood: number | null
  steps: number | null
  active_kcal: number | null
  exercise_min: number | null
  stand_hours: number | null
  diary: string | null
  updated_at: string
}

/** daily_logs の部分 UPSERT 用。各エディタは自分のカラムだけを送る */
export type DailyLogPatch = Partial<
  Omit<DailyLog, 'date' | 'user_id' | 'updated_at'>
>

export interface Meal {
  id: string
  user_id: string
  date: string
  time: string | null // 'HH:MM:SS'
  meal_type: MealType
  photo_url: string | null // Storage オブジェクトパス
  description: string | null
  tags: string[]
  source: Source
  created_at: string
}

export interface Workout {
  id: string
  user_id: string
  date: string
  photo_url: string | null // Storage オブジェクトパス
  menu: string | null
  notes: string | null
  tags: string[]
  source: Source
  created_at: string
}

export const MEAL_TYPES: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack']

export const MEAL_TYPE_LABELS: Record<MealType, string> = {
  breakfast: '朝食',
  lunch: '昼食',
  dinner: '夕食',
  snack: '間食',
}
