// src/cancha/hud-insight-chart.js

import * as THREE from 'three'
import gsap from 'gsap'

/**
 * Crea un componente HUD Insight Chart: tarjeta rectangular con un número
 * hero arriba, una gráfica de línea suave abajo con área shaded, líneas guía
 * horizontales, etiquetas de meses, y un tooltip flotante destacando un punto
 * de interés. Conector horizontal sale por la izquierda hacia un punto 3D.
 *
 * EL "destacado" SOPORTA ÍNDICES FRACCIONALES:
 *   destacado: { indice: 3 }       → exactamente sobre el punto Sep
 *   destacado: { indice: 2.5 }     → punto medio entre Aug y Sep
 *   destacado: { indice: 2.65 }    → 65% del camino entre Aug y Sep
 *
 *   Cuando el índice es fraccional, X y Y se interpolan a lo largo de la
 *   curva (aproximación lineal entre los dos puntos vecinos). El tooltip
 *   y el dot siguen al punto durante toda la animación de crecimiento.
 */
export function createHudInsightChart({
  scene,
  camera,
  anchor3D = { x: 0, y: 0, z: 0 },

  // Hero
  valor = 121,
  etiqueta = 'finalizaciones',

  // Datos de la gráfica
  serie = [
    { label: 'Jun', valor: 12 },
    { label: 'Jul', valor: 28 },
    { label: 'Aug', valor: 35 },
    { label: 'Sep', valor: 121 },
  ],

  // Punto destacado (tooltip + dot). null para ocultarlo.
  // `indice` puede ser fraccional para colocarlo entre dos puntos.
  destacado = {
    indice: 2.65,   // entre Aug (2) y Sep (3) — 65% del camino hacia Sep
    label: '+80%',
  },

  color = '#00f0ff',
  valorColor = '#ffffff',
  etiquetaColor = '#9EA5B2',

  cardWidth = 340,
  cardHeight = 295,
  offsetX = 126,
  offsetY = 0,
  // Desplazamiento del punto donde aterriza el conector respecto al anchor3D
  // proyectado. Hay dos modos:
  //
  // (A) Modo "píxeles fijos" — anchorOffsetX/Y se interpretan literalmente
  //     como píxeles. Útil para anclas estáticas sin tamaño visual.
  //
  // (B) Modo "proporcional al ancla" — si anchorRadius3D > 0, los offsets se
  //     interpretan como FRACCIONES del radio del ancla en pantalla. Esto se
  //     adapta automáticamente al zoom/perspectiva de la cámara, perfecto
  //     para anclar el conector al borde de un círculo de jugador.
  //
  //     Ejemplo: anchorOffsetX: 1.0 → conector aterriza en el borde derecho
  //              del círculo del jugador independientemente del zoom.
  //              anchorOffsetY: -0.5 → 50% del radio arriba del centro.
  anchorOffsetX = 0,
  anchorOffsetY = 0,
  anchorRadius3D = 0,    // radio del ancla en unidades 3D (0 = modo píxeles fijos)
  countDuration = 1.2,
  chartDuration = 1.6,

  container = document.body,
} = {}) {

  // ---------------------------------------------------------------------------
  // 1. Inyectar estilos (una sola vez)
  // ---------------------------------------------------------------------------
  const STYLE_ID = 'hud-insight-chart-styles'
  if (!document.getElementById(STYLE_ID)) {
    const style = document.createElement('style')
    style.id = STYLE_ID
    style.textContent = `
      .hud-insight-c {
        position: fixed;
        z-index: 9998;
        pointer-events: none;
        opacity: 0;
      }
      .hud-insight-c__card {
        position: relative;
        background: rgba(5, 8, 14, 0);
        box-shadow: 0px 10.1834px 40.7337px rgba(3, 2, 4, 0);
        backdrop-filter: blur(0px);
        -webkit-backdrop-filter: blur(0px);
        border-radius: 15px;
        padding: 40px 32px 24px 32px;
        transform-origin: center center;
        will-change: transform, background-color, box-shadow, backdrop-filter;
        overflow: hidden;
        transition:
          background-color 0.45s ease-out,
          box-shadow      0.45s ease-out,
          backdrop-filter 0.45s ease-out,
          -webkit-backdrop-filter 0.45s ease-out;
        display: flex;
        flex-direction: column;
        box-sizing: border-box;
      }
      .hud-insight-c__card--filled {
        background: rgba(5, 8, 14, 0.55);
        box-shadow: 0px 10.1834px 40.7337px rgba(3, 2, 4, 0.37);
        backdrop-filter: blur(15px);
        -webkit-backdrop-filter: blur(15px);
      }

      /* Glow decorativo en esquina superior derecha (mismo del insight-card vertical) */
      .hud-insight-c__glow {
        position: absolute;
        width: 162.93px;
        height: 162.93px;
        right: -50.63px;
        top: -49.64px;
        background: rgba(37, 159, 235, 0.1);
        filter: blur(25.4585px);
        border-radius: 50%;
        z-index: 0;
        pointer-events: none;
        opacity: 0;
      }

      /* Borde animado */
      .hud-insight-c__border-svg {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        z-index: 3;
      }
      .hud-insight-c__border-rect {
        fill: none;
        stroke: rgba(0, 221, 255, 0.7);
        stroke-width: 1.4;
      }

      /* Header: número + label + ícono */
      .hud-insight-c__header {
        display: flex;
        align-items: flex-end;
        gap: 24px;
        position: relative;
        z-index: 1;
      }
      .hud-insight-c__number {
        font-family: 'Poppins', system-ui, sans-serif;
        font-weight: 400;
        font-size: 48px;
        color: var(--hi-valor-color);
        letter-spacing: -0.02em;
        line-height: 1;
        font-variant-numeric: tabular-nums;
      }
      .hud-insight-c__label {
        font-family: 'Poppins', system-ui, sans-serif;
        font-weight: 600;
        font-size: 15px;
        color: var(--hi-etiqueta-color);
        margin-bottom: 7px;
        flex: 1;
      }
      .hud-insight-c__icon {
        position: absolute;
        top: 20px;
        right: 20px;
        width: 44px;
        height: 44px;
        border-radius: 14.1019px;
        background: rgba(98, 182, 255, 0.1);
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .hud-insight-c__icon svg {
        width: 22px;
        height: 15px;
      }
      .hud-insight-c__icon svg path {
        fill: var(--hi-color);
      }

      /* Chart container */
      .hud-insight-c__chart {
        position: relative;
        flex: 1;
        margin-top: 17px;
        z-index: 1;
      }
      .hud-insight-c__chart svg {
        display: block;
        width: 100%;
        height: 100%;
        overflow: visible;
      }

      /* Líneas guía horizontales */
      .hud-insight-c__guide {
        stroke: rgba(158, 165, 178, 0.5);
        stroke-width: 1.4;
        stroke-dasharray: 4 6;
      }

      /* Path de la línea de la gráfica */
      .hud-insight-c__line {
        fill: none;
        stroke: var(--hi-color);
        stroke-width: 2.5;
        stroke-linecap: round;
        stroke-linejoin: round;
        filter: drop-shadow(0 0 6px var(--hi-glow-outer));
      }

      /* Área shaded debajo de la línea */
      .hud-insight-c__area {
        fill: url(#hud-insight-c-area-gradient);
        opacity: 0.6;
      }

      /* Etiquetas de meses */
      .hud-insight-c__month-label {
        font-family: 'Poppins', system-ui, sans-serif;
        font-style: normal;
        font-weight: 400;
        font-size: 22px;
        fill: var(--hi-etiqueta-color);
        text-anchor: middle;
        font-family: 'Poppins';
        color: #70737B;
      }

      /* Tooltip del punto destacado */
      .hud-insight-c__tooltip {
        position: absolute;
        padding: 5px 8px;
        background: rgba(5, 8, 14, 0.85);
        border: 1.8px solid rgba(0, 221, 255, 0.5);
        border-radius: 8px;
        font-family: 'Poppins', system-ui, sans-serif;
        font-weight: 500;
        font-size: 11px;
        color: #ffffff;
        white-space: nowrap;
        transform: translate(-50%, -130%);
        pointer-events: none;
      }
      .hud-insight-c__dot {
        position: absolute;
        width: 7px;
        height: 7px;
        border-radius: 50%;
        border: 2px solid var(--hi-color);
        background: rgba(5, 8, 14, 0.9);
        transform: translate(-50%, -50%);
        box-shadow:
          0 0 8px var(--hi-color),
          0 0 16px var(--hi-glow-outer);
        pointer-events: none;
      }

      /* Connector horizontal saliendo por la izquierda */
      .hud-insight-c__connector {
        position: absolute;
        top: 50%;
        right: 100%;
        height: 1.5px;
        background: linear-gradient(
          90deg,
          var(--hi-color) 0%,
          var(--hi-color) 100%
        );
        box-shadow: 0 0 6px var(--hi-glow-outer);
        opacity: 0;
        transform-origin: left center;
      }
      .hud-insight-c__connector-dot {
        position: absolute;
        top: 50%;
        left: -4px;
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: var(--hi-color);
        box-shadow:
          0 0 8px var(--hi-color),
          0 0 16px var(--hi-glow-outer);
      }
    `
    document.head.appendChild(style)
  }

  // ---------------------------------------------------------------------------
  // 2. Construir DOM
  // ---------------------------------------------------------------------------
  const SVG_NS = 'http://www.w3.org/2000/svg'

  const el = document.createElement('div')
  el.className = 'hud-insight-c'

  el.style.setProperty('--hi-color', color)
  el.style.setProperty('--hi-glow-outer', hexToRgba(color, 0.45))
  el.style.setProperty('--hi-valor-color', valorColor)
  el.style.setProperty('--hi-etiqueta-color', etiquetaColor)

  // Card
  const cardEl = document.createElement('div')
  cardEl.className = 'hud-insight-c__card'
  cardEl.style.width  = `${cardWidth}px`
  cardEl.style.height = `${cardHeight}px`

  // SVG del borde animado
  const borderSvg = document.createElementNS(SVG_NS, 'svg')
  borderSvg.setAttribute('class', 'hud-insight-c__border-svg')
  borderSvg.setAttribute('preserveAspectRatio', 'none')

  const borderPath = document.createElementNS(SVG_NS, 'path')
  borderPath.setAttribute('class', 'hud-insight-c__border-rect')
  borderSvg.appendChild(borderPath)
  cardEl.appendChild(borderSvg)

  // Glow decorativo (esquina superior derecha)
  const glowEl = document.createElement('div')
  glowEl.className = 'hud-insight-c__glow'
  cardEl.appendChild(glowEl)

  // Header: número + label + ícono
  const headerEl = document.createElement('div')
  headerEl.className = 'hud-insight-c__header'

  const numberEl = document.createElement('div')
  numberEl.className = 'hud-insight-c__number'
  numberEl.textContent = '0'

  const labelEl = document.createElement('div')
  labelEl.className = 'hud-insight-c__label'
  labelEl.textContent = etiqueta

  const iconEl = document.createElement('div')
  iconEl.className = 'hud-insight-c__icon'
  iconEl.innerHTML = `
    <svg viewBox="0 0 35 23" preserveAspectRatio="xMidYMid meet">
      <path d="M2.57065 22.2793L0 19.7086L12.8533 6.85537L19.7083 13.7105L31.8761 0.000298083L34.2754 2.39957L19.7083 18.8518L12.8533 11.9967L2.57065 22.2793Z" />
    </svg>
  `

  headerEl.appendChild(numberEl)
  headerEl.appendChild(labelEl)
  cardEl.appendChild(headerEl)
  cardEl.appendChild(iconEl)

  // Chart container
  const chartEl = document.createElement('div')
  chartEl.className = 'hud-insight-c__chart'

  const chartSvg = document.createElementNS(SVG_NS, 'svg')
  chartSvg.setAttribute('preserveAspectRatio', 'none')

  // Defs con el gradient del área shaded
  const defs = document.createElementNS(SVG_NS, 'defs')
  const areaGrad = document.createElementNS(SVG_NS, 'linearGradient')
  areaGrad.setAttribute('id', 'hud-insight-c-area-gradient')
  areaGrad.setAttribute('x1', '0%')
  areaGrad.setAttribute('y1', '0%')
  areaGrad.setAttribute('x2', '0%')
  areaGrad.setAttribute('y2', '100%')

  const stopA1 = document.createElementNS(SVG_NS, 'stop')
  stopA1.setAttribute('offset', '0%')
  stopA1.setAttribute('stop-color', color)
  stopA1.setAttribute('stop-opacity', '0.4')

  const stopA2 = document.createElementNS(SVG_NS, 'stop')
  stopA2.setAttribute('offset', '100%')
  stopA2.setAttribute('stop-color', color)
  stopA2.setAttribute('stop-opacity', '0')

  areaGrad.appendChild(stopA1)
  areaGrad.appendChild(stopA2)
  defs.appendChild(areaGrad)
  chartSvg.appendChild(defs)

  // Grupos para organizar capas (orden de pintado: el último encima)
  const guidesGroup = document.createElementNS(SVG_NS, 'g')   // [1] líneas guía
  const areaPath    = document.createElementNS(SVG_NS, 'path')// [2] área shaded
  const linePath    = document.createElementNS(SVG_NS, 'path')// [3] línea
  const monthsGroup = document.createElementNS(SVG_NS, 'g')   // [4] etiquetas

  areaPath.setAttribute('class', 'hud-insight-c__area')
  linePath.setAttribute('class', 'hud-insight-c__line')

  chartSvg.appendChild(guidesGroup)
  chartSvg.appendChild(areaPath)
  chartSvg.appendChild(linePath)
  chartSvg.appendChild(monthsGroup)
  chartEl.appendChild(chartSvg)

  // Tooltip + dot del punto destacado (HTML absolutos sobre el chart)
  const tooltipEl = document.createElement('div')
  tooltipEl.className = 'hud-insight-c__tooltip'
  if (destacado) tooltipEl.textContent = destacado.label

  const dotEl = document.createElement('div')
  dotEl.className = 'hud-insight-c__dot'

  chartEl.appendChild(tooltipEl)
  chartEl.appendChild(dotEl)

  cardEl.appendChild(chartEl)

  // Connector (línea + dot) — vive en el WRAPPER, no en el card
  const connectorEl = document.createElement('div')
  connectorEl.className = 'hud-insight-c__connector'

  const connectorDotEl = document.createElement('div')
  connectorDotEl.className = 'hud-insight-c__connector-dot'
  connectorEl.appendChild(connectorDotEl)

  el.appendChild(cardEl)
  el.appendChild(connectorEl)
  container.appendChild(el)

  // ─── Estado inicial defensivo (antes del primer show) ──────────────────────
  gsap.set(connectorDotEl, { yPercent: -50, scale: 0 })
  gsap.set(connectorEl,    { yPercent: -50, opacity: 0, scaleX: 0 })

  // ---------------------------------------------------------------------------
  // 3. Estado interno
  // ---------------------------------------------------------------------------
  const state = {
    visible: false,
    anchor3D: new THREE.Vector3(anchor3D.x, anchor3D.y, anchor3D.z),
    masterTimeline: null,
    borderPerimeter: 0,
    valoresActuales: serie.map(() => 0),
    valoresTarget: serie.map(s => Number(s.valor) || 0),
  }

  const _projVec = new THREE.Vector3()
  const _projVec2 = new THREE.Vector3()   // para medir el radio del ancla en pantalla

  // ---------------------------------------------------------------------------
  // 4. Proyección 3D → pantalla
  // ---------------------------------------------------------------------------
  function updateProjection() {
    if (!state.visible) return

    _projVec.copy(state.anchor3D)
    _projVec.project(camera)

    if (_projVec.z > 1) {
      el.style.visibility = 'hidden'
      return
    }
    el.style.visibility = ''

    const w = window.innerWidth
    const h = window.innerHeight

    // Coordenadas en pantalla del centro del ancla 3D
    const anchorScreenX = (_projVec.x * 0.5 + 0.5) * w
    const anchorScreenY = (-_projVec.y * 0.5 + 0.5) * h

    // Si el ancla tiene un radio 3D (ej. el círculo de un jugador), proyectamos
    // un segundo punto desplazado por ese radio para medir su tamaño REAL en
    // píxeles en pantalla. Así los offsets se adaptan al zoom y perspectiva
    // de la cámara automáticamente (en vista plana el círculo es chico, en
    // vista cercana es grande, los offsets siempre quedan en el mismo lugar
    // relativo al círculo).
    let anchorRadiusPx = 1   // por defecto 1px (modo "píxeles fijos")
    if (anchorRadius3D > 0) {
      _projVec2.copy(state.anchor3D)
      _projVec2.x += anchorRadius3D
      _projVec2.project(camera)
      const edgeScreenX = (_projVec2.x * 0.5 + 0.5) * w
      anchorRadiusPx = Math.abs(edgeScreenX - anchorScreenX)
    }

    // Punto efectivo donde aterriza el conector (offsets proporcionales al radio
    // del jugador en pantalla, así el conector siempre toca el mismo punto
    // relativo del círculo independientemente del zoom).
    const screenX = anchorScreenX + anchorOffsetX * anchorRadiusPx
    const screenY = anchorScreenY + anchorOffsetY * anchorRadiusPx

    const cardRect = cardEl.getBoundingClientRect()
    const cardHeightReal = cardRect.height

    // offsetX/Y del card son píxeles fijos (no escalan con el zoom)
    const cardLeft = screenX + offsetX
    const cardTop  = screenY - cardHeightReal / 2 + offsetY

    el.style.left = `${cardLeft}px`
    el.style.top  = `${cardTop}px`

    const connectorWidth = Math.max(0, cardLeft - screenX)
    connectorEl.style.width = `${connectorWidth}px`
  }

  // ---------------------------------------------------------------------------
  // 5. Setup del borde SVG
  // ---------------------------------------------------------------------------
  function setupBorderSvg() {
    const cardRect = cardEl.getBoundingClientRect()
    const w = cardRect.width
    const h = cardRect.height

    if (w === 0 || h === 0) return

    const sw = 1.4
    const half = sw / 2
    const r = 15

    borderSvg.setAttribute('viewBox', `0 0 ${w} ${h}`)

    const x0 = half
    const y0 = h / 2
    const yTop = half + r
    const xLeftCorner = half + r
    const xRight = w - half
    const xRightCorner = xRight - r
    const yBot = h - half
    const yBotCorner = yBot - r

    const d = [
      `M ${x0} ${y0}`,
      `L ${x0} ${yTop}`,
      `a ${r} ${r} 0 0 1 ${r} ${-r}`,
      `L ${xRightCorner} ${half}`,
      `a ${r} ${r} 0 0 1 ${r} ${r}`,
      `L ${xRight} ${yBotCorner}`,
      `a ${r} ${r} 0 0 1 ${-r} ${r}`,
      `L ${xLeftCorner} ${yBot}`,
      `a ${r} ${r} 0 0 1 ${-r} ${-r}`,
      `L ${x0} ${y0}`,
    ].join(' ')

    borderPath.setAttribute('d', d)

    const perim = borderPath.getTotalLength()
    state.borderPerimeter = perim

    borderPath.style.strokeDasharray  = `${perim}`
    borderPath.style.strokeDashoffset = `${perim}`
  }

  // ---------------------------------------------------------------------------
  // 6. Setup y render del chart
  // ---------------------------------------------------------------------------
  const CHART_W = 1000
  const CHART_H = 280
  const PAD_TOP = 20
  const PAD_BOT = 60
  const PAD_LR  = 0
  const PLOT_H  = CHART_H - PAD_TOP - PAD_BOT
  const N_GUIDES = 4

  function setupChartSvg() {
    chartSvg.setAttribute('viewBox', `0 0 ${CHART_W} ${CHART_H}`)

    guidesGroup.innerHTML = ''
    for (let i = 0; i < N_GUIDES; i++) {
      const y = PAD_TOP + (PLOT_H / (N_GUIDES - 1)) * i
      const line = document.createElementNS(SVG_NS, 'line')
      line.setAttribute('class', 'hud-insight-c__guide')
      line.setAttribute('x1', PAD_LR)
      line.setAttribute('y1', y)
      line.setAttribute('x2', CHART_W - PAD_LR)
      line.setAttribute('y2', y)
      line.setAttribute('opacity', '0')
      guidesGroup.appendChild(line)
    }

    monthsGroup.innerHTML = ''
    const n = serie.length
    for (let i = 0; i < n; i++) {
      const x = xForIndex(i)
      const text = document.createElementNS(SVG_NS, 'text')
      text.setAttribute('class', 'hud-insight-c__month-label')
      text.setAttribute('x', x)
      text.setAttribute('y', CHART_H - 8)
      text.setAttribute('opacity', '0')
      text.textContent = serie[i].label
      monthsGroup.appendChild(text)
    }

    renderChartPaths()
  }

  function xForIndex(i) {
    const n = serie.length
    if (n === 1) return CHART_W / 2
    return PAD_LR + (CHART_W - PAD_LR * 2) * (i / (n - 1))
  }

  function yForValor(v) {
    const maxTarget = Math.max(1, ...state.valoresTarget)
    const ratio = v / maxTarget
    return PAD_TOP + PLOT_H * (1 - ratio)
  }

  // Interpola un valor dado un índice fraccional (ej. 2.65 → entre punto 2 y 3)
  function valorEnIndice(indiceFraccional) {
    const n = state.valoresActuales.length
    if (n === 0) return 0
    if (indiceFraccional <= 0) return state.valoresActuales[0]
    if (indiceFraccional >= n - 1) return state.valoresActuales[n - 1]
    const i = Math.floor(indiceFraccional)
    const t = indiceFraccional - i
    return state.valoresActuales[i] * (1 - t) + state.valoresActuales[i + 1] * t
  }

  function buildSmoothPath(points) {
    if (points.length < 2) return ''
    const tension = 0.5
    let d = `M ${points[0].x} ${points[0].y}`
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i - 1] || points[i]
      const p1 = points[i]
      const p2 = points[i + 1]
      const p3 = points[i + 2] || p2
      const c1x = p1.x + ((p2.x - p0.x) / 6) * tension
      const c1y = p1.y + ((p2.y - p0.y) / 6) * tension
      const c2x = p2.x - ((p3.x - p1.x) / 6) * tension
      const c2y = p2.y - ((p3.y - p1.y) / 6) * tension
      d += ` C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p2.x} ${p2.y}`
    }
    return d
  }

  function renderChartPaths() {
    const points = state.valoresActuales.map((v, i) => ({
      x: xForIndex(i),
      y: yForValor(v),
    }))

    const lineD = buildSmoothPath(points)
    linePath.setAttribute('d', lineD)

    const yBaseline = PAD_TOP + PLOT_H
    const last = points[points.length - 1]
    const first = points[0]
    const areaD = lineD + ` L ${last.x} ${yBaseline} L ${first.x} ${yBaseline} Z`
    areaPath.setAttribute('d', areaD)

    // ─── Posición del tooltip + dot (con soporte para índice fraccional) ──
    if (destacado && destacado.indice != null) {
      const n = state.valoresActuales.length
      // Clamp del índice fraccional al rango válido [0, n-1]
      const idx = Math.max(0, Math.min(n - 1, destacado.indice))

      // X interpolada entre puntos vecinos (siempre lineal en X)
      const i = Math.floor(idx)
      const t = idx - i

      let px, py
      if (t === 0 || i >= n - 1) {
        // Sobre un punto exacto
        px = points[i].x
        py = points[i].y
      } else {
        // Entre dos puntos: interpolación lineal de X
        px = points[i].x * (1 - t) + points[i + 1].x * t
        // Y se calcula a partir del valor interpolado
        // (no se interpola linealmente entre puntos.y porque la curva
        // es suave; mejor evaluar la curva en el valor actual)
        const valorInterp = valorEnIndice(idx)
        py = yForValor(valorInterp)
      }

      // Convertir coordenadas viewBox a porcentaje del contenedor
      const xPct = (px / CHART_W) * 100
      const yPct = (py / CHART_H) * 100
      tooltipEl.style.left = `${xPct}%`
      tooltipEl.style.top  = `${yPct}%`
      dotEl.style.left = `${xPct}%`
      dotEl.style.top  = `${yPct}%`
    }
  }

  // ---------------------------------------------------------------------------
  // 7. API: show / hide / setValor / setSerie / setAnchor
  // ---------------------------------------------------------------------------
  async function show() {
    if (state.visible) return
    state.visible = true

    if (state.masterTimeline) state.masterTimeline.kill()

    el.style.opacity = '1'
    updateProjection()

    await new Promise(r => requestAnimationFrame(r))
    setupBorderSvg()
    setupChartSvg()

    cardEl.classList.remove('hud-insight-c__card--filled')

    state.valoresActuales = serie.map(() => 0)
    renderChartPaths()
    numberEl.textContent = '0'

    gsap.set(connectorDotEl, { yPercent: -50, scale: 0 })
    gsap.set(connectorEl,    { yPercent: -50, opacity: 0, scaleX: 0 })
    gsap.set(borderPath,     { strokeDashoffset: state.borderPerimeter })
    gsap.set(headerEl,       { opacity: 0 })
    gsap.set(numberEl,       { opacity: 0 })
    gsap.set(labelEl,        { opacity: 0, x: -8 })
    gsap.set(iconEl,         { opacity: 0, scale: 0.8 })
    gsap.set(glowEl,         { opacity: 0 })
    gsap.set(linePath,       { opacity: 0 })
    gsap.set(areaPath,       { opacity: 0 })
    gsap.set(guidesGroup.children, { opacity: 0 })
    gsap.set(monthsGroup.children, { opacity: 0, y: 4 })
    gsap.set(tooltipEl,      { opacity: 0, scale: 0.85 })
    gsap.set(dotEl,          { opacity: 0, scale: 0 })

    const tl = gsap.timeline()
    state.masterTimeline = tl

    tl.to(connectorDotEl, {
      scale: 1,
      duration: 0.25,
      ease: 'back.out(2.5)',
    }, 0)

    const connectorWidth = parseFloat(connectorEl.style.width) || 100
    const totalTraceLength = connectorWidth + state.borderPerimeter
    const totalTraceDuration = 1.4
    const connectorDuration = totalTraceDuration * (connectorWidth / totalTraceLength)
    const borderDuration    = totalTraceDuration * (state.borderPerimeter / totalTraceLength)

    tl.to(connectorEl, {
      opacity: 1,
      scaleX: 1,
      duration: connectorDuration,
      ease: 'none',
    }, 0.15)

    tl.to(borderPath, {
      strokeDashoffset: 0,
      duration: borderDuration,
      ease: 'none',
    }, 0.15 + connectorDuration)

    const fillStart = 0.15 + totalTraceDuration
    tl.add(() => {
      cardEl.classList.add('hud-insight-c__card--filled')
    }, fillStart)

    // [fillStart + 0.05s] Aparece el glow decorativo (esquina superior derecha)
    tl.to(glowEl, {
      opacity: 1,
      duration: 0.5,
      ease: 'power2.out',
    }, fillStart + 0.05)

    tl.to(headerEl, {
      opacity: 1,
      duration: 0.3,
      ease: 'power2.out',
    }, fillStart + 0.05)

    tl.to(numberEl, {
      opacity: 1,
      duration: 0.3,
      ease: 'power2.out',
    }, fillStart + 0.10)

    const counterObj = { v: 0 }
    tl.to(counterObj, {
      v: Number(valor) || 0,
      duration: countDuration,
      ease: 'power2.out',
      onUpdate: () => {
        numberEl.textContent = String(Math.round(counterObj.v))
      },
      onComplete: () => {
        numberEl.textContent = String(Math.round(Number(valor) || 0))
      },
    }, fillStart + 0.10)

    tl.to(labelEl, {
      opacity: 1,
      x: 0,
      duration: 0.45,
      ease: 'power2.out',
    }, fillStart + 0.25)

    tl.to(iconEl, {
      opacity: 1,
      scale: 1,
      duration: 0.4,
      ease: 'back.out(2)',
    }, fillStart + 0.30)

    tl.to(guidesGroup.children, {
      opacity: 1,
      duration: 0.3,
      stagger: 0.05,
      ease: 'power2.out',
    }, fillStart + 0.50)

    tl.to(monthsGroup.children, {
      opacity: 1,
      y: 0,
      duration: 0.4,
      stagger: 0.06,
      ease: 'power2.out',
    }, fillStart + 0.60)

    tl.to([linePath, areaPath], {
      opacity: 1,
      duration: 0.3,
      ease: 'power2.out',
    }, fillStart + 0.70)

    tl.to(state.valoresActuales, {
      ...Object.fromEntries(state.valoresTarget.map((v, i) => [i, v])),
      duration: chartDuration,
      ease: 'power2.out',
      onUpdate: renderChartPaths,
    }, fillStart + 0.75)

    if (destacado) {
      tl.to([tooltipEl, dotEl], {
        opacity: 1,
        scale: 1,
        duration: 0.4,
        stagger: 0.06,
        ease: 'back.out(2)',
      }, fillStart + 0.75 + chartDuration * 0.85)
    }
  }

  function hide() {
    if (!state.visible) return
    state.visible = false

    if (state.masterTimeline) state.masterTimeline.kill()

    const tl = gsap.timeline({
      onComplete: () => {
        cardEl.classList.remove('hud-insight-c__card--filled')
        el.style.opacity = '0'
      },
    })
    state.masterTimeline = tl

    // [0.00s] Glow decorativo se desvanece
    tl.to(glowEl, {
      opacity: 0,
      duration: 0.25,
      ease: 'power2.in',
    }, 0)

    if (destacado) {
      tl.to([tooltipEl, dotEl], {
        opacity: 0,
        scale: 0.85,
        duration: 0.2,
        stagger: 0.04,
        ease: 'power2.in',
      }, 0)
    }

    tl.to(state.valoresActuales, {
      ...Object.fromEntries(state.valoresTarget.map((v, i) => [i, 0])),
      duration: 0.5,
      ease: 'power2.in',
      onUpdate: renderChartPaths,
    }, 0.10)

    tl.to([linePath, areaPath], {
      opacity: 0,
      duration: 0.3,
      ease: 'power2.in',
    }, 0.20)

    tl.to(monthsGroup.children, {
      opacity: 0,
      duration: 0.2,
      stagger: 0.03,
      ease: 'power2.in',
    }, 0.20)

    tl.to(guidesGroup.children, {
      opacity: 0,
      duration: 0.2,
      stagger: 0.02,
      ease: 'power2.in',
    }, 0.25)

    tl.to([numberEl, labelEl, iconEl], {
      opacity: 0,
      duration: 0.2,
      stagger: 0.04,
      ease: 'power2.in',
    }, 0.30)

    tl.add(() => {
      cardEl.classList.remove('hud-insight-c__card--filled')
    }, 0.55)

    tl.to(borderPath, {
      strokeDashoffset: state.borderPerimeter,
      duration: 0.55,
      ease: 'power2.inOut',
    }, 1.05)

    tl.to(connectorEl, {
      opacity: 0,
      scaleX: 0,
      duration: 0.35,
      ease: 'power2.in',
    }, 1.65)

    tl.to(connectorDotEl, {
      scale: 0,
      duration: 0.2,
      ease: 'power2.in',
    }, 1.95)
  }

  function setValor(nuevoValor) {
    const target = Number(nuevoValor)
    if (!state.visible) {
      numberEl.textContent = String(Math.round(target))
      return
    }
    const obj = { v: Number(numberEl.textContent) || 0 }
    gsap.to(obj, {
      v: target,
      duration: countDuration * 0.7,
      ease: 'power2.out',
      onUpdate: () => {
        numberEl.textContent = String(Math.round(obj.v))
      },
    })
  }

  function setEtiqueta(nueva) {
    labelEl.textContent = String(nueva)
  }

  function setSerie(nuevaSerie) {
    serie = nuevaSerie
    state.valoresTarget = nuevaSerie.map(s => Number(s.valor) || 0)
    if (state.visible) {
      gsap.to(state.valoresActuales, {
        ...Object.fromEntries(state.valoresTarget.map((v, i) => [i, v])),
        duration: chartDuration * 0.7,
        ease: 'power2.out',
        onUpdate: renderChartPaths,
      })
      setupChartSvg()
    } else {
      state.valoresActuales = nuevaSerie.map(() => 0)
    }
  }

  function setDestacado(d) {
    destacado = d
    if (destacado) {
      tooltipEl.textContent = destacado.label
      tooltipEl.style.display = ''
      dotEl.style.display = ''
    } else {
      tooltipEl.style.display = 'none'
      dotEl.style.display = 'none'
    }
    renderChartPaths()
  }

  function setAnchor(xyz) {
    state.anchor3D.set(xyz.x, xyz.y, xyz.z)
  }

  function destroy() {
    if (state.masterTimeline) state.masterTimeline.kill()
    gsap.killTweensOf([
      el, cardEl, connectorEl, connectorDotEl,
      borderPath, headerEl, numberEl, labelEl, iconEl, glowEl,
      linePath, areaPath, tooltipEl, dotEl,
      state.valoresActuales,
      ...guidesGroup.children, ...monthsGroup.children,
    ])
    if (el.parentNode) el.parentNode.removeChild(el)
  }

  function tick() {
    updateProjection()
  }

  return {
    el,
    tick,
    show,
    hide,
    setValor,
    setEtiqueta,
    setSerie,
    setDestacado,
    setAnchor,
    destroy,
  }
}

// =============================================================================
// Helpers
// =============================================================================
function hexToRgba(hex, alpha = 1) {
  let h = hex.replace('#', '')
  if (h.length === 3) h = h.split('').map(c => c + c).join('')
  const r = parseInt(h.substring(0, 2), 16)
  const g = parseInt(h.substring(2, 4), 16)
  const b = parseInt(h.substring(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}