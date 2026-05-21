// src/cancha/hud-insight-range.js

import * as THREE from 'three'
import gsap from 'gsap'

/**
 * HUD Insight Range: tarjeta vertical con un ring decorativo grande arriba,
 * un valor en forma de RANGO ("45-60") en su centro, un subtítulo monoespaciado
 * debajo, y un badge inferior con borde cyan ("pico de actividad").
 *
 * Conector horizontal sale por la IZQUIERDA hacia un punto 3D.
 *
 * Hereda la estética de hud-insight-horizontal (ring decorativo, gradient,
 * marcas radiales, círculo punteado) y de hud-insight-chart (layout, animación
 * de trazo continuo, glow decorativo en esquina superior derecha).
 *
 * Diferencias clave:
 *   - Layout vertical (no horizontal)
 *   - El valor es un RANGO (rangoMin → rangoMax) con count up secuencial:
 *     primero anima 0→min, luego 0→max
 *   - Ring puramente decorativo (no acepta "valor", solo se dibuja una vez)
 *   - Badge inferior configurable
 *
 * ANIMACIÓN DE ENTRADA (~3 segundos):
 *   1. Connector dot aparece
 *   2. Trazo continuo: conector → borde del card (sin pausa)
 *   3. Fondo del card aparece + glow decorativo
 *   4. Ring del gradient se dibuja + círculo punteado + marcas radiales
 *   5. Label "Minutos" arriba del rango
 *   6. Count up secuencial: primero 0→rangoMin, luego 0→rangoMax
 *   7. Subtítulo "Segunda parte"
 *   8. Badge "pico de actividad" (pop al final)
 */
