/**
 * Structured output from the Requirement Analyzer agent.
 * Used by downstream agents (Material Selector, Lattice Generator, etc.).
 */
export interface AnalyzedRequirements {
  /** Material hints from the prompt (e.g. "aluminum", "Ti-6Al-4V") */
  materials: string[]
  /** Weight constraint if mentioned (e.g. "under 200g") */
  weightConstraint?: string
  /** Load / strength constraint (e.g. "survive 10G crash") */
  loadConstraint?: string
  /** Manufacturing process (e.g. "SLM", "3D printable") */
  process?: string
  /** Other constraints (recyclable, porosity, etc.) */
  constraints: string[]
  /** One-line summary for logs */
  summary: string
}
