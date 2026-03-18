const API_BASE = import.meta.env.VITE_API_URL ?? ''

export type GenerateResponse = { jobId: string; message: string }

export async function generate(prompt: string): Promise<GenerateResponse> {
  const res = await fetch(`${API_BASE}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `HTTP ${res.status}`)
  }
  return res.json() as Promise<GenerateResponse>
}

export async function health(): Promise<{ ok: boolean }> {
  const res = await fetch(`${API_BASE}/api/health`)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json() as Promise<{ ok: boolean }>
}

/** Job summary for history list. */
export interface JobSummary {
  id: string
  prompt: string
  status: 'running' | 'done' | 'failed'
  createdAt: number
}

/** Full job for reopen (includes result with latticeParams, simulation). */
export interface JobDetail extends JobSummary {
  requirements: unknown
  latticePath: string | null
  reportPath: string | null
  result: {
    latticeParams?: { pattern: string; density: number; strutRadius: number; gridX: number; gridY: number; gridZ: number }
    simulation?: { pattern: string; estimatedMassG: number; estimatedLoadKg: number; safetyFactor: number }
    selectedMaterialId?: string | null
  } | null
}

/**
 * List past jobs (for history panel).
 */
export async function listJobs(options?: { limit?: number; status?: 'running' | 'done' | 'failed' }): Promise<{
  jobs: JobSummary[]
  total: number
}> {
  const params = new URLSearchParams()
  if (options?.limit) params.set('limit', String(options.limit))
  if (options?.status) params.set('status', options.status)
  const url = `${API_BASE}/api/jobs${params.toString() ? `?${params}` : ''}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Failed to list jobs: HTTP ${res.status}`)
  return res.json()
}

/**
 * Get a job by ID (for reopen).
 */
export async function getJob(jobId: string): Promise<JobDetail> {
  const res = await fetch(`${API_BASE}/api/jobs/${jobId}`)
  if (!res.ok) {
    if (res.status === 404) throw new Error('Job not found')
    throw new Error(`Failed to fetch job: HTTP ${res.status}`)
  }
  return res.json()
}

/**
 * URL for the lattice STL file. Use with STLLoader or as src for fetch.
 * Optional cacheBuster to force reload after regeneration.
 */
export function getLatticeStlUrl(jobId: string, cacheBuster?: number): string {
  const base = import.meta.env.VITE_API_URL ?? ''
  const url = `${base}/api/jobs/${jobId}/lattice`
  return cacheBuster != null ? `${url}?v=${cacheBuster}` : url
}

export type RegenerateResponse = {
  simulation: { pattern: string; estimatedMassG: number; estimatedLoadKg: number; safetyFactor: number }
  latticeParams: {
    pattern: string
    width: number
    height: number
    depth: number
    density: number
    strutRadius: number
    gridX: number
    gridY: number
    gridZ: number
  }
}

/** Valid lattice patterns for user selection. */
export const LATTICE_PATTERNS = [
  { value: 'strut-grid', label: 'Strut grid' },
  { value: 'octet-truss', label: 'Octet truss' },
  { value: 'honeycomb', label: 'Honeycomb' },
  { value: 'gyroid', label: 'Gyroid' },
] as const

export type LatticePatternValue = (typeof LATTICE_PATTERNS)[number]['value']

/**
 * Regenerate lattice with tweaked params. Returns new simulation and params.
 */
export async function regenerateLattice(
  jobId: string,
  overrides: {
    selectedMaterialId?: string
    pattern?: LatticePatternValue
    density?: number
    strutRadius?: number
    gridX?: number
    gridY?: number
    gridZ?: number
  }
): Promise<RegenerateResponse> {
  const res = await fetch(`${API_BASE}/api/jobs/${jobId}/regenerate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(overrides),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `Regeneration failed: HTTP ${res.status}`)
  }
  return res.json() as Promise<RegenerateResponse>
}

/**
 * Download the job package (ZIP with STL + Build Bible PDF).
 * Triggers a file download in the browser.
 */
export async function downloadJobPackage(jobId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/jobs/${jobId}/download`)
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `Download failed: HTTP ${res.status}`)
  }
  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `lattice-ai-${jobId}.zip`
  a.click()
  URL.revokeObjectURL(url)
}
