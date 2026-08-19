import { useState } from 'react'
import { useDeleteWorkout, useSaveWorkout } from '../../hooks/useWorkouts'
import { deletePhoto, uploadPhoto } from '../../lib/storage'
import type { Workout } from '../../types/db'
import { BottomSheet } from '../ui/BottomSheet'
import { Field } from '../ui/Field'
import { PhotoPicker } from '../ui/PhotoPicker'
import { TagInput } from '../ui/TagInput'

interface Props {
  date: string
  workout: Workout | null
  onClose: () => void
}

export function WorkoutEditorSheet({ date, workout, onClose }: Props) {
  const [menu, setMenu] = useState(workout?.menu ?? '')
  const [notes, setNotes] = useState(workout?.notes ?? '')
  const [tags, setTags] = useState<string[]>(workout?.tags ?? [])
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoRemoved, setPhotoRemoved] = useState(false)
  const [compressing, setCompressing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const saveWorkout = useSaveWorkout()
  const deleteWorkout = useDeleteWorkout()

  const save = async () => {
    setSaving(true)
    setError(null)
    try {
      let photoUrl: string | null | undefined = undefined
      if (photoFile) {
        photoUrl = await uploadPhoto('workouts', date, photoFile)
      } else if (photoRemoved) {
        photoUrl = null
      }
      await saveWorkout.mutateAsync({
        id: workout?.id,
        date,
        photo_url: photoUrl,
        menu: menu.trim() || null,
        notes: notes.trim() || null,
        tags,
      })
      if (workout?.photo_url && (photoFile || photoRemoved)) {
        void deletePhoto(workout.photo_url).catch(() => {})
      }
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : '保存に失敗しました。')
    } finally {
      setSaving(false)
    }
  }

  const remove = async () => {
    if (!workout) return
    if (!window.confirm('このトレーニング記録を削除しますか？')) return
    setSaving(true)
    setError(null)
    try {
      await deleteWorkout.mutateAsync(workout)
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : '削除に失敗しました。')
      setSaving(false)
    }
  }

  return (
    <BottomSheet
      title={workout ? '筋トレを編集' : '筋トレを記録'}
      en="WORKOUT"
      onClose={onClose}
    >
      <div className="flex flex-col gap-4">
        <Field label="ノート写真" en="PHOTO">
          <PhotoPicker
            existingPath={workout?.photo_url ?? null}
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

        <Field label="メニュー" en="MENU">
          <textarea
            className="input min-h-24"
            placeholder={'例:\nベンチプレス 80kg 5×5\nスクワット 100kg 5×5'}
            value={menu}
            onChange={(e) => setMenu(e.target.value)}
          />
        </Field>

        <Field label="メモ" en="NOTES">
          <textarea
            className="input min-h-16"
            placeholder="調子、フォームの気づきなど"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </Field>

        <Field label="タグ" en="TAGS">
          <TagInput
            value={tags}
            onChange={setTags}
            placeholder="例: 胸, 脚, ジム"
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
        {workout && (
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
