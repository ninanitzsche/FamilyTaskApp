import { create } from 'zustand'
import { supabase } from '../config/supabase'
import { saveLastMember } from '../lib/identityCache'
import { saveMemberSession } from '../lib/memberSessionCache'
import type { MemberRow, FamilyRow } from '../types/supabase'

interface AuthState {
  user: import('@supabase/supabase-js').User | null
  family: FamilyRow | null
  member: MemberRow | null
  loading: boolean
  init: () => () => void
  signInAsChild: () => Promise<void>
  signOut: () => Promise<void>
  switchToMember: (session: { access_token: string; refresh_token: string }) => Promise<void>
  setFamily: (family: FamilyRow) => void
  setMember: (member: MemberRow) => void
  needsSetup: boolean
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  family: null,
  member: null,
  loading: true,
  needsSetup: false,

  init: () => {
    const { data } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        set({ user: session.user, loading: false })
        // Try to load existing member
        const { data: member } = await supabase
          .from('members')
          .select('*, families!inner(*)')
          .eq('auth_id', session.user.id)
          .maybeSingle()
        if (member) {
          const m = member as MemberRow & { families: FamilyRow }
          set({ member: m, family: m.families, needsSetup: false })
          saveLastMember({ name: m.name, color: m.color, familyName: m.families.name })
          const { data: sessionData } = await supabase.auth.getSession()
          if (sessionData.session) {
            saveMemberSession({
              memberId: m.id,
              name: m.name,
              color: m.color,
              role: m.role,
              familyId: m.family_id,
              familyName: m.families.name,
              session: {
                access_token: sessionData.session.access_token,
                refresh_token: sessionData.session.refresh_token,
              },
            })
          }
        } else {
          set({ needsSetup: true })
        }
      } else {
        set({ user: null, family: null, member: null, loading: false, needsSetup: false })
      }
    })
    return data.subscription.unsubscribe
  },

  signInAsChild: async () => {
    await supabase.auth.signInAnonymously()
  },

  signOut: async () => {
    await supabase.auth.signOut()
    set({ user: null, family: null, member: null, needsSetup: false })
  },

  switchToMember: async (session) => {
    await supabase.auth.setSession(session)
  },

  setFamily: (family) => set({ family }),
  setMember: (member) => set({ member }),
}))
