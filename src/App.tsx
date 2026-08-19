import {
  createBrowserRouter,
  Navigate,
  RouterProvider,
} from 'react-router-dom'
import { AppShell } from './components/layout/AppShell'
import { DayDetailPage } from './pages/DayDetailPage'
import { LogPage } from './pages/LogPage'
import { TodayPage } from './pages/TodayPage'

// 認証なし構成（オーナーの判断）。ログイン画面もセッション管理も持たない。
const router = createBrowserRouter([
  {
    element: <AppShell />,
    children: [
      { path: '/', element: <TodayPage /> },
      { path: '/log', element: <LogPage /> },
      { path: '/log/:date', element: <DayDetailPage /> },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
])

export default function App() {
  return <RouterProvider router={router} />
}
