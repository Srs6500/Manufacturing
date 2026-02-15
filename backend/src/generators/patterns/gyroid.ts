import * as THREE from 'three'
import { MarchingCubes } from 'three/examples/jsm/objects/MarchingCubes.js'
import { STLExporter } from 'three/examples/jsm/exporters/STLExporter.js'
import type { LatticeParams } from '../lattice-types.js'

/**
 * Gyroid: triply-periodic minimal surface.
 * sin(x)cos(y) + sin(y)cos(z) + sin(z)cos(x) = threshold
 * Uses MarchingCubes to extract the surface.
 */
export function createGyroid(params: LatticeParams): THREE.Group {
  const { width, height, depth, density } = params
  const group = new THREE.Group()

  const resolution = 24
  const material = new THREE.MeshBasicMaterial()
  const marchingCubes = new MarchingCubes(resolution, material, false, false, 50000)
  marchingCubes.init(resolution)

  const size = marchingCubes.size
  const halfsize = marchingCubes.halfsize
  const scale = Math.min(width, height, depth) / 4
  const threshold = 0.3 * (1 - density)

  for (let x = 0; x < size; x++) {
    for (let y = 0; y < size; y++) {
      for (let z = 0; z < size; z++) {
        const wx = ((x - halfsize) / halfsize) * Math.PI * 2
        const wy = ((y - halfsize) / halfsize) * Math.PI * 2
        const wz = ((z - halfsize) / halfsize) * Math.PI * 2
        const val =
          Math.sin(wx) * Math.cos(wy) +
          Math.sin(wy) * Math.cos(wz) +
          Math.sin(wz) * Math.cos(wx)
        marchingCubes.setCell(x, y, z, val)
      }
    }
  }

  marchingCubes.isolation = threshold
  marchingCubes.update()

  marchingCubes.scale.setScalar(scale)
  group.add(marchingCubes)

  return group
}
