/** Matches backend Requirement Analyzer output */
export interface AnalyzedRequirements {
  materials: string[]
  weightConstraint?: string
  loadConstraint?: string
  process?: string
  constraints: string[]
  summary: string
}
