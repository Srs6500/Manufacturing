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
  default: 1.5,
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
  const matDensity = materialHint
    ? MATERIAL_DENSITY[materialHint.toLowerCase()] ?? MATERIAL_DENSITY.default
    : MATERIAL_DENSITY.default

  let relativeDensity: number
  switch (pattern) {
    case 'gyroid':
      relativeDensity = 0.15 + density * 0.25
      break
    case 'honeycomb':
      relativeDensity = 0.1 + density * 0.2
      break
    case 'octet-truss':
      relativeDensity = 0.2 + density * 0.3
      break
    default:
      relativeDensity = 0.15 + density * 0.25
  }

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

  return {
    pattern,
    estimatedMassG: Math.round(estimatedMassG * 10) / 10,
    estimatedLoadKg: Math.round(estimatedLoadKg * 10) / 10,
    safetyFactor: Math.round(safetyFactor * 100) / 100,
  }
}
