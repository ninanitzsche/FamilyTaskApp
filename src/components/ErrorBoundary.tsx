import { Component, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-sun px-6 text-center">
          <div className="mb-4 text-[64px]">😵</div>
          <h1 className="mb-2 text-[24px] font-black text-ink">
            Ups, etwas ist schiefgelaufen!
          </h1>
          <p className="mb-6 text-[14px] text-ink-soft">
            Keine Sorge, deine Daten sind sicher.
          </p>
          <button
            onClick={() => {
              this.setState({ hasError: false, error: null })
              window.location.href = '/dashboard'
            }}
            className="rounded-2xl bg-coral px-8 py-3 text-[14px] font-bold text-white shadow-lg transition-all active:scale-95"
          >
            Zurück zum Dashboard
          </button>
          {this.state.error && (
            <p className="mt-4 max-w-sm text-[11px] text-ink-soft">
              {this.state.error.message}
            </p>
          )}
        </div>
      )
    }

    return this.props.children
  }
}
