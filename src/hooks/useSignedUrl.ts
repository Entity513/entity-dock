import { useQuery } from '@tanstack/react-query'
import { PHOTOS_BUCKET } from '../lib/storage'
import { supabase } from '../lib/supabase'

const SIGN_TTL_SEC = 3600

/**
 * Storage パス → 署名URL。
 * 署名の有効期限 (1h) より短い staleTime (50min) でキャッシュし、
 * アプリ復帰時の refetchOnWindowFocus で再署名される。
 * DB には署名URLを保存しない — パスのみ。
 */
export function useSignedUrl(path: string | null | undefined) {
  return useQuery({
    queryKey: ['signed-url', path],
    enabled: !!path,
    staleTime: 50 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    queryFn: async (): Promise<string> => {
      const { data, error } = await supabase.storage
        .from(PHOTOS_BUCKET)
        .createSignedUrl(path!, SIGN_TTL_SEC)
      if (error) throw error
      return data.signedUrl
    },
  })
}
