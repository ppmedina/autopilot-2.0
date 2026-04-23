// src/cancha/conexiones-v2.js
// ── Versión sprite canvas — más eficiente en GPU que el GLB ──
// Fichas: sprites canvas con diseño del aro de jugador-cards
// Conexiones: mismo sistema de trapecio flujo que conexiones.js
import * as THREE from 'three'

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

// ── Canvas de ficha — diseño del aro exterior de jugador-cards ──────────────
function crearCanvasFicha(numero) {
  const size    = 512
  const circleR = 90
  const cx      = size / 2
  const cy      = size / 2

  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  const ctx = canvas.getContext('2d')
  ctx.clearRect(0, 0, size, size)

  // ── Glow exterior más intenso ──
  const glowGrad = ctx.createRadialGradient(cx, cy, circleR * 0.6, cx, cy, circleR * 2.0)
  glowGrad.addColorStop(0.0, 'rgba(30, 100, 255, 0.0)')
  glowGrad.addColorStop(0.25, 'rgba(50, 130, 255, 0.42)')
  glowGrad.addColorStop(0.6, 'rgba(20,  80, 220, 0.22)')
  glowGrad.addColorStop(1.0, 'rgba(0,   20, 100, 0.0)')
  ctx.beginPath()
  ctx.arc(cx, cy, circleR * 2.0, 0, Math.PI * 2)
  ctx.fillStyle = glowGrad
  ctx.fill()

  // ── Fondo sólido base ──
  ctx.beginPath()
  ctx.arc(cx, cy, circleR, 0, Math.PI * 2)
  ctx.fillStyle = '#060d1e'
  ctx.fill()

  // ── Degradado vertical opaco encima ──
  ctx.save()
  ctx.beginPath()
  ctx.arc(cx, cy, circleR, 0, Math.PI * 2)
  ctx.clip()
  const bgGrad = ctx.createLinearGradient(cx, cy - circleR, cx, cy + circleR)
  bgGrad.addColorStop(0.0, '#243870')
  bgGrad.addColorStop(0.45, '#0e1a3a')
  bgGrad.addColorStop(1.0, '#060d1e')
  ctx.fillStyle = bgGrad
  ctx.fillRect(cx - circleR, cy - circleR, circleR * 2, circleR * 2)
  ctx.restore()

  // ── Borde gradiente con glow ──
  ctx.save()
  ctx.shadowColor = '#4DAAFF'
  ctx.shadowBlur  = 26
  const gradBorde = ctx.createLinearGradient(cx, cy - circleR, cx, cy + circleR)
  gradBorde.addColorStop(0.0, 'rgba(10,  36,  81, 0.4)')
  gradBorde.addColorStop(0.5, 'rgba(40,  140, 255, 0.85)')
  gradBorde.addColorStop(1.0, 'rgba(80,  200, 255, 1.0)')
  ctx.beginPath()
  ctx.arc(cx, cy, circleR, 0, Math.PI * 2)
  ctx.strokeStyle = gradBorde
  ctx.lineWidth   = 10
  ctx.stroke()
  ctx.restore()

  // ── Borde interior sutil ──
  ctx.beginPath()
  ctx.arc(cx, cy, circleR - 6, 0, Math.PI * 2)
  ctx.strokeStyle = 'rgba(100, 180, 255, 0.3)'
  ctx.lineWidth   = 2
  ctx.stroke()

  // ── Número centrado ──
  const texto    = String(numero)
  const fontSize = texto.length > 1 ? 72 : 84
  ctx.font         = `bold ${fontSize}px "Barlow Condensed", "Barlow", sans-serif`
  ctx.fillStyle    = '#ffffff'
  ctx.textAlign    = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(texto, cx, cy + 3)

  return canvas
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

// ── Vectores reutilizables para trapecio ────────────────────────────────────
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

function crearGeoTrapecioMutable(inicio, fin, anchoOrigen, anchoDestino) {
  const positions = new Float32Array(12)
  calcularVerticesTrapecio(inicio, fin, anchoOrigen, anchoDestino, positions)
  const uvs     = new Float32Array([0,0, 0,1, 1,1, 1,0])
  const indices = new Uint16Array([0, 1, 2, 0, 2, 3])
  const geo     = new THREE.BufferGeometry()
  const posAttr = new THREE.BufferAttribute(positions, 3)
  posAttr.setUsage(THREE.DynamicDrawUsage)
  geo.setAttribute('position', posAttr)
  geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2))
  geo.setIndex(new THREE.BufferAttribute(indices, 1))
  return geo
}

