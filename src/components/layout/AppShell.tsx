import { Outlet } from 'react-router-dom'
import { BottomNav } from './BottomNav'

export function AppShell() {
  return (
    <div className="mx-auto flex min-h-screen max-w-[420px] flex-col bg-sun">
      <main className="flex-1 px-5 pb-4 pt-6">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  )
}
