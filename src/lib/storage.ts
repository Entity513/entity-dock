import { supabase } from './supabase'

export const PHOTOS_BUCKET = 'photos'

/**
 * 圧縮済み写真を private バケットにアップロードし、
 * DB に保存するオブジェクトパス（署名URLではない）を返す。
 * パス規約: meals/2026/08/<uuid>.jpg
 */
export async function uploadPhoto(
  kind: 'meals' | 'workouts',
  dateStr: string,
  file: File,
): Promise<string> {
  const [year, month] = dateStr.split('-')
  const path = `${kind}/${year}/${month}/${crypto.randomUUID()}.jpg`
  const { error } = await supabase.storage
    .from(PHOTOS_BUCKET)
    .upload(path, file, { contentType: 'image/jpeg', upsert: false })
  if (error) throw error
  return path
}

/** ベストエフォート削除（失敗しても行削除は成立させる） */
export async function deletePhoto(path: string): Promise<void> {
  await supabase.storage.from(PHOTOS_BUCKET).remove([path])
}
