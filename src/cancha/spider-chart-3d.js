// src/cancha/spider-chart-3d.js
// Spider chart en ventana 3D flotante
import * as THREE from 'three'

const DATOS_EJEMPLO = {
  titulo:  'Radar General',
  ejes: [
    { label: 'Goles',                        num: 1 },
    { label: '1vs1 exitosos ofensivos',      num: 2 },
    { label: '1vs1 defensivos exitosos',     num: 3 },
    { label: 'Balones ganados en área',      num: 4 },
    { label: 'Centros por derecha',          num: 5 },
    { label: 'Balones recuperados totales',  num: 6 },
  ],
  series: [
    { label: 'LOC', color: '#4ED3FF', valores: [0.75, 0.55, 0.80, 0.40, 0.90, 0.60] },
    { label: 'VIS', color: '#C8E64D', valores: [0.85, 0.70, 0.45, 0.75, 0.55, 0.80] },
  ],
}

// ── Dibujar radar en canvas ───────────────────────────────────────────────────
function dibujarRadar(canvas, datos) {
  const ctx  = canvas.getContext('2d')
  const W    = canvas.width
  const H    = canvas.height
  ctx.clearRect(0, 0, W, H)

  const { ejes, series } = datos
  const N      = ejes.length
  const cx     = W / 2
  const cy     = H * 0.46       // centro vertical: un toque arriba del medio
                                // para abrir espacio para la leyenda inferior
  const R      = Math.min(W, H) * 0.40   // radio del spider chart.
                                         // Los números van a 1.20×R = 0.48 del centro
                                         // → quedan dentro del canvas con margen de
                                         //   0.02 (suficiente para texto 50px).
  const niveles = 4

  const angulo = i => -Math.PI / 2 + (2 * Math.PI / N) * i
  const punto  = (i, t) => ({
    x: cx + Math.cos(angulo(i)) * R * t,
    y: cy + Math.sin(angulo(i)) * R * t,
  })

  // Niveles
  for (let niv = niveles; niv >= 1; niv--) {
    const t = niv / niveles
    ctx.beginPath()
    for (let i = 0; i < N; i++) {
      const p = punto(i, t)
      i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)
    }
    ctx.closePath()
    if (niv === niveles) { ctx.fillStyle = 'rgba(255,255,255,0.06)'; ctx.fill() }
    ctx.strokeStyle = niv === niveles ? 'rgba(255,255,255,0.45)' : 'rgba(255,255,255,0.22)'
    ctx.lineWidth   = niv === niveles ? 2 : 1.2
    ctx.setLineDash(niv < niveles ? [6, 6] : [])
    ctx.stroke(); ctx.setLineDash([])
  }

  // Ejes y números
  for (let i = 0; i < N; i++) {
    const p = punto(i, 1)
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(p.x, p.y)
    ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 1.2; ctx.stroke()
    const lp = punto(i, 1.20)
    ctx.font = `600 50px "Syne", sans-serif`
    ctx.fillStyle = 'rgba(255,255,255,0.85)'
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.fillText(String(ejes[i].num), lp.x, lp.y)
  }

  // Series
  series.forEach(serie => {
    const r = parseInt(serie.color.slice(1,3),16)
    const g = parseInt(serie.color.slice(3,5),16)
    const b = parseInt(serie.color.slice(5,7),16)
    ctx.save()
    ctx.beginPath()
    for (let i = 0; i < N; i++) {
      const p = punto(i, serie.valores[i])
      i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)
    }
    ctx.closePath()
    ctx.fillStyle   = `rgba(${r},${g},${b},0.18)`; ctx.fill()
    ctx.strokeStyle = serie.color; ctx.lineWidth = 2.5
    ctx.shadowColor = serie.color; ctx.shadowBlur = 10
    ctx.stroke(); ctx.restore()
    for (let i = 0; i < N; i++) {
      const p = punto(i, serie.valores[i])
      ctx.save()
      ctx.beginPath(); ctx.arc(p.x, p.y, 5, 0, Math.PI * 2)
      ctx.fillStyle = serie.color; ctx.shadowColor = serie.color; ctx.shadowBlur = 12; ctx.fill()
      ctx.beginPath(); ctx.arc(p.x, p.y, 2.5, 0, Math.PI * 2)
      ctx.fillStyle = '#ffffff'; ctx.shadowBlur = 0; ctx.fill()
      ctx.restore()
    }
  })

  // Leyenda LOC/VIS — posicionada bien abajo del radar para que NO se
  // solape con los números (1-6) del perímetro. El centro del radar (cy)
  // está en H*0.44, y los números caen hasta ~H*0.78 aprox; por eso la
  // leyenda va a H*0.96 (cerca del borde inferior del canvas).
  const leyH = H * 0.96
  ctx.font = `500 36px "JetBrains Mono", monospace`
  const totalW = series.reduce((acc, s) => acc + ctx.measureText(s.label).width + 80, 0)
  let lx = cx - totalW / 2
  series.forEach(s => {
    ctx.save()
    ctx.beginPath(); ctx.arc(lx + 14, leyH, 12, 0, Math.PI * 2)
    ctx.fillStyle = s.color; ctx.shadowColor = s.color; ctx.shadowBlur = 10; ctx.fill()
    ctx.restore()
    ctx.font = `500 36px "JetBrains Mono", monospace`
    ctx.fillStyle = 'rgba(255,255,255,0.85)'
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle'
    ctx.fillText(s.label, lx + 36, leyH)
    lx += ctx.measureText(s.label).width + 80
  })
}

