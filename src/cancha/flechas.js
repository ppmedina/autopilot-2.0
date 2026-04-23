// src/cancha/flechas.js
import * as THREE from 'three'

const JUGADORES_EJEMPLO = [
  { numero: 8,  nombre: 'Mediocampista', x: -10, z:  0  },
  { numero: 10, nombre: 'Enganche',      x:   5, z: -12 },
  { numero: 9,  nombre: 'Delantero',     x:  25, z:  5  },
  { numero: 7,  nombre: 'Extremo',       x:  20, z: -20 },
]

const FLECHAS_EJEMPLO = [
  { de: { x: -10, z:  0  }, a: { x:   5, z: -12 }, estilo: 'pase'       },
  { de: { x:  25, z:  5  }, a: { x:  52, z:  0  }, estilo: 'disparo'    },
  { de: { x: -10, z:  0  }, a: { x:  20, z: -20 }, estilo: 'movimiento' },
  { de: { x:  20, z: -20 }, a: { x:  25, z:  5  }, estilo: 'apoyo'      },
]

const ESTILOS = {
  pase:       { color: 0x00CCFF, radio: 0.12, opacidad: 0.90, alturaArco: 6, punteado: true,  recto: false },
  disparo:    { color: 0x00FF88, radio: 0.12, opacidad: 1.00, alturaArco: 0, punteado: false, recto: true  },
  movimiento: { color: 0x44DDFF, radio: 0.12, opacidad: 0.55, alturaArco: 4, punteado: true,  recto: false },
  apoyo:      { color: 0xFF8800, radio: 0.12, opacidad: 0.70, alturaArco: 5, punteado: true,  recto: false },
}

function crearCurva(de, a, alturaArco) {
  const inicio = new THREE.Vector3(de.x, 0.3, de.z)
  const fin    = new THREE.Vector3(a.x,  0.3, a.z)
  if (alturaArco === 0) return new THREE.CatmullRomCurve3([inicio, fin])
  const medio = new THREE.Vector3().lerpVectors(inicio, fin, 0.5)
  medio.y = alturaArco
  const p1 = new THREE.Vector3().lerpVectors(inicio, medio, 0.4)
  p1.y = alturaArco * 0.6
  const p2 = new THREE.Vector3().lerpVectors(medio, fin, 0.6)
  p2.y = alturaArco * 0.6
  return new THREE.CatmullRomCurve3([inicio, p1, medio, p2, fin])
}

function crearTextura(color, punteado, estilo) {
  const w = 512, h = 16
  const canvas = document.createElement('canvas')
  canvas.width = w; canvas.height = h
  const ctx = canvas.getContext('2d')
  const c = new THREE.Color(color)
  const r = Math.round(c.r * 255)
  const g = Math.round(c.g * 255)
  const b = Math.round(c.b * 255)
  ctx.clearRect(0, 0, w, h)

  if (!punteado) {
    const grad = ctx.createLinearGradient(0, 0, w, 0)
    grad.addColorStop(0.0, `rgba(${r},${g},${b},0.6)`)
    grad.addColorStop(0.4, `rgba(${r},${g},${b},1.0)`)
    grad.addColorStop(1.0, `rgba(${r},${g},${b},0.9)`)
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, w, h)
  } else {
    const dashLen = estilo === 'movimiento' ? 18 : estilo === 'apoyo' ? 28 : 38
    const gapLen  = estilo === 'movimiento' ? 22 : estilo === 'apoyo' ? 18 : 22
    let x = 0, dibujando = true
    while (x < w) {
      const segLen = dibujando ? dashLen : gapLen
      if (dibujando) {
        const grad = ctx.createLinearGradient(x, 0, x + segLen, 0)
        grad.addColorStop(0.0, `rgba(${r},${g},${b},0.4)`)
        grad.addColorStop(0.5, `rgba(${r},${g},${b},1.0)`)
        grad.addColorStop(1.0, `rgba(${r},${g},${b},0.4)`)
        ctx.fillStyle = grad
        ctx.fillRect(x, 0, Math.min(segLen, w - x), h)
      }
      x += segLen
      dibujando = !dibujando
    }
  }

  const tex = new THREE.CanvasTexture(canvas)
  tex.wrapS  = THREE.RepeatWrapping
  tex.repeat.set(4, 1)
  return tex
}

