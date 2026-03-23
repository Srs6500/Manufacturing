/**
 * LATTICE-DNA™ — deterministic watermark strut selection for Builder Spec Section 1.0.
 * Indices are derived from SHA-256(jobId) so the same job always documents the same slots.
 * Geometry perturbation in STL (±0.01 mm) can be wired later; the spec always lists targets.
 */
import { createHash } from 'node:crypto'
import type { LatticePattern } from './lattice-types.js'

const PERTURBATION_MM = 0.01

export interface WatermarkStrut {
  /** Stable identifier printed in the Builder Spec */
  canonicalId: string
  /** Human-readable placement */
  locationDescription: string
  /** Nominal strut radius at generation (mm) — operator compares CT slice to nominal ± delta */
  nominalStrutRadiusMm: number
  /** Signed thickness delta applied to watermark struts (mm) */
  thicknessDeltaMm: number
}

function strutGridBeamCount(gridX: number, gridY: number, gridZ: number): number {
  const gx = Math.max(2, gridX)
  const gy = Math.max(2, gridY)
  const gz = Math.max(2, gridZ)
  const xBeams = (gx - 1) * gy * gz
  const yBeams = gx * (gy - 1) * gz
  const zBeams = gx * gy * (gz - 1)
  return xBeams + yBeams + zBeams
}

/**
 * Decode linear beam index for a simple strut grid (X-major, then Y, then Z beams).
 */
function decodeStrutGridIndex(
  index: number,
  gridX: number,
  gridY: number,
  gridZ: number
): { axis: 'X' | 'Y' | 'Z'; i: number; j: number; k: number } | null {
  const gx = Math.max(2, gridX)
  const gy = Math.max(2, gridY)
  const gz = Math.max(2, gridZ)
  const xCount = (gx - 1) * gy * gz
  const yCount = gx * (gy - 1) * gz
  if (index < xCount) {
    const along = gx - 1
    const cell = index
    const k = Math.floor(cell / ((gx - 1) * gy))
    const rem = cell % ((gx - 1) * gy)
    const j = Math.floor(rem / (gx - 1))
    const i = rem % (gx - 1)
    return { axis: 'X', i, j, k }
  }
  index -= xCount
  if (index < yCount) {
    const cell = index
    const k = Math.floor(cell / (gx * (gy - 1)))
    const rem = cell % (gx * (gy - 1))
    const i = Math.floor(rem / (gy - 1))
    const j = rem % (gy - 1)
    return { axis: 'Y', i, j, k }
  }
  index -= yCount
  const zMax = gx * gy * (gz - 1)
  if (index < zMax) {
    const j = Math.floor(index / (gx * (gz - 1)))
    const rem = index % (gx * (gz - 1))
    const i = Math.floor(rem / (gz - 1))
    const k = rem % (gz - 1)
    return { axis: 'Z', i, j, k }
  }
  return null
}

function pickFiveIndices(total: number, jobId: string): number[] {
  const nTotal = Math.max(1, total)
  const out: number[] = []
  const used = new Set<number>()
  let salt = 0
  while (out.length < 5) {
    const buf = createHash('sha256').update(`LATTICE-DNA-idx|${jobId}|${salt++}`).digest()
    for (let o = 0; o + 2 <= buf.length && out.length < 5; o += 2) {
      const v = buf.readUInt16BE(o) % nTotal
      if (!used.has(v)) {
        used.add(v)
        out.push(v)
      }
    }
  }
  return out
}

export function deriveLatticeDna(args: {
  jobId: string
  pattern: LatticePattern
  gridX: number
  gridY: number
  gridZ: number
  strutRadiusMm: number
}): WatermarkStrut[] {
  const total =
    args.pattern === 'strut-grid' || args.pattern === 'octet-truss' || args.pattern === 'honeycomb'
      ? strutGridBeamCount(args.gridX, args.gridY, args.gridZ)
      : Math.max(500, args.gridX * args.gridY * args.gridZ * 12)

  const indices = pickFiveIndices(Math.max(1, total), args.jobId)
  const deltas = [1, -1, 1, -1, 1]

  return indices.map((beamIndex, slot) => {
    const delta = deltas[slot]! * PERTURBATION_MM
    if (args.pattern === 'strut-grid') {
      const dec = decodeStrutGridIndex(beamIndex, args.gridX, args.gridY, args.gridZ)
      if (dec) {
        const canonicalId = `SG-${dec.axis}-${dec.i}-${dec.j}-${dec.k}-slot${slot + 1}`
        const locationDescription = `Strut grid beam along ${dec.axis} between nodes near cell (${dec.i},${dec.j},${dec.k}); interior volume — use CT/metrology on STL ray cast for beam #${beamIndex}.`
        return {
          canonicalId,
          locationDescription,
          nominalStrutRadiusMm: args.strutRadiusMm,
          thicknessDeltaMm: delta,
        }
      }
    }
    return {
      canonicalId: `LT-${args.pattern.toUpperCase()}-B${beamIndex}-S${slot + 1}`,
      locationDescription: `Topology ${args.pattern}: canonical internal beam/strand index ${beamIndex} of ~${total}. Locate via STL section in part centroid; compare fused strut thickness to nominal ${args.strutRadiusMm} mm ± ${PERTURBATION_MM} mm.`,
      nominalStrutRadiusMm: args.strutRadiusMm,
      thicknessDeltaMm: delta,
    }
  })
}

export const LATTICE_DNA_PERTURBATION_MM = PERTURBATION_MM
