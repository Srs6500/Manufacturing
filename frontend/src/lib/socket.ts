import { io, Socket } from 'socket.io-client'

/**
 * Socket URL: use VITE_API_URL when set (e.g. production), otherwise empty string
 * so the client connects to the same origin and Vite proxy forwards to the backend.
 * In dev, leave VITE_API_URL unset so /socket.io is proxied to localhost:3001.
 */
const SOCKET_URL = import.meta.env.VITE_API_URL ?? ''

let socket: Socket | null = null

export function getSocket(): Socket {
  if (!socket) {
    socket = io(SOCKET_URL, {
      path: '/socket.io',
      transports: ['polling', 'websocket'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
    })
  }
  return socket
}

import type { AnalyzedRequirements } from '../types/requirements'

export type LatticeParams = {
  pattern: string
  width: number
  height: number
  depth: number
  density: number
  strutRadius: number
  gridX: number
  gridY: number
  gridZ: number
}

export type ProgressPayload = {
  step: string
  prompt?: string
  requirements?: AnalyzedRequirements | null
  materialOptions?: Array<{
    id: string
    name: string
    summary: string
    safetyWarning?: string
    safetyStatus?: string
  }>
  simulation?: {
    pattern: string
    estimatedMassG: number
    estimatedLoadKg: number
    safetyFactor: number
  }
  latticeParams?: LatticeParams
  selectedMaterialId?: string
  jobId?: string
  error?: boolean
}

export function subscribeToJob(
  jobId: string,
  onProgress: (payload: ProgressPayload) => void
): () => void {
  const s = getSocket()
  s.emit('subscribe', jobId)
  const handler = (payload: ProgressPayload) => onProgress(payload)
  s.on('progress', handler)
  return () => {
    s.off('progress', handler)
  }
}

export function selectMaterial(jobId: string, materialId: string): void {
  getSocket().emit('material_selected', { jobId, materialId })
}
