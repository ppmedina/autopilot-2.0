// src/cancha/team.js
import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import GUI from 'lil-gui'

export const BLOOM_LAYER = 1

// Referencia exportada para billboarding en script.js
export let teamObject = null

export function createTeam(scene) {
  const loader = new GLTFLoader()

  // ── Gradiente emissive radial — centro oscuro, borde brillante ──
  function crearGradienteEmissive() {
    const canvas  = document.createElement('canvas')
    canvas.width  = 256
    canvas.height = 256
    const ctx     = canvas.getContext('2d')

    const gradient = ctx.createLinearGradient(0, 256, 0, 0)
    gradient.addColorStop(0.5, '#020204')
    gradient.addColorStop(0.8, '#0d1626')
    gradient.addColorStop(1.0, '#00aaff')

    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, 256, 256)

    return new THREE.CanvasTexture(canvas)
  }

  loader.load(
    '/team-04.glb',
    (gltf) => {

      // Detectar nombres de piezas
      gltf.scene.traverse((child) => {
        if (child.isMesh) console.log('Mesh:', child.name)
      })

      // ── Materiales ──
      const matParte01 = new THREE.MeshPhysicalMaterial({
        color:           0x0C1925,
        transmission:    0.75,
        roughness:       0.05,
        metalness:       0.1,
        thickness:       2.0,
        transparent:     true,
        opacity:         0.52,
        side:            THREE.DoubleSide,
        envMapIntensity: 2.0,
        reflectivity:    0.8,
        ior:             1.5,
      })

      const matParte02 = new THREE.MeshPhysicalMaterial({
        color:             0x7ea4c8,
        emissive:          0x7BE6F1,
        emissiveIntensity: 0.5,
        emissiveMap:       crearGradienteEmissive(),
        transmission:      0.75,
        roughness:         0.05,
        metalness:         0.1,
        thickness:         2.0,
        transparent:       true,
        opacity:           0.75,
        side:              THREE.DoubleSide,
        envMapIntensity:   2.0,
        reflectivity:      0.8,
        ior:               1.5,
      })

      // ── Aplicar materiales y layer de bloom al contorno ──
      gltf.scene.traverse((child) => {
        if (!child.isMesh) return
        if (child.name === 'base')     child.material = matParte01
        if (child.name === 'contorno') {
          child.material = matParte02
          child.layers.enable(BLOOM_LAYER)
        }
      })

      // ── GUI ──
      function addMaterialFolder(gui, nombre, material, colorHex) {
        const folder = gui.addFolder(nombre)
        folder.addColor({ color: colorHex }, 'color').name('Color').onChange(v => {
          material.color.set(v)
        })
        folder.add(material, 'emissiveIntensity', 0, 5,   0.1 ).name('Glow intensity')
        folder.add(material, 'transmission',      0, 1,   0.01).name('Transmisión')
        folder.add(material, 'roughness',         0, 1,   0.01).name('Rugosidad')
        folder.add(material, 'metalness',         0, 1,   0.01).name('Metalness')
        folder.add(material, 'thickness',         0, 5,   0.1 ).name('Grosor cristal')
        folder.add(material, 'opacity',           0, 1,   0.01).name('Opacidad')
        folder.add(material, 'envMapIntensity',   0, 5,   0.1 ).name('Env intensity')
        folder.add(material, 'reflectivity',      0, 1,   0.01).name('Reflectividad')
        folder.add(material, 'ior',               1, 2.5, 0.01).name('IOR')
      }

      const gui = new GUI({ title: 'Team controls' })
      addMaterialFolder(gui, 'Base',     matParte01, '#173858')
      addMaterialFolder(gui, 'Contorno', matParte02, '#172c40')
      gui.hide()

      // ── Tamaño y posición ──
      gltf.scene.scale.setScalar(7.0)
      gltf.scene.position.set(0, 10, 0)
      gltf.scene.rotation.x = 0

      scene.add(gltf.scene)

      // ← Guardar referencia para billboarding
      teamObject = gltf.scene
    },
    (progress) => {
      console.log('Cargando:', (progress.loaded / progress.total * 100).toFixed(1) + '%')
    },
    (error) => {
      console.error('Error cargando team:', error)
    }
  )
}