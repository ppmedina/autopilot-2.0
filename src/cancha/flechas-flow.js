// src/cancha/flechas-flow.js
import * as THREE from 'three'

const FLECHAS_FLOW_EJEMPLO = [
  { de: { x:  0, z: -15 }, a: { x: 25, z:   5 }, intensidad: 0.9 },
  { de: { x: 25, z:   5 }, a: { x: 52, z:   0 }, intensidad: 1.0 },
  { de: { x:-20, z:  10 }, a: { x:  0, z: -15 }, intensidad: 0.6 },
  { de: { x:-20, z:  10 }, a: { x: 25, z:   5 }, intensidad: 0.7 },
]

// ── Textura de flujo — igual que conexiones ───────────────────────────────────
function crearTexturaFlujo(intensidad) {
  const w = 256, h = 32
  const canvas = document.createElement('canvas')
  canvas.width = w; canvas.height = h
  const ctx = canvas.getContext('2d')

  const grad = ctx.createLinearGradient(0, 0, w, 0)
  grad.addColorStop(0.0, `rgba(10,  40, 160, 0.3)`)
  grad.addColorStop(0.2, `rgba(20,  80, 200, ${0.4 * intensidad})`)
  grad.addColorStop(0.6, `rgba(60, 140, 255, ${0.6 * intensidad})`)
  grad.addColorStop(1.0, `rgba(120, 200, 255, ${intensidad})`)
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, w, h)

  // Fade en los bordes verticales
  const gradV = ctx.createLinearGradient(0, 0, 0, h)
  gradV.addColorStop(0.0,  'rgba(0,0,0,0)')
  gradV.addColorStop(0.15, 'rgba(255,255,255,1)')
  gradV.addColorStop(0.85, 'rgba(255,255,255,1)')
  gradV.addColorStop(1.0,  'rgba(0,0,0,0)')
  ctx.globalCompositeOperation = 'destination-in'
  ctx.fillStyle = gradV
  ctx.fillRect(0, 0, w, h)

  const tex = new THREE.CanvasTexture(canvas)
  tex.wrapS  = THREE.RepeatWrapping
  tex.repeat.set(1, 1)
  return tex
}

// ── Geometría trapecio — más angosto en origen, más ancho en destino ──────────
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

  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geo.setAttribute('uv',       new THREE.BufferAttribute(uvs,       2))
  geo.setIndex(new THREE.BufferAttribute(indices, 1))
  return geo
}

// ── Punta plana paralela a la cancha ─────────────────────────────────────────
function crearPuntaPlana(posicion, dirXZ, color, opacidad, tamano = 3.5) {
  const perp  = new THREE.Vector3(-dirXZ.z, 0, dirXZ.x)
  const punta = new THREE.Vector3().copy(posicion).addScaledVector(dirXZ,  tamano * 0.7)
  const baseL = new THREE.Vector3().copy(posicion).addScaledVector(perp,   tamano * 0.5)
  const baseR = new THREE.Vector3().copy(posicion).addScaledVector(perp,  -tamano * 0.5)

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
    opacity:     opacidad,
    depthWrite:  false,
    side:        THREE.DoubleSide,
    blending:    THREE.AdditiveBlending,
  })

  const mesh = new THREE.Mesh(geo, mat)
  mesh.renderOrder = 4
  return mesh
}

export function createFlechasFlow(scene, flechas = FLECHAS_FLOW_EJEMPLO, opciones = {}) {

  const {
    offsetY      = 0.5,
    anchoOrigen  = 0.4,   // ← ancho en el origen (punta fina)
    anchoDestino = 2.5,   // ← ancho en el destino (base ancha)
    colorPunta   = 0x78C8FF,
  } = opciones

  const grupo = new THREE.Group()
  grupo.position.y = offsetY
  grupo.visible    = false
  scene.add(grupo)

  const puntasMesh     = []
  const lineasAnimadas = []

  flechas.forEach(flecha => {
    const intensidad = flecha.intensidad ?? 1.0

    const inicio = new THREE.Vector3(flecha.de.x, 0, flecha.de.z)
    const fin    = new THREE.Vector3(flecha.a.x,  0, flecha.a.z)
    const dir    = new THREE.Vector3().subVectors(fin, inicio).normalize()

    // Acortar para no tapar destino
    const finAcortado = new THREE.Vector3().copy(fin).addScaledVector(dir, -3.5)

    const tex = crearTexturaFlujo(intensidad)

    // ── Trapecio principal ──
    const mat = new THREE.MeshBasicMaterial({
      map:         tex,
      transparent: true,
      depthWrite:  false,
      blending:    THREE.AdditiveBlending,
      side:        THREE.DoubleSide,
    })
    const mesh = new THREE.Mesh(
      crearGeoTrapecio(inicio, finAcortado, anchoOrigen, anchoDestino * intensidad),
      mat
    )
    mesh.renderOrder = 3
    grupo.add(mesh)

    // ── Glow más ancho y tenue ──
    const matGlow = new THREE.MeshBasicMaterial({
      map:         tex,
      transparent: true,
      opacity:     0.2,
      depthWrite:  false,
      blending:    THREE.AdditiveBlending,
      side:        THREE.DoubleSide,
    })
    const meshGlow = new THREE.Mesh(
      crearGeoTrapecio(inicio, finAcortado, anchoOrigen * 0.5, anchoDestino * intensidad * 2.2),
      matGlow
    )
    meshGlow.renderOrder = 2
    grupo.add(meshGlow)

    // ── Punta plana en dirección de la flecha ──
    const punta = crearPuntaPlana(
      finAcortado,
      dir,
      colorPunta,
      0.8 * intensidad,
      anchoDestino * intensidad * 0.9
    )
    grupo.add(punta)
    puntasMesh.push(punta)

    // Animar UV
    lineasAnimadas.push({ tex, velocidad: 0.4 + intensidad * 0.3 })
  })

  // ── Tick — animar flujo ───────────────────────────────────────────────────
  function tickFlechasFlow(dt) {
    if (!grupo.visible) return
    lineasAnimadas.forEach(({ tex, velocidad }) => {
      tex.offset.x -= velocidad * dt
    })
  }

  function ocultarPuntasFlow() { puntasMesh.forEach(p => { p.visible = false }) }
  function mostrarPuntasFlow() { puntasMesh.forEach(p => { p.visible = true  }) }

  // ── Botón ──
  const btn = document.createElement('button')
  btn.textContent = 'Flujo'
  btn.className   = 'btn'
  btn.addEventListener('click', function () {
    grupo.visible = !grupo.visible
    this.classList.toggle('active', grupo.visible)
  })
  document.getElementById('cc-controls').appendChild(btn)

  return { grupo, tickFlechasFlow, ocultarPuntasFlow, mostrarPuntasFlow }
}