// ── Export principal ─────────────────────────────────────────────────────────
export function createConexionesV2(
  scene,
  jugadores  = JUGADORES_EJEMPLO,
  conexiones = CONEXIONES_EJEMPLO,
  opciones   = {}
) {
  const {
    offsetY      = 4.0,
    escalaFicha  = 7.0,    // tamaño del sprite en unidades de escena
    getPhi       = null,
    alturaBase   = -1.5,
    alturaCentro = 0,
    umbralTop    = 1.1,
    anchoOrigen  = 0.6,
    anchoDestino = 1.2,
    fichaYTop    = 0,
    fichaYBase   = 0,
  } = opciones

  const grupo = new THREE.Group()
  grupo.position.y = offsetY
  grupo.visible    = false
  scene.add(grupo)

  const mapaJugadores = {}
  jugadores.forEach(j => { mapaJugadores[j.numero] = j })

  // ── Crear sprites de fichas ──────────────────────────────────────────────
  const fichasSprites = []

  jugadores.forEach(jugador => {
    const canvas  = crearCanvasFicha(jugador.numero)
    const textura = new THREE.CanvasTexture(canvas)
    const mat     = new THREE.SpriteMaterial({
      map:         textura,
      transparent: true,
      depthWrite:  false,
      sizeAttenuation: true,
    })
    const sprite = new THREE.Sprite(mat)
    // El canvas es 512px pero el círculo solo ocupa el centro (radio 90/512)
    // escalaFicha controla el círculo visible, el sprite es más grande para el glow
    const escalaSprite = escalaFicha * (512 / (90 * 2))
    sprite.scale.set(escalaSprite, escalaSprite, 1)
    sprite.position.set(jugador.x, fichaYBase, jugador.z)
    sprite.renderOrder       = 2
    sprite.userData.esFicha  = true
    sprite.userData.jugadorX = jugador.x
    sprite.userData.jugadorZ = jugador.z
    grupo.add(sprite)
    fichasSprites.push({ sprite, jugador })
  })

  // ── Crear meshes de conexión con geometría mutable ───────────────────────
  const lineasData = []
  const _tmpVerts  = new Float32Array(12)
  const _inicio    = new THREE.Vector3()
  const _fin       = new THREE.Vector3()
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

  // ── Tick optimizado ──────────────────────────────────────────────────────
  let ultimoPhi = null

  function tickConexionesV2(camera) {
    const phi = getPhi ? getPhi() : 0.5
    const phiCambio = ultimoPhi === null || Math.abs(phi - ultimoPhi) >= 0.005

    if (phiCambio) {
      ultimoPhi = phi
      const esTop  = phi > umbralTop
      const lineaY = esTop ? alturaCentro : alturaBase
      const fichaY = esTop ? fichaYTop    : fichaYBase

      // Actualizar posición Y de fichas
      fichasSprites.forEach(({ sprite }) => {
        sprite.position.y = fichaY
      })

      // Actualizar geometría de conexiones
      lineasData.forEach(({ mesh, meshGlow, jDe, jA, intensidad }) => {
        _inicio.set(jDe.x, lineaY, jDe.z)
        _fin.set(jA.x, lineaY, jA.z)

        calcularVerticesTrapecio(_inicio, _fin, anchoOrigen, anchoDestino * intensidad, _tmpVerts)
        mesh.geometry.attributes.position.array.set(_tmpVerts)
        mesh.geometry.attributes.position.needsUpdate = true
        mesh.geometry.computeBoundingSphere()

        calcularVerticesTrapecio(_inicio, _fin, anchoOrigen * 1.5, anchoDestino * intensidad * 2.5, _tmpVerts)
        meshGlow.geometry.attributes.position.array.set(_tmpVerts)
        meshGlow.geometry.attributes.position.needsUpdate = true
        meshGlow.geometry.computeBoundingSphere()
      })
    }
  }

  // Función para actualizar número de un jugador en caliente
  function updateFicha(numero, datos) {
    const entry = fichasSprites.find(f => f.jugador.numero === numero)
    if (!entry) return
    const nuevoNumero = datos.numero ?? entry.jugador.numero
    const canvas  = crearCanvasFicha(nuevoNumero)
    entry.sprite.material.map.dispose()
    entry.sprite.material.map = new THREE.CanvasTexture(canvas)
    entry.sprite.material.needsUpdate = true
    entry.jugador = { ...entry.jugador, ...datos }
  }

  // ── Botón ────────────────────────────────────────────────────────────────
  const btn = document.createElement('button')
  btn.textContent = 'Conexiones V2'
  btn.className   = 'btn'
  btn.addEventListener('click', function () {
    grupo.visible = !grupo.visible
    this.classList.toggle('active', grupo.visible)
  })
  document.getElementById('cc-controls').appendChild(btn)

  tickConexionesV2()

  return { grupo, tickConexionesV2, updateFicha, fichasSprites }
}
