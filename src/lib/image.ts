/**
 * アップロード前のクライアント側圧縮。
 * iPhone の 12MP 写真 (数MB) を 1600px / ~500KB 以下の JPEG に落とす。
 * EXIF の回転は browser-image-compression が処理する。
 * ライブラリは重いので写真選択時に動的ロードする。
 */
export async function compressImage(file: File): Promise<File> {
  const { default: imageCompression } = await import(
    'browser-image-compression'
  )
  try {
    return await imageCompression(file, {
      maxWidthOrHeight: 1600,
      maxSizeMB: 0.5,
      fileType: 'image/jpeg',
      initialQuality: 0.8,
      useWebWorker: true,
    })
  } catch {
    // Files アプリ経由の生 HEIC などはブラウザでデコードできない
    throw new Error(
      'この画像を読み込めませんでした。HEIC 形式の場合は写真アプリから選択し直してください。',
    )
  }
}
