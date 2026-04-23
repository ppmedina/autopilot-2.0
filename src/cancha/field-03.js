import * as THREE from 'three'
import GUI from 'lil-gui'
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js'

export function createField(scene) {

  // ── Fondo PNG panorámico con movimiento ──
  const textureLoader = new THREE.TextureLoader()
  const bgTexture = textureLoader.load('/estadio.exr')
  bgTexture.mapping = THREE.EquirectangularReflectionMapping
  scene.background  = bgTexture

  // HDR solo para reflejos (no como fondo)
  new RGBELoader().load('/estadio.exr', (hdrTexture) => {
    hdrTexture.mapping = THREE.EquirectangularReflectionMapping
    scene.environment  = hdrTexture
  })

  // Material de cristal
  const fieldMaterial = new THREE.MeshPhysicalMaterial({
    color:           0x153351,
    transmission:    0.75,
    roughness:       0.05,
    metalness:       0.1,
    thickness:       2.0,
    transparent:     true,
    opacity:         0.75,
    side:            THREE.DoubleSide,
    envMapIntensity: 2.0,
    reflectivity:    0.8,
    ior:             1.5,
  })

  const fieldMaterial2 = new THREE.MeshPhysicalMaterial({
    color:           0x4400dd,
    transmission:    0.75,
    roughness:       0.05,
    metalness:       0.1,
    thickness:       2.0,
    side:            THREE.DoubleSide,
    envMapIntensity: 2.0,
    reflectivity:    0.8,
    ior:             1.5,
  })

  // ── Meshes ──
  const fieldMesh = new THREE.Mesh(
    new THREE.BoxGeometry(109, 72, 0.6),
    fieldMaterial
  )
  fieldMesh.rotation.x    = -Math.PI / 2
  fieldMesh.position.y    = -0.3
  fieldMesh.receiveShadow = true
  scene.add(fieldMesh)

  const fieldMesh2 = new THREE.Mesh(
    new THREE.BoxGeometry(109, 72, 0.6),
    fieldMaterial
  )
  fieldMesh2.rotation.x    = -Math.PI / 2
  fieldMesh2.position.y    = -1.3
  fieldMesh2.receiveShadow = true
  scene.add(fieldMesh2)

  const fieldMesh3 = new THREE.Mesh(
    new THREE.BoxGeometry(16, 16, 16),
    fieldMaterial2
  )
  fieldMesh3.rotation.x    = -Math.PI / 2
  fieldMesh3.position.y    = -12
  fieldMesh3.receiveShadow = true
  scene.add(fieldMesh3)

  // Glow inferior
  const glowMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(105, 68),
    new THREE.MeshPhysicalMaterial({
      color:       0x1155cc,
      transparent: true,
      opacity:     0.25,
      side:        THREE.DoubleSide,
    })
  )
  glowMesh.rotation.x = -Math.PI / 2
  glowMesh.position.y  = -0.08
  scene.add(glowMesh)

  // ── lil-gui ──
  const gui = new GUI({ title: 'Field controls' })

  // Dimensiones
  const dimFolder = gui.addFolder('Dimensiones')
  dimFolder.add({ width: 110 }, 'width', 80, 200, 1).name('Ancho').onChange(v => {
    fieldMesh.geometry.dispose()
    fieldMesh.geometry = new THREE.BoxGeometry(v, 0.8, 74)
  })
  dimFolder.add({ depth: 74 }, 'depth', 60, 150, 1).name('Profundidad').onChange(v => {
    fieldMesh.geometry.dispose()
    fieldMesh.geometry = new THREE.BoxGeometry(110, 0.8, v)
  })
  dimFolder.add({ height: 0.8 }, 'height', 0.1, 3.0, 0.05).name('Grosor').onChange(v => {
    fieldMesh.geometry.dispose()
    fieldMesh.geometry = new THREE.BoxGeometry(110, v, 74)
  })
  dimFolder.add(fieldMesh.position, 'y', -2, 0, 0.05).name('Posición Y')

  // Material cristal
  const matFolder = gui.addFolder('Material cristal')
  matFolder.addColor({ color: '#153351' }, 'color').name('Color').onChange(v => {
    fieldMaterial.color.set(v)
  })
  matFolder.add(fieldMaterial, 'transmission',    0, 1,   0.01).name('Transmisión')
  matFolder.add(fieldMaterial, 'opacity',         0, 1,   0.01).name('Opacidad')
  matFolder.add(fieldMaterial, 'roughness',       0, 1,   0.01).name('Rugosidad')
  matFolder.add(fieldMaterial, 'metalness',       0, 1,   0.01).name('Metalness')
  matFolder.add(fieldMaterial, 'thickness',       0, 5,   0.1 ).name('Grosor cristal')
  matFolder.add(fieldMaterial, 'ior',             1, 2.5, 0.01).name('IOR')
  matFolder.add(fieldMaterial, 'reflectivity',    0, 1,   0.01).name('Reflectividad')
  matFolder.add(fieldMaterial, 'envMapIntensity', 0, 5,   0.1 ).name('Intensidad env')

  // Glow inferior
  const glowFolder = gui.addFolder('Glow inferior')
  glowFolder.addColor({ color: '#1155cc' }, 'color').name('Color').onChange(v => {
    glowMesh.material.color.set(v)
  })
  glowFolder.add(glowMesh.material, 'opacity', 0, 1, 0.01).name('Opacidad')

  // Entorno
  const envFolder = gui.addFolder('Entorno')
  envFolder.add({ intensity: 1 }, 'intensity', 0, 3, 0.01).name('Intensidad fondo').onChange(v => {
    scene.backgroundIntensity = v
  })
  envFolder.add({ blur: 0 }, 'blur', 0, 1, 0.01).name('Desenfoque').onChange(v => {
    scene.backgroundBlurriness = v
  })
  envFolder.add({ speed: 0.0003 }, 'speed', 0, 0.005, 0.0001).name('Velocidad fondo').onChange(v => {
    bgSpeed = v
  })

  return { fieldMaterial, bgTexture }
}

// Variable de velocidad accesible desde el loop
export let bgSpeed = 0.0003