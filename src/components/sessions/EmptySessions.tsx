interface EmptySessionsProps {
  onStartSession: () => void
}

export function EmptySessions({ onStartSession }: EmptySessionsProps) {
  return (
    <div className="rounded-[16px] bg-white p-5 text-center shadow-sm">
      <p className="mb-1 text-[36px]">🧸</p>
      <p className="mb-3 text-[13px] font-semibold text-ink-soft">
        Noch keine Aufräum-Action!
      </p>
      <button
        onClick={onStartSession}
        className="rounded-2xl bg-gradient-to-br from-coral to-coral-deep px-6 py-3 text-[14px] font-bold text-white shadow-md transition-all active:scale-[0.97]"
      >
        🔥 Session starten
      </button>
    </div>
  )
}