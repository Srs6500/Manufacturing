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
  {
    id: 'ss316l',
    name: 'Stainless Steel 316L',
    formula: 'Fe-Cr-Ni-Mo',
    density: 7.99,
    youngsModulus: 193,
    yieldStrength: 170,
    costUsdPerKg: 25,
    printableBy: ['SLM', 'DED', 'Binder Jetting'],
    summary: 'Corrosion resistant, medical grade. Good for implants and marine.',
  },
  {
    id: 'pla',
    name: 'PLA (Polylactic Acid)',
    formula: 'C3H4O2',
    density: 1.24,
    youngsModulus: 3.5,
    yieldStrength: 50,
    costUsdPerKg: 25,
    printableBy: ['FDM'],
    summary: 'Biodegradable, easy to print. Great for prototypes and low-stress parts.',
  },
  {
    id: 'petg',
    name: 'PETG',
    formula: 'C10H8O4',
    density: 1.27,
    youngsModulus: 2.0,
    yieldStrength: 50,
    costUsdPerKg: 30,
    printableBy: ['FDM'],
    summary: 'Tough, chemical resistant. Good for functional prototypes.',
  },
  {
    id: 'tpe',
    name: 'TPE (Flexible)',
    formula: 'Thermoplastic Elastomer',
    density: 1.1,
    youngsModulus: 0.05,
    yieldStrength: 15,
    costUsdPerKg: 60,
    printableBy: ['FDM'],
    summary: 'Flexible, impact resistant. Ideal for grips and seals.',
  },
  {
    id: 'co-cr',
    name: 'Cobalt-Chromium',
    formula: 'Co-Cr-Mo',
    density: 8.5,
    youngsModulus: 230,
    yieldStrength: 900,
    costUsdPerKg: 150,
    printableBy: ['SLM', 'EBM'],
    summary: 'Biocompatible, wear resistant. Dental and orthopedic implants.',
  },
]

/**
 * Extract material/context hints from requirements (materials + summary + constraints).
 * Used when materials array is empty or to enrich matching.
 */
function extractHintsFromRequirements(requirements: AnalyzedRequirements | null): string[] {
  if (!requirements) return []
  const hints = [...(requirements.materials ?? [])]
  const summary = (requirements.summary ?? '').toLowerCase()
  const constraints = (requirements.constraints ?? []).join(' ').toLowerCase()
  const combined = `${summary} ${constraints}`

  // Extract keywords that map to material families
  const keywordMap: Record<string, string> = {
    dental: 'titanium',
    implant: 'titanium',
    medical: 'stainless',
    biocompatible: 'cobalt',
    lightweight: 'aluminum',
    light: 'aluminum',
    drone: 'carbon',
    aerospace: 'titanium',
    strong: 'titanium',
    flexible: 'tpe',
    grip: 'tpe',
    prototype: 'pla',
    cheap: 'pla',
    biodegradable: 'pla',
    corrosion: 'stainless',
    marine: 'stainless',
    printable: 'pla',
    fdm: 'pla',
    slm: 'titanium',
  }
  for (const [keyword, material] of Object.entries(keywordMap)) {
    if (combined.includes(keyword) && !hints.some((h) => h.toLowerCase().includes(material))) {
      hints.push(material)
    }
  }
  return [...new Set(hints)]
}

/**
 * Search materials matching requirements.
 * Uses Materials Project API when MP_API_KEY is set, else returns curated options.
 */
