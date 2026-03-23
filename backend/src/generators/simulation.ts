/**
 * Simplified structural validation/simulation.
 * Rule-of-thumb estimates for weight and load capacity.
 * Real FEA would require external solvers (e.g. CalculiX, Code_Aster).
 */
import type { LatticeResult, LatticePattern } from './lattice-types.js'

/** Approximate density g/cm³ for common materials */
const MATERIAL_DENSITY: Record<string, number> = {
  aluminum: 2.7,
  'al-7075': 2.81,
  nylon: 1.14,
  'pa12-cf': 1.4,
  'carbon-fiber': 1.4,
  titanium: 4.43,
  ti64: 4.43,
  'ti-6al-4v': 4.43,
  'ss316l': 7.99,
  stainless: 7.99,
  pla: 1.24,
  petg: 1.27,
  tpe: 1.1,
  'co-cr': 8.5,
  default: 1.5,
}

/** Typical bulk yield / proof strength (MPa) for surrogate stress index — not lattice FEA */
const MATERIAL_YIELD_MPA: Record<string, number> = {
  aluminum: 270,
  'al-7075': 503,
  nylon: 65,
  'pa12-cf': 65,
  titanium: 880,
  ti64: 880,
  'ti-6al-4v': 880,
  'ss316l': 290,
  stainless: 290,
  pla: 50,
  petg: 50,
  tpe: 15,
  'co-cr': 600,
  default: 200,
}

export function relativeDensityFraction(pattern: LatticePattern, density: number): number {
  switch (pattern) {
    case 'gyroid':
      return 0.15 + density * 0.25
    case 'honeycomb':
      return 0.1 + density * 0.2
    case 'octet-truss':
      return 0.2 + density * 0.3
    default:
      return 0.15 + density * 0.25
  }
}

/**
 * Estimate lattice performance from pattern and dimensions.
 */
export function estimateLatticePerformance(
  pattern: LatticePattern,
  width: number,
  height: number,
  depth: number,
  density: number,
  materialHint?: string
): LatticeResult {
  const volCm3 = (width * height * depth) / 1000
  const key = materialHint?.toLowerCase() ?? ''
  const matDensity = MATERIAL_DENSITY[key] ?? MATERIAL_DENSITY.default
  const bulkYieldMpa = MATERIAL_YIELD_MPA[key] ?? MATERIAL_YIELD_MPA.default

  const relativeDensity = relativeDensityFraction(pattern, density)
  const relativeDensityPercent = Math.round(relativeDensity * 1000) / 10

  const solidVol = volCm3 * relativeDensity
  const estimatedMassG = solidVol * matDensity

  let strengthFactor: number
  switch (pattern) {
    case 'octet-truss':
      strengthFactor = 1.4
      break
    case 'gyroid':
      strengthFactor = 1.2
      break
    case 'honeycomb':
      strengthFactor = 1.0
      break
    default:
      strengthFactor = 1.1
  }

  const estimatedLoadKg = (estimatedMassG / 50) * strengthFactor * (1 + density)
  const targetLoadKg = 2
  const safetyFactor = estimatedLoadKg / targetLoadKg

  const latticeEfficiency = 0.35 + relativeDensity * 0.45
  const indicativeYieldMpa = Math.round(bulkYieldMpa * latticeEfficiency * 10) / 10
  const structuralProofNote =
    `Surrogate structural index (not certified FEA): effective lattice utilization ~${Math.round(latticeEfficiency * 100)}% of bulk yield for this topology class; indicative first-yield stress band ~${indicativeYieldMpa} MPa — validate with solver + coupon tests before flight- or implant-critical use.`

  return {
    pattern,
    estimatedMassG: Math.round(estimatedMassG * 10) / 10,
    estimatedLoadKg: Math.round(estimatedLoadKg * 10) / 10,
    safetyFactor: Math.round(safetyFactor * 100) / 100,
    relativeDensityPercent,
    structuralProofNote,
    indicativeYieldMpa,
  }
}
