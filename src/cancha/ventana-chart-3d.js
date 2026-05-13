// src/cancha/ventana-chart-3d.js
// Ventana flotante 3D con gráfico de líneas como textura canvas
// Vive en el espacio 3D de Three.js — responde a luces y perspectiva real

import * as THREE from 'three'

// ── Dibujar gráfico en canvas ─────────────────────────────────────────────────
function dibujarGrafico(canvas, series, etiquetas) {
  const ctx  = canvas.getContext('2d')
  const W    = canvas.width
  const H    = canvas.height
  const padL = 70, padR = 30, padT = 30, padB = 55
  const gW   = W - padL - padR
  const gH   = H - padT - padB

  ctx.clearRect(0, 0, W, H)

  // Fondo frosted glass simulado
  ctx.fillStyle = 'rgba(6, 12, 26, 0.72)'
  ctx.fillRect(0, 0, W, H)

  // Ruido sutil
  for (let i = 0; i < W * H * 0.08; i++) {
    ctx.fillStyle = `rgba(255,255,255,${Math.random() * 0.025})`
    ctx.fillRect(Math.random() * W, Math.random() * H, 1, 1)
  }

  // Rango de valores
  const todos = series.flatMap(s => s.puntos)
  const minV  = Math.floor(Math.min(...todos) * 0.85)
  const maxV  = Math.ceil( Math.max(...todos) * 1.08)
  const n     = etiquetas.length

  const px = i => padL + (i / (n - 1)) * gW
  const py = v => padT + gH - ((v - minV) / (maxV - minV)) * gH

  // Líneas de guía
  const pasos = 4
  for (let i = 0; i <= pasos; i++) {
    const v = minV + ((maxV - minV) / pasos) * i
    const y = py(v)
    ctx.beginPath()
    ctx.moveTo(padL, y)
    ctx.lineTo(padL + gW, y)
    ctx.strokeStyle = 'rgba(255,255,255,0.06)'
    ctx.lineWidth   = 1
    ctx.stroke()
    ctx.font         = '500 26px "JetBrains Mono", monospace'
    ctx.fillStyle    = 'rgba(255,255,255,0.3)'
    ctx.textAlign    = 'right'
    ctx.textBaseline = 'middle'
    ctx.fillText(Math.round(v), padL - 12, y)
  }

  // Etiquetas X
  ctx.font         = '500 26px "JetBrains Mono", monospace'
  ctx.fillStyle    = 'rgba(255,255,255,0.3)'
  ctx.textAlign    = 'center'
  ctx.textBaseline = 'top'
  etiquetas.forEach((lbl, i) => ctx.fillText(lbl, px(i), padT + gH + 16))

  // Series
  series.forEach(serie => {
    const pts = serie.puntos
    const col = serie.color
    const r = parseInt(col.slice(1,3),16)
    const g = parseInt(col.slice(3,5),16)
    const b = parseInt(col.slice(5,7),16)

    // Área
    ctx.save()
    ctx.beginPath()
    ctx.moveTo(px(0), py(pts[0]))
    for (let i = 1; i < n; i++) {
      const cpx = (px(i-1) + px(i)) / 2
      ctx.bezierCurveTo(cpx, py(pts[i-1]), cpx, py(pts[i]), px(i), py(pts[i]))
    }
    ctx.lineTo(px(n-1), padT + gH)
    ctx.lineTo(px(0),   padT + gH)
    ctx.closePath()
    const grad = ctx.createLinearGradient(0, padT, 0, padT + gH)
    grad.addColorStop(0,   `rgba(${r},${g},${b},0.25)`)
    grad.addColorStop(0.7, `rgba(${r},${g},${b},0.05)`)
    grad.addColorStop(1,   `rgba(${r},${g},${b},0)`)
    ctx.fillStyle = grad
    ctx.fill()
    ctx.restore()

    // Línea
    ctx.save()
    ctx.beginPath()
    ctx.moveTo(px(0), py(pts[0]))
    for (let i = 1; i < n; i++) {
      const cpx = (px(i-1) + px(i)) / 2
      ctx.bezierCurveTo(cpx, py(pts[i-1]), cpx, py(pts[i]), px(i), py(pts[i]))
    }
    ctx.strokeStyle = col
    ctx.lineWidth   = 3
    ctx.shadowColor = col
    ctx.shadowBlur  = 10
    ctx.stroke()
    ctx.restore()

    // Puntos
    pts.forEach((v, i) => {
      ctx.save()
      ctx.beginPath()
      ctx.arc(px(i), py(v), 5, 0, Math.PI * 2)
      ctx.fillStyle   = col
      ctx.shadowColor = col
      ctx.shadowBlur  = 14
      ctx.fill()
      ctx.beginPath()
      ctx.arc(px(i), py(v), 2.5, 0, Math.PI * 2)
      ctx.fillStyle = '#ffffff'
      ctx.shadowBlur = 0
      ctx.fill()
      ctx.restore()
    })
  })
}

