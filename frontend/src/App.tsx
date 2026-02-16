import { useState, useRef, useEffect } from 'react'
import { LatticePreview } from './components/LatticePreview'
import { generate, downloadJobPackage, regenerateLattice } from './lib/api'
import { subscribeToJob, selectMaterial } from './lib/socket'
import type { AnalyzedRequirements } from './types/requirements'

const TAGLINE = 'One prompt = one perfect part + one manual + one memory — forever.'

type ProgressStep = 'idle' | 'analyzing' | 'material' | 'lattice' | 'simulating' | 'validating' | 'done'

const STEP_LABELS: Record<ProgressStep, string> = {
  idle: '',
  analyzing: 'Analyzing requirements…',
  material: 'Select a material to continue…',
  lattice: 'Generating lattice structure…',
  simulating: 'Running FEA & optimization…',
  validating: 'Validating printability & compliance…',
  done: 'Ready — download your package.',
}

/** Terminal-style label for Brain Feed */
function getBrainFeedLine(step: ProgressStep, prompt: string): string {
  if (step === 'idle') return ''
  if (step === 'analyzing') return `> Agent Requirement analyzing '${prompt.slice(0, 40)}${prompt.length > 40 ? '…' : ''}'`
  if (step === 'material') return `> Agent Material selecting…`
  if (step === 'lattice') return `> Agent Lattice generating…`
  if (step === 'simulating') return `> Agent FEA optimizing…`
  if (step === 'validating') return `> Agent Validator checking…`
  if (step === 'done') return `> Done.`
  return `> ${STEP_LABELS[step]}`
}

function TweakControls({
  params,
  onApply,
  disabled,
}: {
  params: { density: number; strutRadius: number; gridX: number; gridY: number; gridZ: number }
  onApply: (overrides: { density?: number; strutRadius?: number; gridX?: number; gridY?: number; gridZ?: number }) => void
  disabled: boolean
}) {
  const [density, setDensity] = useState(params.density)
  const [strutRadius, setStrutRadius] = useState(params.strutRadius)
  const [gridX, setGridX] = useState(params.gridX)
  const [gridY, setGridY] = useState(params.gridY)
  const [gridZ, setGridZ] = useState(params.gridZ)

  useEffect(() => {
    setDensity(params.density)
    setStrutRadius(params.strutRadius)
    setGridX(params.gridX)
    setGridY(params.gridY)
    setGridZ(params.gridZ)
  }, [params.density, params.strutRadius, params.gridX, params.gridY, params.gridZ])

  const handleApply = () => {
    onApply({ density, strutRadius, gridX, gridY, gridZ })
  }

  return (
    <div className="space-y-3 text-sm">
      <div>
        <label className="flex justify-between text-[var(--bp-ink-muted)] mb-1">
          <span>Density</span>
          <span className="text-[var(--bp-ink)]">{density.toFixed(2)}</span>
        </label>
        <input
          type="range"
          min={0.1}
          max={1}
          step={0.05}
          value={density}
          onChange={(e) => setDensity(Number(e.target.value))}
          className="w-full accent-[var(--bp-energy)]"
        />
      </div>
      <div>
        <label className="flex justify-between text-[var(--bp-ink-muted)] mb-1">
          <span>Strut radius (mm)</span>
          <span className="text-[var(--bp-ink)]">{strutRadius.toFixed(1)}</span>
        </label>
        <input
          type="range"
          min={0.5}
          max={5}
          step={0.25}
          value={strutRadius}
          onChange={(e) => setStrutRadius(Number(e.target.value))}
          className="w-full accent-[var(--bp-energy)]"
        />
      </div>
      <div>
        <label className="flex justify-between text-[var(--bp-ink-muted)] mb-1">
          <span>Unit cell (X×Y×Z)</span>
          <span className="text-[var(--bp-ink)]">{gridX}×{gridY}×{gridZ}</span>
        </label>
        <div className="flex gap-2">
          <input
            type="range"
            min={2}
            max={12}
            value={gridX}
            onChange={(e) => setGridX(Number(e.target.value))}
            className="flex-1 accent-[var(--bp-energy)]"
          />
          <input
            type="range"
            min={2}
            max={12}
            value={gridY}
            onChange={(e) => setGridY(Number(e.target.value))}
            className="flex-1 accent-[var(--bp-energy)]"
          />
          <input
            type="range"
            min={2}
            max={12}
            value={gridZ}
            onChange={(e) => setGridZ(Number(e.target.value))}
            className="flex-1 accent-[var(--bp-energy)]"
          />
        </div>
      </div>
      <button
        type="button"
        onClick={handleApply}
        disabled={disabled}
        className="w-full py-2 rounded border border-[var(--bp-energy)]/50 text-[var(--bp-energy)] hover:bg-[var(--bp-energy)]/10 disabled:opacity-50 text-xs font-medium"
      >
        {disabled ? 'Regenerating…' : 'Apply & re-validate'}
      </button>
    </div>
  )
}

