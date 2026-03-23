/**
 * LangGraph pipeline for Lattice AI.
 *
 * Flow:
 *   START → policy_gate → (blocked → END | continue → analyze → material_search → material_select (interrupt))
 *   On resume: material_select returns selectedMaterialId → lattice → build_bible → certificate → END
 *
 * policy_gate uses LLM structured JSON (Vertex/OpenAI) — not a static keyword list — to block weapons/explosives
 * while allowing lawful aerospace/mechanical prompts (drones, satellites, structural parts).
 *
 * The material_select node calls interrupt() to pause. The Express layer emits
 * material options via WebSocket, waits for material_selected, then resumes
 * with Command({ resume: selectedMaterialId }).
 */
import { StateGraph, START, END, MemorySaver } from '@langchain/langgraph'
import { LatticePipelineState, type LatticePipelineStateType } from './state.js'
import {
  policyGateNode,
  analyzeNode,
  materialSearchNode,
  materialSelectNode,
  latticeNode,
  buildBibleNode,
  certificateNode,
} from './nodes.js'

function routeAfterPolicy(state: LatticePipelineStateType): 'blocked' | 'continue' {
  return state.policyBlocked ? 'blocked' : 'continue'
}

let compiledGraph: ReturnType<typeof buildGraph> | null = null

function buildGraph() {
  const builder = new StateGraph(LatticePipelineState)
    .addNode('policy_gate', policyGateNode)
    .addNode('analyze', analyzeNode)
    .addNode('material_search', materialSearchNode)
    .addNode('material_select', materialSelectNode)
    .addNode('lattice', latticeNode)
    .addNode('build_bible', buildBibleNode)
    .addNode('certificate', certificateNode)
    .addEdge(START, 'policy_gate')
    .addConditionalEdges('policy_gate', routeAfterPolicy, {
      blocked: END,
      continue: 'analyze',
    })
    .addEdge('analyze', 'material_search')
    .addEdge('material_search', 'material_select')
    .addEdge('material_select', 'lattice')
    .addEdge('lattice', 'build_bible')
    .addEdge('build_bible', 'certificate')
    .addEdge('certificate', END)

  return builder.compile({
    checkpointer: new MemorySaver(),
  })
}

/**
 * Get the compiled graph. Lazily built on first use.
 */
export function getLatticePipelineGraph() {
  if (!compiledGraph) {
    compiledGraph = buildGraph()
  }
  return compiledGraph
}
