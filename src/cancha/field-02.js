// src/cancha/field-02.js
import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { RGBELoader }  from 'three/addons/loaders/RGBELoader.js'
import GUI from 'lil-gui'

export const CANCHA_BLOOM_LAYER = 1

// ── Función para ajustar el aspect ratio del background ──
function ajustarBackground(tex) {
  if (!tex || !tex.image) return
  const canvasAspect = window.innerWidth / window.innerHeight
  const imageAspect  = tex.image.width / tex.image.height

  if (canvasAspect > imageAspect) {
    tex.repeat.set(1, imageAspect / canvasAspect)
    tex.offset.set(0, (1 - imageAspect / canvasAspect) / 2)
  } else {
    tex.repeat.set(canvasAspect / imageAspect, 1)
    tex.offset.set((1 - canvasAspect / imageAspect) / 2, 0)
  }
}

export function createField(scene, ruta = '/cancha.glb', opciones = {}) {

  const {
    escala   = 10.0,
    posicion = { x: 0, y: -5, z: 0 },
    rotacion = { x: 0, y: 0, z: 0 },
  } = opciones

  // ── Fondo fijo PNG ajustado al ancho de la ventana ──
  const bgTexture = new THREE.TextureLoader().load('/estadio.png', (tex) => {
    ajustarBackground(tex)
  })
  scene.background = bgTexture

  window.addEventListener('resize', () => {
    ajustarBackground(bgTexture)
  })

  // ── HDR solo para reflejos ──
  new RGBELoader().load('/stadium.hdr', (hdrTexture) => {
    hdrTexture.mapping = THREE.EquirectangularReflectionMapping
    scene.environment  = hdrTexture

    const loader = new GLTFLoader()

    loader.load(
      ruta,

      (gltf) => {

        // ── Detectar nombres de piezas ──
        gltf.scene.traverse((child) => {
          if (child.isMesh) console.log('Mesh:', child.name)
        })

        // ── Material Superficie ──
        const matCapa01 = new THREE.MeshPhysicalMaterial({
          color:        0x322f31,
          metalness:    0,
          roughness:    0,
          transmission: 1,
          ior:          1.5,
          thickness:    0.5,
          transparent:  true,
          opacity:      0.85,
        })

        // ── Material capa brillante ──
        const matCapa02 = new THREE.MeshPhysicalMaterial({
          color:             0x1D272F,
          emissive:          0x7BE6F1,
          emissiveIntensity: 0.2,
          roughness:         0.05,
          metalness:         0.1,
          side:              THREE.DoubleSide,
          envMapIntensity:   2.0,
        })

        // ── Material capa final ──
        const matCapa03 = new THREE.MeshPhysicalMaterial({
          color:           0x322f31,
          transmission:    0.56,
          roughness:       0.32,
          metalness:       0.3,
          thickness:       3.3,
          transparent:     true,
          opacity:         0.47,
          envMapIntensity: 2.8,
          reflectivity:    0.750,
          ior:             3.2,
        })

        // Material para las franjas del modelo
        const matFranjas = new THREE.MeshPhysicalMaterial({
          color:           0xcce0ff,
          transmission:    0.5,
          roughness:       0.3,
          metalness:       0.2,
          transparent:     true,
          opacity:         0.18,
          side:            THREE.DoubleSide,
          envMapIntensity: 2.0,
        })

        // Material para los grids
        const matGrids = new THREE.MeshPhysicalMaterial({
          color:           0xcce0ff,
          transmission:    0.5,
          roughness:       0.3,
          metalness:       0.2,
          transparent:     true,
          opacity:         0.18,
          side:            THREE.DoubleSide,
          envMapIntensity: 2.0,
          wireframe:       true,
        })

        // ── Aplicar materiales y renderOrder ──
        gltf.scene.traverse((child) => {
          if (!child.isMesh) return

          child.renderOrder = 1  // ← cancha en orden 1, líneas también en 1, fichas en 2

          if (child.name === 'capa-01') child.material = matCapa01
          if (child.name === 'capa-03') child.material = matCapa03
          if (child.name === 'capa-02') {
            child.material = matCapa02
            child.layers.enable(CANCHA_BLOOM_LAYER)
          }
          if (child.name === 'franjas' || child.name === 'franjas001') {
            child.material = matFranjas
            child.visible = false 
          }
          if (child.name === 'grid-10x6' || child.name === 'franjas001') {
            child.material = matGrids
          }
        })

        // ── lil-gui ──
        function addMaterialFolder(gui, nombre, material, colorHex) {
          const folder = gui.addFolder(nombre)
          folder.addColor({ color: colorHex }, 'color').name('Color').onChange(v => {
            material.color.set(v)
          })
          folder.add(material, 'transmission',    0, 1,   0.01).name('Transmisión')
          folder.add(material, 'roughness',       0, 1,   0.01).name('Rugosidad')
          folder.add(material, 'metalness',       0, 1,   0.01).name('Metalness')
          folder.add(material, 'thickness',       0, 5,   0.1 ).name('Grosor cristal')
          folder.add(material, 'opacity',         0, 1,   0.01).name('Opacidad')
          folder.add(material, 'envMapIntensity', 0, 5,   0.1 ).name('Env intensity')
          folder.add(material, 'reflectivity',    0, 1,   0.01).name('Reflectividad')
          folder.add(material, 'ior',             1, 2.5, 0.01).name('IOR')
          if (material.emissive) {
            folder.add(material, 'emissiveIntensity', 0, 5, 0.1).name('Glow intensity')
          }
        }

        const gui = new GUI({ title: 'Cancha controls' })
        addMaterialFolder(gui, 'Capa 01',  matCapa01,  '#153351')
        addMaterialFolder(gui, 'Capa 02',  matCapa02,  '#7BE6F1')
        addMaterialFolder(gui, 'Capa 03',  matCapa03,  '#153351')
        addMaterialFolder(gui, 'Franjas',  matFranjas, '#1a3a6b')
        gui.hide()

        // ── Tamaño, posición y rotación ──
        gltf.scene.scale.setScalar(escala)
        gltf.scene.position.set(posicion.x, posicion.y, posicion.z)
        gltf.scene.rotation.set(rotacion.x, rotacion.y, rotacion.z)

        scene.add(gltf.scene)
      },

      (progress) => {
        const pct = (progress.loaded / progress.total * 100).toFixed(1)
        console.log(`Cargando ${ruta}: ${pct}%`)
      },

      (error) => {
        console.error(`Error cargando ${ruta}:`, error)
      }
    )
  })

  return { fieldMaterial: null, bgTexture }
}
