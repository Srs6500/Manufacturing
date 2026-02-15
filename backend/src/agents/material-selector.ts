/**
 * Material Selector Agent.
 * Searches Materials Project API for materials matching requirements.
 * Falls back to curated options when API is unavailable.
 */
import type { AnalyzedRequirements } from './types.js'

export interface MaterialOption {
  id: string
  name: string
  formula: string
  density: number
  youngsModulus?: number
  yieldStrength?: number
  costUsdPerKg?: number
  printableBy: string[]
  summary: string
}

const CURATED_MATERIALS: MaterialOption[] = [
  {
    id: 'al-7075',
    name: 'Aluminum 7075',
    formula: 'Al-Zn-Mg-Cu',
    density: 2.81,
    youngsModulus: 71.7,
    yieldStrength: 503,
    costUsdPerKg: 8,
    printableBy: ['SLM', 'DED'],
    summary: 'Light, moderate strength, low cost. Good for prototypes.',
  },
  {
    id: 'pa12-cf',
    name: 'Carbon Fiber Nylon (PA12-CF)',
    formula: 'PA12 + 15% CF',
    density: 1.4,
    youngsModulus: 7.5,
    yieldStrength: 65,
    costUsdPerKg: 80,
    printableBy: ['FDM', 'SLS'],
    summary: 'Very light, good strength, medium cost. Ideal for drones.',
  },
  {
    id: 'ti64',
    name: 'Titanium Ti-6Al-4V',
    formula: 'Ti-6Al-4V',
    density: 4.43,
    youngsModulus: 113.8,
    yieldStrength: 880,
    costUsdPerKg: 120,
    printableBy: ['SLM', 'EBM', 'DED'],
    summary: 'Light, extreme strength, aerospace grade. Higher cost.',
  },
]

/**
 * Search materials matching requirements.
 * Uses Materials Project API when MP_API_KEY is set, else returns curated options.
 */
export async function searchMaterials(
  requirements: AnalyzedRequirements | null
): Promise<MaterialOption[]> {
  const apiKey = process.env.MP_API_KEY
  const hints = requirements?.materials ?? []
  const weightG = parseWeightGrams(requirements?.weightConstraint)
  const loadKg = parseLoadKg(requirements?.loadConstraint)

  if (apiKey) {
    try {
      const results = await searchMaterialsProject(apiKey, hints, weightG, loadKg)
      if (results.length > 0) return results
    } catch (err) {
      console.warn('[MaterialSelector] Materials Project API failed, using curated:', err)
    }
  }

  return filterCuratedMaterials(hints, weightG, loadKg)
}

function parseWeightGrams(constraint?: string): number {
  if (!constraint) return 200
  const m = constraint.match(/(\d+)\s*g/i)
  return m ? Number(m[1]) : 200
}

function parseLoadKg(constraint?: string): number {
  if (!constraint) return 2
  const m = constraint.match(/(\d+)\s*kg/i)
  return m ? Number(m[1]) : 2
}

/**
 * Materials Project REST API.
 * Docs: https://api.materialsproject.org/docs
 * Falls back to curated materials on 404/errors (API format may change).
 */
async function searchMaterialsProject(
  apiKey: string,
  hints: string[],
  _weightG: number,
  _loadKg: number
): Promise<MaterialOption[]> {
  const elements = hints.flatMap((h) => extractElements(h)).filter(Boolean)
  const elemList = elements.length > 0 ? elements.slice(0, 3) : ['Al', 'Ti', 'C']

  const res = await fetch('https://api.materialsproject.org/materials/summary/', {
    method: 'POST',
    headers: {
      'X-API-KEY': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      criteria: { elements: { $all: elemList } },
      properties: ['material_id', 'formula_pretty', 'density'],
      limit: 5,
    }),
  })

  if (!res.ok) throw new Error(`MP API ${res.status}`)

  const data = (await res.json()) as { data?: Array<Record<string, unknown>> } | Array<Record<string, unknown>>
  const rawDocs = Array.isArray(data) ? data : ((data as { data?: Array<Record<string, unknown>> }).data ?? [])
  const docs = rawDocs as Array<Record<string, unknown>>

  return docs.slice(0, 3).map((d, i) => ({
    id: (d.material_id as string) ?? `mp-${i}`,
    name: (d.formula_pretty as string) ?? 'Unknown',
    formula: (d.formula_pretty as string) ?? '',
    density: (d.density as number) ?? 2,
    youngsModulus: undefined,
    yieldStrength: undefined,
    costUsdPerKg: undefined,
    printableBy: ['SLM', 'FDM'],
    summary: `${d.formula_pretty ?? 'Material'} from Materials Project`,
  }))
}

function extractElements(hint: string): string[] {
  const elementMap: Record<string, string> = {
    aluminum: 'Al',
    aluminium: 'Al',
    titanium: 'Ti',
    carbon: 'C',
    nylon: 'C',
    steel: 'Fe',
    copper: 'Cu',
  }
  const lower = hint.toLowerCase()
  for (const [k, v] of Object.entries(elementMap)) {
    if (lower.includes(k)) return [v]
  }
  return []
}

function filterCuratedMaterials(
  hints: string[],
  weightG: number,
  _loadKg: number
): MaterialOption[] {
  let filtered = [...CURATED_MATERIALS]
  if (hints.length > 0) {
    const lower = hints.map((h) => h.toLowerCase())
    filtered = filtered.filter((m) =>
      lower.some((h) => m.name.toLowerCase().includes(h) || m.formula.toLowerCase().includes(h))
    )
  }
  if (filtered.length === 0) filtered = CURATED_MATERIALS
  if (weightG < 100) {
    filtered.sort((a, b) => a.density - b.density)
  }
  return filtered.slice(0, 3)
}
