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

/**
 * Regenerate lattice with tweaked params. Returns new simulation and params.
 */
export async function regenerateLattice(
  jobId: string,
  overrides: {
    selectedMaterialId?: string
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
