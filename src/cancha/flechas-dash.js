// src/cancha/flechas-dash.js
import * as THREE from 'three'

const FLECHAS_DASH_EJEMPLO = [
  { de: { x:  0, z: -15 }, a: { x: 25, z:   5 }, estilo: 'dash'    },
  { de: { x:-20, z:  10 }, a: { x:  0, z: -15 }, estilo: 'dash'    },
  { de: { x: 25, z:   5 }, a: { x: 52, z:   0 }, estilo: 'disparo' },
]

// ── Guión individual como plano 3D con ancho real ────────────────────────────
// anchoP0 = grosor en el extremo origen, anchoP1 = grosor en el extremo destino
function crearGuion(p0, p1, anchoP0, anchoP1, color, alpha) {
  const dir  = new THREE.Vector3().subVectors(p1, p0).normalize()
  const perp = new THREE.Vector3(-dir.z, 0, dir.x)
  const h0   = anchoP0 * 0.5
  const h1   = anchoP1 * 0.5

  const v0 = new THREE.Vector3().copy(p0).addScaledVector(perp,  h0)
  const v1 = new THREE.Vector3().copy(p0).addScaledVector(perp, -h0)
  const v2 = new THREE.Vector3().copy(p1).addScaledVector(perp, -h1)
  const v3 = new THREE.Vector3().copy(p1).addScaledVector(perp,  h1)

  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(
    new Float32Array([v0.x,v0.y,v0.z, v1.x,v1.y,v1.z, v2.x,v2.y,v2.z, v3.x,v3.y,v3.z]), 3
  ))
  geo.setIndex(new THREE.BufferAttribute(new Uint16Array([0,1,2, 0,2,3]), 1))

  const mat = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity:     alpha,
    depthWrite:  false,
    side:        THREE.DoubleSide,
  })

  const mesh = new THREE.Mesh(geo, mat)
  mesh.renderOrder = 3
  return mesh
}

// ── Línea punteada con guiones como geometría ────────────────────────────────
// Gradiente SVG: #68D9FF → #2097FF → #2097FF opacity 0.1
// La parte brillante está en el INICIO, se desvanece hacia el FIN
function crearLineaDash(inicio, fin, dashSize, gapSize, anchoMin, anchoMax) {
  const dir      = new THREE.Vector3().subVectors(fin, inicio)
  const longitud = dir.length()
  dir.normalize()

  const grupo  = new THREE.Group()
  const C_INI  = new THREE.Color(0x68D9FF)
  const C_MID  = new THREE.Color(0x2097FF)

  let d      = 0
  let enDash = true

  while (d < longitud) {
    const segLen = enDash ? dashSize : gapSize

    if (enDash) {
      const d0   = d
      const d1   = Math.min(d + dashSize, longitud)
      const tMid = ((d0 + d1) * 0.5) / longitud

      // Color y alpha según posición
      const cMid = interpolarColor(tMid, C_INI, C_MID)
      const aMid = interpolarAlpha(tMid)

      // Ancho variable: delgado en origen (t=0), grueso en destino (t=1)
      const anchoEn = (t) => anchoMin + (anchoMax - anchoMin) * t
      const a0 = anchoEn(d0 / longitud)
      const a1 = anchoEn(d1 / longitud)

      const p0 = new THREE.Vector3().copy(inicio).addScaledVector(dir, d0)
      const p1 = new THREE.Vector3().copy(inicio).addScaledVector(dir, d1)

      const guion = crearGuion(p0, p1, a0, a1, cMid, aMid)
      grupo.add(guion)
    }

    d += segLen
    enDash = !enDash
  }

  return grupo
}

// Gradiente invertido: oscuro/transparente en origen, brillante en destino (punta)
// t=0 (inicio) → #2097FF opacity 0.1
// t=0.495      → #2097FF
// t=1   (fin)  → #68D9FF opacity 1.0
function interpolarColor(t, cIni, cMid) {
  const col = new THREE.Color()
  if (t >= 0.495) {
    col.lerpColors(cMid, cIni, (t - 0.495) / 0.505)  // #2097FF → #68D9FF
  } else {
    col.copy(cMid)  // #2097FF constante en la primera mitad
  }
  return col
}

function interpolarAlpha(t) {
  if (t >= 0.495) return 1.0
  return 0.1 + (t / 0.495) * 0.9   // 0.1 → 1.0
}

function crearTexturaDisparo(color) {
  const w = 256, h = 8
  const canvas = document.createElement('canvas')
  canvas.width = w; canvas.height = h
  const ctx = canvas.getContext('2d')
  const c   = new THREE.Color(color)
  const grad = ctx.createLinearGradient(0, 0, w, 0)
  grad.addColorStop(0.0, `rgba(${Math.round(c.r*255)},${Math.round(c.g*255)},${Math.round(c.b*255)},0.3)`)
  grad.addColorStop(1.0, `rgba(${Math.round(c.r*255)},${Math.round(c.g*255)},${Math.round(c.b*255)},0.9)`)
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, w, h)
  return new THREE.CanvasTexture(canvas)
}

