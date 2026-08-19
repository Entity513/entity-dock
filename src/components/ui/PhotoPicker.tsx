import { useEffect, useRef, useState } from 'react'
import { compressImage } from '../../lib/image'
import { SignedImage } from './SignedImage'

interface PhotoPickerProps {
  /** 既存レコードの写真パス（編集時） */
  existingPath: string | null
  /** 圧縮済みの選択ファイル。アップロードは親が保存時に行う */
  file: File | null
  /** 既存写真を削除扱いにしているか */
  removed: boolean
  onSelect: (file: File) => void
  onRemove: () => void
  /** 圧縮中は親が保存ボタンを無効化できるように通知する */
  onCompressingChange?: (compressing: boolean) => void
}

export function PhotoPicker({
  existingPath,
  file,
  removed,
  onSelect,
  onRemove,
  onCompressingChange,
}: PhotoPickerProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [compressing, setCompressing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // createObjectURL/revokeObjectURL は effect 内で対にする
  // （レンダー中に作ると StrictMode や破棄レンダーで blob URL がリークする）
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  useEffect(() => {
    if (!file) {
      setPreviewUrl(null)
      return
    }
    const url = URL.createObjectURL(file)
    setPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  const handleFile = async (raw: File | undefined) => {
    if (!raw) return
    setError(null)
    setCompressing(true)
    onCompressingChange?.(true)
    try {
      onSelect(await compressImage(raw))
    } catch (e) {
      setError(e instanceof Error ? e.message : '画像の処理に失敗しました。')
    } finally {
      setCompressing(false)
      onCompressingChange?.(false)
    }
  }

  const showExisting = existingPath && !removed && !file
  const hasPhoto = !!file || !!showExisting

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          void handleFile(e.target.files?.[0])
          e.target.value = '' // 同じファイルの再選択を許可
        }}
      />

      {compressing ? (
        <div className="flex h-40 items-center justify-center rounded-[4px] border border-line bg-panel2">
          <span className="microlabel animate-pulse">COMPRESSING…</span>
        </div>
      ) : file && previewUrl ? (
        <img
          src={previewUrl}
          alt="選択した写真"
          className="max-h-64 w-full rounded-[4px] border border-line object-cover"
        />
      ) : showExisting ? (
        <SignedImage
          path={existingPath}
          alt="登録済みの写真"
          className="max-h-64 w-full rounded-[4px] border border-line object-cover"
        />
      ) : (
        <button
          type="button"
          className="flex h-24 w-full items-center justify-center gap-2 rounded-[4px] border border-dashed border-line bg-panel2 text-sm text-ink-dim"
          onClick={() => inputRef.current?.click()}
        >
          ＋ 写真を追加
        </button>
      )}

      {hasPhoto && !compressing && (
        <div className="mt-2 flex gap-2">
          <button
            type="button"
            className="btn-ghost flex-1 text-xs"
            onClick={() => inputRef.current?.click()}
          >
            写真を変更
          </button>
          <button
            type="button"
            className="btn-danger flex-1 text-xs"
            onClick={onRemove}
          >
            写真を削除
          </button>
        </div>
      )}

      {error && <p className="mt-2 text-sm text-alert">{error}</p>}
    </div>
  )
}