export async function searchMaterials(
  requirements: AnalyzedRequirements | null
): Promise<MaterialOption[]> {
  const apiKey = process.env.MP_API_KEY
  const hints = extractHintsFromRequirements(requirements)
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

  return filterCuratedMaterials(hints, weightG, loadKg, requirements)
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
 * Uses GET /materials/core/ with query params (OpenAPI spec).
 * Auth: X-API-KEY header.
 */
async function searchMaterialsProject(
  apiKey: string,
  hints: string[],
  _weightG: number,
  _loadKg: number
): Promise<MaterialOption[]> {
  const elements = hints.flatMap((h) => extractElements(h)).filter(Boolean)
  const elemList = elements.length > 0 ? elements.slice(0, 3) : ['Al', 'Ti', 'C']
  const elementsParam = elemList.join(',')

  const params = new URLSearchParams({
    elements: elementsParam,
    _limit: '5',
    _fields: 'material_id,formula_pretty,density',
  })

  const url = `https://api.materialsproject.org/materials/core/?${params.toString()}`
  const res = await fetch(url, {
    method: 'GET',
    headers: {
      'X-API-KEY': apiKey,
    },
  })

  if (!res.ok) {
    const errBody = await res.text()
    console.warn('[MaterialSelector] MP API error response:', errBody.slice(0, 300))
    throw new Error(`MP API ${res.status}`)
  }

  const data = (await res.json()) as { data?: Array<Record<string, unknown>> } | Array<Record<string, unknown>>
  const rawDocs = Array.isArray(data) ? data : ((data as { data?: Array<Record<string, unknown>> }).data ?? [])
  const docs = rawDocs as Array<Record<string, unknown>>

  if (docs.length === 0) return []

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
    cobalt: 'Co',
    chromium: 'Cr',
    stainless: 'Fe',
    pla: 'C',
    petg: 'C',
  }
  const lower = hint.toLowerCase()
  for (const [k, v] of Object.entries(elementMap)) {
    if (lower.includes(k)) return [v]
  }
  return []
}

/** Map hint keywords to material IDs for relevance scoring. */
const HINT_TO_IDS: Record<string, string[]> = {
  aluminum: ['al-7075'],
  aluminium: ['al-7075'],
  titanium: ['ti64'],
  carbon: ['pa12-cf'],
  nylon: ['pa12-cf'],
  steel: ['ss316l'],
  stainless: ['ss316l'],
  pla: ['pla'],
  petg: ['petg'],
  flexible: ['tpe'],
  tpe: ['tpe'],
  cobalt: ['co-cr'],
  medical: ['ss316l', 'co-cr'],
  dental: ['co-cr', 'ti64'],
  implant: ['co-cr', 'ti64', 'ss316l'],
  drone: ['pa12-cf', 'al-7075'],
  aerospace: ['ti64', 'al-7075'],
  prototype: ['pla', 'petg', 'pa12-cf'],
  lightweight: ['pa12-cf', 'pla', 'al-7075'],
}

function filterCuratedMaterials(
  hints: string[],
  weightG: number,
  _loadKg: number,
  requirements?: AnalyzedRequirements | null
): MaterialOption[] {
  const lowerHints = hints.map((h) => h.toLowerCase())
  const summary = (requirements?.summary ?? '').toLowerCase()

  // Score each material by relevance to hints and summary
  const scored = CURATED_MATERIALS.map((m) => {
    let score = 0
    const nameLower = m.name.toLowerCase()
    const formulaLower = m.formula.toLowerCase()
    const summaryLower = m.summary.toLowerCase()

    for (const h of lowerHints) {
      if (nameLower.includes(h) || formulaLower.includes(h)) score += 3
      if (summaryLower.includes(h)) score += 1
    }
    // Boost from HINT_TO_IDS mapping
    for (const [keyword, ids] of Object.entries(HINT_TO_IDS)) {
      if (lowerHints.some((h) => h.includes(keyword)) || summary.includes(keyword)) {
        if (ids.includes(m.id)) score += 2
      }
    }
    return { material: m, score }
  })

  // Sort: higher score first, then by density for lightweight preference
  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score
    if (weightG < 150) return a.material.density - b.material.density
    return 0
  })

  const filtered = scored.filter((s) => s.score > 0).map((s) => s.material)
  const result = filtered.length > 0 ? filtered : CURATED_MATERIALS
  return result.slice(0, 4)
}
