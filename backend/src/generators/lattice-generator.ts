import * as THREE from 'three'
import { STLExporter } from 'three/examples/jsm/exporters/STLExporter.js'
import { writeFileSync } from 'node:fs'
import type { AnalyzedRequirements } from '../agents/types.js'
import type { LatticeParams, LatticePattern, LatticeResult } from './lattice-types.js'
import { createStrutGrid } from './patterns/strut-grid.js'
import { createOctetTruss } from './patterns/octet-truss.js'
import { createHoneycomb } from './patterns/honeycomb.js'
import { createGyroid } from './patterns/gyroid.js'
import { estimateLatticePerformance } from './simulation.js'

const PATTERNS: LatticePattern[] = ['strut-grid', 'octet-truss', 'honeycomb', 'gyroid']

function createLatticeGeometry(params: LatticeParams): THREE.Group {
  switch (params.pattern) {
    case 'octet-truss':
      return createOctetTruss(params)
    case 'honeycomb':
      return createHoneycomb(params)
    case 'gyroid':
      return createGyroid(params)
    default:
      return createStrutGrid(params)
  }
}

/**
 * Parse approximate dimensions from requirements.
 */
function parseDimensionsFromRequirements(requirements: AnalyzedRequirements | null): {
  width: number
  height: number
  depth: number
} {
  const defaultSize = 100
  if (!requirements?.weightConstraint) {
    return { width: defaultSize, height: defaultSize * 0.8, depth: defaultSize * 0.6 }
  }
  const m = requirements.weightConstraint.match(/(\d+)\s*g/i)
  if (m) {
    const grams = Number(m[1])
    const scale = Math.min(1.5, Math.max(0.5, 200 / grams))
    return {
      width: defaultSize * scale,
      height: defaultSize * 0.8 * scale,
      depth: defaultSize * 0.6 * scale,
    }
  }
  return { width: defaultSize, height: defaultSize * 0.8, depth: defaultSize * 0.6 }
}

/**
 * Pick pattern based on requirements.
 * - Lightweight/minimal weight → honeycomb
 * - Strong load / crash / structural → octet-truss
 * - Prototype / aesthetic / organic → gyroid
 * - Default → strut-grid (simple, predictable, good for prototyping)
 */
function pickPatternFromRequirements(requirements: AnalyzedRequirements | null): LatticePattern {
  if (!requirements) return 'strut-grid'
  const s = (requirements.summary ?? '').toLowerCase()
  const w = (requirements.weightConstraint ?? '').toLowerCase()
  const l = (requirements.loadConstraint ?? '').toLowerCase()
  const mats = (requirements.materials ?? []).join(' ').toLowerCase()

  const combined = `${s} ${w} ${l} ${mats}`

  if (
    w.includes('light') ||
    w.includes('minimal') ||
    combined.includes('lightweight') ||
    gramsFromConstraint(w) < 100
  ) {
    return 'honeycomb'
  }
  if (
    l.includes('strong') ||
    l.includes('load') ||
    l.includes('crash') ||
    combined.includes('structural') ||
    combined.includes('aerospace')
  ) {
    return 'octet-truss'
  }
  if (
    combined.includes('organic') ||
    combined.includes('aesthetic') ||
    combined.includes('smooth')
  ) {
    return 'gyroid'
  }
  return 'strut-grid'
}

function gramsFromConstraint(constraint: string): number {
  const m = constraint.match(/(\d+)\s*g/i)
  return m ? Number(m[1]) : 200
}

export interface GenerateLatticeOutput {
  path: string
  pattern: LatticePattern
  params: LatticeParams
  simulation: LatticeResult
}

export interface LatticeOverrides {
  selectedMaterialId?: string
  pattern?: LatticePattern
  density?: number
  strutRadius?: number
  gridX?: number
  gridY?: number
  gridZ?: number
}

/**
 * Generate lattice STL. Uses pattern chosen from requirements, runs simulation.
 * @param outputPath - Path to write STL file
 * @param requirements - Analyzed requirements (or null)
 * @param overrides - Optional material ID and/or param overrides (density, strutRadius, grid)
 */
export function generateLattice(
  outputPath: string,
  requirements: AnalyzedRequirements | null,
  overrides?: LatticeOverrides
): GenerateLatticeOutput | null {
  try {
    const dims = parseDimensionsFromRequirements(requirements)
    const density = overrides?.density ?? 0.5
    const strutRadius = overrides?.strutRadius ?? 1.5
    const gridX = overrides?.gridX ?? 4
    const gridY = overrides?.gridY ?? 4
    const gridZ = overrides?.gridZ ?? 4

    const materialHint =
      overrides?.selectedMaterialId ??
      requirements?.materials?.[0] ??
      (requirements?.summary?.toLowerCase().includes('light') ? 'pa12-cf' : undefined)

    let bestResult: LatticeResult | null = null
    let bestPattern: LatticePattern = 'strut-grid'
    let bestParams: LatticeParams | null = null

    const patternToTry: LatticePattern =
      overrides?.pattern ?? pickPatternFromRequirements(requirements)

    const params: LatticeParams = {
      pattern: patternToTry,
      width: dims.width,
      height: dims.height,
      depth: dims.depth,
      density,
      strutRadius,
      gridX,
      gridY,
      gridZ,
    }

    const sim = estimateLatticePerformance(
      patternToTry,
      dims.width,
      dims.height,
      dims.depth,
      density,
      materialHint
    )

    bestResult = sim
    bestPattern = patternToTry
    bestParams = params

    const group = createLatticeGeometry(bestParams)
    const exporter = new STLExporter()
    const stlString = exporter.parse(group, { binary: false })
    writeFileSync(outputPath, stlString, 'utf-8')

    return {
      path: outputPath,
      pattern: bestPattern,
      params: bestParams,
      simulation: bestResult,
    }
  } catch (err) {
    console.error('[LatticeGenerator]', err)
    return null
  }
}
