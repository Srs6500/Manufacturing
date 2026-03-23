/**
 * Lattice generation parameters and pattern types.
 * Used by the lattice generator and (later) interactive tweaks.
 */
export type LatticePattern = 'strut-grid' | 'octet-truss' | 'honeycomb' | 'gyroid'

export interface LatticeParams {
  pattern: LatticePattern
  width: number
  height: number
  depth: number
  /** Relative density 0.1–1 (affects strut thickness, cell size, or gyroid threshold) */
  density: number
  /** Strut radius in mm (for strut-based patterns) */
  strutRadius: number
  /** Grid resolution (strut-grid, octet-truss) or cell count */
  gridX: number
  gridY: number
  gridZ: number
}

export interface LatticeResult {
  pattern: LatticePattern
  /** Estimated mass in grams (approximate) */
  estimatedMassG: number
  /** Estimated max load in kg (rule-of-thumb) */
  estimatedLoadKg: number
  /** Safety factor (estimated load / target load) */
  safetyFactor: number
  /** Volume fraction of solid in bounding box, percent (surrogate model) */
  relativeDensityPercent: number
  /** Plain-language structural proof line for Builder Spec Section 3.0 */
  structuralProofNote: string
  /** Scalar used in proof note — not a certified FEA yield (MPa) */
  indicativeYieldMpa: number
}
