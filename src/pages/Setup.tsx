import { useState } from 'react'
import { useAuthStore } from '../store/authStore'
import { createFamily, createMember, getFamilyByInvite } from '../lib/supabase'
import { generateInviteCode } from '../lib/utils'

const COLORS = ['#E05555', '#00A381', '#6C5CE7', '#8A6D00', '#C9422B', '#7968CA']

export function Setup() {
  const [step, setStep] = useState<'create' | 'join'>('create')
  const [familyName, setFamilyName] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [memberName, setMemberName] = useState('')
  const [selectedColor, setSelectedColor] = useState('#6C5CE7')
  const [role, setRole] = useState<'parent' | 'child'>('child')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const user = useAuthStore((s) => s.user)
  const setFamily = useAuthStore((s) => s.setFamily)
  const setMember = useAuthStore((s) => s.setMember)

  const finishSetup = (family: { id: number }, member: { id: number }) => {
    setFamily(family as any)
    setMember(member as any)
    useAuthStore.setState({ needsSetup: false })
  }

  const handleCreate = async () => {
    if (!user || !familyName.trim() || !memberName.trim()) return
    setSaving(true)
    setError(null)
    const code = generateInviteCode()
    const { data: family } = await createFamily(familyName.trim(), code)
    if (family) {
      const { data: member } = await createMember({
        family_id: family.id,
        auth_id: user.id,
        name: memberName.trim(),
        color: selectedColor,
        role: 'parent',
      })
      if (member) {
        finishSetup(family, member)
      }
    }
    setSaving(false)
  }

  const handleJoin = async () => {
    if (!user || !inviteCode.trim() || !memberName.trim()) return
    setSaving(true)
    setError(null)
    const { data: family, error: familyError } = await getFamilyByInvite(
      inviteCode.trim().toUpperCase()
    )
    if (familyError || !family) {
      setError('Kein passender Einladungscode gefunden. Prüfe den Code!')
      setSaving(false)
      return
    }
    const { data: member, error: memberError } = await createMember({
      family_id: family.id,
      auth_id: user.id,
      name: memberName.trim(),
      color: selectedColor,
      role,
    })
    if (memberError || !member) {
      setError('Beitritt fehlgeschlagen. Versuch es nochmal!')
      setSaving(false)
      return
    }
    finishSetup(family, member)
    setSaving(false)
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-sun px-6">
      <div className="w-full max-w-sm text-center">
        <div className="mb-3 text-[56px]">🏠</div>
        <h1 className="mb-1 text-[28px] font-black text-ink">Willkommen!</h1>
        <p className="mb-8 text-[14px] font-semibold text-ink-soft">
          Wie willst du starten?
        </p>

        <div className="mb-6 flex gap-2" role="tablist" aria-label="Familie starten">
          <button
            role="tab"
            aria-selected={step === 'create'}
            onClick={() => {
              setStep('create')
              setError(null)
            }}
            className={`flex-1 rounded-2xl py-3 text-[14px] font-bold transition ${
              step === 'create' ? 'bg-coral text-white' : 'bg-white text-ink-soft'
            }`}
          >
            Neu erstellen
          </button>
          <button
            role="tab"
            aria-selected={step === 'join'}
            onClick={() => {
              setStep('join')
              setError(null)
            }}
            className={`flex-1 rounded-2xl py-3 text-[14px] font-bold transition ${
              step === 'join' ? 'bg-coral text-white' : 'bg-white text-ink-soft'
            }`}
          >
            Beitreten
          </button>
        </div>

        <div className="flex flex-col gap-3">
          {step === 'create' ? (
            <input
              className="w-full rounded-2xl border-2 border-ink-soft bg-white px-5 py-4 text-center text-[16px] font-bold text-ink outline-none focus:border-coral"
              placeholder="Familienname"
              value={familyName}
              onChange={(e) => setFamilyName(e.target.value)}
            />
          ) : (
            <input
              className="w-full rounded-2xl border-2 border-ink-soft bg-white px-5 py-4 text-center text-[16px] font-black tracking-[0.3em] text-ink outline-none focus:border-coral uppercase"
              placeholder="EINLADUNG"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
              maxLength={6}
              autoCapitalize="characters"
            />
          )}
          <input
            className="w-full rounded-2xl border-2 border-ink-soft bg-white px-5 py-4 text-center text-[16px] font-bold text-ink outline-none focus:border-coral"
            placeholder="Dein Name"
            value={memberName}
            onChange={(e) => setMemberName(e.target.value)}
          />

          <div className="flex justify-center gap-2">
            {COLORS.map((c) => (
              <button
                key={c}
                onClick={() => setSelectedColor(c)}
                aria-label={`Farbe wählen ${c}`}
                aria-pressed={selectedColor === c}
                className={`h-11 w-11 rounded-full border-[2px] shadow-sm transition-transform hover:scale-110 motion-reduce:hover:scale-100 ${
                  selectedColor === c ? 'border-ink scale-110' : 'border-white'
                }`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>

          {step === 'join' && (
            <div className="flex gap-2">
              <button
                role="tab"
                aria-pressed={role === 'child'}
                onClick={() => setRole('child')}
                className={`flex-1 rounded-2xl py-3 text-[14px] font-bold transition ${
                  role === 'child' ? 'bg-teal text-white' : 'bg-white text-ink-soft'
                }`}
              >
                🥷 Kind
              </button>
              <button
                role="tab"
                aria-pressed={role === 'parent'}
                onClick={() => setRole('parent')}
                className={`flex-1 rounded-2xl py-3 text-[14px] font-bold transition ${
                  role === 'parent' ? 'bg-coral text-white' : 'bg-white text-ink-soft'
                }`}
              >
                👨‍👩‍👧 Elternteil
              </button>
            </div>
          )}

          {error && (
            <p role="alert" className="rounded-2xl bg-wash-coral px-4 py-2 text-[13px] font-bold text-rose-deep">
              {error}
            </p>
          )}

          <button
            onClick={step === 'create' ? handleCreate : handleJoin}
            disabled={saving || !memberName || (step === 'create' ? !familyName : !inviteCode)}
            className="mt-2 w-full rounded-2xl bg-gradient-to-r from-coral to-coral-deep py-4 text-[16px] font-bold text-white shadow-lg transition-transform hover:scale-[1.02] disabled:opacity-40"
          >
            {saving
              ? 'Wird geladen...'
              : step === 'create'
              ? '🚀 Familie gründen'
              : '🔗 Beitreten'}
          </button>
        </div>
      </div>
    </div>
  )
}