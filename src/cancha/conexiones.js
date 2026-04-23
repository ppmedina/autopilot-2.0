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

// ── Calcula los 4 vértices del trapecio como Float32Array ──────────────────
// Reutilizable para actualizar BufferAttribute sin crear geometría nueva
const _dir  = new THREE.Vector3()
const _perp = new THREE.Vector3()
const _v0   = new THREE.Vector3()
const _v1   = new THREE.Vector3()
const _v2   = new THREE.Vector3()
const _v3   = new THREE.Vector3()

function calcularVerticesTrapecio(inicio, fin, anchoOrigen, anchoDestino, out) {
  _dir.subVectors(fin, inicio).normalize()
  _perp.set(-_dir.z, 0, _dir.x)

  const h0 = anchoOrigen  * 0.2
  const h1 = anchoDestino * 0.27

  _v0.copy(inicio).addScaledVector(_perp,  h0)
  _v1.copy(inicio).addScaledVector(_perp, -h0)
  _v2.copy(fin).addScaledVector(_perp,    -h1)
  _v3.copy(fin).addScaledVector(_perp,     h1)

  out[0] = _v0.x; out[1]  = _v0.y; out[2]  = _v0.z
  out[3] = _v1.x; out[4]  = _v1.y; out[5]  = _v1.z
  out[6] = _v2.x; out[7]  = _v2.y; out[8]  = _v2.z
  out[9] = _v3.x; out[10] = _v3.y; out[11] = _v3.z
}