export function createHudInsightRange({
  scene,
  camera,
  anchor3D = { x: 0, y: 0, z: 0 },

  // Valor central: es un RANGO (no un número simple)
  rangoMin = 45,
  rangoMax = 60,
  unidad = 'Minutos',         // label pequeño arriba del rango

  // Textos
  titulo = 'Segunda parte',
  badge = 'pico de actividad',

  color = '#00f0ff',
  valorColor = '#ffffff',
  etiquetaColor = '#9EA5B2',

  // Layout
  cardWidth = 340,
  cardHeight = 460,
  offsetX = 90,
  offsetY = 0,
  anchorOffsetX = 0,
  anchorOffsetY = 0,
  anchorRadius3D = 0,

  // Animaciones
  countDuration = 0.7,        // duración de cada paso del count up del rango

  container = document.body,
} = {}) {

  // ---------------------------------------------------------------------------
  // 1. Inyectar estilos
  // ---------------------------------------------------------------------------
  const STYLE_ID = 'hud-insight-range-styles'
  if (!document.getElementById(STYLE_ID)) {
    const style = document.createElement('style')
    style.id = STYLE_ID
    style.textContent = `
      .hud-insight-r {
        position: fixed;
        z-index: 9998;
        pointer-events: none;
        opacity: 0;
      }
      .hud-insight-r__card {
        position: relative;
        background: rgba(5, 8, 14, 0);
        box-shadow: 0px 10.1834px 40.7337px rgba(3, 2, 4, 0);
        backdrop-filter: blur(0px);
        -webkit-backdrop-filter: blur(0px);
        border-radius: 25px;
        padding: 40px 32px 36px 32px;
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
        align-items: center;
        box-sizing: border-box;
      }
      .hud-insight-r__card--filled {
        background: rgba(5, 8, 14, 0.55);
        box-shadow: 0px 10.1834px 40.7337px rgba(3, 2, 4, 0.37);
        backdrop-filter: blur(15px);
        -webkit-backdrop-filter: blur(15px);
      }

      /* Glow decorativo en esquina superior derecha */
      .hud-insight-r__glow {
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
      .hud-insight-r__border-svg {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        z-index: 3;
      }
      .hud-insight-r__border-rect {
        fill: none;
        stroke: rgba(0, 221, 255, 0.7);
        stroke-width: 1.4;
      }
      /* Pulso de "energía" que recorre el borde. Es un path completo brillante
         al que se le aplica una <mask> SVG con gradient radial móvil: la máscara
         es una elipse difusa (blanca al centro, transparente en los bordes) que
         se mueve por el path. Solo se ve la porción de trazo bajo la máscara. */
      .hud-insight-r__border-pulse {
        fill: none;
        stroke: #00DDFF;
        stroke-width: 2.0;
        stroke-linecap: round;
        opacity: 0;
        filter:
          drop-shadow(0 0 3px #00DDFF)
          drop-shadow(0 0 8px #00DDFF)
          drop-shadow(0 0 18px rgba(0, 221, 255, 0.7))
          drop-shadow(0 0 32px rgba(0, 221, 255, 0.5));
        pointer-events: none;
      }

      /* Ring container (mismo del horizontal pero centrado en lugar de a la izquierda) */
      .hud-insight-r__ring-wrap {
        position: relative;
        width: 240px;
        height: 240px;
        flex-shrink: 0;
        z-index: 1;
      }
      .hud-insight-r__ring-wrap svg {
        display: block;
        width: 100%;
        height: 100%;
        overflow: visible;
      }
      /* Círculo punteado exterior */
      .hud-insight-r__ring-track {
        fill: none;
        stroke: var(--hi-color);
        stroke-width: 1;
        opacity: 0.35;
      }
      /* Ring del gradient (decorativo, completo) */
      .hud-insight-r__ring-progress {
        fill: none;
        stroke: url(#hud-insight-r-ring-gradient);
        stroke-width: 4;
        stroke-linecap: butt;
        filter: drop-shadow(0 0 6px var(--hi-glow-outer));
      }
      /* Marcas radiales (8 distribuidas detrás del ring) */
      .hud-insight-r__ring-ticks {
        opacity: 0;
      }
      .hud-insight-r__ring-tick {
        stroke: var(--hi-color);
        stroke-width: 2;
        stroke-linecap: round;
        opacity: 0.25;
      }

      /* Contenido dentro del ring (label + rango) */
      .hud-insight-r__ring-content {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 4px;
        opacity: 0;
        pointer-events: none;
      }
      .hud-insight-r__unidad {
        font-family: 'Poppins', system-ui, sans-serif;
        font-style: normal;
        font-weight: 400;
        font-size: 18px;
        color: var(--hi-etiqueta-color);
        line-height: 1;
        margin-bottom: 8px;
      }
      .hud-insight-r__rango {
        font-family: 'Poppins', system-ui, sans-serif;
        font-weight: 400;
        font-size: 52px;
        color: var(--hi-valor-color);
        letter-spacing: -0.02em;
        line-height: 1;
        font-variant-numeric: tabular-nums;
        display: flex;
        align-items: center;
      }
      .hud-insight-r__rango-sep {
        opacity: 0.85;
        margin: 0 2px;
      }

      /* Título debajo del ring */
      .hud-insight-r__titulo {
        margin-top: 56px;
        font-family: 'JetBrains Mono', 'Courier New', monospace;
        font-weight: 400;
        font-size: 18px;
        color: var(--hi-etiqueta-color);
        text-align: center;
        position: relative;
        z-index: 1;
      }

      /* Badge inferior con border cyan */
      .hud-insight-r__badge {
        margin-top: 20px;
        padding: 8px 18px;
        background: transparent;
        border: 1.5px solid rgba(0, 221, 255, 0.55);
        border-radius: 12px;
        font-family: 'Poppins', system-ui, sans-serif;
        font-weight: 500;
        font-size: 16px;
        color: var(--hi-color);
        text-align: center;
        position: relative;
        z-index: 1;
        white-space: nowrap;
      }

      /* Connector horizontal */
      .hud-insight-r__connector {
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
      .hud-insight-r__connector-dot {
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
  el.className = 'hud-insight-r'
  el.style.setProperty('--hi-color', color)
  el.style.setProperty('--hi-glow-outer', hexToRgba(color, 0.45))
  el.style.setProperty('--hi-valor-color', valorColor)
  el.style.setProperty('--hi-etiqueta-color', etiquetaColor)

  const cardEl = document.createElement('div')
  cardEl.className = 'hud-insight-r__card'
  cardEl.style.width  = `${cardWidth}px`
  cardEl.style.height = `${cardHeight}px`

  // SVG del borde
  const borderSvg = document.createElementNS(SVG_NS, 'svg')
  borderSvg.setAttribute('class', 'hud-insight-r__border-svg')
  borderSvg.setAttribute('preserveAspectRatio', 'none')
  const borderPath = document.createElementNS(SVG_NS, 'path')
  borderPath.setAttribute('class', 'hud-insight-r__border-rect')
  borderSvg.appendChild(borderPath)

  // Pulso de "energía" — un único path completo con stroke brillante, al que
  // aplicamos una máscara SVG con gradient RADIAL móvil. La máscara es un
  // círculo difuso (blanco al centro, transparente en los bordes) que se
  // desplaza por las coordenadas del path usando getPointAtLength(). Resultado:
  // solo se ve la porción del trazo que está bajo la máscara, con fade natural.
  // Mucho más limpio que múltiples segmentos.

  // Defs con la máscara
  const borderDefs = document.createElementNS(SVG_NS, 'defs')
  const pulseMaskId = `hud-insight-r-pulse-mask-${Math.random().toString(36).slice(2, 9)}`
  const pulseMask = document.createElementNS(SVG_NS, 'mask')
  pulseMask.setAttribute('id', pulseMaskId)
  pulseMask.setAttribute('maskUnits', 'userSpaceOnUse')
  // Gradient radial dentro de la máscara: blanco (visible) al centro, negro (invisible) afuera
  const pulseMaskGrad = document.createElementNS(SVG_NS, 'radialGradient')
  const maskGradId = `hud-insight-r-pulse-mask-grad-${Math.random().toString(36).slice(2, 9)}`
  pulseMaskGrad.setAttribute('id', maskGradId)
  pulseMaskGrad.setAttribute('cx', '50%')
  pulseMaskGrad.setAttribute('cy', '50%')
  pulseMaskGrad.setAttribute('r', '50%')
  const mStop1 = document.createElementNS(SVG_NS, 'stop')
  mStop1.setAttribute('offset', '0%')
  mStop1.setAttribute('stop-color', 'white')
  mStop1.setAttribute('stop-opacity', '1')
  const mStop2 = document.createElementNS(SVG_NS, 'stop')
  mStop2.setAttribute('offset', '50%')
  mStop2.setAttribute('stop-color', 'white')
  mStop2.setAttribute('stop-opacity', '0.6')
  const mStop3 = document.createElementNS(SVG_NS, 'stop')
  mStop3.setAttribute('offset', '100%')
  mStop3.setAttribute('stop-color', 'white')
  mStop3.setAttribute('stop-opacity', '0')
  pulseMaskGrad.appendChild(mStop1)
  pulseMaskGrad.appendChild(mStop2)
  pulseMaskGrad.appendChild(mStop3)
  borderDefs.appendChild(pulseMaskGrad)

  // Elipse que actúa como la "linterna" móvil dentro de la máscara
  const pulseMaskCircle = document.createElementNS(SVG_NS, 'ellipse')
  pulseMaskCircle.setAttribute('cx', '0')
  pulseMaskCircle.setAttribute('cy', '0')
  pulseMaskCircle.setAttribute('rx', '0')
  pulseMaskCircle.setAttribute('ry', '0')
  pulseMaskCircle.setAttribute('fill', `url(#${maskGradId})`)
  pulseMask.appendChild(pulseMaskCircle)
  borderDefs.appendChild(pulseMask)
  borderSvg.appendChild(borderDefs)

  // Path del pulso (un solo elemento) — stroke continuo brillante, recortado
  // por la máscara para que solo se vea donde está la "linterna".
  const borderPulse = document.createElementNS(SVG_NS, 'path')
  borderPulse.setAttribute('class', 'hud-insight-r__border-pulse')
  borderPulse.setAttribute('mask', `url(#${pulseMaskId})`)
  borderSvg.appendChild(borderPulse)
  cardEl.appendChild(borderSvg)

  // Glow decorativo
  const glowEl = document.createElement('div')
  glowEl.className = 'hud-insight-r__glow'
  cardEl.appendChild(glowEl)

  // Ring wrap (con SVG interno)
  const ringWrapEl = document.createElement('div')
  ringWrapEl.className = 'hud-insight-r__ring-wrap'

  const ringSvg = document.createElementNS(SVG_NS, 'svg')

  // ─── Geometría del ring ────────────────────────────────────────────────
  const ringSize       = 240   // tamaño visual del wrap
  const svgPadding     = 16    // padding extra para que el punteado no se corte
  const svgViewSize    = ringSize + svgPadding * 2
  const ringCx         = svgViewSize / 2
  const ringCy         = svgViewSize / 2
  const ringRadius     = (ringSize / 2) - 12   // radio del ring del gradient
  const trackRadius    = ringRadius + 16       // radio del círculo punteado exterior
  const tickInnerR     = ringRadius + 4        // radio interior de las marcas
  const tickOuterR     = ringRadius + 14       // radio exterior de las marcas
  const NUM_TICKS      = 8                     // 8 marcas radiales

  ringSvg.setAttribute('viewBox', `0 0 ${svgViewSize} ${svgViewSize}`)
  ringSvg.style.overflow = 'visible'
  ringSvg.style.marginLeft = `-${svgPadding}px`
  ringSvg.style.marginTop  = `-${svgPadding}px`
  ringSvg.style.width = `${svgViewSize}px`
  ringSvg.style.height = `${svgViewSize}px`

  // Defs con gradient del ring
  const ringDefs = document.createElementNS(SVG_NS, 'defs')
  const ringGrad = document.createElementNS(SVG_NS, 'linearGradient')
  ringGrad.setAttribute('id', 'hud-insight-r-ring-gradient')
  // El <circle> del ring tiene transform="rotate(-90 cx cy)" para que el trazo
  // empiece arriba (en lugar de a la derecha que es el default). Esto rota el
  // sistema local del elemento, y aunque usemos gradientUnits="userSpaceOnUse",
  // el transform del elemento SÍ se aplica también al gradient.
  //
  // Por eso, para que el degradado se vea visualmente de SUP-IZQ (brillante)
  // a INF-DER (oscuro), tenemos que apuntar el gradient en LA DIAGONAL OPUESTA
  // en el sistema LOCAL (pre-rotación):
  //
  //   Después de rotate(-90), local (cx+r, cy-r) [sup-der]  → visual sup-izq
  //   Después de rotate(-90), local (cx-r, cy+r) [inf-izq]  → visual inf-der
  //
  // Así el 0% (brillante) acaba en la sup-izq visual y el 100% (oscuro) en la inf-der.
  ringGrad.setAttribute('gradientUnits', 'userSpaceOnUse')
  ringGrad.setAttribute('x1', String(ringCx + ringRadius))   // sup-der local → sup-izq visual
  ringGrad.setAttribute('y1', String(ringCy - ringRadius))
  ringGrad.setAttribute('x2', String(ringCx - ringRadius))   // inf-izq local → inf-der visual
  ringGrad.setAttribute('y2', String(ringCy + ringRadius))

  // Stops: cyan brillante (sup-izq) → cyan medio → cyan oscuro (inf-der)
  const cBright = color
  const cMid    = mixHexColors(color, '#0a3050', 0.55)
  const cDark   = mixHexColors(color, '#020a14', 0.85)

  const sg1 = document.createElementNS(SVG_NS, 'stop')
  sg1.setAttribute('offset', '0%')
  sg1.setAttribute('stop-color', cBright)
  const sg2 = document.createElementNS(SVG_NS, 'stop')
  sg2.setAttribute('offset', '50%')
  sg2.setAttribute('stop-color', cMid)
  const sg3 = document.createElementNS(SVG_NS, 'stop')
  sg3.setAttribute('offset', '100%')
  sg3.setAttribute('stop-color', cDark)
  ringGrad.appendChild(sg1)
  ringGrad.appendChild(sg2)
  ringGrad.appendChild(sg3)
  ringDefs.appendChild(ringGrad)
  ringSvg.appendChild(ringDefs)

  // Marcas radiales (8) — se calculan ángulos cada 360/8 = 45°
  const ticksGroup = document.createElementNS(SVG_NS, 'g')
  ticksGroup.setAttribute('class', 'hud-insight-r__ring-ticks')
  for (let i = 0; i < NUM_TICKS; i++) {
    const angle = (i * (2 * Math.PI) / NUM_TICKS) - Math.PI / 2  // empieza arriba
    const x1 = ringCx + tickInnerR * Math.cos(angle)
    const y1 = ringCy + tickInnerR * Math.sin(angle)
    const x2 = ringCx + tickOuterR * Math.cos(angle)
    const y2 = ringCy + tickOuterR * Math.sin(angle)
    const tick = document.createElementNS(SVG_NS, 'line')
    tick.setAttribute('class', 'hud-insight-r__ring-tick')
    tick.setAttribute('x1', x1)
    tick.setAttribute('y1', y1)
    tick.setAttribute('x2', x2)
    tick.setAttribute('y2', y2)
    ticksGroup.appendChild(tick)
  }
  ringSvg.appendChild(ticksGroup)

  // Círculo punteado exterior (dasharray calculado para cerrar exacto)
  const trackCircumference = 2 * Math.PI * trackRadius
  const segCount    = Math.round(trackCircumference / 6)
  const segLen      = trackCircumference / segCount
  const segDashLen  = segLen / 3
  const segGapLen   = segLen - segDashLen

  const ringTrack = document.createElementNS(SVG_NS, 'circle')
  ringTrack.setAttribute('class', 'hud-insight-r__ring-track')
  ringTrack.setAttribute('cx', ringCx)
  ringTrack.setAttribute('cy', ringCy)
  ringTrack.setAttribute('r', trackRadius)
  ringTrack.style.strokeDasharray = `${segDashLen} ${segGapLen}`
  ringSvg.appendChild(ringTrack)

  // Ring del gradient (completo, decorativo). Lo dibujamos con stroke-dasharray
  // para poder animar su "trazado" pero al final queda completo.
  const ringCircumference = 2 * Math.PI * ringRadius
  const ringProgress = document.createElementNS(SVG_NS, 'circle')
  ringProgress.setAttribute('class', 'hud-insight-r__ring-progress')
  ringProgress.setAttribute('cx', ringCx)
  ringProgress.setAttribute('cy', ringCy)
  ringProgress.setAttribute('r', ringRadius)
  ringProgress.setAttribute('transform', `rotate(-90 ${ringCx} ${ringCy})`)
  ringProgress.style.strokeDasharray  = `${ringCircumference}`
  ringProgress.style.strokeDashoffset = `${ringCircumference}`
  ringSvg.appendChild(ringProgress)

  ringWrapEl.appendChild(ringSvg)

  // Contenido del ring (label + rango)
  const ringContentEl = document.createElement('div')
  ringContentEl.className = 'hud-insight-r__ring-content'

  const unidadEl = document.createElement('div')
  unidadEl.className = 'hud-insight-r__unidad'
  unidadEl.textContent = unidad

  const rangoEl = document.createElement('div')
  rangoEl.className = 'hud-insight-r__rango'

  const rangoMinEl = document.createElement('span')
  rangoMinEl.className = 'hud-insight-r__rango-min'
  rangoMinEl.textContent = '0'

  const rangoSepEl = document.createElement('span')
  rangoSepEl.className = 'hud-insight-r__rango-sep'
  rangoSepEl.textContent = '-'

  const rangoMaxEl = document.createElement('span')
  rangoMaxEl.className = 'hud-insight-r__rango-max'
  rangoMaxEl.textContent = '0'

  rangoEl.appendChild(rangoMinEl)
  rangoEl.appendChild(rangoSepEl)
  rangoEl.appendChild(rangoMaxEl)

  ringContentEl.appendChild(unidadEl)
  ringContentEl.appendChild(rangoEl)
  ringWrapEl.appendChild(ringContentEl)

  cardEl.appendChild(ringWrapEl)

  // Título debajo del ring
  const tituloEl = document.createElement('div')
  tituloEl.className = 'hud-insight-r__titulo'
  tituloEl.textContent = titulo
  cardEl.appendChild(tituloEl)

  // Badge inferior
  const badgeEl = document.createElement('div')
  badgeEl.className = 'hud-insight-r__badge'
  badgeEl.textContent = badge || ''
  if (badge == null) badgeEl.style.display = 'none'
  cardEl.appendChild(badgeEl)

  // Connector
  const connectorEl = document.createElement('div')
  connectorEl.className = 'hud-insight-r__connector'
  const connectorDotEl = document.createElement('div')
  connectorDotEl.className = 'hud-insight-r__connector-dot'
  connectorEl.appendChild(connectorDotEl)

  el.appendChild(cardEl)
  el.appendChild(connectorEl)
  container.appendChild(el)

  // Estado inicial defensivo
  gsap.set(connectorDotEl, { yPercent: -50, scale: 0 })
  gsap.set(connectorEl,    { yPercent: -50, opacity: 0, scaleX: 0 })

  // ---------------------------------------------------------------------------
  // 3. Estado
  // ---------------------------------------------------------------------------
  const state = {
    visible: false,
    anchor3D: new THREE.Vector3(anchor3D.x, anchor3D.y, anchor3D.z),
    masterTimeline: null,
    pulseTimeline: null,    // loop infinito del pulso del borde
    borderPerimeter: 0,
    ringCircumference,
    targetMin: Number(rangoMin) || 0,
    targetMax: Number(rangoMax) || 0,
  }
  const _projVec = new THREE.Vector3()
  const _projVec2 = new THREE.Vector3()

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
    const anchorScreenX = (_projVec.x * 0.5 + 0.5) * w
    const anchorScreenY = (-_projVec.y * 0.5 + 0.5) * h

    let anchorRadiusPx = 1
    if (anchorRadius3D > 0) {
      _projVec2.copy(state.anchor3D)
      _projVec2.x += anchorRadius3D
      _projVec2.project(camera)
      const edgeScreenX = (_projVec2.x * 0.5 + 0.5) * w
      anchorRadiusPx = Math.abs(edgeScreenX - anchorScreenX)
    }

    const screenX = anchorScreenX + anchorOffsetX * anchorRadiusPx
    const screenY = anchorScreenY + anchorOffsetY * anchorRadiusPx

    const cardRect = cardEl.getBoundingClientRect()
    const cardHeightReal = cardRect.height

    const cardLeft = screenX + offsetX
    const cardTop  = screenY - cardHeightReal / 2 + offsetY

    el.style.left = `${cardLeft}px`
    el.style.top  = `${cardTop}px`

    const connectorWidth = Math.max(0, cardLeft - screenX)
    connectorEl.style.width = `${connectorWidth}px`
  }

  // ---------------------------------------------------------------------------
  // 5. Setup del borde SVG (path arranca en lado izq, media altura)
  // ---------------------------------------------------------------------------
  function setupBorderSvg() {
    const cardRect = cardEl.getBoundingClientRect()
    const w = cardRect.width
    const h = cardRect.height
    if (w === 0 || h === 0) return

    const sw = 1.4
    const half = sw / 2
    const r = 25

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
    borderPulse.setAttribute('d', d)
    const perim = borderPath.getTotalLength()
    state.borderPerimeter = perim
    borderPath.style.strokeDasharray  = `${perim}`
    borderPath.style.strokeDashoffset = `${perim}`
  }

  // ---------------------------------------------------------------------------
  // 5b. Pulso del borde: porción brillante (controlada por una máscara radial
  //     móvil) que recorre todo el perímetro con VELOCIDAD UNIFORME. Se repite
  //     cada ~10 segundos.
  // ---------------------------------------------------------------------------
  function startBorderPulse() {
    if (state.pulseTimeline) state.pulseTimeline.kill()
    state._pulseStopped = false

    const perim = state.borderPerimeter || 0
    if (perim === 0) return

    // Dimensiones BASE de la "linterna" elíptica. La hacemos alargada (rx > ry)
    // para que actúe como una estela orientada en la dirección del movimiento.
    // En cada frame: rx se mantiene cerca de este valor con pulsación leve, y
    // el ángulo se calcula a partir de la tangente del path.
    const baseRx = 55    // largo del haz (dirección del movimiento)
    const baseRy = 35    // ancho del haz (perpendicular)

    // Estado inicial de la máscara y del path
    gsap.set(borderPulse, { opacity: 0 })
    gsap.set(pulseMaskCircle, {
      attr: { rx: baseRx, ry: baseRy, cx: -1000, cy: -1000 },
    })

    // Helper que dispara UN ciclo del pulso. Cada ciclo crea su propia
    // timeline con valores levemente variados (microvariaciones), y al
    // terminar llama recursivamente para el siguiente disparo.
    const runOneCycle = () => {
      if (state._pulseStopped) return

      // ──── Microvariaciones aleatorias por ciclo ────────────────────────
      // Cada vuelta tiene timing ligeramente distinto (±10%) para que no
      // se sienta robótico. También variamos el delay entre disparos.
      const r = () => 0.95 + Math.random() * 0.10   // factor 0.95..1.05
      const runDuration   = 1.50 * r()             // ~1.42..1.58s
      const fadeInDuration  = 0.30 * r()
      const fadeOutDuration = 0.55                 // duración del fade-out
      // Umbral: cuando progress.len/perim cruza este valor, dispara el fade-out.
      // 0.85 = se empieza a apagar al entrar en la última recta vertical
      // (después de la curva inf-izq, en la subida final hacia el inicio).
      const fadeOutTriggerProgress = 0.85
      const interCycleDelay = 8.5 * r()            // ~8.07..8.93s

      const progress = { len: 0 }

      const tl = gsap.timeline({
        onComplete: () => {
          progress.len = 0
          pulseMaskCircle.setAttribute('cx', '-1000')
          pulseMaskCircle.setAttribute('cy', '-1000')
          // Programar el siguiente ciclo después de la pausa
          gsap.delayedCall(interCycleDelay, runOneCycle)
        },
      })
      state.pulseTimeline = tl

      // Fade-in
      tl.fromTo(borderPulse, {
        opacity: 0,
      }, {
        opacity: 1,
        duration: fadeInDuration,
        ease: 'power2.out',
      }, 0)

      // ──── Recorrido UNIFORME ──────────────────────────────────────────
      //
      // Animamos directamente `progress.len` con easing 'none' para que
      // la velocidad sea constante a lo largo de todo el perímetro. No
      // hay modulación local — el haz avanza al mismo ritmo sin importar
      // si está subiendo, en horizontal o bajando.

      let fadeOutFired = false

      tl.to(progress, {
        len: perim,
        duration: runDuration,
        ease: 'none',
        onUpdate: () => {
          const len = Math.min(progress.len, perim - 0.01)

          // Dispara el fade-out cuando entra en la ÚLTIMA recta vertical
          // (después de la curva inf-izq, subiendo hacia el inicio).
          if (!fadeOutFired && len / perim >= fadeOutTriggerProgress) {
            fadeOutFired = true
            gsap.to(borderPulse, {
              opacity: 0,
              duration: fadeOutDuration,
              ease: 'power2.in',
            })
          }

          // ──── Render ──────────────────────────────────────────────────
          const pt = borderPath.getPointAtLength(len)
          const ptAhead = borderPath.getPointAtLength(
            (len + 1.5) % perim
          )
          const dx = ptAhead.x - pt.x
          const dy = ptAhead.y - pt.y
          const angleDeg = Math.atan2(dy, dx) * 180 / Math.PI

          // Pulsación sutil del tamaño (sine wave durante el recorrido)
          const tlProgress = tl.progress()
          const pulse = 1 + Math.sin(tlProgress * Math.PI * 6) * 0.08
          const currentRx = baseRx * pulse
          const currentRy = baseRy * pulse

          pulseMaskCircle.setAttribute('cx', pt.x)
          pulseMaskCircle.setAttribute('cy', pt.y)
          pulseMaskCircle.setAttribute('rx', currentRx)
          pulseMaskCircle.setAttribute('ry', currentRy)
          pulseMaskCircle.setAttribute(
            'transform',
            `rotate(${angleDeg} ${pt.x} ${pt.y})`
          )
        },
      }, 0)

      // Reset al final del ciclo
      tl.add(() => {
        progress.len = 0
        pulseMaskCircle.setAttribute('cx', '-1000')
        pulseMaskCircle.setAttribute('cy', '-1000')
      }, runDuration)
    }

    // Disparar el primer ciclo
    runOneCycle()
  }

  function stopBorderPulse() {
    state._pulseStopped = true
    if (state.pulseTimeline) {
      state.pulseTimeline.kill()
      state.pulseTimeline = null
    }
    // Cancelar todos los delayedCall pendientes del próximo ciclo.
    // (El flag _pulseStopped también previene que runOneCycle ejecute si
    //  el delayedCall ya estaba en cola).
    gsap.killTweensOf(state)
    gsap.set(borderPulse, { opacity: 0 })
    pulseMaskCircle.setAttribute('cx', '-1000')
    pulseMaskCircle.setAttribute('cy', '-1000')
  }

  // ---------------------------------------------------------------------------
  // 6. show / hide
  // ---------------------------------------------------------------------------
  async function show() {
    if (state.visible) return
    state.visible = true

    if (state.masterTimeline) state.masterTimeline.kill()

    el.style.opacity = '1'
    updateProjection()

    await new Promise(r => requestAnimationFrame(r))
    setupBorderSvg()

    cardEl.classList.remove('hud-insight-r__card--filled')

    // Reset
    rangoMinEl.textContent = '0'
    rangoMaxEl.textContent = '0'

    gsap.set(connectorDotEl, { yPercent: -50, scale: 0 })
    gsap.set(connectorEl,    { yPercent: -50, opacity: 0, scaleX: 0 })
    gsap.set(borderPath,     { strokeDashoffset: state.borderPerimeter })
    gsap.set(ringProgress,   { strokeDashoffset: state.ringCircumference })
    gsap.set(ringTrack,      { opacity: 0 })
    gsap.set(ticksGroup,     { opacity: 0 })
    gsap.set(ticksGroup.children, { scale: 0.5, transformOrigin: '50% 50%' })
    gsap.set(ringContentEl,  { opacity: 0 })
    gsap.set(unidadEl,       { opacity: 0, y: 4 })
    gsap.set(rangoEl,        { opacity: 0 })
    gsap.set(tituloEl,       { opacity: 0, y: 6 })
    gsap.set(badgeEl,        { opacity: 0, scale: 0.85 })
    gsap.set(glowEl,         { opacity: 0 })

    const tl = gsap.timeline({
      onComplete: () => {
        // Arrancar el loop del pulso brillante del borde cada ~3.5s
        startBorderPulse()
      },
    })
    state.masterTimeline = tl

    // [0.00s] Connector dot
    tl.to(connectorDotEl, {
      scale: 1,
      duration: 0.25,
      ease: 'back.out(2.5)',
    }, 0)

    // ─── Trazo continuo conector + borde ────────────────────────────────
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

    // [~1.55s] Fondo del card
    const fillStart = 0.15 + totalTraceDuration
    tl.add(() => {
      cardEl.classList.add('hud-insight-r__card--filled')
    }, fillStart)

    // [fillStart + 0.05s] Glow decorativo
    tl.to(glowEl, {
      opacity: 1,
      duration: 0.5,
      ease: 'power2.out',
    }, fillStart + 0.05)

    // [fillStart + 0.10s] Marcas radiales aparecen (grupo + pop de cada tick)
    tl.to(ticksGroup, {
      opacity: 1,
      duration: 0.4,
      ease: 'power2.out',
    }, fillStart + 0.10)

    tl.to(ticksGroup.children, {
      scale: 1,
      duration: 0.35,
      stagger: 0.04,
      ease: 'back.out(2)',
    }, fillStart + 0.10)

    // [fillStart + 0.10s] Círculo punteado exterior fade-in
    tl.to(ringTrack, {
      opacity: 0.35,
      duration: 0.5,
      ease: 'power2.out',
    }, fillStart + 0.10)

    // [fillStart + 0.10s] Ring del gradient se dibuja completo (decorativo)
    tl.to(ringProgress, {
      strokeDashoffset: 0,
      duration: 0.9,
      ease: 'power2.out',
    }, fillStart + 0.10)

    // [fillStart + 0.20s] Contenido del ring aparece
    tl.to(ringContentEl, {
      opacity: 1,
      duration: 0.35,
      ease: 'power2.out',
    }, fillStart + 0.20)

    // [fillStart + 0.25s] Label "Minutos"
    tl.to(unidadEl, {
      opacity: 1,
      y: 0,
      duration: 0.35,
      ease: 'power2.out',
    }, fillStart + 0.25)

    // [fillStart + 0.30s] Rango aparece (todavía en 0-0)
    tl.to(rangoEl, {
      opacity: 1,
      duration: 0.3,
      ease: 'power2.out',
    }, fillStart + 0.30)

    // [fillStart + 0.40s] Count up SECUENCIAL: primero el mínimo, luego el máximo
    //   Paso 1: rangoMin 0 → state.targetMin
    const minObj = { v: 0 }
    tl.to(minObj, {
      v: state.targetMin,
      duration: countDuration,
      ease: 'power2.out',
      onUpdate: () => {
        rangoMinEl.textContent = String(Math.round(minObj.v))
      },
      onComplete: () => {
        rangoMinEl.textContent = String(Math.round(state.targetMin))
      },
    }, fillStart + 0.40)

    //   Paso 2 (después del mínimo): rangoMax 0 → state.targetMax
    const maxObj = { v: 0 }
    tl.to(maxObj, {
      v: state.targetMax,
      duration: countDuration,
      ease: 'power2.out',
      onUpdate: () => {
        rangoMaxEl.textContent = String(Math.round(maxObj.v))
      },
      onComplete: () => {
        rangoMaxEl.textContent = String(Math.round(state.targetMax))
      },
    }, fillStart + 0.40 + countDuration)

    // [fillStart + countDuration*2 + 0.5s] Título debajo del ring
    const tituloStart = fillStart + 0.40 + countDuration * 2 + 0.1
    tl.to(tituloEl, {
      opacity: 1,
      y: 0,
      duration: 0.4,
      ease: 'power2.out',
    }, tituloStart)

    // [tituloStart + 0.25s] Badge inferior con pop
    if (badge != null) {
      tl.to(badgeEl, {
        opacity: 1,
        scale: 1,
        duration: 0.45,
        ease: 'back.out(2)',
      }, tituloStart + 0.25)
    }
  }

  function hide() {
    if (!state.visible) return
    state.visible = false

    if (state.masterTimeline) state.masterTimeline.kill()
    stopBorderPulse()

    const tl = gsap.timeline({
      onComplete: () => {
        cardEl.classList.remove('hud-insight-r__card--filled')
        el.style.opacity = '0'
      },
    })
    state.masterTimeline = tl

    // [0.00s] Glow + badge + título desaparecen
    tl.to(glowEl, {
      opacity: 0,
      duration: 0.25,
      ease: 'power2.in',
    }, 0)

    tl.to(badgeEl, {
      opacity: 0,
      scale: 0.85,
      duration: 0.2,
      ease: 'power2.in',
    }, 0)

    tl.to(tituloEl, {
      opacity: 0,
      y: 6,
      duration: 0.2,
      ease: 'power2.in',
    }, 0.05)

    // [0.15s] Contenido del ring (rango + unidad)
    tl.to(rangoEl, {
      opacity: 0,
      duration: 0.2,
      ease: 'power2.in',
    }, 0.15)

    tl.to(unidadEl, {
      opacity: 0,
      duration: 0.2,
      ease: 'power2.in',
    }, 0.20)

    tl.to(ringContentEl, {
      opacity: 0,
      duration: 0.25,
      ease: 'power2.in',
    }, 0.25)

    // [0.25s] Ring del gradient se desdibuja
    tl.to(ringProgress, {
      strokeDashoffset: state.ringCircumference,
      duration: 0.4,
      ease: 'power2.inOut',
    }, 0.25)

    // [0.25s] Círculo punteado fade out
    tl.to(ringTrack, {
      opacity: 0,
      duration: 0.3,
      ease: 'power2.in',
    }, 0.25)

    // [0.25s] Marcas radiales desaparecen
    tl.to(ticksGroup, {
      opacity: 0,
      duration: 0.3,
      ease: 'power2.in',
    }, 0.25)
    tl.to(ticksGroup.children, {
      scale: 0.5,
      duration: 0.25,
      stagger: 0.03,
      ease: 'power2.in',
    }, 0.25)

    // [0.65s] Fondo del card desaparece
    tl.add(() => {
      cardEl.classList.remove('hud-insight-r__card--filled')
    }, 0.65)

    // [1.10s] Borde se desdibuja COMPLETO
    tl.to(borderPath, {
      strokeDashoffset: state.borderPerimeter,
      duration: 0.55,
      ease: 'power2.inOut',
    }, 1.10)

    // [1.70s] Línea conectora se retrae (DESPUÉS del borde, sin solape)
    tl.to(connectorEl, {
      opacity: 0,
      scaleX: 0,
      duration: 0.35,
      ease: 'power2.in',
    }, 1.70)

    // [2.00s] Dot se apaga al final
    tl.to(connectorDotEl, {
      scale: 0,
      duration: 0.2,
      ease: 'power2.in',
    }, 2.00)
  }

  // ---------------------------------------------------------------------------
  // 7. API setters
  // ---------------------------------------------------------------------------
  function setRango(min, max) {
    state.targetMin = Number(min) || 0
    state.targetMax = Number(max) || 0
    if (state.visible) {
      // Animar a los nuevos valores (sin secuencia, ambos a la vez)
      const minObj = { v: Number(rangoMinEl.textContent) || 0 }
      const maxObj = { v: Number(rangoMaxEl.textContent) || 0 }
      gsap.to(minObj, {
        v: state.targetMin,
        duration: countDuration,
        ease: 'power2.out',
        onUpdate: () => rangoMinEl.textContent = String(Math.round(minObj.v)),
      })
      gsap.to(maxObj, {
        v: state.targetMax,
        duration: countDuration,
        ease: 'power2.out',
        onUpdate: () => rangoMaxEl.textContent = String(Math.round(maxObj.v)),
      })
    } else {
      rangoMinEl.textContent = String(state.targetMin)
      rangoMaxEl.textContent = String(state.targetMax)
    }
  }

  function setUnidad(nueva) {
    unidad = String(nueva)
    unidadEl.textContent = unidad
  }

  function setTitulo(nuevo) {
    titulo = String(nuevo)
    tituloEl.textContent = titulo
  }

  function setBadge(nuevoTexto) {
    if (nuevoTexto == null) {
      badge = null
      badgeEl.style.display = 'none'
      badgeEl.textContent = ''
    } else {
      badge = String(nuevoTexto)
      badgeEl.style.display = ''
      badgeEl.textContent = badge
    }
  }

  function setAnchor(xyz) {
    state.anchor3D.set(xyz.x, xyz.y, xyz.z)
  }

  function destroy() {
    if (state.masterTimeline) state.masterTimeline.kill()
    if (state.pulseTimeline) state.pulseTimeline.kill()
    gsap.killTweensOf([
      el, cardEl, connectorEl, connectorDotEl,
      borderPath, borderPulse,
      glowEl, ringProgress, ringTrack, ringContentEl,
      unidadEl, rangoEl, rangoMinEl, rangoMaxEl,
      tituloEl, badgeEl,
      ticksGroup, ...ticksGroup.children,
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
    setRango,
    setUnidad,
    setTitulo,
    setBadge,
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

function mixHexColors(hexA, hexB, t) {
  const a = hexToRgbObj(hexA)
  const b = hexToRgbObj(hexB)
  const r = Math.round(a.r * (1 - t) + b.r * t)
  const g = Math.round(a.g * (1 - t) + b.g * t)
  const bl = Math.round(a.b * (1 - t) + b.b * t)
  return `rgb(${r}, ${g}, ${bl})`
}

function hexToRgbObj(hex) {
  let h = hex.replace('#', '')
  if (h.length === 3) h = h.split('').map(c => c + c).join('')
  return {
    r: parseInt(h.substring(0, 2), 16),
    g: parseInt(h.substring(2, 4), 16),
    b: parseInt(h.substring(4, 6), 16),
  }
}