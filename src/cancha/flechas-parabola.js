// src/cancha/flechas-parabola.js
// Flechas parabólicas para pases largos
// Dos estilos: 'linea' (delgada con punta) y 'dash' (punteada animada)
import * as THREE from 'three'

const FLECHAS_EJEMPLO = [
  {
    de:     { x: -27, z: 14  },  // R. Juárez #29
    a:      { x:  30, z: -19 },  // B. Rodríguez #7
    estilo: 'linea',
  },
  {
    de:     { x: -27, z: 14  },  // R. Juárez #29
    a:      { x:  30, z: -19 },  // B. Rodríguez #7
    estilo: 'dash',
  },
]

// ── Paleta azul de las dash ───────────────────────────────────────────────────
const COLOR_ORIGEN  = new THREE.Color(10/255,  40/255, 160/255)   // azul oscuro
const COLOR_DESTINO = new THREE.Color(120/255, 200/255, 255/255)  // azul claro

// ── Generar puntos de la parábola ─────────────────────────────────────────────
function generarPuntosParabola(inicio, fin, alturaArco, segmentos = 60) {
  const medio = new THREE.Vector3().addVectors(inicio, fin).multiplyScalar(0.5)
  medio.y += alturaArco

  const curva  = new THREE.QuadraticBezierCurve3(inicio, medio, fin)
  return curva.getPoints(segmentos)
}

// ── Textura de cuadrados animados (estilo dash) ───────────────────────────────
function crearTexturaDashParabola() {
  const w = 512, h = 16
  const canvas = document.createElement('canvas')
  canvas.width = w; canvas.height = h
  const ctx = canvas.getContext('2d')
  ctx.clearRect(0, 0, w, h)

  let x = 0
  while (x < w) {
    const t    = x / w
    const size = 5 + t * 8
    const gap  = 1 + (1 - t) * 2
    const r    = Math.round(COLOR_ORIGEN.r * 255 + t * (COLOR_DESTINO.r - COLOR_ORIGEN.r) * 255)
    const g    = Math.round(COLOR_ORIGEN.g * 255 + t * (COLOR_DESTINO.g - COLOR_ORIGEN.g) * 255)
    const b    = Math.round(COLOR_ORIGEN.b * 255 + t * (COLOR_DESTINO.b - COLOR_ORIGEN.b) * 255)
    const a    = 0.4 + t * 0.6

    ctx.fillStyle = `rgba(${r},${g},${b},${a})`
    ctx.fillRect(x, h / 2 - size / 2, size, size)
    x += size + gap
  }

  const tex = new THREE.CanvasTexture(canvas)
  tex.wrapS = THREE.RepeatWrapping
  return tex
}

// ── Geometría de tubo delgado con colores por vértice ────────────────────────
function crearGeoCurvaColoreada(puntos) {
  const positions = []
  const colors    = []
  const total     = puntos.length

  puntos.forEach((p, i) => {
    positions.push(p.x, p.y, p.z)
    const t = i / (total - 1)
    const c = new THREE.Color().lerpColors(COLOR_ORIGEN, COLOR_DESTINO, t)
    const a = 0.3 + t * 0.7  // opacidad crece hacia el destino
    colors.push(c.r * a, c.g * a, c.b * a)
  })

  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geo.setAttribute('color',    new THREE.Float32BufferAttribute(colors,    3))
  return geo
}

// ── Punta de flecha plana en el destino ──────────────────────────────────────
function crearPuntaParabola(posicion, dirXZ, tamano = 2.5) {
  const perp  = new THREE.Vector3(-dirXZ.z, 0, dirXZ.x)
  const punta = new THREE.Vector3().copy(posicion).addScaledVector(dirXZ,  tamano * 0.8)
  const baseL = new THREE.Vector3().copy(posicion).addScaledVector(perp,   tamano * 0.5)
  const baseR = new THREE.Vector3().copy(posicion).addScaledVector(perp,  -tamano * 0.5)

  const positions = new Float32Array([
    punta.x, punta.y, punta.z,
    baseL.x, baseL.y, baseL.z,
    baseR.x, baseR.y, baseR.z,
  ])
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geo.setIndex(new THREE.BufferAttribute(new Uint16Array([0, 1, 2]), 1))

  const mat  = new THREE.MeshBasicMaterial({
    color:       COLOR_DESTINO,
    transparent: true,
    opacity:     0.9,
    depthWrite:  false,
    side:        THREE.DoubleSide,
  })
  const mesh = new THREE.Mesh(geo, mat)
  mesh.renderOrder = 4
  return mesh
}

