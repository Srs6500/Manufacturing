import { Link, useSearchParams } from 'react-router-dom'

export function LandingPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const error = searchParams.get('error')

  const clearError = () => setSearchParams({}, { replace: true })

  return (
    <div className="min-h-screen text-[var(--bp-ink)] bp-grid-bg">
      {error && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 max-w-md px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm flex items-center justify-between gap-4">
          <span>
            {error === 'auth_failed' && 'GitHub sign-in failed. Please try again.'}
            {error === 'no_code' && 'Sign-in was cancelled or incomplete.'}
            {error === 'session' && 'Session error. Please try again.'}
            {error === 'logout_failed' && 'Sign out failed. Please try again.'}
            {!['auth_failed', 'no_code', 'session', 'logout_failed'].includes(error) && 'Something went wrong.'}
          </span>
          <button onClick={clearError} className="text-red-400 hover:text-red-300" aria-label="Dismiss">
            ×
          </button>
        </div>
      )}
      {/* Hero */}
      <section className="relative min-h-[90vh] flex flex-col justify-center overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: 'url(/images/hero-manufacturing.png)' }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[var(--bp-bg)]/80 via-[var(--bp-bg)]/70 to-[var(--bp-bg)]" />
        <div className="relative max-w-5xl mx-auto px-6 py-24 text-center">
          <h1
            className="text-5xl md:text-7xl font-bold tracking-tight mb-6"
            style={{ fontFamily: 'var(--font-ui)' }}
          >
            <span className="text-[var(--bp-ink)]">One prompt.</span>
            <br />
            <span className="text-[var(--bp-energy)]">One perfect part.</span>
          </h1>
          <p className="text-xl md:text-2xl text-[var(--bp-ink-muted)] max-w-2xl mx-auto mb-10">
            Natural language → manufacturable lattice structure. STL, Builder Spec, certificate. Under 7 minutes.
          </p>
          <Link
            to="/sign-in"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-lg bg-[var(--bp-energy)]/20 text-[var(--bp-energy)] border-2 border-[var(--bp-energy)]/50 font-semibold text-lg hover:bg-[var(--bp-energy)]/30 hover:border-[var(--bp-energy)] transition-all"
          >
            Try now
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="relative py-24 border-t border-[var(--bp-glass-border)]">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-center mb-16 text-[var(--bp-ink)]">
            What you get
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              {
                title: 'Prompt to part',
                desc: 'Describe your part in plain English. We extract requirements and generate lattice geometry.',
                icon: '✎',
              },
              {
                title: 'Material intelligence',
                desc: 'Curated + Materials Project. Toxicity checked via PubChem. Pick your material, we optimize.',
                icon: '◇',
              },
              {
                title: 'Builder Spec',
                desc: 'Professional PDF with specs, load estimates, safety factor. Print-ready documentation.',
                icon: '⊞',
              },
              {
                title: 'My designs',
                desc: 'Clock icon. Reopen past jobs. Change lattice pattern. Regenerate. Download anytime.',
                icon: '◷',
              },
            ].map((f) => (
              <div
                key={f.title}
                className="p-6 rounded-xl border border-[var(--bp-glass-border)] bg-[var(--bp-glass)]/50 hover:border-[var(--bp-energy)]/30 transition-colors"
              >
                <span className="text-3xl text-[var(--bp-energy)] mb-4 block">{f.icon}</span>
                <h3 className="text-lg font-semibold text-[var(--bp-ink)] mb-2">{f.title}</h3>
                <p className="text-sm text-[var(--bp-ink-muted)]">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Visual: Lattice */}
      <section className="relative py-24 border-t border-[var(--bp-glass-border)]">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold mb-8 text-[var(--bp-ink)]">
            Lattice patterns
          </h2>
          <p className="text-[var(--bp-ink-muted)] mb-12 max-w-xl mx-auto">
            Strut grid, octet truss, honeycomb, gyroid. Choose and tweak. Apply & re-validate.
          </p>
          <div className="rounded-xl overflow-hidden border border-[var(--bp-glass-border)] bg-[var(--bp-bg)] shadow-lg">
            <img
              src="/images/lattice-wireframe.png"
              alt="Lattice structure — strut grid, octet truss, honeycomb, gyroid patterns"
              className="w-full h-80 object-cover object-center"
            />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative py-24 border-t border-[var(--bp-glass-border)]">
        <div className="max-w-2xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold mb-4 text-[var(--bp-ink)]">
            Ready to manifest?
          </h2>
          <p className="text-[var(--bp-ink-muted)] mb-8">
            One prompt = one perfect part + one manual + one memory — forever.
          </p>
          <Link
            to="/sign-in"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-lg bg-[var(--bp-energy)]/20 text-[var(--bp-energy)] border-2 border-[var(--bp-energy)]/50 font-semibold hover:bg-[var(--bp-energy)]/30 hover:border-[var(--bp-energy)] transition-all"
          >
            Get started
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t border-[var(--bp-glass-border)]">
        <div className="max-w-6xl mx-auto px-6 flex items-center justify-between">
          <span className="text-sm text-[var(--bp-ink-muted)]">Lattice AI — Electric Blueprint</span>
        </div>
      </footer>
    </div>
  )
}
