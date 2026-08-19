import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !anonKey) {
  throw new Error(
    'Supabase の環境変数が設定されていません。SUPABASE_URL と SUPABASE_ANON_KEY（または VITE_ prefix 付き）を設定してください。',
  )
}

// 認証なし構成のため、セッション管理は一切行わない（anon キーのみで動く）
export const supabase = createClient(url, anonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
})