// ── Dibujar lista de ejes en canvas separado (layout VERTICAL) ────────────────
// Los 6 ejes se apilan en una sola columna, uno arriba del otro. Cada uno
// tiene un badge cuadrado con el número y a la derecha el label descriptivo.
// El espaciado entre filas es fijo (rowH) para tener control independiente
// del alto del canvas.
function dibujarLista(canvas, ejes) {
  const ctx = canvas.getContext('2d')
  const W = canvas.width, H = canvas.height
  ctx.clearRect(0, 0, W, H)

  const padX = W * 0.06          // padding lateral del canvas
  const rowH = 110               // espaciado fijo entre filas (compacto)
  // Centrar el bloque verticalmente: el alto total del bloque es rowH * N,
  // y lo desplazamos hacia arriba para que quede centrado en el canvas.
  const yStart = (H - rowH * ejes.length) / 2 + rowH / 2
  ejes.forEach((eje, i) => {
    const ey = yStart + rowH * i

    // Badge cuadrado con el número
    const bw = 56, bh = 50, br = 8
    const bx = padX, by = ey - bh / 2
    ctx.beginPath(); ctx.roundRect(bx, by, bw, bh, br)
    ctx.fillStyle = 'rgba(255,255,255,0.14)'; ctx.fill()
    ctx.font = `600 34px "Syne", sans-serif`
    ctx.fillStyle = '#ffffff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.fillText(String(eje.num), bx + bw / 2, by + bh / 2)

    // Label descriptivo a la derecha del badge
    ctx.font = `400 28px "JetBrains Mono", monospace`
    ctx.fillStyle = 'rgba(255,255,255,0.75)'
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle'
    ctx.fillText(eje.label, bx + bw + 18, ey)
  })
}

// ── Dibujar header ────────────────────────────────────────────────────────────
function dibujarHeader(canvas, titulo) {
  const ctx = canvas.getContext('2d')
  const W = canvas.width, H = canvas.height
  ctx.clearRect(0, 0, W, H)
  ctx.font         = `700 52px "Syne", sans-serif`
  ctx.fillStyle    = '#ffffff'
  ctx.textAlign    = 'left'
  ctx.textBaseline = 'middle'
  // Padding-top de ~20px: bajamos el texto desde H/2 a H/2 + 20.
  // Como el canvas tiene 140px de alto (definido más abajo en el factory),
  // el texto queda en y=90 → deja 64px de "padding" arriba y ~50px abajo.
  ctx.fillText(titulo, 40, H / 2 + 20)
  // Línea separadora
  ctx.beginPath()
  ctx.moveTo(40, H - 4)
  ctx.lineTo(W - 40, H - 4)
  ctx.strokeStyle = 'rgba(255,255,255,0.12)'
  ctx.lineWidth   = 1
  ctx.stroke()
}

