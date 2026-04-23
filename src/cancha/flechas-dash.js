// src/cancha/flechas-dash.js
import * as THREE from 'three'

const FLECHAS_DASH_EJEMPLO = [
  { de: { x:  0, z: -15 }, a: { x: 25, z:   5 }, estilo: 'dash'     },
  { de: { x:-20, z:  10 }, a: { x:  0, z: -15 }, estilo: 'dash'     },
  { de: { x: 25, z:   5 }, a: { x: 52, z:   0 }, estilo: 'disparo'  },
  { de: { x:-20, z:  10 }, a: { x: 25, z:   5 }, estilo: 'disparo'  },
]

// ── Textura de cuadrados para línea dash ─────────────────────────────────────
// Gradiente: rgba(10, 40, 160) en origen → rgba(120, 200, 255) en destino
function crearTexturaDash(intensidad = 1.0) {
  const w = 512, h = 32
  const canvas = document.createElement('canvas')
  canvas.width = w; canvas.height = h
  const ctx = canvas.getContext('2d')
  ctx.clearRect(0, 0, w, h)

  let x = 0
  while (x < w) {
    const t    = x / w               // 0 → 1
    const size = 4 + t * 14          // crece de 4px a 18px
    const gap  = 3 + (1 - t) * 8    // gap decrece (más denso al final)

    const r = Math.round(10  + t * 110)            //  10 → 120
    const g = Math.round(40  + t * 160)            //  40 → 200
    const b = Math.round(160 + t * 95)             // 160 → 255
    const a = (0.4 + t * 0.6) * intensidad

    const cy = h / 2
    const hs = size / 2

    ctx.fillStyle = `rgba(${r},${g},${b},${a})`
    ctx.fillRect(x, cy - hs, size, size)

    x += size + gap
  }

  const tex = new THREE.CanvasTexture(canvas)
  tex.wrapS  = THREE.RepeatWrapping
  tex.repeat.set(1, 1)
  return tex
}

// ── Textura con gradiente de opacidad para línea disparo ─────────────────────
function crearTexturaDisparo(color) {
  const w = 256, h = 8
  const canvas = document.createElement('canvas')
  canvas.width = w; canvas.height = h
  const ctx = canvas.getContext('2d')
  const c = new THREE.Color(color)
  const r = Math.round(c.r * 255)
  const g = Math.round(c.g * 255)
  const b = Math.round(c.b * 255)
  const grad = ctx.createLinearGradient(0, 0, w, 0)
  grad.addColorStop(0.0, `rgba(${r},${g},${b},0.3)`)   // origen — 30% opacidad
  grad.addColorStop(1.0, `rgba(${r},${g},${b},0.9)`)   // destino — 90% opacidad
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, w, h)
  return new THREE.CanvasTexture(canvas)
}

// ── Geometría de segmento plano (ancho uniforme) ──────────────────────────────
function crearGeoLinea(inicio, fin, ancho) {
  const dir  = new THREE.Vector3().subVectors(fin, inicio).normalize()
  const perp = new THREE.Vector3(-dir.z, 0, dir.x)
  const h    = ancho * 0.5

  const v0 = new THREE.Vector3().copy(inicio).addScaledVector(perp,  h)
  const v1 = new THREE.Vector3().copy(inicio).addScaledVector(perp, -h)
  const v2 = new THREE.Vector3().copy(fin).addScaledVector(perp,    -h)
  const v3 = new THREE.Vector3().copy(fin).addScaledVector(perp,     h)

  const positions = new Float32Array([
    v0.x, v0.y, v0.z,
    v1.x, v1.y, v1.z,
    v2.x, v2.y, v2.z,
    v3.x, v3.y, v3.z,
  ])
  const uvs     = new Float32Array([0,0, 0,1, 1,1, 1,0])
  const indices = new Uint16Array([0,1,2, 0,2,3])
  const geo     = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geo.setAttribute('uv',       new THREE.BufferAttribute(uvs,       2))
  geo.setIndex(new THREE.BufferAttribute(indices, 1))
  return geo
}

// ── Geometría trapezoidal para dash (ancho origen ≠ ancho destino) ────────────
function crearGeoTrapecio(inicio, fin, anchoOrigen, anchoDestino) {
  const dir  = new THREE.Vector3().subVectors(fin, inicio).normalize()
  const perp = new THREE.Vector3(-dir.z, 0, dir.x)

  const h0 = anchoOrigen  * 0.5
  const h1 = anchoDestino * 0.5

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
  const indices = new Uint16Array([0,1,2, 0,2,3])
  const geo     = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geo.setAttribute('uv',       new THREE.BufferAttribute(uvs,       2))
  geo.setIndex(new THREE.BufferAttribute(indices, 1))
  return geo
}

