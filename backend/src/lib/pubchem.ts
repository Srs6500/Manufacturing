/**
 * PubChem PUG REST and PUG View client for toxicity/safety checks.
 *
 * - PUG REST: name/formula → CID (compound ID)
 * - PUG View: CID → GHS hazard data (requires CID, one per request)
 *
 * Rate limit: 5 requests/sec. No API key required.
 * Docs: https://pubchem.ncbi.nlm.nih.gov/docs/pug-rest
 *       https://pubchem.ncbi.nlm.nih.gov/docs/pug-view
 */

const PUG_REST = 'https://pubchem.ncbi.nlm.nih.gov/rest/pug'
const PUG_VIEW = 'https://pubchem.ncbi.nlm.nih.gov/rest/pug_view'

const USER_AGENT = 'LatticeAI/1.0 (https://github.com/Srs6500/Manufacturing)'

/** GHS H-codes that trigger Red Alert (acute toxicity, carcinogen, reprotoxic, organ damage). */
const CRITICAL_H_CODES = [
  /^H300/,  // Fatal if swallowed
  /^H301/,  // Toxic if swallowed
  /^H310/,  // Fatal in contact with skin
  /^H311/,  // Toxic in contact with skin
  /^H330/,  // Fatal if inhaled
  /^H331/,  // Toxic if inhaled
  /^H340/,  // May cause genetic defects
  /^H350/,  // May cause cancer
  /^H351/,  // Suspected carcinogen
  /^H360/,  // May damage fertility or unborn child
  /^H361/,  // Suspected of damaging fertility
  /^H362/,  // May cause harm to breast-fed children
  /^H370/,  // Causes damage to organs
  /^H371/,  // May cause damage to organs
  /^H372/,  // Causes damage to organs through prolonged exposure
  /^H373/,  // May cause damage to organs through prolonged exposure
  /^H304/,  // May be fatal if swallowed and enters airways
]

const CACHE_TTL_MS = 5 * 60 * 1000 // 5 min
const cache = new Map<string, { result: SafetyResult; expires: number }>()

export interface SafetyResult {
  isHazardous: boolean
  hazardStatements: string[]
  safetyWarning?: string
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

/**
 * Get PubChem Compound ID from chemical name.
 */
export async function getCidByName(name: string): Promise<number | null> {
  const encoded = encodeURIComponent(name.trim())
  if (!encoded) return null
  const url = `${PUG_REST}/compound/name/${encoded}/cids/JSON`
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
    })
    if (!res.ok) return null
    const data = (await res.json()) as { IdentifierList?: { CID?: number[] } }
    const cids = data.IdentifierList?.CID
    return Array.isArray(cids) && cids.length > 0 ? cids[0] : null
  } catch {
    return null
  }
}

/**
 * Get PubChem Compound ID from molecular formula (e.g. Pb, C3H4O2).
 */
export async function getCidByFormula(formula: string): Promise<number | null> {
  const cleaned = formula.replace(/\s+/g, '').trim()
  if (!cleaned) return null
  const encoded = encodeURIComponent(cleaned)
  const url = `${PUG_REST}/compound/formula/${encoded}/cids/JSON`
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
    })
    if (!res.ok) return null
    const data = (await res.json()) as { IdentifierList?: { CID?: number[] } }
    const cids = data.IdentifierList?.CID
    return Array.isArray(cids) && cids.length > 0 ? cids[0] : null
  } catch {
    return null
  }
}

/**
 * Extract GHS hazard statements from PUG View GHS Classification response.
 */
interface GhsSection {
  TOCHeading?: string
  Section?: GhsSection[]
  Information?: Array<{ Name?: string; Value?: { StringWithMarkup?: Array<{ String?: string }> } }>
}

function parseGhsHazards(json: unknown): string[] {
  const statements: string[] = []
  const rec = json as { Record?: { Section?: GhsSection[] } }
  const sections = rec.Record?.Section ?? []
  for (const s1 of sections) {
    if (s1.TOCHeading !== 'Safety and Hazards') continue
    for (const s2 of s1.Section ?? []) {
      if (s2.TOCHeading !== 'Hazards Identification') continue
      for (const s3 of s2.Section ?? []) {
        if (s3.TOCHeading !== 'GHS Classification') continue
        for (const info of s3.Information ?? []) {
          if (info.Name !== 'GHS Hazard Statements') continue
          const strings = info.Value?.StringWithMarkup ?? []
          for (const sw of strings) {
            const str = sw.String
            if (typeof str === 'string' && str.includes(':')) {
              statements.push(str)
            }
          }
        }
      }
    }
  }
  return statements
}

