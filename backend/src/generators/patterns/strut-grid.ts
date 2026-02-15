import * as THREE from 'three'
import type { LatticeParams } from '../lattice-types.js'

/**
 * Simple strut grid: nodes at grid points, beams along X/Y/Z.
 */
export function createStrutGrid(params: LatticeParams): THREE.Group {
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
      }
    }
  }

  return group
}
