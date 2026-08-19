import { useState } from 'react'

interface TagInputProps {
  value: string[]
  onChange: (tags: string[]) => void
  placeholder?: string
}

/** タグチップ入力。Enter / カンマ / 確定ボタンで追加、チップのタップで削除 */
export function TagInput({ value, onChange, placeholder }: TagInputProps) {
  const [text, setText] = useState('')

  const commit = () => {
    const t = text.trim().replace(/,$/, '')
    if (t && !value.includes(t)) {
      onChange([...value, t])
    }
    setText('')
  }

  return (
    <div>
      {value.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {value.map((tag) => (
            <button
              key={tag}
              type="button"
              className="num inline-flex items-center gap-1 rounded-[4px] border border-accent/40 bg-accent/10 px-2 py-1 text-xs text-accent"
              onClick={() => onChange(value.filter((t) => t !== tag))}
            >
              {tag}
              <span aria-hidden>×</span>
            </button>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <input
          type="text"
          className="input"
          placeholder={placeholder ?? 'タグを追加（例: 高たんぱく）'}
          value={text}
          enterKeyHint="done"
          onChange={(e) => {
            const v = e.target.value
            if (v.endsWith(',') || v.endsWith('、')) {
              setText(v.slice(0, -1))
              // カンマ入力で即確定
              const t = v.slice(0, -1).trim()
              if (t && !value.includes(t)) onChange([...value, t])
              setText('')
            } else {
              setText(v)
            }
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              commit()
            }
          }}
          onBlur={commit}
        />
      </div>
    </div>
  )
}
