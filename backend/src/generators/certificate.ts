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
  } | null
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
  simulation?: LatticeResult | null
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
        }
      : null,
  }

  const json = JSON.stringify(cert, null, 2)
  writeFileSync(outputPath, json, 'utf-8')
  return outputPath
}