// ── Punta plana paralela a la cancha ─────────────────────────────────────────
function crearPuntaPlana(posicion, dirXZ, color, tamano) {
  const perp  = new THREE.Vector3(-dirXZ.z, 0, dirXZ.x)
  const punta = new THREE.Vector3().copy(posicion).addScaledVector(dirXZ,  tamano * 0.8)
  const baseL = new THREE.Vector3().copy(posicion).addScaledVector(perp,   tamano * 0.55)
  const baseR = new THREE.Vector3().copy(posicion).addScaledVector(perp,  -tamano * 0.55)

  const positions = new Float32Array([
    punta.x, punta.y, punta.z,
    baseL.x, baseL.y, baseL.z,
    baseR.x, baseR.y, baseR.z,
  ])
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geo.setIndex(new THREE.BufferAttribute(new Uint16Array([0,1,2]), 1))

  const mat = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity:     1.0,
    depthWrite:  false,
    side:        THREE.DoubleSide,
  })

  const mesh = new THREE.Mesh(geo, mat)
  mesh.renderOrder = 4
  return mesh
}

export function createFlechasDash(scene, flechas = FLECHAS_DASH_EJEMPLO, opciones = {}) {

  const {
    offsetY         = 0.4,
    colorDisparo    = 0xD6F221,  // color de la línea sólida de disparo
    anchoDash       = 0.8,       // ancho destino de la línea dash
    anchoOrigenDash = 2.5,       // ancho origen de la línea dash
    anchoDisparo    = 0.5,      // ancho de la línea de disparo
    onToggle        = null,
    getPhi          = null,      // función para detectar vista actual
    radioAro        = 4.5,       // radio en vista perspectiva
    radioAroTop     = 6.5,       // radio en vista top (más grande por proyección)
    umbralTop       = 1.1,       // phi > umbral = vista top
  } = opciones

  // Color de punta dash: stop final del gradiente azul
  const COLOR_PUNTA_DASH = 0x78C8FF  // rgb(120, 200, 255)

  const grupo = new THREE.Group()
  grupo.position.y = offsetY
  grupo.visible    = false
  scene.add(grupo)

  const puntasMesh     = []
  const lineasDashAnim = []  // solo las dash se animan

  flechas.forEach(flecha => {
    const esDash = flecha.estilo === 'dash'

    const inicio = new THREE.Vector3(flecha.de.x, 0, flecha.de.z)
    const fin    = new THREE.Vector3(flecha.a.x,  0, flecha.a.z)
    const dir    = new THREE.Vector3().subVectors(fin, inicio).normalize()

    // radioAro: radio visual del aro — cambia según vista top o perspectiva
    // radioDestino puede sobreescribirse por flecha (útil para porterías sin jugador)
    const phi             = getPhi ? getPhi() : 0.5
    const esTop           = phi > umbralTop
    const radio           = esTop ? radioAroTop : radioAro
    const radioDestino    = flecha.radioDestino ?? radio
    const inicioAcortado  = new THREE.Vector3().copy(inicio).addScaledVector(dir,  radio)
    const finAcortado     = new THREE.Vector3().copy(fin).addScaledVector(dir,    -radioDestino)

    const tex = esDash
      ? crearTexturaDash(1.0)
      : crearTexturaDisparo(colorDisparo)

    const mat = new THREE.MeshBasicMaterial({
      map:         tex,
      transparent: true,
      depthWrite:  false,
      side:        THREE.DoubleSide,
      blending:    esDash ? THREE.AdditiveBlending : THREE.NormalBlending,
    })

    const geo = esDash
      ? crearGeoTrapecio(inicioAcortado, finAcortado, anchoOrigenDash, anchoDash)
      : crearGeoTrapecio(inicioAcortado, finAcortado, anchoDisparo * 0.3, anchoDisparo)

    const mesh = new THREE.Mesh(geo, mat)
    mesh.renderOrder = 3
    grupo.add(mesh)

    // ── Punta — 30% más pequeña que antes ──
    const colorPunta = esDash ? COLOR_PUNTA_DASH : colorDisparo
    const tamPunta   = esDash ? 2.1 : 1.4
    const punta      = crearPuntaPlana(finAcortado, dir, colorPunta, tamPunta)
    grupo.add(punta)
    puntasMesh.push(punta)

    // Solo las dash se animan (offset UV avanza hacia el destino)
    if (esDash) {
      lineasDashAnim.push({ tex, velocidad: 0.5 })
    }
  })

  // ── Tick ──────────────────────────────────────────────────────────────────
  function tickFlechasDash(dt) {
    if (!grupo.visible) return
    lineasDashAnim.forEach(({ tex, velocidad }) => {
      tex.offset.x -= velocidad * dt
    })
  }

  function ocultarPuntasDash() { puntasMesh.forEach(p => { p.visible = false }) }
  function mostrarPuntasDash() { puntasMesh.forEach(p => { p.visible = true  }) }

  // ── Botón ──
  const btn = document.createElement('button')
  btn.textContent = 'Dash'
  btn.className   = 'btn'
  btn.addEventListener('click', function () {
    grupo.visible = !grupo.visible
    this.classList.toggle('active', grupo.visible)
    if (onToggle) onToggle(grupo.visible)
  })
  document.getElementById('cc-controls').appendChild(btn)

  return { grupo, tickFlechasDash, ocultarPuntasDash, mostrarPuntasDash }
}
