import { useEffect, useState } from 'react'

interface NumberInputProps {
  value: number | null
  onChange: (v: number | null) => void
  step?: number
  min?: number
  max?: number
  unit?: string
  decimal?: boolean
  placeholder?: string
}

/**
 * null 許容の数値入力。+/- ステッパー付き。
 * 空欄 = null（保存すると値のクリアになる）。
 */
export function NumberInput({
  value,
  onChange,
  step = 1,
  min = 0,
  max,
  unit,
  decimal = false,
  placeholder,
}: NumberInputProps) {
  const [text, setText] = useState(value != null ? String(value) : '')

  useEffect(() => {
    setText(value != null ? String(value) : '')
  }, [value])

  const parse = (s: string): number | null => {
    if (s.trim() === '') return null
    const n = Number(s)
    return Number.isFinite(n) ? n : null
  }

  const clamp = (n: number): number => {
    let v = n
    if (min != null) v = Math.max(min, v)
    if (max != null) v = Math.min(max, v)
    // 0.1 ステップの浮動小数点誤差を丸める
    return decimal ? Math.round(v * 10) / 10 : Math.round(v)
  }

  const bump = (dir: 1 | -1) => {
    const base = parse(text) ?? min ?? 0
    const next = clamp(base + dir * step)
    setText(String(next))
    onChange(next)
  }

  const handleText = (s: string) => {
    setText(s)
    onChange(parse(s))
  }

  // 手入力値は blur 時にクランプして確定する（入力途中は制限しない）。
  // 保存ボタンのタップは blur を先に発火させるので、DB の CHECK 制約に
  // 引っかかる値がそのまま送られることはない。
  const handleBlur = () => {
    const n = parse(text)
    if (n == null) {
      setText('')
      return
    }
    const v = clamp(n)
    setText(String(v))
    onChange(v)
  }

  return (
    <div className="flex items-stretch gap-2">
      <button
        type="button"
        aria-label="減らす"
        className="btn-ghost num w-12 shrink-0 text-lg"
        onClick={() => bump(-1)}
      >
        −
      </button>
      <div className="relative flex-1">
        <input
          type="text"
          inputMode={decimal ? 'decimal' : 'numeric'}
          className="input num pr-12 text-center text-xl"
          placeholder={placeholder ?? '--'}
          value={text}
          onChange={(e) => handleText(e.target.value)}
          onBlur={handleBlur}
        />
        {unit && (
          <span className="microlabel absolute top-1/2 right-3 -translate-y-1/2">
            {unit}
          </span>
        )}
      </div>
      <button
        type="button"
        aria-label="増やす"
        className="btn-ghost num w-12 shrink-0 text-lg"
        onClick={() => bump(1)}
      >
        ＋
      </button>
    </div>
  )
}