// ── Punta plana paralela a la cancha ─────────────────────────────────────────
function crearPuntaPlana(posicion, dirXZ, color, opacidad, tamano = 3.5) {
  // Triángulo en el plano XZ apuntando en dirXZ
  const perp = new THREE.Vector3(-dirXZ.z, 0, dirXZ.x) // perpendicular

  const punta  = new THREE.Vector3().copy(posicion).addScaledVector(dirXZ,  tamano * 0.6)
  const baseL  = new THREE.Vector3().copy(posicion).addScaledVector(perp,   tamano * 0.4)
  const baseR  = new THREE.Vector3().copy(posicion).addScaledVector(perp,  -tamano * 0.4)

  const positions = new Float32Array([
    punta.x,  punta.y,  punta.z,
    baseL.x,  baseL.y,  baseL.z,
    baseR.x,  baseR.y,  baseR.z,
  ])

  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geo.setIndex(new THREE.BufferAttribute(new Uint16Array([0, 1, 2]), 1))

  const mat = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity:     opacidad,
    depthWrite:  false,
    side:        THREE.DoubleSide,
  })

  const mesh = new THREE.Mesh(geo, mat)
  mesh.renderOrder = 4
  return mesh
}

export function createFlechas(scene, jugadores = JUGADORES_EJEMPLO, flechas = FLECHAS_EJEMPLO, opciones = {}) {

  const { offsetY = 0 } = opciones

  const grupo = new THREE.Group()
  grupo.position.y = offsetY
  grupo.visible    = false
  scene.add(grupo)

  const puntasMesh     = []
  const lineasAnimadas = []

  flechas.forEach(flecha => {
    const est   = ESTILOS[flecha.estilo] || ESTILOS.pase
    const curva = crearCurva(flecha.de, flecha.a, est.alturaArco)

    const puntos       = curva.getPoints(80)
    const puntosCortos = puntos.slice(0, Math.floor(puntos.length * 0.88))
    const curvaCorta   = new THREE.CatmullRomCurve3(puntosCortos)

    const tex = crearTextura(est.color, est.punteado, flecha.estilo)

    // ── Tubo principal ──
    const geoTubo = new THREE.TubeGeometry(curvaCorta, 60, est.radio, 8, false)
    const matTubo = new THREE.MeshBasicMaterial({
      map:         tex,
      transparent: true,
      opacity:     est.opacidad,
      depthWrite:  false,
      side:        THREE.DoubleSide,
    })
    const tubo = new THREE.Mesh(geoTubo, matTubo)
    tubo.renderOrder = 3
    grupo.add(tubo)

    // ── Dirección XZ al final de la curva ──
    const tangente = curvaCorta.getTangent(1)
    const dirXZ    = new THREE.Vector3(tangente.x, 0, tangente.z).normalize()
    const posicion = curvaCorta.getPoint(1).clone()
    posicion.y = 0.3  // ← al nivel de la cancha

    // ── Punta plana en el plano XZ ──
    const punta = crearPuntaPlana(posicion, dirXZ, est.color, est.opacidad)
    grupo.add(punta)
    puntasMesh.push(punta)

    if (est.punteado) {
      const velocidad = flecha.estilo === 'movimiento' ? 0.25 :
                        flecha.estilo === 'apoyo'       ? 0.45 : 0.7
      lineasAnimadas.push({ tex, velocidad })
    }
  })

  // ── Nodos en posición de jugadores ───────────────────────────────────────
  jugadores.forEach(j => {
    const geoRing = new THREE.RingGeometry(2.2, 2.7, 32)
    const matRing = new THREE.MeshBasicMaterial({
      color:       0x00AAFF,
      transparent: true,
      opacity:     0.4,
      depthWrite:  false,
      side:        THREE.DoubleSide,
    })
    const anillo = new THREE.Mesh(geoRing, matRing)
    anillo.rotation.x = -Math.PI / 2
    anillo.position.set(j.x, 0.1, j.z)
    anillo.renderOrder = 2
    grupo.add(anillo)
  })

  // ── Tick ──────────────────────────────────────────────────────────────────
  function tickFlechas(dt, camera) {
    if (!grupo.visible) return
    lineasAnimadas.forEach(({ tex, velocidad }) => {
      tex.offset.x -= velocidad * dt
    })
  }

  function ocultarPuntas() { puntasMesh.forEach(p => { p.visible = false }) }
  function mostrarPuntas() { puntasMesh.forEach(p => { p.visible = true  }) }

  // ── Botón ──
  const btn = document.createElement('button')
  btn.textContent = 'Flechas'
  btn.className   = 'btn'
  btn.addEventListener('click', function () {
    grupo.visible = !grupo.visible
    this.classList.toggle('active', grupo.visible)
  })
  document.getElementById('cc-controls').appendChild(btn)

  return { grupo, tickFlechas, ocultarPuntas, mostrarPuntas }
}
