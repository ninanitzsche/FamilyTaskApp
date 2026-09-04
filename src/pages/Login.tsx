import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { loadLastMember } from '../lib/identityCache'
import { loadMemberSessions } from '../lib/memberSessionCache'

const PREVIEW_IMAGES = [
  { src: '/images/tasks/lego.png', alt: 'Lego', bg: 'bg-wash-coral' },
  { src: '/images/tasks/dinos.png', alt: 'Dinos', bg: 'bg-wash-teal' },
  { src: '/images/tasks/kuscheltiere.png', alt: 'Kuscheltiere', bg: 'bg-wash-gold' },
  { src: '/images/tasks/zaehne.png', alt: 'Zähne', bg: 'bg-wash-sky' },
  { src: '/images/tasks/waesche.png', alt: 'Wäsche', bg: 'bg-wash-plum' },
]

export function Login() {
  const { signInAsChild, switchToMember } = useAuth()
  const [starting, setStarting] = useState(false)
  const [switching, setSwitching] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const last = loadLastMember()
  const knownMembers = loadMemberSessions()

  const handleStart = async () => {
    if (starting) return
    setStarting(true)
    setError(null)
    try {
      await signInAsChild()
    } catch {
      setError('Ups, das hat nicht geklappt. Versuch es nochmal!')
      setStarting(false)
    }
  }

  const handleSwitch = async (accessToken: string, refreshToken: string) => {
    if (switching) return
    setSwitching(true)
    setError(null)
    try {
      await switchToMember({ access_token: accessToken, refresh_token: refreshToken })
    } catch {
      setError('Der Wechsel hat nicht geklappt. Versuch es nochmal!')
      setSwitching(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-sun px-6">
      <div className="w-full max-w-sm text-center">
        <div className="mx-auto mb-4 flex h-26 w-26 items-center justify-center rounded-[52px] shadow-[0_8px_24px_rgba(0,0,0,0.08)]">
          {last ? (
            <span
              className="flex h-26 w-26 items-center justify-center rounded-[52px] text-[48px] text-white"
              style={{ backgroundColor: last.color }}
            >
              {last.initial}
            </span>
          ) : (
            <span className="flex h-26 w-26 items-center justify-center rounded-[52px] bg-gradient-to-br from-coral to-coral-deep text-[56px]">
              🥷
            </span>
          )}
        </div>
        <h1 className="text-[28px] font-black tracking-tight text-ink">
          {last ? `Hallo ${last.name}!` : 'FamilyBoard'}
        </h1>
        <p className="mb-8 text-[14px] font-semibold text-ink-soft">
          {last ? (last.familyName || 'Dein Ninja-Team') : 'Dein Ninja-Team'}
        </p>

        <div className="mb-8 flex justify-center gap-2">
          {PREVIEW_IMAGES.map((img, i) => (
            <div
              key={img.src}
              className={`flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl shadow-[0_4px_12px_rgba(0,0,0,0.06)] ${
                i % 2 === 1 ? '-mt-1.5' : ''
              } ${img.bg}`}
            >
              <img
                src={img.src}
                alt={img.alt}
                className="h-full w-full object-cover"
              />
            </div>
          ))}
        </div>

        {knownMembers.length > 0 && (
          <div className="mb-6">
            <p className="mb-2 text-[12px] font-bold text-ink-soft">Wer bist du?</p>
            <div className="flex flex-wrap justify-center gap-2">
              {knownMembers.map((m) => (
                <button
                  key={m.memberId}
                  onClick={() => handleSwitch(m.session.access_token, m.session.refresh_token)}
                  disabled={switching}
                  className="flex flex-col items-center gap-1 rounded-2xl bg-white px-3 py-2 shadow-sm transition-transform active:scale-95 disabled:opacity-50"
                >
                  <span
                    className="flex h-10 w-10 items-center justify-center rounded-full text-[16px] font-black text-white"
                    style={{ backgroundColor: m.color }}
                  >
                    {m.name[0]?.toUpperCase()}
                  </span>
                  <span className="text-[11px] font-bold text-ink">{m.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {error && (
          <p role="alert" className="mb-4 rounded-2xl bg-wash-coral px-4 py-2 text-[13px] font-bold text-rose-deep">
            {error}
          </p>
        )}

        <button
          onClick={handleStart}
          disabled={starting}
          aria-label="Spiel starten"
          aria-busy={starting}
          className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-coral to-coral-deep text-white shadow-[0_6px_24px_rgba(255,122,92,0.4)] transition-all active:scale-95 disabled:cursor-wait disabled:opacity-70 motion-reduce:animate-none animate-[pulse_2.5s_ease-in-out_infinite]"
        >
          <svg
            viewBox="0 0 24 24"
            fill="currentColor"
            className="ml-1 h-9 w-9"
          >
            <path d="M8 5v14l11-7z" />
          </svg>
        </button>

        {starting || switching ? (
          <p className="mb-4 min-h-[16px] text-[14px] font-bold text-ink">
            {switching ? 'Wechsle …' : 'Lädt …'}
          </p>
        ) : (
          <p className="mb-4 text-[14px] font-bold text-ink">
            Los geht's!
          </p>
        )}
      </div>
    </div>
  )
}
