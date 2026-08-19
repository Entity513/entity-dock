import { useState } from 'react'
import { useDeleteMeal, useSaveMeal } from '../../hooks/useMeals'
import { todayStr } from '../../lib/date'
import { deletePhoto, uploadPhoto } from '../../lib/storage'
import {
  MEAL_TYPES,
  MEAL_TYPE_LABELS,
  type Meal,
  type MealType,
} from '../../types/db'
import { BottomSheet } from '../ui/BottomSheet'
import { Field } from '../ui/Field'
import { PhotoPicker } from '../ui/PhotoPicker'
import { TagInput } from '../ui/TagInput'

interface Props {
  date: string
  meal: Meal | null
  initialType?: MealType
  onClose: () => void
}

const guessMealType = (): MealType => {
  const h = new Date().getHours()
  if (h < 10) return 'breakfast'
  if (h < 15) return 'lunch'
  if (h < 21) return 'dinner'
  return 'snack'
}

const nowHM = (): string => {
  const d = new Date()
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export function MealEditorSheet({ date, meal, initialType, onClose }: Props) {
  const [mealType, setMealType] = useState<MealType>(
    meal?.meal_type ?? initialType ?? guessMealType(),
  )
  // 現在時刻のプリセットは新規作成時のみ。既存の記録が time なしなら
  // なしのまま初期化する（編集で勝手に時刻が入るのを防ぐ）。
  const [time, setTime] = useState(
    meal ? (meal.time?.slice(0, 5) ?? '') : date === todayStr() ? nowHM() : '',
  )
  const [description, setDescription] = useState(meal?.description ?? '')
  const [tags, setTags] = useState<string[]>(meal?.tags ?? [])
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoRemoved, setPhotoRemoved] = useState(false)
  const [compressing, setCompressing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const saveMeal = useSaveMeal()
  const deleteMeal = useDeleteMeal()

  const save = async () => {
    setSaving(true)
    setError(null)
    try {
      // undefined = 写真は変更しない / null = 削除 / string = 新しいパス
      let photoUrl: string | null | undefined = undefined
      if (photoFile) {
        photoUrl = await uploadPhoto('meals', date, photoFile)
      } else if (photoRemoved) {
        photoUrl = null
      }
      await saveMeal.mutateAsync({
        id: meal?.id,
        date,
        time: time || null,
        meal_type: mealType,
        photo_url: photoUrl,
        description: description.trim() || null,
        tags,
      })
      // 置き換え/削除された古い写真の後始末（ベストエフォート）
      if (meal?.photo_url && (photoFile || photoRemoved)) {
        void deletePhoto(meal.photo_url).catch(() => {})
      }
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : '保存に失敗しました。')
    } finally {
      setSaving(false)
    }
  }

  const remove = async () => {
    if (!meal) return
    if (!window.confirm('この食事記録を削除しますか？')) return
    setSaving(true)
    setError(null)
    try {
      await deleteMeal.mutateAsync(meal)
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : '削除に失敗しました。')
      setSaving(false)
    }
  }

  return (
    <BottomSheet
      title={meal ? '食事を編集' : '食事を記録'}
      en="MEAL"
      onClose={onClose}
    >
      <div className="flex flex-col gap-4">
        <Field label="種別" en="TYPE">
          <div className="grid grid-cols-4 gap-1.5">
            {MEAL_TYPES.map((t) => (
              <button
                key={t}
                type="button"
                className={`flex h-11 items-center justify-center rounded-[4px] border text-sm ${
                  mealType === t
                    ? 'border-accent bg-accent/15 font-semibold text-accent'
                    : 'border-line bg-panel2 text-ink-dim'
                }`}
                onClick={() => setMealType(t)}
              >
                {MEAL_TYPE_LABELS[t]}
              </button>
            ))}
          </div>
        </Field>

        <Field label="時刻" en="TIME">
          <input
            type="time"
            className="input num"
            value={time}
            onChange={(e) => setTime(e.target.value)}
          />
        </Field>

        <Field label="写真" en="PHOTO">
          <PhotoPicker
            existingPath={meal?.photo_url ?? null}
            file={photoFile}
            removed={photoRemoved}
            onSelect={(f) => {
              setPhotoFile(f)
              setPhotoRemoved(false)
            }}
            onRemove={() => {
              setPhotoFile(null)
              setPhotoRemoved(true)
            }}
            onCompressingChange={setCompressing}
          />
        </Field>

        <Field label="内容" en="DESCRIPTION">
          <textarea
            className="input min-h-20"
            placeholder="例: 鶏むね肉とブロッコリー、白米150g"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </Field>

        <Field label="タグ" en="TAGS">
          <TagInput
            value={tags}
            onChange={setTags}
            placeholder="例: 高たんぱく, 外食, 自炊"
          />
        </Field>

        {error && <p className="text-sm text-alert">{error}</p>}

        <button
          type="button"
          className="btn-primary"
          disabled={saving || compressing}
          onClick={() => void save()}
        >
          {saving ? '保存中…' : compressing ? '写真を処理中…' : '保存'}
        </button>
        {meal && (
          <button
            type="button"
            className="btn-danger"
            disabled={saving}
            onClick={() => void remove()}
          >
            この記録を削除
          </button>
        )}
      </div>
    </BottomSheet>
  )
}
