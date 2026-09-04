import { lazy, Suspense, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import { useAuthStore } from './store/authStore'
import { LoadingScreen } from './components/ui/LoadingScreen'
import { ErrorBoundary } from './components/ErrorBoundary'
import { AppShell } from './components/layout/AppShell'
import { Login } from './pages/Login'
import { Setup } from './pages/Setup'

function lazyPage(fn: () => Promise<{ [key: string]: unknown }>) {
  return lazy(async () => {
    const mod = await fn()
    const key = Object.keys(mod).find((k) => k[0] === k[0].toUpperCase() && !k.startsWith('use'))
    return { default: (key ? mod[key] : mod.default) as React.ComponentType }
  })
}

const Dashboard = lazyPage(() => import('./pages/Dashboard'))
const Backlog = lazyPage(() => import('./pages/Backlog'))
const SessionSelect = lazyPage(() => import('./pages/SessionSelect'))
const SessionActive = lazyPage(() => import('./pages/SessionActive'))
const SessionFree = lazyPage(() => import('./pages/SessionFree'))
const SessionResult = lazyPage(() => import('./pages/SessionResult'))
const SessionDetail = lazyPage(() => import('./pages/SessionDetail'))
const Achievements = lazyPage(() => import('./pages/Achievements'))
const Profile = lazyPage(() => import('./pages/Profile'))
const Rewards = lazyPage(() => import('./pages/Rewards'))
const MyDay = lazyPage(() => import('./pages/MyDay'))

function Page({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<LoadingScreen />}>{children}</Suspense>
}

function AppRoutes() {
  const { isAuthenticated, loading, needsSetup, isParent, member } = useAuth()

  if (loading || (isAuthenticated && !member && !needsSetup)) return <LoadingScreen />

  if (!isAuthenticated) {
    return (
      <Routes>
        <Route path="*" element={<Login />} />
      </Routes>
    )
  }

  if (needsSetup) return <Setup />

  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route path="/meintag" element={<Page><MyDay /></Page>} />
        <Route path="/dashboard" element={<Page><Dashboard /></Page>} />
        <Route path="/backlog" element={<Page><Backlog /></Page>} />
        <Route path="/rewards" element={<Page><Rewards /></Page>} />
        <Route path="/achievements" element={<Page><Achievements /></Page>} />
        <Route path="/profile" element={<Page><Profile /></Page>} />
      </Route>
      <Route path="/session/select" element={<Page><SessionSelect /></Page>} />
      <Route path="/session/active" element={<Page><SessionActive /></Page>} />
      <Route path="/session/free" element={<Page><SessionFree /></Page>} />
      <Route path="/session/result" element={<Page><SessionResult /></Page>} />
      <Route path="/achievements/session/:sessionId" element={<Page><SessionDetail /></Page>} />
      <Route path="*" element={<Navigate to={isParent ? '/meintag' : '/dashboard'} replace />} />
    </Routes>
  )
}

export default function App() {
  useEffect(() => {
    const unsubscribe = useAuthStore.getState().init()
    return unsubscribe
  }, [])

  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </ErrorBoundary>
  )
}