// ── Dibujar header en canvas separado ────────────────────────────────────────
function dibujarHeader(canvas, titulo, subtitulo, badge, leyenda) {
  const ctx = canvas.getContext('2d')
  const W = canvas.width, H = canvas.height
  ctx.clearRect(0, 0, W, H)

  // Fondo semitransparente
  ctx.fillStyle = 'rgba(6, 12, 26, 0.0)'
  ctx.fillRect(0, 0, W, H)

  // Título
  ctx.font         = `700 52px "Syne", sans-serif`
  ctx.fillStyle    = '#ffffff'
  ctx.textAlign    = 'left'
  ctx.textBaseline = 'top'
  ctx.fillText(titulo, 0, 10)

  // Subtítulo
  ctx.font      = `400 28px "JetBrains Mono", monospace`
  ctx.fillStyle = 'rgba(255,255,255,0.45)'
  ctx.fillText(subtitulo, 0, 80)

  // Badge
  const bx = W - 280, by = 15, bw = 260, bh = 50, br = 25
  ctx.beginPath()
  ctx.roundRect(bx, by, bw, bh, br)
  ctx.fillStyle   = 'rgba(78,211,255,0.12)'
  ctx.fill()
  ctx.beginPath()
  ctx.roundRect(bx, by, bw, bh, br)
  ctx.strokeStyle = 'rgba(78,211,255,0.4)'
  ctx.lineWidth   = 2
  ctx.stroke()
  ctx.font         = `500 26px "JetBrains Mono", monospace`
  ctx.fillStyle    = '#4ED3FF'
  ctx.textAlign    = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(badge, bx + bw / 2, by + bh / 2)

  // Leyenda
  let lx = 0
  leyenda.forEach(s => {
    // Dot
    ctx.save()
    ctx.beginPath()
    ctx.arc(lx + 10, 140, 8, 0, Math.PI * 2)
    ctx.strokeStyle = s.color
    ctx.lineWidth   = 2
    ctx.stroke()
    ctx.restore()
    // Label
    ctx.font         = `400 26px "JetBrains Mono", monospace`
    ctx.fillStyle    = 'rgba(255,255,255,0.55)'
    ctx.textAlign    = 'left'
    ctx.textBaseline = 'middle'
    ctx.fillText(s.label, lx + 26, 140)
    lx += ctx.measureText(s.label).width + 60
  })
}

