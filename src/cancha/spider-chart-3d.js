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
  const cy     = H / 2
  const R      = Math.min(W, H) * 0.36
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
    if (niv === niveles) { ctx.fillStyle = 'rgba(255,255,255,0.03)'; ctx.fill() }
    ctx.strokeStyle = niv === niveles ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.07)'
    ctx.lineWidth   = niv === niveles ? 1.5 : 1
    ctx.setLineDash(niv < niveles ? [6, 6] : [])
    ctx.stroke(); ctx.setLineDash([])
  }

  // Ejes y números
  for (let i = 0; i < N; i++) {
    const p = punto(i, 1)
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(p.x, p.y)
    ctx.strokeStyle = 'rgba(255,255,255,0.15)'; ctx.lineWidth = 1; ctx.stroke()
    const lp = punto(i, 1.16)
    ctx.font = `600 28px "Syne", sans-serif`
    ctx.fillStyle = 'rgba(255,255,255,0.55)'
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

  // Leyenda centrada abajo del radar
  const leyH = H * 0.93
  ctx.font = `400 26px "JetBrains Mono", monospace`
  const totalW = series.reduce((acc, s) => acc + ctx.measureText(s.label).width + 60, 0)
  let lx = cx - totalW / 2
  series.forEach(s => {
    ctx.save()
    ctx.beginPath(); ctx.arc(lx + 10, leyH, 9, 0, Math.PI * 2)
    ctx.fillStyle = s.color; ctx.shadowColor = s.color; ctx.shadowBlur = 8; ctx.fill()
    ctx.restore()
    ctx.font = `400 26px "JetBrains Mono", monospace`
    ctx.fillStyle = 'rgba(255,255,255,0.6)'
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle'
    ctx.fillText(s.label, lx + 26, leyH)
    lx += ctx.measureText(s.label).width + 60
  })
}

