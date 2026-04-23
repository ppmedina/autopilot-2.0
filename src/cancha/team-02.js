// src/cancha/team.js
import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'

export function createTeam(scene) {
  const loader = new GLTFLoader()

  loader.load(
    '/team.glb',
    (gltf) => {

      // Detectar nombres de piezas
      gltf.scene.traverse((child) => {
        if (child.isMesh) console.log('Mesh:', child.name)
      })

      // Materiales por pieza
      gltf.scene.traverse((child) => {
        if (!child.isMesh) return

        if (child.name === 'parte-01') {
          child.material = new THREE.MeshPhysicalMaterial({
            color:            0x153351,
            transmission:     0.75,      // un poco menos transparente para que se vea
            roughness:        0.05,
            metalness:        0.1,
            thickness:        2.0,
            transparent:      true,
            opacity:          0.75,
            side:             THREE.DoubleSide,
            envMapIntensity:  2.0,
            reflectivity:     0.8,
            ior:              1.5,
          })
        }

        if (child.name === 'parte-02') {
          child.material = new THREE.MeshPhysicalMaterial({
            color:            0xFE4D2A,
            transmission:     0.75,      // un poco menos transparente para que se vea
            roughness:        0.05,
            metalness:        0.1,
            thickness:        2.0,
            transparent:      true,
            opacity:          0.75,
            side:             THREE.DoubleSide,
            envMapIntensity:  2.0,
            reflectivity:     0.8,
            ior:              1.5,
          })
        }
      })

      // Tamaño y posición
      gltf.scene.scale.setScalar(4.4)
      gltf.scene.position.set(0, 10, 0)

      scene.add(gltf.scene)
    },
    (progress) => {
      console.log('Cargando:', (progress.loaded / progress.total * 100).toFixed(1) + '%')
    },
    (error) => {
      console.error('Error cargando team:', error)
    }
  )
}

