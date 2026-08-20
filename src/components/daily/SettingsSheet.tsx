import { useState } from 'react'
import { useSaveSettings, useSettings } from '../../hooks/useSettings'
import { BottomSheet } from '../ui/BottomSheet'
import { Field } from '../ui/Field'
import { NumberInput } from '../ui/NumberInput'

/** 目標値。栄養バーの分母になるので、入っていると画面の情報量が上がる */
export function SettingsSheet({ onClose }: { onClose: () => void }) {
  const { data } = useSettings()
  const save = useSaveSettings()

  const [weight, setWeight] = useState<number | null>(
    data?.target_weight_kg ?? null,
  )
  const [sleep, setSleep] = useState<number | null>(
    data?.target_sleep_hours ?? null,
  )
  const [kcal, setKcal] = useState<number | null>(data?.target_kcal ?? null)
  const [protein, setProtein] = useState<number | null>(
    data?.target_protein_g ?? null,
  )
  const [fat, setFat] = useState<number | null>(data?.target_fat_g ?? null)
  const [carb, setCarb] = useState<number | null>(data?.target_carb_g ?? null)

  return (
    <BottomSheet title="目標" en="TARGETS" onClose={onClose}>
      <div className="flex flex-col gap-4">
        <Field label="目標体重" en="WEIGHT">
          <NumberInput
            value={weight}
            onChange={setWeight}
            step={0.5}
            min={20}
            max={299}
            decimal
            unit="kg"
          />
        </Field>
        <Field label="目標睡眠時間" en="SLEEP">
          <NumberInput
            value={sleep}
            onChange={setSleep}
            step={0.5}
            min={0}
            max={24}
            decimal
            unit="時間"
          />
        </Field>
        <Field label="目標カロリー" en="KCAL">
          <NumberInput
            value={kcal}
            onChange={setKcal}
            step={100}
            min={0}
            max={19999}
            unit="kcal"
          />
        </Field>
        <Field label="たんぱく質" en="PROTEIN">
          <NumberInput
            value={protein}
            onChange={setProtein}
            step={10}
            min={0}
            max={1999}
            unit="g"
          />
        </Field>
        <Field label="脂質" en="FAT">
          <NumberInput
            value={fat}
            onChange={setFat}
            step={5}
            min={0}
            max={1999}
            unit="g"
          />
        </Field>
        <Field label="炭水化物" en="CARB">
          <NumberInput
            value={carb}
            onChange={setCarb}
            step={10}
            min={0}
            max={1999}
            unit="g"
          />
        </Field>

        {save.isError && (
          <p className="text-sm text-alert">
            保存に失敗しました: {save.error.message}
          </p>
        )}

        <button
          type="button"
          className="btn-primary"
          disabled={save.isPending}
          onClick={() =>
            save.mutate(
              {
                target_weight_kg: weight,
                target_sleep_hours: sleep,
                target_kcal: kcal,
                target_protein_g: protein,
                target_fat_g: fat,
                target_carb_g: carb,
              },
              { onSuccess: onClose },
            )
          }
        >
          {save.isPending ? '保存中…' : '保存'}
        </button>
      </div>
    </BottomSheet>
  )
}
