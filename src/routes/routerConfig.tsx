import { createBrowserRouter, createHashRouter, Navigate, type RouteObject } from 'react-router-dom'
import { Layout } from '../components/Layout/Layout'
import { LoadingState } from '../components/organisms/LoadingState/LoadingState'
import { useAuth } from '../contexts/AuthContext'
import { Calendario } from '../pages/Calendario/Calendario'
import { Chat } from '../pages/Chat/Chat'
import { Dashboard } from '../pages/Dashboard/Dashboard'
import { Auditoria } from '../pages/Auditoria/Auditoria'
import { Goals } from '../pages/Goals/Goals'
import { Login } from '../pages/Login/Login'
import { Report } from '../pages/Report/Report'
import { Settings } from '../pages/Settings/Settings'
import { ProtectedRoute } from './ProtectedRoute'

const RootRedirect = (): JSX.Element => {
  const { isAuthenticated, loading } = useAuth()

  if (loading) {
    return <LoadingState label="Carregando sessao..." centered />
  }

  return <Navigate to={isAuthenticated ? '/chat' : '/login'} replace />
}

const routes: RouteObject[] = [
  {
    path: '/',
    element: <RootRedirect />
  },
  {
    path: '/login',
    element: <Login />
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <Layout />,
        children: [
          {
            path: '/chat',
            element: <Chat />
          },
          {
            path: '/dashboard',
            element: <Dashboard />
          },
          {
            path: '/report',
            element: <Report />
          },
          {
            path: '/goals',
            element: <Goals />
          },
          {
            path: '/auditoria',
            element: <Auditoria />
          },
          {
            path: '/calendario',
            element: <Calendario />
          },
          {
            path: '/settings',
            element: <Settings />
          }
        ]
      }
    ]
  }
]

const isFileProtocol = typeof window !== 'undefined' && window.location.protocol === 'file:'

export const router = isFileProtocol ? createHashRouter(routes) : createBrowserRouter(routes)
