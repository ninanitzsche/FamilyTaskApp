import { NavLink } from 'react-router-dom'
import { Home, ClipboardList, Gift, Trophy, User, Sun } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'

const childNavItems = [
  { to: '/dashboard', icon: Home, label: 'Home' },
  { to: '/backlog', icon: ClipboardList, label: 'Aufgaben' },
  { to: '/rewards', icon: Gift, label: 'Belohnungen' },
  { to: '/achievements', icon: Trophy, label: 'Erfolge' },
  { to: '/profile', icon: User, label: 'Profil' },
]

const parentNavItems = [
  { to: '/meintag', icon: Sun, label: 'Mein Tag' },
  { to: '/backlog', icon: ClipboardList, label: 'Aufgaben' },
  { to: '/rewards', icon: Gift, label: 'Belohnungen' },
  { to: '/achievements', icon: Trophy, label: 'Erfolge' },
  { to: '/profile', icon: User, label: 'Profil' },
]

export function BottomNav() {
  const { isParent } = useAuth()
  const navItems = isParent ? parentNavItems : childNavItems

  return (
    <nav className="border-t border-wash-plum bg-white px-3 py-2">
      <div className="mx-auto flex max-w-lg justify-around">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex min-h-[44px] flex-col items-center justify-center gap-0.5 rounded-xl px-2 py-2 text-[10px] font-bold transition ${
                isActive ? 'bg-wash-plum text-coral-deep' : 'text-ink-soft'
              }`
            }
          >
            <item.icon className="h-6 w-6" />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
