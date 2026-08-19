import {
  createBrowserRouter,
  Navigate,
  RouterProvider,
} from 'react-router-dom'
import { AppShell } from './components/layout/AppShell'
import { BridgePage } from './pages/BridgePage'
import { DayDetailPage } from './pages/DayDetailPage'
import { DrivePage } from './pages/DrivePage'
import { FuelPage } from './pages/FuelPage'
import { MindPage } from './pages/MindPage'
import { RestPage } from './pages/RestPage'

// 認証なし構成（オーナーの判断）。ログイン画面もセッション管理も持たない。
const router = createBrowserRouter([
  {
    element: <AppShell />,
    children: [
      { path: '/', element: <BridgePage /> },
      { path: '/drive', element: <DrivePage /> },
      { path: '/fuel', element: <FuelPage /> },
      { path: '/mind', element: <MindPage /> },
      { path: '/rest', element: <RestPage /> },
      { path: '/log/:date', element: <DayDetailPage /> },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
])

export default function App() {
  return <RouterProvider router={router} />
}