/**
 * Get GHS hazard statements for a compound by CID.
 */
export async function getGhsHazards(cid: number): Promise<string[]> {
  const url = `${PUG_VIEW}/data/compound/${cid}/JSON?heading=GHS+Classification`
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
    })
    if (!res.ok) return []
    const json = (await res.json()) as unknown
    return parseGhsHazards(json)
  } catch {
    return []
  }
}

/**
 * Check if any hazard statement matches critical (Red Alert) H-codes.
 * Handles GHS variants like H360FD, H360Df (reproductive toxicity).
 */
function hasCriticalHazard(statements: string[]): boolean {
  for (const stmt of statements) {
    const match = stmt.match(/^(H\d{3}[A-Za-z]*)/)
    if (match) {
      const code = match[1]
      for (const pattern of CRITICAL_H_CODES) {
        if (pattern.test(code)) return true
      }
    }
  }
  return false
}

/**
 * Check material safety. Returns hazard info; isHazardous is true if critical H-codes found.
 * Uses in-memory cache (5 min TTL) to avoid repeated lookups.
 */
export async function checkMaterialSafety(searchTerm: string): Promise<SafetyResult> {
  const key = searchTerm.toLowerCase().trim()
  const cached = cache.get(key)
  if (cached && Date.now() < cached.expires) {
    return cached.result
  }

  let cid: number | null = null
  if (/^[A-Za-z0-9\-]+$/.test(searchTerm) && !searchTerm.includes(' ')) {
    cid = await getCidByFormula(searchTerm)
  }
  if (!cid) {
    cid = await getCidByName(searchTerm)
  }

  if (!cid) {
    const result: SafetyResult = { isHazardous: false, hazardStatements: [] }
    cache.set(key, { result, expires: Date.now() + CACHE_TTL_MS })
    return result
  }

  const statements = await getGhsHazards(cid)
  const isHazardous = hasCriticalHazard(statements)
  const safetyWarning = isHazardous && statements.length > 0
    ? `Toxic/hazardous: ${statements[0].slice(0, 80)}${statements[0].length > 80 ? '…' : ''}. Do not use for food contact.`
    : undefined

  const result: SafetyResult = { isHazardous, hazardStatements: statements, safetyWarning }
  cache.set(key, { result, expires: Date.now() + CACHE_TTL_MS })
  return result
}

/** Map element symbols to PubChem-friendly names for alloy fallback. */
const ELEMENT_TO_PUBCHEM: Record<string, string> = {
  Al: 'aluminum',
  Ti: 'titanium',
  Fe: 'iron',
  Cu: 'copper',
  Co: 'cobalt',
  Cr: 'chromium',
  Ni: 'nickel',
  Pb: 'lead',
  Cd: 'cadmium',
  C: 'carbon',
}

/**
 * Resolve PubChem search term from material (curated or MP).
 * For MP materials with alloy formulas (e.g. TiAl, Al2O3), uses formula when valid;
 * otherwise falls back to primary element or material name.
 */
export function getPubChemSearchTerm(material: { id: string; name: string; formula: string }): string {
  const curatedMap: Record<string, string> = {
    'al-7075': 'aluminum',
    'pa12-cf': 'nylon 12',
    'ti64': 'titanium',
    'ss316l': 'iron',
    'pla': 'polylactic acid',
    'petg': 'polyethylene terephthalate glycol',
    'tpe': 'thermoplastic elastomer',
    'co-cr': 'cobalt',
    'pb-test': 'lead',
  }
  const mapped = curatedMap[material.id]
  if (mapped) return mapped

  const formula = material.formula?.replace(/\s/g, '') ?? ''
  // Simple molecular/oxide formula (e.g. TiO2, Al2O3, Fe2O3) - PubChem accepts these
  if (formula && /^[A-Z][a-z]?\d*([A-Z][a-z]?\d*)*$/.test(formula)) {
    return formula
  }
  // Alloy notation (Ti-6Al-4V, Al-Zn-Mg-Cu) or MP formula with numbers - use primary element
  const firstElement = formula.match(/^([A-Z][a-z]?)/)?.[1]
  if (firstElement && ELEMENT_TO_PUBCHEM[firstElement]) {
    return ELEMENT_TO_PUBCHEM[firstElement]
  }
  return material.name || formula || 'unknown'
}
