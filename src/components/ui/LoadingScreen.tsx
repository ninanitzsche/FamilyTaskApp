import { Loader2 } from 'lucide-react'

export function LoadingScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-sun">
      <div className="text-center" role="status" aria-live="polite">
        <div className="mb-4 text-[56px]">🥷</div>
        <Loader2 className="mx-auto h-8 w-8 animate-spin text-coral" />
        <p className="mt-3 text-[14px] font-bold text-ink">
          FamilyBoard lädt...
        </p>
      </div>
    </div>
  )
}
