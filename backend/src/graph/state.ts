/**
 * LangGraph state schema for the Lattice AI pipeline.
 *
 * Defines the shared state passed between nodes. Each node reads from and
 * returns partial updates to this state. Reducers determine how updates merge.
 */
import { Annotation } from '@langchain/langgraph'
import type { AnalyzedRequirements } from '../agents/types.js'
import type { MaterialOption } from '../agents/material-selector.js'
import type { LatticeParams, LatticeResult } from '../generators/lattice-types.js'

/** Material option shown to user; includes id for selection. */
export interface MaterialOptionState {
  id: string
  name: string
  formula: string
  density: number
  youngsModulus?: number
  yieldStrength?: number
  costUsdPerKg?: number
  printableBy: string[]
  summary: string
  /** Red Alert: toxic/hazardous. Do not use for food contact. */
  safetyWarning?: string
  /** Always set: "No known hazards" or brief hazard summary. */
  safetyStatus?: string
}

/** Lattice generation result stored in state. */
export interface LatticeResultState {
  path: string
  pattern: string
  params: LatticeParams
  simulation: LatticeResult
}

/**
 * Root state annotation. Each field uses LastValue semantics by default:
 * a node's return value replaces the previous value.
 */
export const LatticePipelineState = Annotation.Root({
  /** User prompt (input). */
  prompt: Annotation<string>(),
  /** Job ID for outputs and WebSocket room. */
  jobId: Annotation<string>(),
  /** Extracted requirements from the prompt. */
  requirements: Annotation<AnalyzedRequirements | null>(),
  /** Material options from search; shown to user before interrupt. */
  materialOptions: Annotation<MaterialOptionState[]>(),
  /** User-selected material ID (from interrupt resume). */
  selectedMaterialId: Annotation<string | null>(),
  /** Lattice generation result (path, params, simulation). */
  latticeResult: Annotation<LatticeResultState | null>(),
  /** Builder Spec PDF path. */
  reportPath: Annotation<string | null>(),
  /** Whether the pipeline failed. */
  error: Annotation<boolean>(),
})

export type LatticePipelineStateType = typeof LatticePipelineState.State

/** Convert MaterialOption to state shape (serializable). */
export function toMaterialOptionState(m: MaterialOption): MaterialOptionState {
  return {
    id: m.id,
    name: m.name,
    formula: m.formula,
    density: m.density,
    youngsModulus: m.youngsModulus,
    yieldStrength: m.yieldStrength,
    costUsdPerKg: m.costUsdPerKg,
    printableBy: m.printableBy,
    summary: m.summary,
    safetyWarning: m.safetyWarning,
    safetyStatus: m.safetyStatus,
  }
}
