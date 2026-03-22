import { useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { getAuthStatus } from '../lib/api'
import { GitHubMark } from '../components/GitHubMark'

const TAGLINE = 'One prompt = one perfect part + one manual + one memory — forever.'

/**
 * Always shown before GitHub OAuth when coming from the landing page.
 * If already signed in to Lattice, redirects to /app.
 */
export function SignInPage() {
  const [status, setStatus] = useState<'loading' | 'guest' | 'authed'>('loading')

  useEffect(() => {
    getAuthStatus()
      .then((a) => setStatus(a.authenticated ? 'authed' : 'guest'))
      .catch(() => setStatus('guest'))
  }, [])

  if (status === 'loading') {
    return (
      <div className="min-h-screen bp-grid-bg flex items-center justify-center">
        <p className="text-[var(--bp-ink-muted)] text-sm animate-pulse">Loading…</p>
      </div>
    )
  }

  if (status === 'authed') {
    return <Navigate to="/app" replace />
  }

  return (
    <div className="min-h-screen bp-grid-bg text-[var(--bp-ink)] flex flex-col">
      <header className="border-b border-[var(--bp-glass-border)] bg-[var(--bp-glass)]/80 backdrop-blur-sm shrink-0">
        <div className="max-w-lg mx-auto px-6 py-6 flex flex-col items-center text-center">
          <Link to="/" className="hover:opacity-90 transition-opacity">
            <div className="flex items-center justify-center gap-3 mb-2">
              <div
                className="w-11 h-11 rounded-xl border border-[var(--bp-energy)]/40 bg-[var(--bp-energy)]/10 flex items-center justify-center text-[var(--bp-energy)] font-mono text-lg font-bold"
                aria-hidden
              >
                ⌬
              </div>
              <span className="text-xl font-semibold tracking-tight" style={{ fontFamily: 'var(--font-ui)' }}>
                Lattice AI
              </span>
            </div>
            <p className="text-xs text-[var(--bp-ink-muted)] max-w-sm">{TAGLINE}</p>
          </Link>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-md rounded-xl border border-[var(--bp-glass-border)] bg-[var(--bp-glass)]/60 backdrop-blur-sm p-8 shadow-lg">
          <h1 className="text-2xl font-bold text-[var(--bp-ink)] mb-3 text-center" style={{ fontFamily: 'var(--font-ui)' }}>
            Sign in to continue
          </h1>
          <p className="text-sm text-[var(--bp-ink-muted)] text-center mb-8 leading-relaxed">
            Connect GitHub to save your session, then describe your part in plain language — we’ll generate lattice geometry,
            materials intelligence, and your Builder Spec.
          </p>

          <a
            href="/auth/github"
            className="flex w-full items-center justify-center gap-3 rounded-lg bg-[var(--bp-energy)] px-5 py-3.5 text-[#001133] font-semibold text-base hover:brightness-110 active:brightness-95 transition-all border border-[var(--bp-energy)] shadow-[0_0_24px_rgba(0,255,255,0.15)]"
          >
            <GitHubMark className="w-6 h-6 shrink-0" />
            Sign in with GitHub
          </a>

          <p className="mt-6 text-xs text-[var(--bp-ink-muted)] text-center leading-relaxed">
            We use GitHub only to identify you. We don’t access your repositories for this product.
          </p>
        </div>

        <Link
          to="/"
          className="mt-8 text-sm text-[var(--bp-energy)] hover:underline"
        >
          ← Back to home
        </Link>

        <a
          href="https://docs.github.com/en/site-policy/privacy-policies/github-privacy-statement"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 text-xs text-[var(--bp-ink-muted)] hover:text-[var(--bp-energy)] underline"
        >
          Privacy & data (GitHub)
        </a>
      </main>
    </div>
  )
}
