// src/cancha/ventana-chart.js
// Ventana flotante con gráfico de líneas, efecto glass y bisel
// Se posiciona con CSS position:fixed y transform perspective + rotateY

export function createVentanaChart(opciones = {}) {

  const {
    titulo      = 'Centros por partido',
    subtitulo   = 'Resumen mensual',
    badge       = '+18% vs anterior',
    series      = [
      {
        label:  'Este año',
        color:  '#4ED3FF',
        puntos: [15, 21, 18, 19, 26, 32],
      },
      {
        label:  'Año anterior',
        color:  '#7BA4F5',
        puntos: [13, 18, 16, 17, 21, 26],
      },
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
        transition: opacity 0.4s ease;
      }

      .vc-wrapper.visible {
        display: block;
        opacity: 1;
      }

      .vc-card {
        position: relative;
        width: 1050px;
        padding: 28px 28px 24px;
        border-radius: 18px;
        background: rgba(6, 12, 26, 0.58);
        backdrop-filter: blur(6px);
        -webkit-backdrop-filter: blur(6px);

        /* Bisel — borde diferenciado por lado */
        border-top:    1.5px solid rgba(255, 255, 255, 0.22);
        border-left:   1.5px solid rgba(255, 255, 255, 0.18);
        border-right:  1.5px solid rgba(255, 255, 255, 0.06);
        border-bottom: 1.5px solid rgba(255, 255, 255, 0.06);

        box-shadow:
          /* grosor del canto superior */
          inset  0px  1px  0px rgba(255, 255, 255, 0.12),
          /* sombra interior inferior */
          inset  0px -1px  0px rgba(0,   0,   0,   0.3),
          /* glow azul exterior */
                 0px  0px 40px rgba(78, 211, 255, 0.06),
          /* sombra de profundidad */
                 8px 16px 48px rgba(0,   0,   0,   0.55);
      }

      /* Canto iluminado — pseudo-elemento */
      .vc-card::before {
        content: '';
        position: absolute;
        inset: 0;
        border-radius: 18px;
        background: linear-gradient(
          135deg,
          rgba(255,255,255,0.06) 0%,
          rgba(255,255,255,0.01) 40%,
          transparent 60%
        );
        pointer-events: none;
        z-index: 0;
      }

      /* Highlight en el borde superior como reflejo de luz */
      .vc-card::after {
        content: '';
        position: absolute;
        top: 0; left: 16px; right: 16px;
        height: 1px;
        background: linear-gradient(90deg,
          transparent,
          rgba(255,255,255,0.35) 30%,
          rgba(255,255,255,0.5)  50%,
          rgba(255,255,255,0.35) 70%,
          transparent
        );
        border-radius: 50%;
        pointer-events: none;
        z-index: 1;
      }

      .vc-header {
        position: relative;
        z-index: 2;
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: 4px;
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
      }

      .vc-canvas {
        display: block;
        width: 100%;
      }
    `
    document.head.appendChild(style)
  }

  // ── Crear DOM ─────────────────────────────────────────────────────────────
  const wrapper = document.createElement('div')
  wrapper.className = 'vc-wrapper'
  wrapper.style.left      = posX
  wrapper.style.top       = posY
  wrapper.style.transform = `translate(-50%, -50%) perspective(900px) rotateY(${rotacionY}deg)`

  const card = document.createElement('div')
  card.className = 'vc-card'

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
  })

  // Canvas
  const canvasWrap = document.createElement('div')
  canvasWrap.className = 'vc-canvas-wrap'
  const canvas = document.createElement('canvas')
  canvas.className = 'vc-canvas'
  canvas.width  = 925
  canvas.height = 400
  canvasWrap.appendChild(canvas)

  card.appendChild(header)
  card.appendChild(leyenda)
  card.appendChild(canvasWrap)
  wrapper.appendChild(card)
  document.body.appendChild(wrapper)

  // ── Dibujar gráfico ───────────────────────────────────────────────────────
  function dibujarGrafico() {
    const ctx  = canvas.getContext('2d')
    const W    = canvas.width
    const H    = canvas.height
    const padL = 55, padR = 20, padT = 20, padB = 44
    const gW   = W - padL - padR
    const gH   = H - padT - padB

    ctx.clearRect(0, 0, W, H)

    // Rango de valores
    const todos = series.flatMap(s => s.puntos)
    const minV  = Math.floor(Math.min(...todos) * 0.85)
    const maxV  = Math.ceil( Math.max(...todos) * 1.08)
    const n     = etiquetas.length

    // Coordenadas
    const px = i => padL + (i / (n - 1)) * gW
    const py = v => padT + gH - ((v - minV) / (maxV - minV)) * gH

    // Líneas de guía horizontales
    const pasos = 4
    for (let i = 0; i <= pasos; i++) {
      const v = minV + ((maxV - minV) / pasos) * i
      const y = py(v)
      ctx.beginPath()
      ctx.moveTo(padL, y)
      ctx.lineTo(padL + gW, y)
      ctx.strokeStyle = 'rgba(255,255,255,0.07)'
      ctx.lineWidth   = 1
      ctx.stroke()

      // Etiquetas Y
      ctx.font         = '500 22px "JetBrains Mono", monospace'
      ctx.fillStyle    = 'rgba(255,255,255,0.35)'
      ctx.textAlign    = 'right'
      ctx.textBaseline = 'middle'
      ctx.fillText(Math.round(v), padL - 10, y)
    }

    // Etiquetas X
    ctx.font         = '500 22px "JetBrains Mono", monospace'
    ctx.fillStyle    = 'rgba(255,255,255,0.35)'
    ctx.textAlign    = 'center'
    ctx.textBaseline = 'top'
    etiquetas.forEach((lbl, i) => {
      ctx.fillText(lbl, px(i), padT + gH + 14)
    })

    // Series
    series.forEach(serie => {
      const pts = serie.puntos
      const col = serie.color

      // Área rellena con gradiente
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
      const rgb  = hexToRgb(col)
      grad.addColorStop(0,   `rgba(${rgb},0.22)`)
      grad.addColorStop(0.6, `rgba(${rgb},0.06)`)
      grad.addColorStop(1,   `rgba(${rgb},0.0)`)
      ctx.fillStyle = grad
      ctx.fill()
      ctx.restore()

      // Línea
      ctx.save()
      ctx.beginPath()
      ctx.moveTo(px(0), py(pts[0]))
      for (let i = 1; i < n; i++) {
        const cpx = (px(i - 1) + px(i)) / 2
        ctx.bezierCurveTo(cpx, py(pts[i-1]), cpx, py(pts[i]), px(i), py(pts[i]))
      }
      ctx.strokeStyle = col
      ctx.lineWidth   = 2.5
      ctx.shadowColor = col
      ctx.shadowBlur  = 8
      ctx.stroke()
      ctx.restore()

      // Puntos
      pts.forEach((v, i) => {
        ctx.save()
        ctx.beginPath()
        ctx.arc(px(i), py(v), 4, 0, Math.PI * 2)
        ctx.fillStyle   = col
        ctx.shadowColor = col
        ctx.shadowBlur  = 10
        ctx.fill()
        ctx.beginPath()
        ctx.arc(px(i), py(v), 2, 0, Math.PI * 2)
        ctx.fillStyle = '#ffffff'
        ctx.shadowBlur = 0
        ctx.fill()
        ctx.restore()
      })
    })
  }

  function hexToRgb(hex) {
    const r = parseInt(hex.slice(1, 3), 16)
    const g = parseInt(hex.slice(3, 5), 16)
    const b = parseInt(hex.slice(5, 7), 16)
    return `${r},${g},${b}`
  }

  dibujarGrafico()

  // ── Botón Gráfica ─────────────────────────────────────────────────────────
  const btn = document.createElement('button')
  btn.textContent = 'Gráfica'
  btn.className   = 'btn'
  btn.addEventListener('click', function () {
    const isVisible = wrapper.style.display === 'block'
    wrapper.style.display  = isVisible ? 'none' : 'block'
    wrapper.style.opacity  = isVisible ? '0'    : '1'
    this.classList.toggle('active', !isVisible)
  })
  document.getElementById('cc-controls').appendChild(btn)

  // ── Botón Ocultar cancha ───────────────────────────────────────────────────
  const btnCancha = document.createElement('button')
  btnCancha.textContent = 'Cancha'
  btnCancha.className   = 'btn active'
  let canchaVisible = true
  btnCancha.addEventListener('click', function () {
    canchaVisible = !canchaVisible
    // Nombres de meshes del GLB y líneas de campo
    const nombresMesh = ['capa-01', 'capa-02', 'capa-03', 'franjas', 'franjas001', 'grid-10x6']
    if (opciones.scene) {
      opciones.scene.traverse(child => {
        if (child.isMesh && nombresMesh.includes(child.name)) {
          child.visible = canchaVisible
        }
      })
    }
    // Líneas CSS2D / allLines
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

  return { wrapper, updateDatos }
}
