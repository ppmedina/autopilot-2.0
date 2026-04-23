// src/cancha/conexiones.js
import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { BLOOM_LAYER } from './team.js'
import GUI from 'lil-gui'

const JUGADORES_EJEMPLO = [
  { numero: 1,  x: -48, z:  0  },
  { numero: 3,  x: -35, z: -18 },
  { numero: 4,  x: -35, z:  18 },
  { numero: 5,  x: -28, z:  0  },
  { numero: 6,  x: -15, z: -22 },
  { numero: 8,  x: -10, z:  0  },
  { numero: 10, x:   0, z: -12 },
  { numero: 14, x:   5, z:  15 },
  { numero: 9,  x:  20, z:  0  },
  { numero: 24, x:  10, z: -25 },
  { numero: 32, x: -20, z: -20 },
]

const CONEXIONES_EJEMPLO = [
  { de: 1,  a: 3,  intensidad: 0.6 },
  { de: 1,  a: 4,  intensidad: 0.5 },
  { de: 3,  a: 8,  intensidad: 0.8 },
  { de: 4,  a: 8,  intensidad: 0.7 },
  { de: 5,  a: 8,  intensidad: 0.9 },
  { de: 8,  a: 10, intensidad: 1.0 },
  { de: 8,  a: 14, intensidad: 0.8 },
  { de: 10, a: 9,  intensidad: 0.7 },
  { de: 14, a: 9,  intensidad: 0.6 },
  { de: 32, a: 10, intensidad: 0.5 },
  { de: 24, a: 14, intensidad: 0.4 },
]

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

function crearGeoTrapecio(inicio, fin, anchoOrigen, anchoDestino) {
  const dir  = new THREE.Vector3().subVectors(fin, inicio).normalize()
  const perp = new THREE.Vector3(-dir.z, 0, dir.x)

  const h0 = anchoOrigen  * 0.2
  const h1 = anchoDestino * 0.27

  const v0 = new THREE.Vector3().copy(inicio).addScaledVector(perp,  h0)
  const v1 = new THREE.Vector3().copy(inicio).addScaledVector(perp, -h0)
  const v2 = new THREE.Vector3().copy(fin).addScaledVector(perp,    -h1)
  const v3 = new THREE.Vector3().copy(fin).addScaledVector(perp,     h1)

  const positions = new Float32Array([
    v0.x, v0.y, v0.z,
    v1.x, v1.y, v1.z,
    v2.x, v2.y, v2.z,
    v3.x, v3.y, v3.z,
  ])
  const uvs     = new Float32Array([0,0, 0,1, 1,1, 1,0])
  const indices = new Uint16Array([0, 1, 2, 0, 2, 3])
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geo.setAttribute('uv',       new THREE.BufferAttribute(uvs,       2))
  geo.setIndex(new THREE.BufferAttribute(indices, 1))
  return geo
}

function crearTexturaFlujo(intensidad) {
  const w = 256, h = 32
  const canvas = document.createElement('canvas')
  canvas.width = w; canvas.height = h
  const ctx = canvas.getContext('2d')
  const grad = ctx.createLinearGradient(0, 0, w, 0)
  grad.addColorStop(0.0, `rgba(10,  40, 160, 0.4)`)
  grad.addColorStop(0.2, `rgba(20,  80, 200, ${0.4 * intensidad})`)
  grad.addColorStop(0.6, `rgba(60, 140, 255, ${0.6 * intensidad})`)
  grad.addColorStop(1.0, `rgba(120, 200, 255, ${intensidad})`)
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, w, h)
  const gradV = ctx.createLinearGradient(0, 0, 0, h)
  gradV.addColorStop(0.0,  'rgba(0,0,0,0)')
  gradV.addColorStop(0.15, 'rgba(255,255,255,1)')
  gradV.addColorStop(0.85, 'rgba(255,255,255,1)')
  gradV.addColorStop(1.0,  'rgba(0,0,0,0)')
  ctx.globalCompositeOperation = 'destination-in'
  ctx.fillStyle = gradV
  ctx.fillRect(0, 0, w, h)
  return new THREE.CanvasTexture(canvas)
}