// ── Dibujar lista de ejes en canvas separado ──────────────────────────────────
function dibujarLista(canvas, ejes) {
  const ctx = canvas.getContext('2d')
  const W = canvas.width, H = canvas.height
  ctx.clearRect(0, 0, W, H)

  const colW  = W / 2
  const rowH  = H / 3
  ejes.forEach((eje, i) => {
    const col = i < 3 ? 0 : 1
    const row = i % 3
    const ex  = W * 0.03 + col * colW
    const ey  = rowH * row + rowH / 2

    const bx = ex, by = ey - 18, bw = 40, bh = 36, br = 6
    ctx.beginPath(); ctx.roundRect(bx, by, bw, bh, br)
    ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.fill()
    ctx.font = `600 24px "Syne", sans-serif`
    ctx.fillStyle = '#ffffff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.fillText(String(eje.num), bx + bw / 2, by + bh / 2)

    ctx.font = `400 20px "JetBrains Mono", monospace`
    ctx.fillStyle = 'rgba(255,255,255,0.5)'
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle'
    ctx.fillText(eje.label, ex + bw + 12, ey)
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
  ctx.fillText(titulo, 40, H / 2)
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
    datos      = DATOS_EJEMPLO,
    posicion   = { x: 30, y: 18, z: -20 },
    rotacionY  = -0.3,
    anchoMundo = 50,
    altoMundo  = 38,
    allLines   = null,
  } = opciones

  const grupo = new THREE.Group()
  grupo.position.set(posicion.x, posicion.y, posicion.z)
  grupo.rotation.y = rotacionY
  grupo.visible = false
  scene.add(grupo)

  // ── Plano de vidrio ──────────────────────────────────────────────────────
  // ── Plano de vidrio — esmerilado simulado con canvas ────────────────────
  const cVidrio = document.createElement('canvas')
  cVidrio.width = 512; cVidrio.height = 512
  const ctxV = cVidrio.getContext('2d')
  // Base semitransparente
  ctxV.fillStyle = 'rgba(10, 20, 40, 0.45)'
  ctxV.fillRect(0, 0, 512, 512)
  // Tinte azul
  ctxV.fillStyle = 'rgba(80, 140, 220, 0.08)'
  ctxV.fillRect(0, 0, 512, 512)
  // Ruido — textura esmerilada
  for (let i = 0; i < 512 * 512 * 0.3; i++) {
    ctxV.fillStyle = `rgba(255,255,255,${Math.random() * 0.04})`
    ctxV.fillRect(Math.random() * 512, Math.random() * 512, 1, 1)
  }
  // Highlight superior
  const hvGrad = ctxV.createLinearGradient(0, 0, 0, 200)
  hvGrad.addColorStop(0,   'rgba(160, 210, 255, 0.08)')
  hvGrad.addColorStop(1,   'rgba(160, 210, 255, 0)')
  ctxV.fillStyle = hvGrad
  ctxV.fillRect(0, 0, 512, 512)

  const texVidrio = new THREE.CanvasTexture(cVidrio)
  const matVidrio = new THREE.MeshBasicMaterial({
    map:         texVidrio,
    transparent: true,
    depthWrite:  false,
    side:        THREE.DoubleSide,
  })
  const meshVidrio = new THREE.Mesh(new THREE.PlaneGeometry(anchoMundo, altoMundo), matVidrio)
  meshVidrio.renderOrder = 10
  grupo.add(meshVidrio)

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
  meshBorde.position.z = 0.05; meshBorde.renderOrder = 11
  grupo.add(meshBorde)

  // ── Header ───────────────────────────────────────────────────────────────
  const cHead = document.createElement('canvas')
  cHead.width = 900; cHead.height = 100
  dibujarHeader(cHead, datos.titulo)
  const texHead  = new THREE.CanvasTexture(cHead)
  const altoHead = altoMundo * 0.12
  const meshHead = new THREE.Mesh(
    new THREE.PlaneGeometry(anchoMundo * 0.92, altoHead),
    new THREE.MeshBasicMaterial({ map: texHead, transparent: true, depthWrite: false, side: THREE.DoubleSide })
  )
  meshHead.position.set(0, altoMundo * 0.44, 0.1)
  meshHead.renderOrder = 12
  grupo.add(meshHead)

  // ── Radar — canvas cuadrado ───────────────────────────────────────────────
  const cRadar = document.createElement('canvas')
  cRadar.width = 900; cRadar.height = 900
  dibujarRadar(cRadar, datos)
  const texRadar   = new THREE.CanvasTexture(cRadar)
  const altoRadar  = altoMundo * 0.65
  const meshRadar  = new THREE.Mesh(
    new THREE.PlaneGeometry(altoRadar, altoRadar),  // cuadrado
    new THREE.MeshBasicMaterial({ map: texRadar, transparent: true, depthWrite: false, side: THREE.DoubleSide })
  )
  meshRadar.position.set(0, altoMundo * 0.06, 0.1)
  meshRadar.renderOrder = 12
  grupo.add(meshRadar)

  // ── Lista de ejes — canvas aparte ─────────────────────────────────────────
  const cLista = document.createElement('canvas')
  cLista.width = 1100; cLista.height = 240
  dibujarLista(cLista, datos.ejes)
  const texLista  = new THREE.CanvasTexture(cLista)
  const altoLista = altoMundo * 0.22
  const meshLista = new THREE.Mesh(
    new THREE.PlaneGeometry(anchoMundo * 0.88, altoLista),
    new THREE.MeshBasicMaterial({ map: texLista, transparent: true, depthWrite: false, side: THREE.DoubleSide })
  )
  meshLista.position.set(0, -altoMundo * 0.38, 0.1)
  meshLista.renderOrder = 12
  grupo.add(meshLista)

  // ── Botón ────────────────────────────────────────────────────────────────
  const btn = document.createElement('button')
  btn.textContent = 'Radar'
  btn.className   = 'btn'
  btn.addEventListener('click', function () {
    grupo.visible = !grupo.visible
    this.classList.toggle('active', grupo.visible)
  })
  document.getElementById('cc-controls').appendChild(btn)

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
