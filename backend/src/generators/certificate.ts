import { writeFileSync } from 'node:fs'
import type { LatticeResult } from './lattice-types.js'
import type { AnalyzedRequirements } from '../agents/types.js'

export interface CertificateData {
  jobId: string
  prompt: string
  generatedAt: string
  requirements: AnalyzedRequirements | null
  lattice: {
    pattern: string
    estimatedMassG: number
    estimatedLoadKg: number
    safetyFactor: number
    relativeDensityPercent?: number
    indicativeYieldMpa?: number
    structuralProofNote?: string
  } | null
  /** Matches Builder Spec Section 1.0 (canonical payload hash) */
  builderSpecDocumentSha256?: string
  /** Placeholder for future blockchain proof */
  proof?: {
    txHash?: string
    blockNumber?: string
  }
}

/**
 * Generate certificate.json for the download package.
 */
export function generateCertificate(
  outputPath: string,
  jobId: string,
  prompt: string,
  requirements: AnalyzedRequirements | null,
  simulation?: LatticeResult | null,
  builderSpecDocumentSha256?: string
): string {
  const cert: CertificateData = {
    jobId,
    prompt,
    generatedAt: new Date().toISOString(),
    requirements,
    lattice: simulation
      ? {
          pattern: simulation.pattern,
          estimatedMassG: simulation.estimatedMassG,
          estimatedLoadKg: simulation.estimatedLoadKg,
          safetyFactor: simulation.safetyFactor,
          relativeDensityPercent: simulation.relativeDensityPercent,
          indicativeYieldMpa: simulation.indicativeYieldMpa,
          structuralProofNote: simulation.structuralProofNote,
        }
      : null,
    ...(builderSpecDocumentSha256 ? { builderSpecDocumentSha256 } : {}),
  }

  const json = JSON.stringify(cert, null, 2)
  writeFileSync(outputPath, json, 'utf-8')
  return outputPath
}