function crearGeoTrapecio(inicio, fin, anchoOrigen, anchoDestino) {
  const dir  = new THREE.Vector3().subVectors(fin, inicio).normalize()
  const perp = new THREE.Vector3(-dir.z, 0, dir.x)
  const v0 = new THREE.Vector3().copy(inicio).addScaledVector(perp,  anchoOrigen  * 0.5)
  const v1 = new THREE.Vector3().copy(inicio).addScaledVector(perp, -anchoOrigen  * 0.5)
  const v2 = new THREE.Vector3().copy(fin).addScaledVector(perp,    -anchoDestino * 0.5)
  const v3 = new THREE.Vector3().copy(fin).addScaledVector(perp,     anchoDestino * 0.5)
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array([v0.x,v0.y,v0.z,v1.x,v1.y,v1.z,v2.x,v2.y,v2.z,v3.x,v3.y,v3.z]),3))
  geo.setAttribute('uv',       new THREE.BufferAttribute(new Float32Array([0,0,0,1,1,1,1,0]),2))
  geo.setIndex(new THREE.BufferAttribute(new Uint16Array([0,1,2,0,2,3]),1))
  return geo
}

function crearPunta(posicion, dirXZ, color, tamano) {
  const perp  = new THREE.Vector3(-dirXZ.z, 0, dirXZ.x)
  const punta = new THREE.Vector3().copy(posicion).addScaledVector(dirXZ,  tamano * 0.9)
  const baseL = new THREE.Vector3().copy(posicion).addScaledVector(perp,   tamano * 0.55)
  const baseR = new THREE.Vector3().copy(posicion).addScaledVector(perp,  -tamano * 0.55)
  const geo   = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(
    new Float32Array([punta.x,punta.y,punta.z, baseL.x,baseL.y,baseL.z, baseR.x,baseR.y,baseR.z]), 3
  ))
  geo.setIndex(new THREE.BufferAttribute(new Uint16Array([0,1,2]),1))
  const mat  = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 1.0, depthWrite: false, side: THREE.DoubleSide })
  const mesh = new THREE.Mesh(geo, mat)
  mesh.renderOrder = 4
  return mesh
}

// ─────────────────────────────────────────────────────────────────────────────

export function createFlechasDash(scene, flechas = FLECHAS_DASH_EJEMPLO, opciones = {}) {
  const {
    offsetY      = 0.4,
    colorDisparo = 0xD6F221,
    dashSize     = 0.5,
    gapSize      = 0.5,
    anchoDash    = 0.12,   // grosor mínimo (extremo oscuro/origen)
    anchoMaxDash = 0.30,   // grosor máximo (extremo brillante/punta)
    anchoDisparo = 0.5,
    onToggle     = null,
    getPhi       = null,
    radioAro     = 4.5,
    radioAroTop  = 6.5,
    umbralTop    = 1.1,
  } = opciones

  const grupo = new THREE.Group()
  grupo.position.y = offsetY
  grupo.visible    = false
  scene.add(grupo)

  const puntasMesh = []

  flechas.forEach(flecha => {
    const esDash = flecha.estilo === 'dash'
    const inicio = new THREE.Vector3(flecha.de.x, 0, flecha.de.z)
    const fin    = new THREE.Vector3(flecha.a.x,  0, flecha.a.z)
    const dir    = new THREE.Vector3().subVectors(fin, inicio).normalize()
    const phi          = getPhi ? getPhi() : 0.5
    const esTop        = phi > umbralTop
    const radio        = esTop ? radioAroTop : radioAro
    const radioDestino = flecha.radioDestino ?? radio
    const inicioAcortado = new THREE.Vector3().copy(inicio).addScaledVector(dir,  radio)
    const finAcortado    = new THREE.Vector3().copy(fin).addScaledVector(dir,    -radioDestino)

    if (esDash) {
      const linea = crearLineaDash(inicioAcortado, finAcortado, dashSize, gapSize, anchoDash, anchoMaxDash)
      grupo.add(linea)

      const punta = crearPunta(finAcortado, dir, 0x68D9FF, 1.32)
      grupo.add(punta)
      puntasMesh.push(punta)

    } else {
      const tex  = crearTexturaDisparo(colorDisparo)
      const mat  = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, side: THREE.DoubleSide })
      const geo  = crearGeoTrapecio(inicioAcortado, finAcortado, anchoDisparo * 0.3, anchoDisparo)
      const mesh = new THREE.Mesh(geo, mat)
      mesh.renderOrder = 3
      grupo.add(mesh)

      const punta = crearPunta(finAcortado, dir, colorDisparo, 1.4)
      grupo.add(punta)
      puntasMesh.push(punta)
    }
  })

  function tickFlechasDash(dt) {}

  function ocultarPuntasDash() { puntasMesh.forEach(p => { p.visible = false }) }
  function mostrarPuntasDash() { puntasMesh.forEach(p => { p.visible = true  }) }

  const btn = document.createElement('button')
  btn.textContent = 'Pases'
  btn.className   = 'btn'
  btn.addEventListener('click', function () {
    grupo.visible = !grupo.visible
    this.classList.toggle('active', grupo.visible)
    if (onToggle) onToggle(grupo.visible)
  })
  document.getElementById('cc-controls').appendChild(btn)

  return { grupo, tickFlechasDash, ocultarPuntasDash, mostrarPuntasDash }
}
