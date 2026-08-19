import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from './AuthProvider'

export function RequireAuth() {
  const { session, loading } = useAuth()

  // コールドスタート時にログイン画面が一瞬見えるのを防ぐ
  if (loading) {
    return (
      <div className="flex h-dvh items-center justify-center">
        <span className="microlabel animate-pulse">CONNECTING…</span>
      </div>
    )
  }

  if (!session) {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}
