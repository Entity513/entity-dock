import {
  createBrowserRouter,
  Navigate,
  RouterProvider,
} from 'react-router-dom'
import { LoginPage } from './auth/LoginPage'
import { RequireAuth } from './auth/RequireAuth'
import { AppShell } from './components/layout/AppShell'
import { DayDetailPage } from './pages/DayDetailPage'
import { LogPage } from './pages/LogPage'
import { TodayPage } from './pages/TodayPage'

const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  {
    element: <RequireAuth />,
    children: [
      {
        element: <AppShell />,
        children: [
          { path: '/', element: <TodayPage /> },
          { path: '/log', element: <LogPage /> },
          { path: '/log/:date', element: <DayDetailPage /> },
        ],
      },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
])

export default function App() {
  return <RouterProvider router={router} />
}
