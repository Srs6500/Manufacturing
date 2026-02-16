/**
 * LangGraph pipeline for Lattice AI.
 *
 * Flow:
 *   START → analyze → material_search → material_select (interrupt)
 *   On resume: material_select returns selectedMaterialId → lattice → build_bible → certificate → END
 *
 * The material_select node calls interrupt() to pause. The Express layer emits
 * material options via WebSocket, waits for material_selected, then resumes
 * with Command({ resume: selectedMaterialId }).
 */
import { StateGraph, START, END, MemorySaver } from '@langchain/langgraph'
import { LatticePipelineState } from './state.js'
import {
  analyzeNode,
  materialSearchNode,
  materialSelectNode,
  latticeNode,
  buildBibleNode,
  certificateNode,
} from './nodes.js'

let compiledGraph: ReturnType<typeof buildGraph> | null = null

function buildGraph() {
  const builder = new StateGraph(LatticePipelineState)
    .addNode('analyze', analyzeNode)
    .addNode('material_search', materialSearchNode)
    .addNode('material_select', materialSelectNode)
    .addNode('lattice', latticeNode)
    .addNode('build_bible', buildBibleNode)
    .addNode('certificate', certificateNode)
    .addEdge(START, 'analyze')
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