// ── Export principal ──────────────────────────────────────────────────────────
export function createFlechasParabola(
  scene,
  flechas  = FLECHAS_EJEMPLO,
  opciones = {}
) {
  const {
    offsetY    = 4.0,
    alturaArco = 18,    // altura del punto de control de la curva
    radioAro   = 4.5,   // recorte en origen y destino para no tapar fichas
    segmentos  = 60,
  } = opciones

  const grupo = new THREE.Group()
  grupo.position.y = offsetY
  grupo.visible    = false
  scene.add(grupo)

  const lineasDashAnim = []
  const puntasMesh     = []

  flechas.forEach(flecha => {
    const esDash = flecha.estilo === 'dash'

    const inicio = new THREE.Vector3(flecha.de.x, 0, flecha.de.z)
    const fin    = new THREE.Vector3(flecha.a.x,  0, flecha.a.z)

    // Acortar origen y destino para no meterse en las fichas
    const dir          = new THREE.Vector3().subVectors(fin, inicio).normalize()
    const inicioAcort  = new THREE.Vector3().copy(inicio).addScaledVector(dir,  radioAro)
    const finAcort     = new THREE.Vector3().copy(fin).addScaledVector(dir,    -radioAro)

    const puntos = generarPuntosParabola(inicioAcort, finAcort, alturaArco, segmentos)

    if (esDash) {
      // ── Estilo dash — tubo con textura de cuadrados animados ──
      const curva    = new THREE.QuadraticBezierCurve3(
        inicioAcort,
        new THREE.Vector3().addVectors(inicioAcort, finAcort).multiplyScalar(0.5).setY(alturaArco),
        finAcort
      )
      const tuboGeo  = new THREE.TubeGeometry(curva, segmentos, 0.18, 6, false)
      const tex      = crearTexturaDashParabola()
      const tuboMat  = new THREE.MeshBasicMaterial({
        map:         tex,
        transparent: true,
        depthWrite:  false,
        blending:    THREE.AdditiveBlending,
        side:        THREE.DoubleSide,
      })
      const tubo = new THREE.Mesh(tuboGeo, tuboMat)
      tubo.renderOrder = 3
      grupo.add(tubo)
      lineasDashAnim.push({ tex, velocidad: 0.4 })

    } else {
      // ── Estilo linea — línea delgada con colores por vértice ──
      const geo = crearGeoCurvaColoreada(puntos)
      const mat = new THREE.LineBasicMaterial({
        vertexColors: true,
        transparent:  true,
        opacity:      0.85,
        blending:     THREE.AdditiveBlending,
        linewidth:    1,
      })
      const linea = new THREE.Line(geo, mat)
      linea.renderOrder = 3
      grupo.add(linea)
    }

    // ── Punta al final ──
    const penultimo = puntos[puntos.length - 2]
    const ultimo    = puntos[puntos.length - 1]
    const dirFinal  = new THREE.Vector3().subVectors(ultimo, penultimo).normalize()
    const dirXZ     = new THREE.Vector3(dirFinal.x, 0, dirFinal.z).normalize()
    const punta     = crearPuntaParabola(ultimo, dirXZ, 2.5)
    grupo.add(punta)
    puntasMesh.push(punta)
  })

  // ── Tick — animar cuadrados dash ─────────────────────────────────────────
  function tickFlechasParabola(dt) {
    if (!grupo.visible) return
    lineasDashAnim.forEach(({ tex, velocidad }) => {
      tex.offset.x -= velocidad * dt
    })
  }

  function ocultarPuntasParabola() { puntasMesh.forEach(p => { p.visible = false }) }
  function mostrarPuntasParabola() { puntasMesh.forEach(p => { p.visible = true  }) }

  // ── Botón ─────────────────────────────────────────────────────────────────
  const btn = document.createElement('button')
  btn.textContent = 'Pase largo'
  btn.className   = 'btn'
  btn.addEventListener('click', function () {
    grupo.visible = !grupo.visible
    this.classList.toggle('active', grupo.visible)
  })
  document.getElementById('cc-controls').appendChild(btn)

  return { grupo, tickFlechasParabola, ocultarPuntasParabola, mostrarPuntasParabola }
}