export function createConexiones(
  scene,
  jugadores  = JUGADORES_EJEMPLO,
  conexiones = CONEXIONES_EJEMPLO,
  opciones   = {}
) {
  const {
    offsetY            = 4.0,
    radioNodo          = 3.5,
    rutaFicha          = '/ficha.glb',
    escalaFicha        = 3.0,
    usarGLB            = true,
    nombreCentro       = 'center',
    nombreBorde        = 'stroke',
    nombreTransparente = 'transparent',
    getPhi             = null,
    alturaBase         = -1.5,
    alturaCentro       = 0,
    umbralTop          = 1.1,
    anchoOrigen        = 0.6,
    anchoDestino       = 1.2,
    fichaYTop          = 1.0,
    fichaYBase         = 0,
  } = opciones

  const grupo = new THREE.Group()
  grupo.position.y = offsetY
  scene.add(grupo)

  const mapaJugadores = {}
  jugadores.forEach(j => { mapaJugadores[j.numero] = j })

  // ── Material compartido transparent ──
  const matTransparente = new THREE.MeshPhysicalMaterial({
    color:             0x32699f,
    emissive:          0x3750b3,
    emissiveIntensity: 0.5,
    // emissiveMap:       crearGradienteEmissive(),
    transmission:      1.0,
    roughness:         0.5,
    metalness:         0.45,
    thickness:         0.5,
    transparent:       true,
    opacity:           0.34,
    // side:              THREE.DoubleSide,
    envMapIntensity:   2.9,
    reflectivity:      0.5,
    ior:               1.9,
    depthTest:         true,
    // depthWrite:        false,
  })

  // ── GUI — objeto params separado para evitar conflicto con THREE.Color ──
  const params = {
    color:    '#173858',
    emissive: '#7BE6F1',
  }

  const gui    = new GUI({ title: 'Ficha controls' })
  const folder = gui.addFolder('Transparent')

  folder.addColor(params, 'color').name('Color').onChange(v => {
    matTransparente.color.set(v)
  })
  folder.addColor(params, 'emissive').name('Emissive').onChange(v => {
    matTransparente.emissive.set(v)
  })
  folder.add(matTransparente, 'emissiveIntensity', 0, 5,   0.1 ).name('Glow intensity')
  folder.add(matTransparente, 'transmission',      0, 1,   0.01).name('Transmisión')
  folder.add(matTransparente, 'roughness',         0, 1,   0.01).name('Rugosidad')
  folder.add(matTransparente, 'metalness',         0, 1,   0.01).name('Metalness')
  folder.add(matTransparente, 'thickness',         0, 5,   0.1 ).name('Grosor cristal')
  folder.add(matTransparente, 'opacity',           0, 1,   0.01).name('Opacidad')
  folder.add(matTransparente, 'envMapIntensity',   0, 5,   0.1 ).name('Env intensity')
  folder.add(matTransparente, 'reflectivity',      0, 1,   0.01).name('Reflectividad')
  folder.add(matTransparente, 'ior',               1, 2.5, 0.01).name('IOR')
  folder.open()

  // ── Contenedor overlay ──
  const labelsContainer = document.createElement('div')
  labelsContainer.style.cssText = `
    position: absolute;
    top: 0; left: 0;
    width: 100%; height: 100%;
    pointer-events: none;
    overflow: hidden;
    z-index: 10;
  `
  document.body.appendChild(labelsContainer)

  const labelsData = []

  function crearLabelNumero(numero, x, z) {
    const div = document.createElement('div')
    div.textContent = String(numero)
    div.style.cssText = `
      position: absolute;
      color: white;
      margin-top: 30px;
      font-family: sans-serif;
      font-size: 28px;
      font-weight: bold;
      line-height: 1;
      pointer-events: none;
      user-select: none;
      white-space: nowrap;
    `
    labelsContainer.appendChild(div)
    labelsData.push({ div, x, y: offsetY, z })
  }

  // ── Materiales GLB ──
  function aplicarMateriales(clon) {
    clon.traverse(child => {
      if (!child.isMesh) return
      child.userData.esGLB = true
      child.renderOrder    = 2

      if (child.name === nombreCentro) {
        child.material = new THREE.MeshStandardMaterial({
          color:             0x122C7E,
          roughness:         0.4,
          emissive:          0x0a1550,
          emissiveIntensity: 0.5,
          transparent:       false,
          opacity:           1,
          depthTest:         true,
          depthWrite:        true,
        })
        child.layers.set(0)
      }
      if (child.name === nombreBorde) {
        child.material = new THREE.MeshStandardMaterial({
          color:             0x1A3A9E,
          emissive:          0x0a1550,
          emissiveIntensity: 0.5,
          metalness:         0.1,
          roughness:         0.05,
          transparent:       false,
          opacity:           1,
          depthTest:         true,
          depthWrite:        true,
        })
        child.layers.set(0)
      }
      if (child.name === nombreTransparente) {
        child.material = matTransparente
        child.layers.enable(BLOOM_LAYER)
      }
    })
  }

  function crearNodosGLB() {
    const loader = new GLTFLoader()
    loader.load(
      rutaFicha,
      (gltf) => {
        gltf.scene.traverse(c => { if (c.isMesh) console.log(' -', c.name) })
        jugadores.forEach(jugador => {
          const clon = gltf.scene.clone(true)
          aplicarMateriales(clon)
          clon.renderOrder = 2
          clon.scale.setScalar(escalaFicha)
          clon.position.set(jugador.x, fichaYBase, jugador.z)
          clon.userData.esFicha    = true
          clon.userData.jugadorX   = jugador.x
          clon.userData.jugadorZ   = jugador.z
          grupo.add(clon)
          crearLabelNumero(jugador.numero, jugador.x, jugador.z)
        })
      },
      (progress) => { console.log('Cargando ficha:', (progress.loaded / progress.total * 100).toFixed(1) + '%') },
      (error)    => { console.warn('No se pudo cargar ficha.glb:', error); crearNodosCanvas() }
    )
  }

  function crearNodosCanvas() {
    jugadores.forEach(jugador => {
      const size = 256
      const canvas = document.createElement('canvas')
      canvas.width = canvas.height = size
      const ctx = canvas.getContext('2d')
      ctx.clearRect(0, 0, size, size)
      ctx.beginPath(); ctx.arc(size/2, size/2, size/2 - 2, 0, Math.PI * 2)
      ctx.fillStyle = '#0a0d1a'; ctx.fill()
      ctx.beginPath(); ctx.arc(size/2, size/2, size/2 - 22, 0, Math.PI * 2)
      const bgGrad = ctx.createRadialGradient(size/2, size/2 - 10, 5, size/2, size/2, size/2 - 22)
      bgGrad.addColorStop(0.0, '#2a3eaa'); bgGrad.addColorStop(1.0, '#121d6e')
      ctx.fillStyle = bgGrad; ctx.fill()
      ctx.strokeStyle = '#5599ff'; ctx.lineWidth = 6
      ctx.beginPath(); ctx.arc(size/2, size/2, size/2 - 22, 0, Math.PI * 2); ctx.stroke()
      const fontSize = jugador.numero > 9 ? 96 : 110
      ctx.fillStyle = '#ffffff'; ctx.font = `bold ${fontSize}px sans-serif`
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
      ctx.fillText(String(jugador.numero), size/2, size/2 + 4)
      const mat = new THREE.SpriteMaterial({
        map: new THREE.CanvasTexture(canvas), transparent: true, depthWrite: false,
      })
      const sprite = new THREE.Sprite(mat)
      sprite.position.set(jugador.x, fichaYBase, jugador.z)
      sprite.scale.set(radioNodo * 2, radioNodo * 2, 1)
      sprite.renderOrder       = 2
      sprite.userData.esFicha  = true
      sprite.userData.jugadorX = jugador.x
      sprite.userData.jugadorZ = jugador.z
      sprite.layers.set(0)
      grupo.add(sprite)
      crearLabelNumero(jugador.numero, jugador.x, jugador.z)
    })
  }

  if (usarGLB) { crearNodosGLB() } else { crearNodosCanvas() }

  // ── Crear meshes de conexión ──
  const lineasData = []

  conexiones.forEach(con => {
    const jDe = mapaJugadores[con.de]
    const jA  = mapaJugadores[con.a]
    if (!jDe || !jA) return

    const intensidad = con.intensidad ?? 1.0
    const tex        = crearTexturaFlujo(intensidad)

    const mat = new THREE.MeshBasicMaterial({
      map:         tex,
      transparent: true,
      depthWrite:  false,
      depthTest:   true,
      blending:    THREE.AdditiveBlending,
      side:        THREE.DoubleSide,
    })
    const matGlow = new THREE.MeshBasicMaterial({
      map:         tex,
      transparent: true,
      depthWrite:  false,
      depthTest:   true,
      blending:    THREE.AdditiveBlending,
      side:        THREE.DoubleSide,
      opacity:     0.25,
    })

    const mesh     = new THREE.Mesh(new THREE.BufferGeometry(), mat)
    const meshGlow = new THREE.Mesh(new THREE.BufferGeometry(), matGlow)

    mesh.renderOrder     = 1
    meshGlow.renderOrder = 1
    mesh.layers.set(0)
    meshGlow.layers.set(0)

    grupo.add(mesh)
    grupo.add(meshGlow)

    lineasData.push({ mesh, meshGlow, jDe, jA, intensidad })
  })

  // ── Actualizar según vista ──
  let ultimoPhi = null

  function tickLineas() {
    const phi = getPhi ? getPhi() : 0.5
    if (ultimoPhi !== null && Math.abs(phi - ultimoPhi) < 0.005) return
    ultimoPhi = phi

    const esTop  = phi > umbralTop
    const lineaY = esTop ? alturaCentro : alturaBase
    const fichaY = esTop ? fichaYTop    : fichaYBase

    grupo.traverse(child => {
      if (child.userData.esFicha === true) {
        child.position.y = fichaY
      }
    })

    lineasData.forEach(({ mesh, meshGlow, jDe, jA, intensidad }) => {
      mesh.material.depthTest       = true
      meshGlow.material.depthTest   = true
      mesh.material.needsUpdate     = true
      meshGlow.material.needsUpdate = true

      const inicio = new THREE.Vector3(jDe.x, lineaY, jDe.z)
      const fin    = new THREE.Vector3(jA.x,  lineaY, jA.z)

      mesh.geometry.dispose()
      mesh.geometry = crearGeoTrapecio(inicio, fin, anchoOrigen, anchoDestino * intensidad)

      meshGlow.geometry.dispose()
      meshGlow.geometry = crearGeoTrapecio(inicio, fin, anchoOrigen * 1.5, anchoDestino * intensidad * 2.5)
    })
  }

  tickLineas()

  // ── Botón ──
  const btn = document.createElement('button')
  btn.textContent = 'Conexiones'
  btn.className   = 'btn'
  btn.addEventListener('click', function() {
    grupo.visible = !grupo.visible
    labelsContainer.style.display = grupo.visible ? '' : 'none'
    this.classList.toggle('active', grupo.visible)
  })
  document.getElementById('cc-controls').appendChild(btn)

  return { grupo, labelsData, tickLineas }
}
