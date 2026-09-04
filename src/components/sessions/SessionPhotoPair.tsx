import type { SessionRow } from '../../types/supabase'

export function SessionPhotoPair({ session }: { session: SessionRow }) {
  const { before_photo, after_photo, created_at } = session
  if (!before_photo && !after_photo) return null
  const date = new Date(created_at).toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
  return (
    <div>
      <h2 className="mb-3 text-[14px] font-black text-ink">📸 Vorher · Nachher</h2>
      <div className="flex gap-2">
        {before_photo && (
          <div className="flex-1">
            <img
              src={before_photo}
              alt={`Vorher-Foto vom ${date}`}
              className="h-40 w-full rounded-2xl object-cover"
            />
            <p className="mt-1 text-center text-[10px] font-bold text-ink-soft">Vorher</p>
          </div>
        )}
        {after_photo && (
          <div className="flex-1">
            <img
              src={after_photo}
              alt={`Nachher-Foto vom ${date}`}
              className="h-40 w-full rounded-2xl object-cover"
            />
            <p className="mt-1 text-center text-[10px] font-bold text-ink-soft">Nachher</p>
          </div>
        )}
      </div>
    </div>
  )
}