// ── Factory principal ─────────────────────────────────────────────────────────
export function createVentanaChart3D(scene, opciones = {}) {

  const {
    titulo     = 'Centros por partido',
    subtitulo  = 'Resumen mensual',
    badge      = '+18% vs anterior',
    series     = [
      { label: 'Este año',     color: '#4ED3FF', puntos: [15, 21, 18, 19, 26, 32] },
      { label: 'Año anterior', color: '#7BA4F5', puntos: [13, 18, 16, 17, 21, 26] },
    ],
    etiquetas  = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun'],
    posicion   = { x: -30, y: 18, z: -20 },  // posición en la escena
    rotacionY  = 0.3,                          // radianes
    anchoMundo = 55,                           // ancho en unidades 3D
    altoMundo  = 32,                           // alto en unidades 3D
    allLines   = null,
  } = opciones

  const grupo = new THREE.Group()
  grupo.position.set(posicion.x, posicion.y, posicion.z)
  grupo.rotation.y = rotacionY
  grupo.visible = false
  scene.add(grupo)

  // ── 1. Plano de vidrio base ──────────────────────────────────────────────
  const geoVidrio = new THREE.PlaneGeometry(anchoMundo, altoMundo)
  // ── Plano de vidrio — esmerilado simulado con canvas ────────────────────
  const cVidrio = document.createElement('canvas')
  cVidrio.width = 512; cVidrio.height = 512
  const ctxV = cVidrio.getContext('2d')
  ctxV.fillStyle = 'rgba(10, 20, 40, 0.45)'
  ctxV.fillRect(0, 0, 512, 512)
  ctxV.fillStyle = 'rgba(80, 140, 220, 0.08)'
  ctxV.fillRect(0, 0, 512, 512)
  for (let i = 0; i < 512 * 512 * 0.3; i++) {
    ctxV.fillStyle = `rgba(255,255,255,${Math.random() * 0.04})`
    ctxV.fillRect(Math.random() * 512, Math.random() * 512, 1, 1)
  }
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
  const meshVidrio = new THREE.Mesh(geoVidrio, matVidrio)
  meshVidrio.renderOrder = 10
  grupo.add(meshVidrio)

  // ── 2. Borde con glow ────────────────────────────────────────────────────
  // Canvas del borde
  const cBorde = document.createElement('canvas')
  cBorde.width = 1024; cBorde.height = 600
  const ctxB = cBorde.getContext('2d')
  const bw = cBorde.width, bh = cBorde.height, br = 32
  ctxB.clearRect(0, 0, bw, bh)
  // Bisel — borde asimétrico
  ctxB.beginPath(); ctxB.roundRect(4, 4, bw-8, bh-8, br)
  ctxB.save()
  ctxB.shadowColor = 'rgba(78, 211, 255, 0.5)'
  ctxB.shadowBlur  = 24
  ctxB.strokeStyle = 'rgba(255, 255, 255, 0.22)'
  ctxB.lineWidth   = 4
  ctxB.stroke()
  ctxB.restore()
  // Highlight superior
  const hlGrad = ctxB.createLinearGradient(bw*0.1, 0, bw*0.9, 0)
  hlGrad.addColorStop(0,   'rgba(255,255,255,0)')
  hlGrad.addColorStop(0.3, 'rgba(255,255,255,0.4)')
  hlGrad.addColorStop(0.5, 'rgba(255,255,255,0.6)')
  hlGrad.addColorStop(0.7, 'rgba(255,255,255,0.4)')
  hlGrad.addColorStop(1,   'rgba(255,255,255,0)')
  ctxB.beginPath()
  ctxB.moveTo(br, 4); ctxB.lineTo(bw-br, 4)
  ctxB.strokeStyle = hlGrad
  ctxB.lineWidth   = 2
  ctxB.stroke()

  const texBorde  = new THREE.CanvasTexture(cBorde)
  const matBorde  = new THREE.MeshBasicMaterial({ map: texBorde, transparent: true, depthWrite: false, side: THREE.DoubleSide })
  const meshBorde = new THREE.Mesh(new THREE.PlaneGeometry(anchoMundo, altoMundo), matBorde)
  meshBorde.position.z = 0.05
  meshBorde.renderOrder = 11
  grupo.add(meshBorde)

  // ── 3. Canvas del gráfico ────────────────────────────────────────────────
  const cGraf = document.createElement('canvas')
  cGraf.width = 1400; cGraf.height = 700
  dibujarGrafico(cGraf, series, etiquetas)

  const texGraf  = new THREE.CanvasTexture(cGraf)
  const matGraf  = new THREE.MeshBasicMaterial({ map: texGraf, transparent: true, depthWrite: false, side: THREE.DoubleSide })
  const altoGraf = altoMundo * 0.62
  const meshGraf = new THREE.Mesh(new THREE.PlaneGeometry(anchoMundo * 0.92, altoGraf), matGraf)
  meshGraf.position.set(0, -altoMundo * 0.08, 0.1)
  meshGraf.renderOrder = 12
  grupo.add(meshGraf)

  // ── 4. Canvas del header ─────────────────────────────────────────────────
  const cHead = document.createElement('canvas')
  cHead.width = 1400; cHead.height = 200
  dibujarHeader(cHead, titulo, subtitulo, badge, series)

  const texHead  = new THREE.CanvasTexture(cHead)
  const matHead  = new THREE.MeshBasicMaterial({ map: texHead, transparent: true, depthWrite: false, side: THREE.DoubleSide })
  const altoHead = altoMundo * 0.22
  const meshHead = new THREE.Mesh(new THREE.PlaneGeometry(anchoMundo * 0.92, altoHead), matHead)
  meshHead.position.set(0, altoMundo * 0.36, 0.1)
  meshHead.renderOrder = 12
  grupo.add(meshHead)

  // ── Botón ────────────────────────────────────────────────────────────────
  const btn = document.createElement('button')
  btn.textContent = 'Gráfica 3D'
  btn.className   = 'btn'
  btn.addEventListener('click', function () {
    grupo.visible = !grupo.visible
    this.classList.toggle('active', grupo.visible)
  })
  document.getElementById('cc-controls').appendChild(btn)

  // ── Botón ocultar cancha ─────────────────────────────────────────────────
  const btnCancha = document.createElement('button')
  btnCancha.textContent = 'Cancha'
  btnCancha.className   = 'btn active'
  let canchaVisible = true
  btnCancha.addEventListener('click', function () {
    canchaVisible = !canchaVisible
    const canchaGlb = scene.getObjectByName('cancha-glb')
    if (canchaGlb) canchaGlb.visible = canchaVisible
    if (allLines) allLines.forEach(m => { m.visible = canchaVisible })
    this.classList.toggle('active', canchaVisible)
  })
  document.getElementById('cc-controls').appendChild(btnCancha)

  // ── Actualizar datos ─────────────────────────────────────────────────────
  function updateDatos(nuevosDatos = {}) {
    const s = nuevosDatos.series    || series
    const e = nuevosDatos.etiquetas || etiquetas
    dibujarGrafico(cGraf, s, e)
    texGraf.needsUpdate = true
    if (nuevosDatos.titulo || nuevosDatos.subtitulo || nuevosDatos.badge) {
      dibujarHeader(
        cHead,
        nuevosDatos.titulo    || titulo,
        nuevosDatos.subtitulo || subtitulo,
        nuevosDatos.badge     || badge,
        s
      )
      texHead.needsUpdate = true
    }
  }

  return { grupo, updateDatos }
}