// ── Crea geometría inicial del trapecio con BufferAttribute dinámico ────────
function crearGeoTrapecioMutable(inicio, fin, anchoOrigen, anchoDestino) {
  const positions = new Float32Array(12)
  calcularVerticesTrapecio(inicio, fin, anchoOrigen, anchoDestino, positions)

  const uvs     = new Float32Array([0,0, 0,1, 1,1, 1,0])
  const indices = new Uint16Array([0, 1, 2, 0, 2, 3])

  const geo = new THREE.BufferGeometry()
  const posAttr = new THREE.BufferAttribute(positions, 3)
  posAttr.setUsage(THREE.DynamicDrawUsage) // ← clave para updates eficientes
  geo.setAttribute('position', posAttr)
  geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2))
  geo.setIndex(new THREE.BufferAttribute(indices, 1))
  return geo
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

  // ── Textura canvas que imita el aro de las jugador-cards ──
  function crearTexturaAro() {
    const size = 256
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = size
    const ctx = canvas.getContext('2d')
    const cx = size / 2, cy = size / 2, r = size / 2 - 4

    // Fondo oscuro
    const bgGrad = ctx.createRadialGradient(cx, cy - 10, 5, cx, cy, r)
    bgGrad.addColorStop(0.0, '#1a2a4a')
    bgGrad.addColorStop(1.0, '#0a0f1e')
    ctx.beginPath()
    ctx.arc(cx, cy, r, 0, Math.PI * 2)
    ctx.fillStyle = bgGrad
    ctx.fill()

    // Glow exterior
    ctx.save()
    ctx.shadowColor = '#4DAAFF'
    ctx.shadowBlur  = 30
    const gradBorde = ctx.createLinearGradient(cx, cy - r, cx, cy + r)
    gradBorde.addColorStop(0.0, 'rgba(10,  36,  81, 0.4)')
    gradBorde.addColorStop(0.5, 'rgba(40,  140, 255, 0.9)')
    gradBorde.addColorStop(1.0, 'rgba(80,  200, 255, 1.0)')
    ctx.beginPath()
    ctx.arc(cx, cy, r, 0, Math.PI * 2)
    ctx.strokeStyle = gradBorde
    ctx.lineWidth   = 10
    ctx.stroke()
    ctx.restore()

    // Borde interior sutil
    ctx.beginPath()
    ctx.arc(cx, cy, r - 5, 0, Math.PI * 2)
    ctx.strokeStyle = 'rgba(100, 180, 255, 0.3)'
    ctx.lineWidth   = 2
    ctx.stroke()

    return new THREE.CanvasTexture(canvas)
  }

  const texturaAro = crearTexturaAro()

  // ── Material compartido transparent — inspirado en el aro de las cards ──
  const matTransparente = new THREE.MeshPhysicalMaterial({
    color:             0x0a1628,    // azul muy oscuro del fondo del aro
    emissive:          0x4DAAFF,    // color del glow del aro
    emissiveIntensity: 0.4,
    emissiveMap:       texturaAro,  // textura canvas del aro
    transmission:      0.6,
    roughness:         0.1,
    metalness:         0.2,
    thickness:         0.5,
    transparent:       true,
    opacity:           0.85,
    envMapIntensity:   2.0,
    reflectivity:      0.7,
    ior:               1.5,
    depthTest:         true,
    side:              THREE.DoubleSide,
  })

  // ── GUI ──
  const params = { color: '#0a1628', emissive: '#4DAAFF' }
  const gui    = new GUI({ title: 'Ficha controls' })
  const folder = gui.addFolder('Transparent')
  folder.addColor(params, 'color').name('Color').onChange(v => { matTransparente.color.set(v) })
  folder.addColor(params, 'emissive').name('Emissive').onChange(v => { matTransparente.emissive.set(v) })
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

  // ── Labels overlay ──
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
          color: 0x122C7E, roughness: 0.4,
          emissive: 0x0a1550, emissiveIntensity: 0.5,
          transparent: false, opacity: 1,
          depthTest: true, depthWrite: true,
        })
        child.layers.set(0)
      }
      if (child.name === nombreBorde) {
        child.material = new THREE.MeshStandardMaterial({
          color: 0x1A3A9E, emissive: 0x0a1550, emissiveIntensity: 0.5,
          metalness: 0.1, roughness: 0.05,
          transparent: false, opacity: 1,
          depthTest: true, depthWrite: true,
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
          clon.userData.esFicha  = true
          clon.userData.jugadorX = jugador.x
          clon.userData.jugadorZ = jugador.z
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
      sprite.renderOrder      = 2
      sprite.userData.esFicha = true
      sprite.layers.set(0)
      grupo.add(sprite)
      crearLabelNumero(jugador.numero, jugador.x, jugador.z)
    })
  }

  if (usarGLB) { crearNodosGLB() } else { crearNodosCanvas() }

  // ── Crear meshes de conexión con geometría mutable ──────────────────────
  const lineasData  = []
  const _tmpVerts   = new Float32Array(12) // buffer reutilizable para updates

  // Posición inicial provisional para crear geometría — se actualizará en tickLineas
  const _origenTmp = new THREE.Vector3(0, alturaBase, 0)
  const _finTmp    = new THREE.Vector3(1, alturaBase, 0)

  conexiones.forEach(con => {
    const jDe = mapaJugadores[con.de]
    const jA  = mapaJugadores[con.a]
    if (!jDe || !jA) return

    const intensidad = con.intensidad ?? 1.0
    const tex        = crearTexturaFlujo(intensidad)

    const mat = new THREE.MeshBasicMaterial({
      map: tex, transparent: true, depthWrite: false,
      depthTest: true, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    })
    const matGlow = new THREE.MeshBasicMaterial({
      map: tex, transparent: true, depthWrite: false,
      depthTest: true, blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide, opacity: 0.25,
    })

    // ← Geometría mutable con DynamicDrawUsage — nunca se recrea
    const geoMesh = crearGeoTrapecioMutable(_origenTmp, _finTmp, anchoOrigen, anchoDestino * intensidad)
    const geoGlow = crearGeoTrapecioMutable(_origenTmp, _finTmp, anchoOrigen * 1.5, anchoDestino * intensidad * 2.5)

    const mesh     = new THREE.Mesh(geoMesh, mat)
    const meshGlow = new THREE.Mesh(geoGlow, matGlow)

    mesh.renderOrder     = 1
    meshGlow.renderOrder = 1
    mesh.layers.set(0)
    meshGlow.layers.set(0)

    grupo.add(mesh)
    grupo.add(meshGlow)

    lineasData.push({ mesh, meshGlow, jDe, jA, intensidad })
  })

  // ── Tick optimizado — solo actualiza vértices, nunca recrea geometría ──
  let ultimoPhi = null
  const _inicio = new THREE.Vector3()
  const _fin    = new THREE.Vector3()

  function tickLineas() {
    const phi = getPhi ? getPhi() : 0.5
    if (ultimoPhi !== null && Math.abs(phi - ultimoPhi) < 0.005) return
    ultimoPhi = phi

    const esTop  = phi > umbralTop
    const lineaY = esTop ? alturaCentro : alturaBase
    const fichaY = esTop ? fichaYTop    : fichaYBase

    grupo.traverse(child => {
      if (child.userData.esFicha === true) child.position.y = fichaY
    })

    lineasData.forEach(({ mesh, meshGlow, jDe, jA, intensidad }) => {
      _inicio.set(jDe.x, lineaY, jDe.z)
      _fin.set(jA.x, lineaY, jA.z)

      // ── Actualizar mesh principal ──
      calcularVerticesTrapecio(_inicio, _fin, anchoOrigen, anchoDestino * intensidad, _tmpVerts)
      mesh.geometry.attributes.position.array.set(_tmpVerts)
      mesh.geometry.attributes.position.needsUpdate = true
      mesh.geometry.computeBoundingSphere()

      // ── Actualizar glow ──
      calcularVerticesTrapecio(_inicio, _fin, anchoOrigen * 1.5, anchoDestino * intensidad * 2.5, _tmpVerts)
      meshGlow.geometry.attributes.position.array.set(_tmpVerts)
      meshGlow.geometry.attributes.position.needsUpdate = true
      meshGlow.geometry.computeBoundingSphere()
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
