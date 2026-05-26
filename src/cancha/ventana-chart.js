// src/cancha/ventana-chart.js
// Ventana flotante con gráfico de líneas, efecto glass y bisel.
//
// ANIMACIÓN DE ENTRADA — TIPO BLUEPRINT:
//   1. Trazado del contorno del card con SVG (stroke-dashoffset)
//   2. Fade-in del fondo del card (background blur aparece)
//   3. Aparición en cascada: título → subtítulo → badge → leyenda → líneas guía
//      → etiquetas Y → etiquetas X → curvas del gráfico (trazadas con
//      stroke-dashoffset desde 0 hasta 1) → puntos
//   4. Rotación de plano a perspectiva final (rotacionY)

import gsap from 'gsap'

export function createVentanaChart(opciones = {}) {

  const {
    titulo      = 'Centros por partido',
    subtitulo   = 'Resumen mensual',
    badge       = '+18% vs anterior',
    series      = [
      { label: 'Este año',     color: '#4ED3FF', puntos: [8,  16, 11, 19, 24, 22] },
      { label: 'Año anterior', color: '#7BA4F5', puntos: [14, 12, 18, 13, 16, 15] },
    ],
    etiquetas   = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun'],
    rotacionY   = -12,
    posX        = '50%',
    posY        = '50%',
    scene       = null,
    allLines    = null,
  } = opciones

  // ── Inyectar estilos ──────────────────────────────────────────────────────
  if (!document.getElementById('vc-styles')) {
    const style = document.createElement('style')
    style.id = 'vc-styles'
    style.textContent = `
      @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700&family=JetBrains+Mono:wght@400;500&display=swap');

      .vc-wrapper {
        position: fixed;
        z-index: 100;
        pointer-events: none;
        display: none;
        opacity: 0;
      }

      .vc-card {
        position: relative;
        width: 900px;
        padding: 28px 20px 24px 40px;
        border-radius: 18px;
        background: rgba(6, 12, 26, 0);
        backdrop-filter: blur(0px);
        -webkit-backdrop-filter: blur(0px);
        border: 1.5px solid rgba(255, 255, 255, 0);
        box-shadow: none;
      }

      .vc-card--listo {
        background: rgba(6, 12, 26, 0.58);
        backdrop-filter: blur(16px);
        -webkit-backdrop-filter: blur(16px);
        border-top:    1.5px solid rgba(255, 255, 255, 0.22);
        border-left:   1.5px solid rgba(255, 255, 255, 0.18);
        border-right:  1.5px solid rgba(255, 255, 255, 0.06);
        border-bottom: 1.5px solid rgba(255, 255, 255, 0.06);
        box-shadow:
          inset  0px  1px  0px rgba(255, 255, 255, 0.12),
          inset  0px -1px  0px rgba(0,   0,   0,   0.3),
                 0px  0px 40px rgba(78, 211, 255, 0.06),
                 8px 16px 48px rgba(0,   0,   0,   0.55);
        transition: background 0.4s ease, backdrop-filter 0.4s ease, border-color 0.4s ease, box-shadow 0.4s ease;
      }

      .vc-card::before {
        content: '';
        position: absolute;
        inset: 0;
        border-radius: 18px;
        background: linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.01) 40%, transparent 60%);
        pointer-events: none;
        z-index: 0;
        opacity: 0;
        transition: opacity 0.4s ease;
      }
      .vc-card--listo::before { opacity: 1; }

      .vc-card::after {
        content: '';
        position: absolute;
        top: 0; left: 16px; right: 16px;
        height: 1px;
        background: linear-gradient(90deg, transparent, rgba(255,255,255,0.35) 30%, rgba(255,255,255,0.5) 50%, rgba(255,255,255,0.35) 70%, transparent);
        border-radius: 50%;
        pointer-events: none;
        z-index: 1;
        opacity: 0;
        transition: opacity 0.4s ease;
      }
      .vc-card--listo::after { opacity: 1; }

      .vc-outline-svg {
        position: absolute;
        inset: -2px;
        width: calc(100% + 4px);
        height: calc(100% + 4px);
        pointer-events: none;
        z-index: 5;
        overflow: visible;
      }

      .vc-header {
        position: relative;
        z-index: 2;
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: 4px;
        padding-left:  0;
        padding-right: 0;
      }

      .vc-titulo {
        font-family: 'Syne', sans-serif;
        font-weight: 700;
        font-size: 20px;
        color: #ffffff;
        letter-spacing: -0.02em;
        line-height: 1.2;
      }

      .vc-subtitulo {
        font-family: 'JetBrains Mono', monospace;
        font-size: 11px;
        color: rgba(255,255,255,0.45);
        margin-top: 3px;
        letter-spacing: 0.03em;
      }

      .vc-badge {
        font-family: 'JetBrains Mono', monospace;
        font-size: 11px;
        font-weight: 500;
        color: #4ED3FF;
        background: rgba(78, 211, 255, 0.1);
        border: 1px solid rgba(78, 211, 255, 0.3);
        border-radius: 20px;
        padding: 4px 10px;
        white-space: nowrap;
        letter-spacing: 0.02em;
      }

      .vc-leyenda {
        position: relative;
        z-index: 2;
        display: flex;
        gap: 16px;
        margin: 14px 0 10px;
        padding-left:  0;
        padding-right: 0;
      }

      .vc-leyenda-item {
        display: flex;
        align-items: center;
        gap: 6px;
        font-family: 'JetBrains Mono', monospace;
        font-size: 11px;
        color: rgba(255,255,255,0.6);
      }

      .vc-leyenda-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        border: 1.5px solid currentColor;
      }

      .vc-canvas-wrap {
        position: relative;
        z-index: 2;
        overflow: visible;
      }

      .vc-canvas {
        display: block;
      }
    `
    document.head.appendChild(style)
  }

  // ── Crear DOM ─────────────────────────────────────────────────────────────
  const wrapper = document.createElement('div')
  wrapper.className = 'vc-wrapper'
  wrapper.style.left = posX
  wrapper.style.top  = `calc(${posY} - 48px)`
  wrapper.style.transform = 'translate(-50%, -50%) perspective(900px) rotateY(0deg) scale(0.94)'

  const card = document.createElement('div')
  card.className = 'vc-card'

  // SVG del contorno animado
  const outlineSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  outlineSvg.setAttribute('class', 'vc-outline-svg')
  outlineSvg.setAttribute('preserveAspectRatio', 'none')
  const outlinePath = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
  outlinePath.setAttribute('x', '0')
  outlinePath.setAttribute('y', '0')
  outlinePath.setAttribute('rx', '18')
  outlinePath.setAttribute('ry', '18')
  outlinePath.setAttribute('fill', 'none')
  outlinePath.setAttribute('stroke', 'rgba(78, 211, 255, 0.9)')
  outlinePath.setAttribute('stroke-width', '1.5')
  outlinePath.setAttribute('stroke-linecap', 'round')
  outlineSvg.appendChild(outlinePath)
  card.appendChild(outlineSvg)

  // Header
  const header = document.createElement('div')
  header.className = 'vc-header'

  const tituloWrap = document.createElement('div')
  const tituloEl   = document.createElement('div')
  tituloEl.className   = 'vc-titulo'
  tituloEl.textContent = titulo
  const subtituloEl    = document.createElement('div')
  subtituloEl.className   = 'vc-subtitulo'
  subtituloEl.textContent = subtitulo
  tituloWrap.appendChild(tituloEl)
  tituloWrap.appendChild(subtituloEl)

  const badgeEl = document.createElement('div')
  badgeEl.className   = 'vc-badge'
  badgeEl.textContent = badge
  header.appendChild(tituloWrap)
  header.appendChild(badgeEl)

  // Leyenda
  const leyenda = document.createElement('div')
  leyenda.className = 'vc-leyenda'
  const leyendaItems = []
  series.forEach(s => {
    const item = document.createElement('div')
    item.className = 'vc-leyenda-item'
    const dot  = document.createElement('div')
    dot.className   = 'vc-leyenda-dot'
    dot.style.color = s.color
    const lbl  = document.createElement('span')
    lbl.textContent = s.label
    item.appendChild(dot)
    item.appendChild(lbl)
    leyenda.appendChild(item)
    leyendaItems.push(item)
  })

  // Canvas
  const canvasWrap = document.createElement('div')
  canvasWrap.className = 'vc-canvas-wrap'
  const canvas = document.createElement('canvas')
  canvas.className = 'vc-canvas'
  const CANVAS_W_LOGICO = 840
  const CANVAS_H_LOGICO = 380
  const dpr = Math.min(window.devicePixelRatio || 1, 3)
  canvas.width  = CANVAS_W_LOGICO * dpr
  canvas.height = CANVAS_H_LOGICO * dpr
  canvas.style.width  = CANVAS_W_LOGICO + 'px'
  canvas.style.height = CANVAS_H_LOGICO + 'px'
  canvasWrap.appendChild(canvas)

  const ctx = canvas.getContext('2d')
  ctx.scale(dpr, dpr)
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'

  card.appendChild(header)
  card.appendChild(leyenda)
  card.appendChild(canvasWrap)
  wrapper.appendChild(card)
  document.body.appendChild(wrapper)

  // Layout
  const padL = 42, padR = 16, padT = 20, padB = 44
  const gW   = CANVAS_W_LOGICO - padL - padR
  const gH   = CANVAS_H_LOGICO - padT - padB
  const minV  = 0
  const maxV  = 30
  const n     = etiquetas.length
  const px = i => padL + (i / (n - 1)) * gW
  const py = v => padT + gH - ((v - minV) / (maxV - minV)) * gH
  const pasos = 6

  function hexToRgb(hex) {
    const r = parseInt(hex.slice(1, 3), 16)
    const g = parseInt(hex.slice(3, 5), 16)
    const b = parseInt(hex.slice(5, 7), 16)
    return `${r},${g},${b}`
  }

  function dibujarGrafico({ guias = 1, lineas = 1, relleno = 1, puntos = 1 } = {}) {
    const progGuias   = guias
    const progLineas  = lineas
    const progRelleno = relleno
    const progPuntos  = puntos

    const W = CANVAS_W_LOGICO
    const H = CANVAS_H_LOGICO
    ctx.clearRect(0, 0, W, H)

    // 1) Líneas guía + etiquetas Y
    for (let i = 0; i <= pasos; i++) {
      const v = minV + ((maxV - minV) / pasos) * i
      const y = py(v)
      const visible = i / pasos <= progGuias
      if (!visible) continue
      const alphaLine = Math.min(1, (progGuias - i / pasos) * (pasos + 1)) * 0.18
      ctx.beginPath()
      ctx.moveTo(padL, y)
      ctx.lineTo(padL + gW, y)
      ctx.strokeStyle = `rgba(255,255,255,${alphaLine})`
      ctx.lineWidth   = 1
      ctx.stroke()

      ctx.font         = '500 15px "JetBrains Mono", monospace'
      ctx.fillStyle    = `rgba(255,255,255,${0.5 * Math.min(1, alphaLine / 0.18)})`
      ctx.textAlign    = 'left'
      ctx.textBaseline = 'middle'
      ctx.fillText(Math.round(v), 0, y)
    }

    // 2) Etiquetas X
    ctx.font         = '500 15px "JetBrains Mono", monospace'
    ctx.fillStyle    = `rgba(255,255,255,${0.35 * progGuias})`
    ctx.textBaseline = 'top'
    etiquetas.forEach((lbl, i) => {
      if (i === 0) {
        ctx.textAlign = 'left'
        ctx.fillText(lbl, padL, padT + gH + 14)
      } else if (i === etiquetas.length - 1) {
        ctx.textAlign = 'right'
        ctx.fillText(lbl, padL + gW, padT + gH + 14)
      } else {
        ctx.textAlign = 'center'
        ctx.fillText(lbl, px(i), padT + gH + 14)
      }
    })

    // 3) Series
    series.forEach(serie => {
      const pts = serie.puntos
      const col = serie.color
      const rgb = hexToRgb(col)

      if (progRelleno > 0) {
        ctx.save()
        ctx.beginPath()
        ctx.moveTo(px(0), py(pts[0]))
        for (let i = 1; i < n; i++) {
          const cpx = (px(i - 1) + px(i)) / 2
          ctx.bezierCurveTo(cpx, py(pts[i-1]), cpx, py(pts[i]), px(i), py(pts[i]))
        }
        ctx.lineTo(px(n - 1), padT + gH)
        ctx.lineTo(px(0),     padT + gH)
        ctx.closePath()
        const grad = ctx.createLinearGradient(0, padT, 0, padT + gH)
        grad.addColorStop(0,   `rgba(${rgb},${0.22 * progRelleno})`)
        grad.addColorStop(0.6, `rgba(${rgb},${0.06 * progRelleno})`)
        grad.addColorStop(1,   `rgba(${rgb},0)`)
        ctx.fillStyle = grad
        ctx.fill()
        ctx.restore()
      }

      if (progLineas > 0) {
        const pathDraw = () => {
          ctx.beginPath()
          ctx.moveTo(px(0), py(pts[0]))
          for (let i = 1; i < n; i++) {
            const cpx = (px(i - 1) + px(i)) / 2
            ctx.bezierCurveTo(cpx, py(pts[i-1]), cpx, py(pts[i]), px(i), py(pts[i]))
          }
        }
        let totalLen = 0
        const SAMPLES = 20
        for (let i = 1; i < n; i++) {
          const x0 = px(i-1), y0 = py(pts[i-1])
          const x3 = px(i),   y3 = py(pts[i])
          const cpx = (x0 + x3) / 2
          let prevX = x0, prevY = y0
          for (let s = 1; s <= SAMPLES; s++) {
            const t = s / SAMPLES
            const mt = 1 - t
            const sx = mt*mt*mt*x0 + 3*mt*mt*t*cpx + 3*mt*t*t*cpx + t*t*t*x3
            const sy = mt*mt*mt*y0 + 3*mt*mt*t*y0  + 3*mt*t*t*y3  + t*t*t*y3
            const dx = sx - prevX
            const dy = sy - prevY
            totalLen += Math.sqrt(dx*dx + dy*dy)
            prevX = sx
            prevY = sy
          }
        }

        ctx.save()
        pathDraw()
        ctx.setLineDash([totalLen, totalLen])
        ctx.lineDashOffset = totalLen * (1 - progLineas)
        ctx.strokeStyle = `rgba(${rgb},0.18)`
        ctx.lineWidth   = 3
        ctx.shadowColor = col
        ctx.shadowBlur  = 5
        ctx.lineCap     = 'round'
        ctx.lineJoin    = 'round'
        ctx.stroke()
        ctx.restore()

        ctx.save()
        pathDraw()
        ctx.setLineDash([totalLen, totalLen])
        ctx.lineDashOffset = totalLen * (1 - progLineas)
        ctx.strokeStyle = col
        ctx.lineWidth   = 1.5
        ctx.shadowBlur  = 0
        ctx.lineCap     = 'round'
        ctx.lineJoin    = 'round'
        ctx.stroke()
        ctx.restore()
      }

      pts.forEach((v, i) => {
        const tPunto = i / (n - 1)
        const delta = progPuntos - tPunto
        if (delta < 0) return
        const alphaPunto = Math.min(1, delta * 20)
        if (alphaPunto <= 0) return
        ctx.save()
        ctx.globalAlpha = alphaPunto

        ctx.beginPath()
        ctx.arc(px(i), py(v), 5, 0, Math.PI * 2)
        ctx.fillStyle   = `rgba(${rgb},0.20)`
        ctx.shadowColor = col
        ctx.shadowBlur  = 6
        ctx.fill()

        ctx.beginPath()
        ctx.arc(px(i), py(v), 4, 0, Math.PI * 2)
        ctx.fillStyle  = col
        ctx.shadowBlur = 0
        ctx.fill()

        ctx.beginPath()
        ctx.arc(px(i), py(v), 2, 0, Math.PI * 2)
        ctx.fillStyle = '#ffffff'
        ctx.fill()

        ctx.restore()
      })
    })
  }

  dibujarGrafico({ guias: 0, lineas: 0, relleno: 0, puntos: 0 })

  // ── Helpers de transform ─────────────────────────────────────────────────
  const estado = { rotY: 0, scale: 0.94 }

  function setTransform(rotY, scale) {
    wrapper.style.transform =
      `translate(-50%, -50%) perspective(900px) rotateY(${rotY}deg) scale(${scale})`
  }

  function ocultarElementosInternos() {
    gsap.set([tituloEl, subtituloEl, badgeEl, ...leyendaItems], {
      opacity: 0,
      y:       8,
    })
  }
  ocultarElementosInternos()

  // ── Animación de entrada — BLUEPRINT ──────────────────────────────────────
  function animarEntrada() {
    gsap.killTweensOf([wrapper, estado, outlinePath, tituloEl, subtituloEl, badgeEl, ...leyendaItems])
    const progresos = { guias: 0, lineas: 0, relleno: 0, puntos: 0 }
    gsap.killTweensOf(progresos)

    wrapper.style.display = 'block'
    card.classList.remove('vc-card--listo')
    gsap.set(wrapper, { opacity: 0 })
    gsap.set(outlinePath, { opacity: 1 })
    estado.rotY  = 0
    estado.scale = 0.94
    setTransform(estado.rotY, estado.scale)
    ocultarElementosInternos()
    dibujarGrafico({ guias: 0, lineas: 0, relleno: 0, puntos: 0 })

    requestAnimationFrame(() => {
      const w = card.offsetWidth
      const h = card.offsetHeight
      outlineSvg.setAttribute('viewBox', `0 0 ${w} ${h}`)
      outlinePath.setAttribute('width',  w)
      outlinePath.setAttribute('height', h)
      const r = 18
      const perim = 2 * (w + h) - 8 * r + 2 * Math.PI * r
      outlinePath.style.strokeDasharray  = `${perim}`
      outlinePath.style.strokeDashoffset = `${perim}`
      outlinePath.style.filter           = 'drop-shadow(0 0 6px rgba(78,211,255,0.7))'

      const tl = gsap.timeline()

      // 1. Fade-in del wrapper + scale (plano, sin contorno aún)
      tl.to(wrapper, { opacity: 1, duration: 0.4, ease: 'power2.out' }, 0)
      tl.to(estado, {
        scale: 1, duration: 0.5, ease: 'back.out(1.2)',
        onUpdate: () => setTransform(estado.rotY, estado.scale),
      }, 0)

      // 2. Trazado del contorno
      tl.to(outlinePath.style, {
        strokeDashoffset: 0,
        duration: 1.0,
        ease: 'power2.inOut',
      }, 0.4)

      // 3. Aparece el "glass" del card
      tl.call(() => { card.classList.add('vc-card--listo') }, null, 1.2)

      // 4. Cascada: título → subtítulo → badge → leyenda
      tl.to(tituloEl,    { opacity: 1, y: 0, duration: 0.4, ease: 'power2.out' }, 1.4)
      tl.to(subtituloEl, { opacity: 1, y: 0, duration: 0.4, ease: 'power2.out' }, 1.55)
      tl.to(badgeEl,     { opacity: 1, y: 0, duration: 0.4, ease: 'power2.out' }, 1.7)
      tl.to(leyendaItems,{ opacity: 1, y: 0, duration: 0.4, ease: 'power2.out', stagger: 0.1 }, 1.85)

      // 5. Líneas guía + etiquetas
      tl.to(progresos, {
        guias: 1, duration: 1.0, ease: 'power2.out',
        onUpdate: () => dibujarGrafico(progresos),
      }, 1.6)

      // 6. Trazado de las CURVAS + puntos sincronizados
      tl.to(progresos, {
        lineas: 1, duration: 1.5, ease: 'power1.inOut',
        onUpdate: () => {
          progresos.puntos = progresos.lineas
          dibujarGrafico(progresos)
        },
      }, 2.0)

      // 7. Área rellena (gradiente)
      tl.to(progresos, {
        relleno: 1, duration: 0.9, ease: 'power2.out',
        onUpdate: () => dibujarGrafico(progresos),
      }, 3.5)

      // 8. Fade-out del outline SVG (termina la animación principal ~4.7s)
      tl.to(outlinePath, {
        opacity: 0,
        duration: 0.5,
        ease: 'power2.out',
      }, 4.2)

      // 9. Rotación a perspectiva final — DESPUÉS de la animación de entrada.
      //    El card está de frente todo este tiempo y ahora rota suavemente
      //    a su pose final con perspectiva (rotacionY = -12 por default).
      //    Arranca en 4.8s (justo después del fade-out del outline) y dura
      //    1.4s con ease 'power3.inOut' para que se sienta deliberado.
      tl.to(estado, {
        rotY: rotacionY,
        duration: 1.4,
        ease: 'power3.inOut',
        onUpdate: () => setTransform(estado.rotY, estado.scale),
      }, 4.8)
    })

    return null
  }

  // ── Animación de salida ─────────────────────────────────────────────────
  function animarSalida() {
    gsap.killTweensOf([wrapper, estado])
    const tl = gsap.timeline({
      onComplete: () => { wrapper.style.display = 'none' },
    })
    // Primero vuelve a plano (sin perspectiva) antes de desvanecerse
    tl.to(estado, {
      rotY: 0, duration: 0.5, ease: 'power2.in',
      onUpdate: () => setTransform(estado.rotY, estado.scale),
    }, 0)
    tl.to(wrapper, { opacity: 0, duration: 0.4, ease: 'power2.in' }, 0.3)
    return tl
  }

  // ── Botón Gráfica ─────────────────────────────────────────────────────────
  const btn = document.createElement('button')
  btn.textContent = 'Gráfica'
  btn.className   = 'btn'
  let visible = false
  btn.addEventListener('click', function () {
    visible = !visible
    if (visible) {
      animarEntrada()
    } else {
      animarSalida()
    }
    this.classList.toggle('active', visible)
  })
  document.getElementById('cc-controls').appendChild(btn)

  // ── Botón Ocultar cancha ───────────────────────────────────────────────────
  const btnCancha = document.createElement('button')
  btnCancha.textContent = 'Cancha'
  btnCancha.className   = 'btn active'
  let canchaVisible = true
  btnCancha.addEventListener('click', function () {
    canchaVisible = !canchaVisible
    const nombresMesh = ['capa-01', 'capa-02', 'capa-03', 'franjas', 'franjas001', 'grid-10x6']
    if (opciones.scene) {
      opciones.scene.traverse(child => {
        if (child.isMesh && nombresMesh.includes(child.name)) {
          child.visible = canchaVisible
        }
      })
    }
    if (opciones.allLines) {
      opciones.allLines.forEach(m => { m.visible = canchaVisible })
    }
    this.classList.toggle('active', canchaVisible)
  })
  document.getElementById('cc-controls').appendChild(btnCancha)

  // ── API pública ───────────────────────────────────────────────────────────
  function updateDatos(nuevosDatos) {
    if (nuevosDatos.titulo)    tituloEl.textContent    = nuevosDatos.titulo
    if (nuevosDatos.subtitulo) subtituloEl.textContent = nuevosDatos.subtitulo
    if (nuevosDatos.badge)     badgeEl.textContent     = nuevosDatos.badge
    dibujarGrafico()
  }

  return { wrapper, updateDatos, animarEntrada, animarSalida }
}