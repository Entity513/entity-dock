import { useState, type FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from './AuthProvider'

export function LoginPage() {
  const { session } = useAuth()
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [sent, setSent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (session) {
    return <Navigate to="/" replace />
  }

  const sendLink = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    const { error: err } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        shouldCreateUser: false, // サインアップは作らない（単一ユーザー運用）
        emailRedirectTo: window.location.origin,
      },
    })
    setBusy(false)
    if (err) {
      setError(
        err.message.includes('Signups not allowed')
          ? 'このメールアドレスは登録されていません。'
          : `送信に失敗しました: ${err.message}`,
      )
      return
    }
    setSent(true)
  }

  const verifyCode = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    const { error: err } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token: code.trim(),
      type: 'email',
    })
    setBusy(false)
    if (err) {
      setError('コードが正しくないか、期限切れです。再送信してください。')
    }
    // 成功時は onAuthStateChange → session 設定 → 上の Navigate が発火する
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="num text-3xl font-semibold tracking-widest">
            ENTITY DOCK
          </h1>
          <p className="mt-3 text-xs tracking-[0.3em] text-ink-dim">
            あなたの夢を、目的地へ。
          </p>
        </div>

        <div className="panel p-5">
          {!sent ? (
            <form onSubmit={sendLink} className="flex flex-col gap-4">
              <div>
                <label htmlFor="email" className="microlabel mb-1.5 block">
                  EMAIL
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="input num"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <button type="submit" className="btn-primary" disabled={busy}>
                {busy ? '送信中…' : 'ログインコードを送信'}
              </button>
            </form>
          ) : (
            <form onSubmit={verifyCode} className="flex flex-col gap-4">
              <p className="text-sm text-ink-dim">
                <span className="num text-ink">{email}</span>{' '}
                にメールを送信しました。メール内の
                <span className="text-ink">6桁コード</span>
                を入力するか、リンクを開いてください。
              </p>
              <div>
                <label htmlFor="code" className="microlabel mb-1.5 block">
                  CODE
                </label>
                <input
                  id="code"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  required
                  className="input num text-center text-2xl tracking-[0.5em]"
                  placeholder="000000"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                />
              </div>
              <button type="submit" className="btn-primary" disabled={busy}>
                {busy ? '確認中…' : 'ログイン'}
              </button>
              <button
                type="button"
                className="btn-ghost"
                onClick={() => {
                  setSent(false)
                  setCode('')
                  setError(null)
                }}
              >
                メールアドレスを変更 / 再送信
              </button>
            </form>
          )}

          {error && (
            <p className="mt-4 border border-alert/40 bg-alert/10 p-3 text-sm text-alert">
              {error}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
