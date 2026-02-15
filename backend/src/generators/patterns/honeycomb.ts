import * as THREE from 'three'
import type { LatticeParams } from '../lattice-types.js'

/**
 * Honeycomb: hexagonal cells in XY plane, extruded in Z.
 * Lightweight, good for compression.
 */
export function createHoneycomb(params: LatticeParams): THREE.Group {
  const { width, height, depth, strutRadius, gridX, gridY, gridZ } = params
  const group = new THREE.Group()

  const halfW = width / 2
  const halfH = height / 2
  const halfD = depth / 2

  const hexRadius = Math.min(width / (gridX * 2.5), height / (gridY * 2.2)) || 10
  const material = new THREE.MeshBasicMaterial()
  const cylGeom = new THREE.CylinderGeometry(strutRadius, strutRadius, 1, 6)

  function hexCorner(cx: number, cy: number, i: number): [number, number] {
    const angle = (Math.PI / 3) * i
    return [cx + hexRadius * Math.cos(angle), cy + hexRadius * Math.sin(angle)]
  }

  const hexCenters: [number, number][] = []
  for (let row = 0; row < gridY; row++) {
    for (let col = 0; col < gridX; col++) {
      const x = col * hexRadius * 2.5 + (row % 2) * hexRadius * 1.25
      const y = row * hexRadius * 2.2
      hexCenters.push([x - halfW, y - halfH])
    }
  }

  const stepZ = gridZ > 1 ? depth / (gridZ - 1) : depth

  for (let k = 0; k < gridZ; k++) {
    const z = k * stepZ - halfD
    for (const [cx, cy] of hexCenters) {
      for (let i = 0; i < 6; i++) {
        const [x1, y1] = hexCorner(cx, cy, i)
        const [x2, y2] = hexCorner(cx, cy, (i + 1) % 6)
        const dx = x2 - x1
        const dy = y2 - y1
        const len = Math.sqrt(dx * dx + dy * dy)
        if (len < 0.01) continue
        const beam = new THREE.Mesh(cylGeom, material)
        beam.position.set((x1 + x2) / 2, (y1 + y2) / 2, z)
        beam.scale.y = len
        const dir = new THREE.Vector3(dx, dy, 0).normalize()
        beam.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir)
        group.add(beam)
      }
    }
  }

  for (let k = 0; k < gridZ - 1; k++) {
    const z1 = k * stepZ - halfD
    const z2 = (k + 1) * stepZ - halfD
    for (const [cx, cy] of hexCenters) {
      const beam = new THREE.Mesh(cylGeom, material)
      beam.position.set(cx, cy, (z1 + z2) / 2)
      beam.scale.y = stepZ
      beam.rotation.x = Math.PI / 2
      group.add(beam)
    }
  }

  return group
}
