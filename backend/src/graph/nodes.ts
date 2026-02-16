/**
 * LangGraph nodes for the Lattice AI pipeline.
 *
 * Each node receives the current state, performs work, and returns a partial
 * state update. Nodes are pure with respect to state; side effects (DB, files)
 * are encapsulated here.
 */
import { interrupt } from '@langchain/langgraph'
import { analyzeRequirements } from '../agents/requirement-analyzer.js'
import { searchMaterials } from '../agents/material-selector.js'
import { generateLattice } from '../generators/lattice-generator.js'
import { generateBuildBible } from '../generators/build-bible.js'
import { generateCertificate } from '../generators/certificate.js'
import { getJobOutputPaths } from '../lib/output-paths.js'
import type {
  LatticePipelineStateType,
  MaterialOptionState,
} from './state.js'
import { toMaterialOptionState } from './state.js'

/** Input type for nodes; matches full state. */
type State = LatticePipelineStateType

// ——— analyze ———

export async function analyzeNode(state: State): Promise<Partial<State>> {
  const requirements = await analyzeRequirements(state.prompt)
  return { requirements: requirements ?? null }
}

// ——— material_search ———

export async function materialSearchNode(state: State): Promise<Partial<State>> {
  const options = await searchMaterials(state.requirements ?? null)
  const materialOptions = options.map(toMaterialOptionState)
  return { materialOptions }
}

// ——— material_select (interrupt) ———

/**
 * Interrupt value emitted when waiting for user material selection.
 * The Express layer emits this via WebSocket and waits for material_selected.
 */
export interface MaterialInterruptValue {
  jobId: string
  materialOptions: MaterialOptionState[]
  requirements: State['requirements']
}

/**
 * Material selection node. Calls interrupt() to pause until the user selects
 * a material. On resume, interrupt() returns the selectedMaterialId.
 */
export function materialSelectNode(state: State): Partial<State> & { selectedMaterialId: string } {
  const selectedMaterialId = interrupt<MaterialInterruptValue, string>({
    jobId: state.jobId,
    materialOptions: state.materialOptions,
    requirements: state.requirements,
  })
  return { selectedMaterialId }
}

// ——— lattice ———

export async function latticeNode(state: State): Promise<Partial<State>> {
  const paths = getJobOutputPaths(state.jobId)
  const result = generateLattice(paths.lattice, state.requirements ?? null, {
    selectedMaterialId: state.selectedMaterialId ?? undefined,
  })
  if (!result) {
    return { error: true }
  }
  return {
    latticeResult: {
      path: result.path,
      pattern: result.pattern,
      params: result.params,
      simulation: result.simulation,
    },
  }
}

// ——— build_bible ———

export async function buildBibleNode(state: State): Promise<Partial<State>> {
  if (state.error || !state.latticeResult) {
    return {}
  }
  const paths = getJobOutputPaths(state.jobId)
  const reportPath = await generateBuildBible(
    paths.report,
    state.requirements ?? null,
    state.prompt,
    state.jobId,
    state.latticeResult.simulation
  )
  return { reportPath: reportPath ?? null }
}

// ——— certificate ———

export function certificateNode(state: State): Partial<State> {
  if (state.error) return {}
  const paths = getJobOutputPaths(state.jobId)
  generateCertificate(
    paths.certificate,
    state.jobId,
    state.prompt,
    state.requirements ?? null,
    state.latticeResult?.simulation ?? null
  )
  return {}
}
