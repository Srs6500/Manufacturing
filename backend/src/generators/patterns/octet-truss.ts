import * as THREE from 'three'
import type { LatticeParams } from '../lattice-types.js'

/**
 * Octet-truss: strut grid plus diagonal beams in each cell.
 * Creates a stronger 3D truss structure.
 */
export function createOctetTruss(params: LatticeParams): THREE.Group {
  const { width, height, depth, strutRadius, gridX, gridY, gridZ } = params
  const group = new THREE.Group()

  const stepX = gridX > 1 ? width / (gridX - 1) : width
  const stepY = gridY > 1 ? height / (gridY - 1) : height
  const stepZ = gridZ > 1 ? depth / (gridZ - 1) : depth

  const halfW = width / 2
  const halfH = height / 2
  const halfD = depth / 2

  const nodeGeom = new THREE.SphereGeometry(strutRadius * 1.5, 8, 6)
  const material = new THREE.MeshBasicMaterial()

  for (let i = 0; i < gridX; i++) {
    for (let j = 0; j < gridY; j++) {
      for (let k = 0; k < gridZ; k++) {
        const x = i * stepX - halfW
        const y = j * stepY - halfH
        const z = k * stepZ - halfD
        const node = new THREE.Mesh(nodeGeom, material)
        node.position.set(x, y, z)
        group.add(node)
      }
    }
  }

  const cylGeom = new THREE.CylinderGeometry(strutRadius, strutRadius, 1, 6)

  function addBeam(x1: number, y1: number, z1: number, x2: number, y2: number, z2: number) {
    const dx = x2 - x1
    const dy = y2 - y1
    const dz = z2 - z1
    const len = Math.sqrt(dx * dx + dy * dy + dz * dz)
    if (len < 0.01) return
    const beam = new THREE.Mesh(cylGeom, material)
    beam.position.set((x1 + x2) / 2, (y1 + y2) / 2, (z1 + z2) / 2)
    beam.scale.y = len
    const dir = new THREE.Vector3(dx, dy, dz).normalize()
    beam.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir)
    group.add(beam)
  }

  for (let i = 0; i < gridX; i++) {
    for (let j = 0; j < gridY; j++) {
      for (let k = 0; k < gridZ; k++) {
        const x = i * stepX - halfW
        const y = j * stepY - halfH
        const z = k * stepZ - halfD

        if (i < gridX - 1) {
          const beam = new THREE.Mesh(cylGeom, material)
          beam.position.set(x + stepX / 2, y, z)
          beam.scale.y = stepX
          beam.rotation.z = Math.PI / 2
          group.add(beam)
        }
        if (j < gridY - 1) {
          const beam = new THREE.Mesh(cylGeom, material)
          beam.position.set(x, y + stepY / 2, z)
          beam.scale.y = stepY
          group.add(beam)
        }
        if (k < gridZ - 1) {
          const beam = new THREE.Mesh(cylGeom, material)
          beam.position.set(x, y, z + stepZ / 2)
          beam.scale.y = stepZ
          beam.rotation.x = Math.PI / 2
          group.add(beam)
        }

        if (i < gridX - 1 && j < gridY - 1 && k < gridZ - 1) {
          const x2 = x + stepX
          const y2 = y + stepY
          const z2 = z + stepZ
          addBeam(x, y, z, x2, y2, z2)
          addBeam(x2, y, z, x, y2, z2)
          addBeam(x, y2, z, x2, y, z2)
          addBeam(x, y, z2, x2, y2, z)
        }
      }
    }
  }

  return group
}
