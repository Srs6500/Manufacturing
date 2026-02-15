import { Canvas } from '@react-three/fiber'
import { OrbitControls, Grid } from '@react-three/drei'
import { useEffect, useState } from 'react'
import * as THREE from 'three'
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js'
import { getLatticeStlUrl } from '../lib/api'

/**
 * Placeholder 3D view when no lattice is loaded.
 * Wireframe box + grid in Electric Blueprint style.
 */
function LatticePlaceholder() {
  return (
    <group>
      <mesh>
        <boxGeometry args={[1.2, 0.8, 0.6]} />
        <meshBasicMaterial color="#00ffff" wireframe />
      </mesh>
      <Grid
        args={[4, 4]}
        cellSize={0.5}
        cellThickness={0.5}
        cellColor="rgba(0, 255, 255, 0.08)"
        sectionSize={1}
        sectionThickness={0.8}
        sectionColor="rgba(0, 255, 255, 0.15)"
        fadeDistance={8}
        fadeStrength={1}
        infiniteGrid
      />
    </group>
  )
}

/**
 * Normalizes geometry: center at origin, scale to fit ~1 unit.
 */
function normalizeGeometry(geom: THREE.BufferGeometry): void {
  geom.computeBoundingBox()
  const box = geom.boundingBox
  if (!box) return
  const center = new THREE.Vector3()
  box.getCenter(center)
  geom.translate(-center.x, -center.y, -center.z)
  const size = new THREE.Vector3()
  box.getSize(size)
  const maxDim = Math.max(size.x, size.y, size.z, 1)
  geom.scale(1 / maxDim, 1 / maxDim, 1 / maxDim)
}

/**
 * Renders a loaded STL geometry (already normalized).
 */
function LatticeMesh({ geometry }: { geometry: THREE.BufferGeometry }) {
  return (
    <group>
      <mesh geometry={geometry}>
        <meshStandardMaterial
          color="#00ffff"
          metalness={0.2}
          roughness={0.6}
          emissive="#003344"
        />
      </mesh>
      <Grid
        args={[4, 4]}
        cellSize={0.5}
        cellThickness={0.5}
        cellColor="rgba(0, 255, 255, 0.08)"
        sectionSize={1}
        sectionThickness={0.8}
        sectionColor="rgba(0, 255, 255, 0.15)"
        fadeDistance={8}
        fadeStrength={1}
        infiniteGrid
      />
    </group>
  )
}

type LatticeState = 'idle' | 'loading' | 'loaded' | 'error'

/**
 * Loads STL from API and renders it. Falls back to placeholder when no jobId or on error.
 * cacheBuster: increment to force reload (e.g. after regeneration).
 */
function LatticeScene({ jobId, cacheBuster }: { jobId: string | null; cacheBuster?: number }) {
  const [state, setState] = useState<LatticeState>('idle')
  const [geometry, setGeometry] = useState<THREE.BufferGeometry | null>(null)

  useEffect(() => {
    if (!jobId) {
      setState('idle')
      setGeometry(null)
      return
    }

    setState('loading')
    setGeometry(null)

    const url = getLatticeStlUrl(jobId, cacheBuster)
    const loader = new STLLoader()

    loader
      .loadAsync(url)
      .then((geom) => {
        normalizeGeometry(geom)
        setGeometry(geom)
        setState('loaded')
      })
      .catch((err) => {
        console.warn('[LatticePreview] Failed to load STL:', err)
        setState('error')
        setGeometry(null)
      })
  }, [jobId, cacheBuster])

  if (state === 'loading') {
    return (
      <group>
        <mesh>
          <boxGeometry args={[0.5, 0.5, 0.5]} />
          <meshBasicMaterial color="#00ffff" wireframe opacity={0.5} transparent />
        </mesh>
        <Grid
          args={[4, 4]}
          cellSize={0.5}
          cellThickness={0.5}
          cellColor="rgba(0, 255, 255, 0.08)"
          sectionSize={1}
          sectionThickness={0.8}
          sectionColor="rgba(0, 255, 255, 0.15)"
          fadeDistance={8}
          fadeStrength={1}
          infiniteGrid
        />
      </group>
    )
  }

  if (state === 'loaded' && geometry) {
    return <LatticeMesh geometry={geometry} />
  }

  return <LatticePlaceholder />
}

export interface LatticePreviewProps {
  /** When set, loads and displays the generated lattice STL for this job */
  jobId?: string | null
  /** Increment to force reload (e.g. after regeneration) */
  cacheBuster?: number
}

export function LatticePreview({ jobId = null, cacheBuster }: LatticePreviewProps) {
  return (
    <div className="w-full h-full min-h-[320px] overflow-hidden bg-[#001133]">
      <Canvas
        camera={{ position: [2.5, 1.5, 2.5], fov: 50 }}
        gl={{ antialias: true, alpha: true }}
      >
        <color attach="background" args={['#001133']} />
        <ambientLight intensity={0.4} />
        <directionalLight position={[5, 5, 5]} intensity={1} />
        <LatticeScene jobId={jobId} cacheBuster={cacheBuster} />
        <OrbitControls enableDamping dampingFactor={0.05} />
      </Canvas>
    </div>
  )
}
