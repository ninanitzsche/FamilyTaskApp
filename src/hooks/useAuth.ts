import { useAuthStore } from '../store/authStore'

export function useAuth() {
  const user = useAuthStore((s) => s.user)
  const family = useAuthStore((s) => s.family)
  const member = useAuthStore((s) => s.member)
  const loading = useAuthStore((s) => s.loading)
  const needsSetup = useAuthStore((s) => s.needsSetup)
  const signInAsChild = useAuthStore((s) => s.signInAsChild)
  const switchToMember = useAuthStore((s) => s.switchToMember)
  const signOut = useAuthStore((s) => s.signOut)

  return {
    user,
    family,
    member,
    loading,
    needsSetup,
    isAuthenticated: !!user,
    isParent: member?.role === 'parent',
    signInAsChild,
    switchToMember,
    signOut,
  }
}
