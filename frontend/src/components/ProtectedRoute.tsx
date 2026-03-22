import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { getAuthStatus } from '../lib/api'

interface ProtectedRouteProps {
  children: React.ReactNode
}

/**
 * Wraps /app so it only renders when the user is authenticated via GitHub.
 * If not authenticated, redirects to landing page.
 */
export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const [status, setStatus] = useState<'loading' | 'authenticated' | 'unauthenticated'>('loading')

  useEffect(() => {
    getAuthStatus()
      .then((auth) => {
        setStatus(auth.authenticated ? 'authenticated' : 'unauthenticated')
      })
      .catch(() => {
        setStatus('unauthenticated')
      })
  }, [])

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bp-bg)]">
        <div className="text-[var(--bp-ink-muted)] animate-pulse">Checking authentication…</div>
      </div>
    )
  }

  if (status === 'unauthenticated') {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}