function runMockProgress(setProgress: (s: ProgressStep) => void) {
  setProgress('analyzing')
  const steps: ProgressStep[] = ['material', 'lattice', 'simulating', 'validating', 'done']
  steps.forEach((step, i) => {
    setTimeout(() => setProgress(step), (i + 1) * 800)
  })
}

function App() {
  const [prompt, setPrompt] = useState('')
  const [progress, setProgress] = useState<ProgressStep>('idle')
  const [lastResult, setLastResult] = useState<AnalyzedRequirements | null>(null)
  const [materialOptions, setMaterialOptions] = useState<Array<{ id: string; name: string; summary: string }>>([])
  const [selectedMaterialId, setSelectedMaterialId] = useState<string | null>(null)
  const [latticeParams, setLatticeParams] = useState<{
    density: number
    strutRadius: number
    gridX: number
    gridY: number
    gridZ: number
  } | null>(null)
  const [latticeVersion, setLatticeVersion] = useState(0)
  const [simulation, setSimulation] = useState<{
    pattern: string
    estimatedMassG: number
    estimatedLoadKg: number
    safetyFactor: number
  } | null>(null)
  const [jobId, setJobId] = useState<string | null>(null)
  const [pipelineError, setPipelineError] = useState(false)
  const [downloadError, setDownloadError] = useState<string | null>(null)
  const [isDownloading, setIsDownloading] = useState(false)
  const [isRegenerating, setIsRegenerating] = useState(false)
  const unsubscribeRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    return () => {
      unsubscribeRef.current?.()
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!prompt.trim()) return
    setLastResult(null)
    setMaterialOptions([])
    setSelectedMaterialId(null)
    setLatticeParams(null)
    setSimulation(null)
    setLatticeVersion(0)
    setJobId(null)
    setPipelineError(false)
    setDownloadError(null)
    try {
      const { jobId: id } = await generate(prompt)
      setJobId(id)
      setProgress('analyzing')
      unsubscribeRef.current = subscribeToJob(id, (payload) => {
        setProgress(payload.step as ProgressStep)
        if (payload.step === 'material' && payload.materialOptions) {
          setMaterialOptions(payload.materialOptions)
        }
        if (payload.step === 'done') {
          if (payload.error) setPipelineError(true)
          else {
            if (payload.requirements != null) setLastResult(payload.requirements)
            if (payload.simulation) setSimulation(payload.simulation)
            if (payload.latticeParams) {
              setLatticeParams({
                density: payload.latticeParams.density,
                strutRadius: payload.latticeParams.strutRadius,
                gridX: payload.latticeParams.gridX,
                gridY: payload.latticeParams.gridY,
                gridZ: payload.latticeParams.gridZ,
              })
            }
            if (payload.selectedMaterialId) setSelectedMaterialId(payload.selectedMaterialId)
          }
        }
      })
    } catch {
      runMockProgress(setProgress)
    }
  }

  const handleDownload = async () => {
    if (!jobId) return
    setDownloadError(null)
    setIsDownloading(true)
    try {
      await downloadJobPackage(jobId)
    } catch (err) {
      setDownloadError(err instanceof Error ? err.message : 'Download failed')
    } finally {
      setIsDownloading(false)
    }
  }

  const handleRegenerate = async (overrides: {
    density?: number
    strutRadius?: number
    gridX?: number
    gridY?: number
    gridZ?: number
  }) => {
    if (!jobId) return
    setIsRegenerating(true)
    try {
      const res = await regenerateLattice(jobId, {
        ...(selectedMaterialId && { selectedMaterialId }),
        ...overrides,
      })
      setSimulation(res.simulation)
      setLatticeParams({
        density: res.latticeParams.density,
        strutRadius: res.latticeParams.strutRadius,
        gridX: res.latticeParams.gridX,
        gridY: res.latticeParams.gridY,
        gridZ: res.latticeParams.gridZ,
      })
      setLatticeVersion((v) => v + 1)
    } finally {
      setIsRegenerating(false)
    }
  }

  // Show Laboratory when we have a result OR when job completed (lattice/PDF may exist even if requirements failed)
  const showLaboratory =
    lastResult != null ||
    (jobId != null && progress === 'done') ||
    (jobId != null && progress === 'material' && materialOptions.length > 0)
  const isGenerating = progress !== 'idle' && progress !== 'done'

  return (
    <div className="min-h-screen bp-grid-bg text-[var(--bp-ink)] flex flex-col">
      {/* Minimal header — Electric Blueprint */}
      <header className="border-b border-[var(--bp-glass-border)] bg-[var(--bp-glass)] backdrop-blur-sm shrink-0">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold tracking-tight text-[var(--bp-ink)]" style={{ fontFamily: 'var(--font-ui)' }}>
              Lattice AI
            </h1>
            <p className="text-xs text-[var(--bp-ink-muted)] mt-0.5">{TAGLINE}</p>
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col max-w-7xl w-full mx-auto px-4 py-8">
        {!showLaboratory ? (
          /* ——— Mind's Eye (Input) ——— */
          <div className="flex-1 flex flex-col items-center justify-center gap-8 py-12">
            <form onSubmit={handleSubmit} className="w-full max-w-2xl flex flex-col gap-6">
              <label htmlFor="prompt" className="sr-only">
                What do you wish to manifest?
              </label>
              <textarea
                id="prompt"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="What do you wish to manifest?"
                className="w-full min-h-[140px] px-5 py-4 rounded-lg bg-[var(--bp-glass)] border border-[var(--bp-glass-border)] text-[var(--bp-ink)] placeholder-[var(--bp-ink-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--bp-energy)]/50 focus:border-[var(--bp-energy)]/50 resize-y font-medium text-lg"
                style={{ fontFamily: 'var(--font-ui)' }}
                disabled={isGenerating}
              />
              <div className="flex items-center gap-4 flex-wrap">
                <button
                  type="submit"
                  disabled={!prompt.trim() || isGenerating}
                  className="px-6 py-3 rounded-lg bg-[var(--bp-energy)]/20 text-[var(--bp-energy)] border border-[var(--bp-energy)]/50 font-medium hover:bg-[var(--bp-energy)]/30 disabled:opacity-50 disabled:pointer-events-none transition-colors"
                  style={{ fontFamily: 'var(--font-ui)' }}
                >
                  {progress === 'idle' || progress === 'done' ? 'Manifest' : 'Generating…'}
                </button>
                {isGenerating && (
                  <div className="flex-1 min-w-[120px] rounded-full overflow-hidden bg-[var(--bp-glass)] border border-[var(--bp-glass-border)]">
                    <div className="bp-coil-loader w-full h-full" />
                  </div>
                )}
              </div>
            </form>

            {/* Brain Feed — terminal-style log */}
            {isGenerating && (
              <div className="w-full max-w-2xl rounded-lg bg-black/40 border border-[var(--bp-glass-border)] px-4 py-3 font-mono text-sm text-[var(--bp-energy-dim)]" style={{ fontFamily: 'var(--font-mono)' }}>
                {getBrainFeedLine(progress, prompt)}
              </div>
            )}
          </div>
        ) : (
          /* ——— Laboratory (Results workspace) ——— */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1 min-h-0">
            {/* Left: Dynamo (Gauges + Material options) */}
            <aside className="lg:col-span-3 rounded-lg bg-[var(--bp-glass)] border border-[var(--bp-glass-border)] p-4 flex flex-col gap-4 overflow-auto">
              <h2 className="bp-datasheet-header text-[var(--bp-energy)]">Dynamo</h2>
              <div className="space-y-3 bp-datasheet text-[var(--bp-ink-muted)]">
                {simulation ? (
                  <>
                    <div className="flex justify-between items-center">
                      <span>Pattern</span>
                      <span className="text-[var(--bp-ink)]">{simulation.pattern}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Est. mass</span>
                      <span className="text-[var(--bp-ink)]">{simulation.estimatedMassG} g</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Est. load</span>
                      <span className="text-[var(--bp-ink)]">{simulation.estimatedLoadKg} kg</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Safety factor</span>
                      <span className="text-[var(--bp-ink)]">{simulation.safetyFactor}</span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex justify-between items-center">
                      <span>Stress</span>
                      <span className="text-[var(--bp-ink)]">—</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Weight</span>
                      <span className="text-[var(--bp-ink)]">—</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Cost</span>
                      <span className="text-[var(--bp-ink)]">—</span>
                    </div>
                  </>
                )}
              </div>
              {materialOptions.length > 0 && (
                <div className="pt-3 border-t border-[var(--bp-glass-border)]">
                  <p className="text-[var(--bp-ink-muted)] text-xs uppercase tracking-wider mb-2">
                    {progress === 'material' ? 'Select material' : 'Materials considered'}
                  </p>
                  <ul className="space-y-2 text-sm">
                    {materialOptions.map((m) => (
                      <li key={m.id}>
                        {progress === 'material' && jobId ? (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedMaterialId(m.id)
                              selectMaterial(jobId, m.id)
                            }}
                            className="w-full text-left px-3 py-2 rounded border border-[var(--bp-glass-border)] hover:border-[var(--bp-energy)] hover:bg-[var(--bp-glass)] transition-colors text-[var(--bp-ink)]"
                          >
                            <span className="font-medium">{m.name}</span>
                            {m.summary && (
                              <span className="block text-xs text-[var(--bp-ink-muted)] mt-0.5">{m.summary}</span>
                            )}
                          </button>
                        ) : (
                          <span className="text-[var(--bp-ink)]">{m.name}</span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {progress === 'done' && latticeParams && jobId && (
                <div className="pt-3 border-t border-[var(--bp-glass-border)]">
                  <p className="text-[var(--bp-ink-muted)] text-xs uppercase tracking-wider mb-2">Tweak parameters</p>
                  <TweakControls
                    params={latticeParams}
                    onApply={(overrides) => handleRegenerate(overrides)}
                    disabled={isRegenerating}
                  />
                </div>
              )}
            </aside>

            {/* Center: Viewport (3D) */}
            <section className="lg:col-span-6 flex flex-col min-h-[320px]">
              <h2 className="bp-fig-label mb-2">FIG. 1 — Structure view</h2>
              <div className="flex-1 rounded-lg overflow-hidden border border-[var(--bp-glass-border)] bg-[var(--bp-bg)]">
                <LatticePreview jobId={jobId} cacheBuster={latticeVersion} />
              </div>
            </section>

            {/* Right: Ledger (Build Bible / datasheet) */}
            <aside className="lg:col-span-3 rounded-lg bg-[var(--bp-glass)] border border-[var(--bp-glass-border)] p-4 overflow-auto">
              <h2 className="bp-datasheet-header text-[var(--bp-energy)]">Build Bible</h2>
              <div className="bp-datasheet space-y-3 text-[var(--bp-ink)]">
                {!lastResult && (
                  <p className="text-[var(--bp-ink-muted)] text-sm">Requirements could not be extracted. Lattice and Build Bible PDF are still available.</p>
                )}
                {lastResult?.summary && (
                  <div>
                    <p className="text-[var(--bp-ink-muted)] text-xs uppercase tracking-wider mb-1">Summary</p>
                    <p>{lastResult.summary}</p>
                  </div>
                )}
                {lastResult?.materials?.length ? (
                  <div>
                    <p className="text-[var(--bp-ink-muted)] text-xs uppercase tracking-wider mb-1">Materials</p>
                    <p>{lastResult.materials.join(', ')}</p>
                  </div>
                ) : null}
                {lastResult?.weightConstraint && (
                  <div>
                    <p className="text-[var(--bp-ink-muted)] text-xs uppercase tracking-wider mb-1">Weight</p>
                    <p>{lastResult.weightConstraint}</p>
                  </div>
                )}
                {lastResult?.loadConstraint && (
                  <div>
                    <p className="text-[var(--bp-ink-muted)] text-xs uppercase tracking-wider mb-1">Load</p>
                    <p>{lastResult.loadConstraint}</p>
                  </div>
                )}
                {lastResult?.process && (
                  <div>
                    <p className="text-[var(--bp-ink-muted)] text-xs uppercase tracking-wider mb-1">Process</p>
                    <p>{lastResult.process}</p>
                  </div>
                )}
                {lastResult?.constraints?.length ? (
                  <div>
                    <p className="text-[var(--bp-ink-muted)] text-xs uppercase tracking-wider mb-1">Constraints</p>
                    <p>{lastResult.constraints.join(', ')}</p>
                  </div>
                ) : null}
              </div>
              <div className="mt-4 pt-4 border-t border-[var(--bp-glass-border)]">
                {jobId && progress === 'done' ? (
                  <div className="flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={handleDownload}
                      disabled={isDownloading}
                      className="px-4 py-2 rounded-lg bg-[var(--bp-energy)]/20 text-[var(--bp-energy)] border border-[var(--bp-energy)]/50 font-medium hover:bg-[var(--bp-energy)]/30 disabled:opacity-50 disabled:pointer-events-none transition-colors text-sm"
                      style={{ fontFamily: 'var(--font-ui)' }}
                    >
                      {isDownloading ? 'Downloading…' : 'Download Package'}
                    </button>
                    <p className="text-[var(--bp-ink-muted)] text-xs">
                      ZIP: lattice.stl, Build_Bible.pdf
                    </p>
                    {downloadError && (
                      <p className="text-[var(--bp-warning)] text-xs">{downloadError}</p>
                    )}
                  </div>
                ) : (
                  <p className="text-[var(--bp-ink-muted)] text-xs">
                    Download package (STL, PDF) — available when generation completes.
                  </p>
                )}
              </div>
            </aside>
          </div>
        )}

        {/* Pipeline error */}
        {progress === 'done' && pipelineError && (
          <section className="rounded-lg border border-[var(--bp-warning)]/50 bg-[var(--bp-warning)]/10 p-4 max-w-2xl mx-auto w-full">
            <h2 className="bp-datasheet-header text-[var(--bp-warning)] mb-2">Error</h2>
            <p className="text-[var(--bp-ink)] text-sm">Generation failed. Please try again or check backend logs.</p>
          </section>
        )}

        {/* Placeholder when done but no result (e.g. backend offline mock) */}
        {progress === 'done' && !lastResult && !showLaboratory && !pipelineError && (
          <section className="rounded-lg border border-[var(--bp-glass-border)] bg-[var(--bp-glass)] p-4 max-w-2xl mx-auto w-full">
            <h2 className="bp-datasheet-header text-[var(--bp-energy)] mb-2">Output</h2>
            <p className="text-[var(--bp-ink-muted)] text-sm">ZIP: lattice.stl, Build_Bible.pdf, Certificate.json — coming next.</p>
          </section>
        )}
      </main>
    </div>
  )
}

export default App