// ── Factory ───────────────────────────────────────────────────────────────────
export function createSpiderChart3D(scene, opciones = {}) {

  const {
    datos          = DATOS_EJEMPLO,
    posicion       = { x: 30, y: 18, z: -20 },
    rotacionY      = -0.3,
    anchoMundo     = 50,
    altoMundo      = 38,
    allLines       = null,
    // Si se pasa un material custom (ej. el de frosted-glass-blur.js para
    // tener blur real del backdrop), se usa ese en lugar del PBR.
    materialVidrio = null,
    // Profundidad del bloque del cristal (grosor del marco lateral).
    // 0 = panel plano (sin laterales). Recomendado: 1.5 a 3.0
    profundidad   = 2.0,
  } = opciones

  const grupo = new THREE.Group()
  grupo.position.set(posicion.x, posicion.y, posicion.z)
  grupo.rotation.y = rotacionY
  grupo.visible = false
  scene.add(grupo)

  // ── Plano de vidrio — MeshPhysicalMaterial con clearcoat ────────────────
  // En lugar de pintar un canvas estático con ruido (que se ve plano y
  // poco premium), usamos un material PBR que RECIBE LA LUZ DE LA ESCENA.
  // Las luces existentes en lights.js (SpotLight cenital + 4 PointLights
  // de las esquinas + HemisphereLight) generan automáticamente:
  //   - Highlight especular en la esquina superior donde incide la luz
  //   - Sombra natural en el lado opuesto
  //   - Reflexión brillante en los bordes (gracias al clearcoat)
  //
  // El truco es:
  //   - color muy oscuro (casi negro azulado) → el panel se ve oscuro
  //   - roughness bajo (0.2) → reflexiones nítidas, no difusas
  //   - clearcoat 1.0 → capa de "laca" brillante encima, igual que las refs
  //   - metalness 0.4 → un toque metálico que potencia el especular
  //   - transparent + opacity 0.92 → casi opaco pero deja un mínimo pasar
  //     de la cancha por si querés que se note la profundidad
  //
  // El highlight se MUEVE con la cámara y el lookAt, como en un objeto real.

  const matVidrio = materialVidrio || new THREE.MeshPhysicalMaterial({
    color:              0x2a3a55,   // azul-grisáceo medio (antes era casi negro)
    roughness:          0.22,       // muy liso → reflejos nítidos
    metalness:          0.30,       // un toque metálico (bajado para verse menos pesado)
    clearcoat:          1.0,        // capa de laca brillante encima
    clearcoatRoughness: 0.10,       // laca casi espejada
    transparent:        true,
    opacity:            0.55,       // transparencia notoria — se ve lo que hay detrás
    side:               THREE.DoubleSide,
    depthWrite:         false,
  })

  // ── Cara frontal del cristal ──────────────────────────────────────────────
  // Plano frontal con el material principal (PBR o Blur). Va POSICIONADO en
  // +profundidad/2 para que quede en el frente del bloque (no en el medio).
  const meshVidrio = new THREE.Mesh(
    new THREE.PlaneGeometry(anchoMundo, altoMundo, 16, 16),
    matVidrio
  )
  meshVidrio.position.z = profundidad / 2
  meshVidrio.renderOrder = 10
  grupo.add(meshVidrio)

  // ── Marco lateral PBR — esto le da el grosor 3D visible ───────────────────
  // Usamos una BoxGeometry SÓLIDA con material PBR oscuro. Como la cara
  // frontal del meshVidrio queda EN EL FRENTE de la caja, los costados,
  // la espalda y la parte superior/inferior se ven cuando rotás la cámara.
  // El PBR genera highlights propios en los cantos gracias a las luces de
  // la escena (SpotLight cenital + 4 PointLights de esquinas).
  //
  // IMPORTANTE: aunque el meshVidrio del frente sea Blur (shader), el marco
  // 3D SIEMPRE usa PBR — porque el shader del frosted glass está pensado
  // para una superficie frontal, no para los costados.
  //
  // Con transparencia también: el marco lateral se ve translúcido para
  // mantener coherencia con la cara frontal.
  const matMarco = new THREE.MeshPhysicalMaterial({
    color:              0x2a3a55,
    roughness:          0.25,
    metalness:          0.40,
    clearcoat:          1.0,
    clearcoatRoughness: 0.15,
    transparent:        true,
    opacity:            0.55,
    side:               THREE.FrontSide,    // solo se ve desde afuera
    depthWrite:         false,
  })

  // Box del marco — usa MISMO ancho/alto que la cara frontal, con profundidad.
  // El frente del bloque (z = +profundidad/2) queda OCULTO debajo del
  // meshVidrio del frente porque éste tiene renderOrder=10 y depthWrite=false.
  // Los lados y atrás del bloque sí se ven al rotar.
  const geoMarco = new THREE.BoxGeometry(
    anchoMundo, altoMundo, profundidad,
    1, 1, 1
  )
  const meshMarco = new THREE.Mesh(geoMarco, matMarco)
  meshMarco.position.z = 0   // centrado: ocupa de -profundidad/2 a +profundidad/2
  meshMarco.renderOrder = 9
  grupo.add(meshMarco)

  // ── Borde ────────────────────────────────────────────────────────────────
  const cBorde = document.createElement('canvas')
  cBorde.width = 900; cBorde.height = 700
  const ctxB = cBorde.getContext('2d')
  const bw = cBorde.width, bh = cBorde.height, br = 32
  ctxB.beginPath(); ctxB.roundRect(4, 4, bw-8, bh-8, br)
  ctxB.save()
  ctxB.shadowColor = 'rgba(78, 211, 255, 0.4)'; ctxB.shadowBlur = 20
  ctxB.strokeStyle = 'rgba(255,255,255,0.2)'; ctxB.lineWidth = 4
  ctxB.stroke(); ctxB.restore()
  // Highlight superior
  const hlGrad = ctxB.createLinearGradient(bw*0.1, 0, bw*0.9, 0)
  hlGrad.addColorStop(0,   'rgba(255,255,255,0)')
  hlGrad.addColorStop(0.3, 'rgba(255,255,255,0.35)')
  hlGrad.addColorStop(0.5, 'rgba(255,255,255,0.55)')
  hlGrad.addColorStop(0.7, 'rgba(255,255,255,0.35)')
  hlGrad.addColorStop(1,   'rgba(255,255,255,0)')
  ctxB.beginPath(); ctxB.moveTo(br, 4); ctxB.lineTo(bw-br, 4)
  ctxB.strokeStyle = hlGrad; ctxB.lineWidth = 2; ctxB.stroke()

  const texBorde  = new THREE.CanvasTexture(cBorde)
  const meshBorde = new THREE.Mesh(
    new THREE.PlaneGeometry(anchoMundo, altoMundo),
    new THREE.MeshBasicMaterial({ map: texBorde, transparent: true, depthWrite: false, side: THREE.DoubleSide })
  )
  // Z = frente del bloque + pequeño offset para que quede ENCIMA del meshVidrio
  meshBorde.position.z = profundidad / 2 + 0.05
  meshBorde.renderOrder = 11
  grupo.add(meshBorde)

  // ── Header ───────────────────────────────────────────────────────────────
  // Canvas y mesh con un poco más de alto (140px en vez de 100) para que el
  // padding-top de 20px del título no comprima el espacio.
  const cHead = document.createElement('canvas')
  cHead.width = 900; cHead.height = 140
  dibujarHeader(cHead, datos.titulo)
  const texHead  = new THREE.CanvasTexture(cHead)
  const altoHead = altoMundo * 0.15
  const meshHead = new THREE.Mesh(
    new THREE.PlaneGeometry(anchoMundo * 0.92, altoHead),
    new THREE.MeshBasicMaterial({ map: texHead, transparent: true, depthWrite: false, side: THREE.DoubleSide })
  )
  meshHead.position.set(0, altoMundo * 0.44, profundidad / 2 + 0.1)
  meshHead.renderOrder = 12
  grupo.add(meshHead)

  // ── LAYOUT: dos columnas debajo del header ────────────────────────────────
  // Columna IZQUIERDA: spider chart (radar) cuadrado
  // Columna DERECHA: lista vertical de los 6 ejes (badge + label)
  // El header ocupa la fila de arriba a ancho completo.
  //
  // Las dos columnas comparten la misma altura para verse alineadas. Entre
  // ambas hay un gap horizontal de ~8% del ancho para que no se sientan
  // pegadas.
  const altoContenido = altoMundo * 0.78         // alto del área de contenido (debajo del header)
  const yContenido    = -altoMundo * 0.08        // offset hacia abajo respecto al centro
  const anchoCol      = anchoMundo * 0.42        // cada columna mide ~42% del ancho (8% sobra como gap entre ambas + padding lateral)
  const sepX          = anchoMundo * 0.24        // distancia del centro al centro de cada columna

  // ── Columna IZQUIERDA: Radar — canvas cuadrado ────────────────────────────
  const cRadar = document.createElement('canvas')
  cRadar.width = 900; cRadar.height = 900
  dibujarRadar(cRadar, datos)
  const texRadar   = new THREE.CanvasTexture(cRadar)
  const ladoRadar  = Math.min(anchoCol, altoContenido)   // cuadrado que cabe en la columna
  const meshRadar  = new THREE.Mesh(
    new THREE.PlaneGeometry(ladoRadar, ladoRadar),
    new THREE.MeshBasicMaterial({ map: texRadar, transparent: true, depthWrite: false, side: THREE.DoubleSide })
  )
  // X negativa = a la izquierda del centro del panel
  meshRadar.position.set(-sepX, yContenido, profundidad / 2 + 0.1)
  meshRadar.renderOrder = 12
  grupo.add(meshRadar)

  // ── Columna DERECHA: Lista de ejes — vertical ─────────────────────────────
  // Canvas alto y angosto para la columna vertical de 6 filas.
  const cLista = document.createElement('canvas')
  cLista.width = 600; cLista.height = 900
  dibujarLista(cLista, datos.ejes)
  const texLista  = new THREE.CanvasTexture(cLista)
  const meshLista = new THREE.Mesh(
    new THREE.PlaneGeometry(anchoCol, altoContenido),
    new THREE.MeshBasicMaterial({ map: texLista, transparent: true, depthWrite: false, side: THREE.DoubleSide })
  )
  // X positiva = a la derecha del centro del panel
  meshLista.position.set(sepX, yContenido, profundidad / 2 + 0.1)
  meshLista.renderOrder = 12
  grupo.add(meshLista)

  // ── Botón ────────────────────────────────────────────────────────────────
  // NOTA: el botón interno fue removido. El toggle de visibilidad ahora se
  // maneja desde script.js para tener control unificado con el resto de
  // componentes (botón "Radar" en #cc-controls). Si querés volver al botón
  // interno, descomentá este bloque.
  //
  // const btn = document.createElement('button')
  // btn.textContent = 'Radar'
  // btn.className   = 'btn'
  // btn.addEventListener('click', function () {
  //   grupo.visible = !grupo.visible
  //   this.classList.toggle('active', grupo.visible)
  // })
  // document.getElementById('cc-controls').appendChild(btn)

  // ── Actualizar datos ─────────────────────────────────────────────────────
  function updateDatos(nuevosDatos) {
    dibujarRadar(cRadar, nuevosDatos)
    texRadar.needsUpdate = true
    if (nuevosDatos.titulo) {
      dibujarHeader(cHead, nuevosDatos.titulo)
      texHead.needsUpdate = true
    }
  }

  // ── Tick — siempre mirando a la cámara ──────────────────────────────────
  function tickSpiderChart(camera) {
    if (!grupo.visible) return
    grupo.lookAt(camera.position)
  }

  return { grupo, updateDatos, tickSpiderChart }
}