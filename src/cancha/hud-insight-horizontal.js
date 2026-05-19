// src/cancha/hud-insight-horizontal.js

import * as THREE from 'three'
import gsap from 'gsap'

/**
 * Crea un componente HUD Insight Horizontal: tarjeta rectangular ancha con
 * un ring circular animado de progreso a la izquierda (con número grande
 * dentro), título y secuencia narrativa a la derecha. Conector sale por la
 * izquierda del card hacia un punto 3D en la cancha.
 *
 * ANIMACIÓN DE ENTRADA (secuencial, ~2.5 segundos):
 *   1. Aparece el connector dot (extremo izquierdo)
 *   2. Se dibuja la línea conectora (horizontal, izq → der)
 *   3. Se traza el borde del card (stroke-dasharray animado)
 *   4. Aparece el fondo + glow + blur del card
 *   5. Se dibuja el ring de progreso (arc → maxValor proporcional al valor)
 *   6. Count up del número (0 → valor target)
 *   7. Aparece la unidad debajo del número
 *   8. Aparece el título con fade
 *   9. Aparece la secuencia "a → b" con fade
 *
 * ANIMACIÓN DE SALIDA (secuencial inverso, ~1.8s):
 *   1. Textos del lado derecho desaparecen
 *   2. Unidad + número del ring desaparecen
 *   3. Ring de progreso se desdibuja
 *   4. Glow + fondo del card desaparecen
 *   5. Borde se desdibuja completo
 *   6. Línea conectora se retrae
 *   7. Dot se apaga al final
 *
 * Renderizado: HTML/CSS overlay + SVG para borde y ring animados.
 */
export function createHudInsightHorizontal({
  scene,
  camera,
  anchor3D = { x: 0, y: 0, z: 0 },
  valor = 3,
  unidad = 'Segundos',
  maxValor = 10,
  titulo = 'Tras recuperación',
  secuencia = ['recuperación', 'centro'],
  color = '#00f0ff',
  valorColor = '#ffffff',
  unidadColor = '#9EA5B2',
  tituloColor = '#ffffff',
  secuenciaColor = '#00DDFF',
  cardWidth = 520,
  cardHeight = 180,
  ringSize = 130,
  offsetX = 180,     // distancia horizontal del card respecto al anchor (largo del conector)
  offsetY = 0,       // 0 = card alineado verticalmente con el anchor
  countUp = true,
  countDuration = 1.2,
  container = document.body,
} = {}) {

  // ---------------------------------------------------------------------------
  // 1. Inyectar estilos (una sola vez)
  // ---------------------------------------------------------------------------
  const STYLE_ID = 'hud-insight-horizontal-styles'
  if (!document.getElementById(STYLE_ID)) {
    const style = document.createElement('style')
    style.id = STYLE_ID
    style.textContent = `
      .hud-insight-h {
        position: fixed;
        z-index: 9998;
        pointer-events: none;
        opacity: 0;
      }
      .hud-insight-h__card {
        position: relative;
        background: rgba(14, 20, 33, 0);
        box-shadow: 0px 10.1834px 40.7337px rgba(3, 2, 4, 0);
        backdrop-filter: blur(0px);
        -webkit-backdrop-filter: blur(0px);
        border-radius: 22px;
        padding: 24px 36px;
        display: flex;
        align-items: center;
        gap: 28px;
        transform-origin: center center;
        will-change: transform, background-color, box-shadow, backdrop-filter;
        overflow: hidden;
        transition:
          background-color 0.45s ease-out,
          box-shadow      0.45s ease-out,
          backdrop-filter 0.45s ease-out,
          -webkit-backdrop-filter 0.45s ease-out;
      }
      .hud-insight-h__card--filled {
        background: rgba(5, 8, 14, 0.55);
        box-shadow: 0px 10.1834px 40.7337px rgba(3, 2, 4, 0.37);
        backdrop-filter: blur(15px);
        -webkit-backdrop-filter: blur(15px);
      }

      /* SVG con el borde animado */
      .hud-insight-h__border-svg {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        z-index: 2;
      }
      .hud-insight-h__border-rect {
        fill: none;
        stroke: rgba(0, 221, 255, 0.7);
        stroke-width: 1.4;
      }

      /* Lado izquierdo: ring + número + unidad */
      .hud-insight-h__ring-wrap {
        position: relative;
        flex-shrink: 0;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .hud-insight-h__ring-svg {
        position: relative;
        z-index: 1;
        display: block;
      }
      /* Track del ring (círculo de fondo punteado tenue) */
      .hud-insight-h__ring-track {
        fill: none;
        stroke: rgba(158, 165, 178, 0.25);
        stroke-width: 1.5;
        stroke-dasharray: 2 4;
      }
      /* Ring completo decorativo (NO progreso). Usa un linearGradient vertical
         definido inline en el SVG: cyan brillante arriba → cyan oscuro abajo.
         stroke-linecap: butt (en vez de round) porque con round, el navegador
         renderiza un pequeño punto donde "arrancaría" el trazo aunque el
         stroke-dashoffset esté al máximo (trazo invisible). Eso causaba un
         punto fantasma en la posición 12 en punto del ring. Con butt no hay
         tapa residual y como el ring se cierra (es un círculo completo), no
         se nota visualmente la diferencia. */
      .hud-insight-h__ring-progress {
        fill: none;
        stroke: url(#hud-insight-h-ring-gradient);
        stroke-width: 3;
        stroke-linecap: butt;
      }
      /* Grupo contenedor de las 5 marcas radiales. Opacity 0 desde el CSS para
         que esté completamente oculto antes del primer show(). El show() lo
         anima a opacity:1 cuando arranca el ring del loader. */
      .hud-insight-h__ring-ticks {
        opacity: 0;
      }
      /* Marcas radiales individuales. Su opacidad propia se mantiene en su
         estado final (0.2 = apenas perceptibles cuando el grupo es visible). */
      .hud-insight-h__ring-tick {
        stroke: var(--hi-color);
        stroke-width: 2;
        stroke-linecap: round;
        opacity: 0.2;
      }
      /* Contenido en el centro del ring */
      .hud-insight-h__ring-content {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        text-align: center;
        z-index: 2;
        pointer-events: none;
      }
      .hud-insight-h__number {
        font-family: 'Poppins', var(--hi-font-sans);
        font-style: normal;
        font-weight: 400;
        font-size: 48px;
        color: var(--hi-valor-color);
        letter-spacing: -0.02em;
        line-height: 1;
        font-variant-numeric: tabular-nums;
      }
      .hud-insight-h__unit {
        font-family: 'Poppins', var(--hi-font-sans);
        font-weight: 400;
        font-size: 14px;
        color: var(--hi-unidad-color);
        margin-top: 4px;
        letter-spacing: 0.02em;
      }

      /* Lado derecho: título + secuencia */
      .hud-insight-h__content {
        flex: 1;
        min-width: 0;
        display: flex;
        flex-direction: column;
        gap: 8px;
        z-index: 1;
      }
      .hud-insight-h__title {
        font-family: 'Poppins', var(--hi-font-sans);
        font-style: normal;
        font-weight: 600;
        font-size: 28px;
        color: var(--hi-titulo-color);
        line-height: 1.1;
        letter-spacing: -0.01em;
      }
      .hud-insight-h__sequence {
        font-family: 'JetBrains Mono', 'Fira Code', 'Courier New', monospace;
        font-weight: 500;
        font-size: 18px;
        color: var(--hi-secuencia-color);
        letter-spacing: 0.02em;
        display: flex;
        align-items: center;
        gap: 12px;
        flex-wrap: wrap;
      }
      .hud-insight-h__sequence-arrow {
        opacity: 0.8;
        font-size: 20px;
      }

      /* Connector: línea horizontal saliendo por la IZQUIERDA del card.
         OJO: NO usar translateY aquí, porque GSAP anima scaleX y sobrescribe
         el transform completo. El yPercent: -50 se aplica desde JS con gsap.set.
         transform-origin: left center → el scaleX crece de izquierda (dot) a
         derecha (card), simulando un trazado continuo desde el extremo izquierdo. */
      .hud-insight-h__connector {
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
      .hud-insight-h__connector-dot {
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
  const el = document.createElement('div')
  el.className = 'hud-insight-h'

  el.style.setProperty('--hi-color', color)
  el.style.setProperty('--hi-glow-outer', hexToRgba(color, 0.45))
  el.style.setProperty('--hi-glow-inner', hexToRgba(color, 0.25))
  el.style.setProperty('--hi-valor-color', valorColor)
  el.style.setProperty('--hi-unidad-color', unidadColor)
  el.style.setProperty('--hi-titulo-color', tituloColor)
  el.style.setProperty('--hi-secuencia-color', secuenciaColor)
  el.style.setProperty('--hi-font-sans', "'Inter', 'Helvetica Neue', system-ui, sans-serif")

  // Card
  const cardEl = document.createElement('div')
  cardEl.className = 'hud-insight-h__card'
  cardEl.style.width = `${cardWidth}px`
  cardEl.style.height = `${cardHeight}px`

  // SVG con el borde animado
  const SVG_NS = 'http://www.w3.org/2000/svg'
  // SVG con el borde animado del card.
  // Uso <path> en lugar de <rect> para poder definir exactamente DÓNDE arranca
  // el trazado del borde — debe arrancar en el lado izquierdo a media altura,
  // exactamente donde el connector toca el card, y dibujar en sentido horario
  // para cerrar el trazo. Si fuera <rect>, el navegador siempre arranca arriba-izq.
  const borderSvg = document.createElementNS(SVG_NS, 'svg')
  borderSvg.setAttribute('class', 'hud-insight-h__border-svg')
  borderSvg.setAttribute('preserveAspectRatio', 'none')

  const borderPath = document.createElementNS(SVG_NS, 'path')
  borderPath.setAttribute('class', 'hud-insight-h__border-rect')
  // El atributo 'd' se setea dinámicamente en setupBorderSvg()
  borderSvg.appendChild(borderPath)
  cardEl.appendChild(borderSvg)

  // Ring (lado izquierdo).
  // El wrap mantiene el tamaño visual del ring (ringSize) para que el layout
  // flex del card sea consistente, pero el SVG interno es más grande para que
  // el círculo punteado quepa sin recortes. overflow:visible permite que el
  // SVG sobresalga del wrap sin ser recortado.
  const ringWrapEl = document.createElement('div')
  ringWrapEl.className = 'hud-insight-h__ring-wrap'
  ringWrapEl.style.width = `${ringSize}px`
  ringWrapEl.style.height = `${ringSize}px`
  ringWrapEl.style.overflow = 'visible'

  // SVG del ring.
  // El viewBox tiene un PADDING extra (svgPadding) además del ringSize para
  // que el círculo punteado exterior y las marcas radiales quepan sin recortes.
  // El ring del gradient y todas las capas quedan centrados en (cx, cy).
  const svgPadding = 16   // espacio extra alrededor del ringSize para el punteado
  const svgSize = ringSize + svgPadding * 2
  const ringSvg = document.createElementNS(SVG_NS, 'svg')
  ringSvg.setAttribute('class', 'hud-insight-h__ring-svg')
  ringSvg.setAttribute('width', svgSize)
  ringSvg.setAttribute('height', svgSize)
  ringSvg.setAttribute('viewBox', `0 0 ${svgSize} ${svgSize}`)
  // overflow:visible por si acaso algún navegador recorta de más
  ringSvg.style.overflow = 'visible'
  // Margins negativos para centrar el SVG (que es más grande) dentro del wrap
  ringSvg.style.margin = `-${svgPadding}px`

  // Calcular geometría del ring (centrado en el SVG expandido)
  const ringStrokeWidth = 3
  const ringRadius = (ringSize - ringStrokeWidth) / 2 - 4  // -4 para margen interno
  const ringCx = svgSize / 2
  const ringCy = svgSize / 2

  // ─── Definición del gradient del ring ────────────────────────────────────
  // linearGradient vertical: arriba cyan brillante, abajo cyan apagado.
  // El ID es global pero único entre instancias para evitar colisiones (si se
  // crean varios componentes a la vez, todos comparten el mismo id, pero como
  // el gradient es idéntico no causa conflicto visual).
  const defs = document.createElementNS(SVG_NS, 'defs')
  const ringGrad = document.createElementNS(SVG_NS, 'linearGradient')
  ringGrad.setAttribute('id', 'hud-insight-h-ring-gradient')
  ringGrad.setAttribute('x1', '0%')
  ringGrad.setAttribute('y1', '0%')
  ringGrad.setAttribute('x2', '0%')
  ringGrad.setAttribute('y2', '100%')

  // Stops del gradient: 3 colores SÓLIDOS (sin opacidad) que van de cyan
  // brillante (arriba) a un cyan-azul muy oscuro (abajo). Usar colores sólidos
  // en vez de opacidad evita que las marcas radiales que están detrás se
  // transparenten a través del stroke.
  // Los colores intermedios se calculan mezclando el color principal con un
  // tono oscuro (#031a22) en proporciones 100%, 35% y 12% del color original.
  const darkColor = '#031a22'
  const stop1 = document.createElementNS(SVG_NS, 'stop')
  stop1.setAttribute('offset', '0%')
  stop1.setAttribute('stop-color', color)         // cyan brillante puro

  const stop2 = document.createElementNS(SVG_NS, 'stop')
  stop2.setAttribute('offset', '50%')
  stop2.setAttribute('stop-color', mixHexColors(color, darkColor, 0.55))  // cyan medio

  const stop3 = document.createElementNS(SVG_NS, 'stop')
  stop3.setAttribute('offset', '100%')
  stop3.setAttribute('stop-color', mixHexColors(color, darkColor, 0.85))  // casi todo oscuro

  ringGrad.appendChild(stop1)
  ringGrad.appendChild(stop2)
  ringGrad.appendChild(stop3)
  defs.appendChild(ringGrad)
  ringSvg.appendChild(defs)

  // ─── Orden de capas (orden de pintado = el último queda ENCIMA):
  //     1. 5 marcas radiales equidistantes (detrás)
  //     2. Círculo punteado exterior (medio)
  //     3. Ring completo decorativo con gradient (ENCIMA de todo)

  // [1] 5 marcas radiales (se pintan PRIMERO para quedar atrás).
  //     Cortas: la mitad interior queda oculta por el ring del gradient,
  //     solo asoman ~4px hacia afuera.
  const ticksGroup = document.createElementNS(SVG_NS, 'g')
  ticksGroup.setAttribute('class', 'hud-insight-h__ring-ticks')
  const tickInnerR = ringRadius - 2    // borde interior: ligeramente dentro del ring del gradient
  const tickOuterR = ringRadius + 4    // borde exterior: apenas asomando hacia afuera del ring
  const TICK_COUNT = 5
  for (let i = 0; i < TICK_COUNT; i++) {
    const angle = (i * (360 / TICK_COUNT) - 90) * (Math.PI / 180)  // -90° para que la primera quede arriba
    const x1 = ringCx + Math.cos(angle) * tickInnerR
    const y1 = ringCy + Math.sin(angle) * tickInnerR
    const x2 = ringCx + Math.cos(angle) * tickOuterR
    const y2 = ringCy + Math.sin(angle) * tickOuterR

    const tick = document.createElementNS(SVG_NS, 'line')
    tick.setAttribute('class', 'hud-insight-h__ring-tick')
    tick.setAttribute('x1', x1)
    tick.setAttribute('y1', y1)
    tick.setAttribute('x2', x2)
    tick.setAttribute('y2', y2)
    ticksGroup.appendChild(tick)
  }
  ringSvg.appendChild(ticksGroup)

  // [2] Track punteado exterior (medio).
  //     Calcular un dasharray que se ajuste EXACTAMENTE al perímetro para
  //     que el patrón punteado no se corte al cerrar el círculo.
  const trackRadius = ringRadius + 12
  const trackCircumference = 2 * Math.PI * trackRadius
  // Buscar un dash pattern (dash, gap) que divida el perímetro en N segmentos exactos.
  // Patrón base "2px dash, 4px gap" = 6px de longitud por segmento.
  const desiredSegmentLength = 6
  const numSegments = Math.round(trackCircumference / desiredSegmentLength)
  const actualSegmentLength = trackCircumference / numSegments
  // Dentro de cada segmento: 1/3 dash, 2/3 gap (proporción similar a 2:4)
  const dashLen = actualSegmentLength / 3
  const gapLen  = actualSegmentLength - dashLen

  const ringTrack = document.createElementNS(SVG_NS, 'circle')
  ringTrack.setAttribute('class', 'hud-insight-h__ring-track')
  ringTrack.setAttribute('cx', ringCx)
  ringTrack.setAttribute('cy', ringCy)
  ringTrack.setAttribute('r', trackRadius)
  // El dasharray inline override el CSS para que el patrón cierre exacto
  ringTrack.style.strokeDasharray = `${dashLen} ${gapLen}`
  ringSvg.appendChild(ringTrack)

  // [3] Ring completo con gradient (ENCIMA de todo).
  //     Rotado -90° para que la animación de trazado arranque arriba.
  //     Como se pinta al final, queda visualmente por encima de las marcas
  //     y del círculo punteado.
  const ringProgress = document.createElementNS(SVG_NS, 'circle')
  ringProgress.setAttribute('class', 'hud-insight-h__ring-progress')
  ringProgress.setAttribute('cx', ringCx)
  ringProgress.setAttribute('cy', ringCy)
  ringProgress.setAttribute('r', ringRadius)
  ringProgress.setAttribute('transform', `rotate(-90 ${ringCx} ${ringCy})`)
  ringSvg.appendChild(ringProgress)

  ringWrapEl.appendChild(ringSvg)

  // Contenido del ring (número + unidad)
  const ringContentEl = document.createElement('div')
  ringContentEl.className = 'hud-insight-h__ring-content'

  const numberEl = document.createElement('div')
  numberEl.className = 'hud-insight-h__number'
  numberEl.textContent = '0'

  const unitEl = document.createElement('div')
  unitEl.className = 'hud-insight-h__unit'
  unitEl.textContent = unidad

  ringContentEl.appendChild(numberEl)
  ringContentEl.appendChild(unitEl)
  ringWrapEl.appendChild(ringContentEl)

  cardEl.appendChild(ringWrapEl)

  // Contenido (lado derecho): título + secuencia
  const contentEl = document.createElement('div')
  contentEl.className = 'hud-insight-h__content'

  const titleEl = document.createElement('div')
  titleEl.className = 'hud-insight-h__title'
  titleEl.textContent = titulo

  const sequenceEl = document.createElement('div')
  sequenceEl.className = 'hud-insight-h__sequence'
  renderSequence(sequenceEl, secuencia)

  contentEl.appendChild(titleEl)
  contentEl.appendChild(sequenceEl)
  cardEl.appendChild(contentEl)

  // Connector (línea + dot). Va FUERA del cardEl (en el wrapper) para que
  // el overflow:hidden del card no lo recorte. El connector sale por la
  // IZQUIERDA del card con position:absolute, right:100% (relativo al wrapper).
  const connectorEl = document.createElement('div')
  connectorEl.className = 'hud-insight-h__connector'

  const connectorDotEl = document.createElement('div')
  connectorDotEl.className = 'hud-insight-h__connector-dot'
  connectorEl.appendChild(connectorDotEl)

  el.appendChild(cardEl)
  el.appendChild(connectorEl)
  container.appendChild(el)

  // ─── Estado inicial oculto (antes del primer show) ──────────────────────
  // Sin esto, el connector dot tiene su box-shadow cyan visible aunque el
  // wrapper esté con opacity:0, porque el box-shadow grande con blur crea
  // su propia capa de compositing que puede bleed más allá del wrapper.
  // Forzamos scale:0 desde el inicio para que el elemento no exista
  // visualmente hasta que el primer show() lo anime.
  gsap.set(connectorDotEl, { yPercent: -50, scale: 0 })
  gsap.set(connectorEl,    { yPercent: -50, opacity: 0, scaleX: 0 })

  // ---------------------------------------------------------------------------
  // 3. Estado interno
  // ---------------------------------------------------------------------------
  const state = {
    currentValor: 0,
    targetValor: valor,
    maxValor: maxValor,
    visible: false,
    anchor3D: new THREE.Vector3(anchor3D.x, anchor3D.y, anchor3D.z),
    countTween: null,
    masterTimeline: null,
    borderPerimeter: 0,
    ringCircumference: 2 * Math.PI * ringRadius,
  }

  const _projVec = new THREE.Vector3()

  // Setup inicial del ring (arc completamente oculto)
  ringProgress.style.strokeDasharray = `${state.ringCircumference}`
  ringProgress.style.strokeDashoffset = `${state.ringCircumference}`

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
    const screenX = (_projVec.x * 0.5 + 0.5) * w
    const screenY = (-_projVec.y * 0.5 + 0.5) * h

    // El card se posiciona a la DERECHA del punto (offsetX positivo) y el
    // connector sale por la izquierda del card hacia el punto.
    const cardRect = cardEl.getBoundingClientRect()
    const cardHeightReal = cardRect.height

    // Posición del card: izquierda alineada con el punto + offsetX
    const cardLeft = screenX + offsetX
    // El card se centra verticalmente con el punto (offsetY desplaza)
    const cardTop = screenY - cardHeightReal / 2 + offsetY

    el.style.left = `${cardLeft}px`
    el.style.top  = `${cardTop}px`

    // Calcular ancho del connector (distancia desde el card hasta el punto)
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
    const r = 22  // border-radius

    borderSvg.setAttribute('viewBox', `0 0 ${w} ${h}`)

    // ─── Construir el path del borde ──────────────────────────────────────
    // Empieza en el LADO IZQUIERDO a MEDIA ALTURA (donde toca el conector),
    // sube por el borde izquierdo, gira esquina superior-izq, va derecha,
    // gira esquina superior-der, baja por la derecha, gira esquina inferior-der,
    // va izquierda, gira esquina inferior-izq, sube y CIERRA en el punto inicial.
    //
    // Usar `a rx ry x-axis-rotation large-arc-flag sweep-flag dx dy` para los
    // arcos (esquinas redondeadas). sweep-flag = 1 = sentido horario.

    const x0 = half          // borde izquierdo
    const y0 = h / 2         // media altura (punto de entrada del conector)
    const x1 = half          // borde izquierdo
    const yTop = half + r    // donde empieza la esquina superior-izq (justo después del radio)
    const xLeftCorner = half + r   // donde termina la esquina superior-izq

    const xRight = w - half
    const xRightCorner = xRight - r

    const yBot = h - half
    const yBotCorner = yBot - r

    const d = [
      `M ${x0} ${y0}`,                                    // start: lado izq, media altura
      `L ${x1} ${yTop}`,                                  // sube hasta donde empieza la esquina sup-izq
      `a ${r} ${r} 0 0 1 ${r} ${-r}`,                     // esquina sup-izq (gira hacia la derecha)
      `L ${xRightCorner} ${half}`,                        // borde superior hacia la derecha
      `a ${r} ${r} 0 0 1 ${r} ${r}`,                      // esquina sup-der
      `L ${xRight} ${yBotCorner}`,                        // borde derecho hacia abajo
      `a ${r} ${r} 0 0 1 ${-r} ${r}`,                     // esquina inf-der
      `L ${xLeftCorner} ${yBot}`,                         // borde inferior hacia la izq
      `a ${r} ${r} 0 0 1 ${-r} ${-r}`,                    // esquina inf-izq
      `L ${x0} ${y0}`,                                    // cierra subiendo hasta el punto inicial
    ].join(' ')

    borderPath.setAttribute('d', d)

    // Medir la longitud real del path (incluye arcos correctamente)
    const perim = borderPath.getTotalLength()
    state.borderPerimeter = perim

    borderPath.style.strokeDasharray  = `${perim}`
    borderPath.style.strokeDashoffset = `${perim}`
  }

  // ---------------------------------------------------------------------------
  // 6. API: show / hide / setValor / setTitulo / setSecuencia / setAnchor
  // ---------------------------------------------------------------------------
  async function show() {
    if (state.visible) return
    state.visible = true

    if (state.masterTimeline) state.masterTimeline.kill()
    if (state.countTween) state.countTween.kill()

    el.style.opacity = '1'
    updateProjection()

    await new Promise(r => requestAnimationFrame(r))
    setupBorderSvg()

    cardEl.classList.remove('hud-insight-h__card--filled')

    // El ring siempre se dibuja completo (decorativo, no proporcional al valor).
    // El offset final es 0 = círculo completamente trazado.
    const finalDashoffset = 0

    // Estado inicial: todo oculto.
    // Para connector y dot, aplico yPercent: -50 explícitamente para centrarlos
    // verticalmente (en CSS no lo pongo porque GSAP sobrescribiría el transform
    // al animar scaleX y scale). GSAP combina yPercent con scaleX/scale sin conflicto.
    gsap.set(connectorDotEl, { yPercent: -50, scale: 0 })
    gsap.set(connectorEl,    { yPercent: -50, opacity: 0, scaleX: 0 })
    gsap.set(borderPath,     { strokeDashoffset: state.borderPerimeter })
    gsap.set(ringProgress,   { strokeDashoffset: state.ringCircumference })
    gsap.set(ringTrack,      { opacity: 0 })
    // El grupo de ticks como un todo arranca oculto; los hijos arrancan con
    // scale:0.5 para el efecto pop. La opacidad final del grupo es 1 (los
    // ticks individuales mantienen su 0.2 de CSS).
    gsap.set(ticksGroup,          { opacity: 0 })
    gsap.set(ticksGroup.children, { scale: 0.5, transformOrigin: '50% 50%' })
    gsap.set(ringContentEl,  { opacity: 0 })
    gsap.set(numberEl,       { opacity: 0 })
    gsap.set(unitEl,         { opacity: 0, y: 4 })
    gsap.set(titleEl,        { opacity: 0, x: -8 })
    gsap.set(sequenceEl,     { opacity: 0, x: -8 })

    state.currentValor = 0
    numberEl.textContent = '0'

    // ─── Timeline secuencial (~2.5s total) ────────────────────────────────
    const tl = gsap.timeline()
    state.masterTimeline = tl

    // [0.00s] Aparece el connector dot (extremo izquierdo, donde está el anchor 3D)
    tl.to(connectorDotEl, {
      scale: 1,
      duration: 0.25,
      ease: 'back.out(2.5)',
    }, 0)

    // ─── Trazo continuo: connector + borde del card ───────────────────────
    // El trazo debe sentirse como UN SOLO movimiento que arranca en el dot,
    // recorre la línea conectora horizontal hasta tocar el card, sube por el
    // borde izquierdo y contornea todo el card en sentido horario.
    //
    // Para que la velocidad de trazado sea constante (px/s), las duraciones
    // del connector y del borde se calculan en proporción a sus longitudes.

    const connectorWidth = parseFloat(connectorEl.style.width) || 100
    const totalTraceLength = connectorWidth + state.borderPerimeter
    const totalTraceDuration = 1.4  // duración total del trazado (connector + borde)
    const connectorDuration = totalTraceDuration * (connectorWidth / totalTraceLength)
    const borderDuration    = totalTraceDuration * (state.borderPerimeter / totalTraceLength)

    // [0.15s] Se dibuja la línea conectora (de izq a der: del dot hacia el card)
    tl.to(connectorEl, {
      opacity: 1,
      scaleX: 1,
      duration: connectorDuration,
      ease: 'none',   // velocidad constante para que empalme con el borde sin saltos
    }, 0.15)

    // [0.15s + connectorDuration] Sin pausa, sigue trazándose el borde del card.
    //   Como el path arranca exactamente en el lado izquierdo a media altura
    //   (donde toca el conector), el trazo se ve continuo.
    tl.to(borderPath, {
      strokeDashoffset: 0,
      duration: borderDuration,
      ease: 'none',   // velocidad constante igual al connector
    }, 0.15 + connectorDuration)

    // [~1.55s] Aparece el fondo del card una vez terminado el trazo
    const fillStart = 0.15 + totalTraceDuration
    tl.add(() => {
      cardEl.classList.add('hud-insight-h__card--filled')
    }, fillStart)

    // [fillStart + 0.10s] Las 5 marcas radiales aparecen en sincronía con el
    // ring del loader: el grupo entero se hace visible con un fade, y los
    // hijos individuales hacen un pop con stagger.
    tl.to(ticksGroup, {
      opacity: 1,
      duration: 0.4,
      ease: 'power2.out',
    }, fillStart + 0.10)

    tl.to(ticksGroup.children, {
      scale: 1,
      duration: 0.35,
      stagger: 0.06,
      ease: 'back.out(2)',
    }, fillStart + 0.10)

    // [fillStart + 0.10s] Contenido del ring (wrap) aparece
    tl.to(ringContentEl, {
      opacity: 1,
      duration: 0.3,
      ease: 'power2.out',
    }, fillStart + 0.10)

    // [fillStart + 0.10s] Se dibuja el ring del gradient (loader) desde 0 a completo
    tl.to(ringProgress, {
      strokeDashoffset: finalDashoffset,
      duration: countDuration,
      ease: 'power2.out',
    }, fillStart + 0.10)

    // [fillStart + 0.10s] EN PARALELO: aparece el círculo punteado exterior con fade
    tl.to(ringTrack, {
      opacity: 1,
      duration: countDuration * 0.6,
      ease: 'power2.out',
    }, fillStart + 0.10)

    // [fillStart + 0.15s] Aparece el número y arranca el count up
    tl.to(numberEl, {
      opacity: 1,
      duration: 0.3,
      ease: 'power2.out',
    }, fillStart + 0.15)

    if (countUp) {
      const obj = { v: 0 }
      tl.to(obj, {
        v: state.targetValor,
        duration: countDuration,
        ease: 'power2.out',
        onUpdate: () => {
          state.currentValor = obj.v
          numberEl.textContent = String(Math.round(obj.v))
        },
        onComplete: () => {
          state.currentValor = state.targetValor
          numberEl.textContent = String(Math.round(state.targetValor))
        },
      }, fillStart + 0.15)
    } else {
      state.currentValor = state.targetValor
      numberEl.textContent = String(Math.round(state.targetValor))
    }

    // [~fillStart + 0.93s] Aparece la unidad debajo del número
    tl.to(unitEl, {
      opacity: 1,
      y: 0,
      duration: 0.35,
      ease: 'power2.out',
    }, fillStart + 0.15 + countDuration * 0.65)

    // [fillStart + 0.40s] Aparece el título (lado derecho)
    tl.to(titleEl, {
      opacity: 1,
      x: 0,
      duration: 0.5,
      ease: 'power2.out',
    }, fillStart + 0.40)

    // [fillStart + 0.75s] Aparece la secuencia "a → b"
    tl.to(sequenceEl, {
      opacity: 1,
      x: 0,
      duration: 0.5,
      ease: 'power2.out',
    }, fillStart + 0.75)
  }

  function hide() {
    if (!state.visible) return
    state.visible = false

    if (state.masterTimeline) state.masterTimeline.kill()
    if (state.countTween) state.countTween.kill()

    const tl = gsap.timeline({
      onComplete: () => {
        cardEl.classList.remove('hud-insight-h__card--filled')
        el.style.opacity = '0'
      },
    })
    state.masterTimeline = tl

    // [0.00s] Textos del lado derecho desaparecen (stagger)
    tl.to([sequenceEl, titleEl], {
      opacity: 0,
      x: -8,
      duration: 0.2,
      stagger: 0.05,
      ease: 'power2.in',
    }, 0)

    // [0.10s] Unidad + número desaparecen
    tl.to([unitEl, numberEl], {
      opacity: 0,
      duration: 0.2,
      stagger: 0.04,
      ease: 'power2.in',
    }, 0.10)

    // [0.25s] Ring del gradient (loader) se desdibuja
    tl.to(ringProgress, {
      strokeDashoffset: state.ringCircumference,
      duration: 0.4,
      ease: 'power2.inOut',
    }, 0.25)

    // [0.25s] EN PARALELO: círculo punteado exterior desaparece con fade
    tl.to(ringTrack, {
      opacity: 0,
      duration: 0.3,
      ease: 'power2.in',
    }, 0.25)

    // [0.25s] Las 5 marcas radiales desaparecen: grupo entero con fade + hijos con scale stagger
    tl.to(ticksGroup, {
      opacity: 0,
      duration: 0.3,
      ease: 'power2.in',
    }, 0.25)

    tl.to(ticksGroup.children, {
      scale: 0.5,
      duration: 0.25,
      stagger: 0.04,
      ease: 'power2.in',
    }, 0.25)

    // [0.40s] Ring content wrap fade out
    tl.to(ringContentEl, {
      opacity: 0,
      duration: 0.25,
      ease: 'power2.in',
    }, 0.40)

    // [0.55s] El card pierde su fondo (via transition CSS, 0.45s)
    tl.add(() => {
      cardEl.classList.remove('hud-insight-h__card--filled')
    }, 0.55)

    // [1.00s] Borde se desdibuja completo (sin solape con lo siguiente)
    tl.to(borderPath, {
      strokeDashoffset: state.borderPerimeter,
      duration: 0.55,
      ease: 'power2.inOut',
    }, 1.00)

    // [1.60s] Línea conectora se retrae (después del borde)
    tl.to(connectorEl, {
      opacity: 0,
      scaleX: 0,
      duration: 0.35,
      ease: 'power2.in',
    }, 1.60)

    // [1.90s] Dot se apaga al final
    tl.to(connectorDotEl, {
      scale: 0,
      duration: 0.2,
      ease: 'power2.in',
    }, 1.90)
  }

  function setValor(nuevoValor) {
    const target = Number(nuevoValor)
    state.targetValor = target

    if (!state.visible) {
      state.currentValor = target
      numberEl.textContent = String(Math.round(target))
      return
    }

    if (state.countTween) state.countTween.kill()

    // El ring es decorativo (completo), así que setValor solo anima el count up.
    const obj = { v: state.currentValor }
    state.countTween = gsap.to(obj, {
      v: target,
      duration: countDuration * 0.7,
      ease: 'power2.out',
      onUpdate: () => {
        state.currentValor = obj.v
        numberEl.textContent = String(Math.round(obj.v))
      },
      onComplete: () => {
        state.currentValor = target
        numberEl.textContent = String(Math.round(target))
        state.countTween = null
      },
    })
  }

  function setMaxValor(nuevoMax) {
    // El ring es decorativo (siempre completo), así que maxValor solo se
    // conserva en el estado por si el usuario quiere usarlo como referencia
    // de dominio (no afecta la visualización).
    state.maxValor = Number(nuevoMax)
  }

  function setUnidad(nueva) {
    unitEl.textContent = String(nueva)
  }

  function setTitulo(nuevo) {
    titleEl.textContent = String(nuevo)
  }

  function setSecuencia(arr) {
    renderSequence(sequenceEl, arr)
  }

  function setAnchor(xyz) {
    state.anchor3D.set(xyz.x, xyz.y, xyz.z)
  }

  function destroy() {
    if (state.masterTimeline) state.masterTimeline.kill()
    if (state.countTween) state.countTween.kill()
    gsap.killTweensOf([
      el, cardEl, connectorEl, connectorDotEl,
      borderPath, ringProgress, ringTrack, ringContentEl,
      numberEl, unitEl, titleEl, sequenceEl,
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
    setValor,
    setMaxValor,
    setUnidad,
    setTitulo,
    setSecuencia,
    setAnchor,
    destroy,
  }
}

// =============================================================================
// Helpers
// =============================================================================
function renderSequence(targetEl, items) {
  targetEl.innerHTML = ''
  const arr = Array.isArray(items) ? items : [String(items)]
  arr.forEach((item, i) => {
    if (i > 0) {
      const arrow = document.createElement('span')
      arrow.className = 'hud-insight-h__sequence-arrow'
      arrow.textContent = '→'
      targetEl.appendChild(arrow)
    }
    const span = document.createElement('span')
    span.textContent = String(item)
    targetEl.appendChild(span)
  })
}

function hexToRgba(hex, alpha = 1) {
  let h = hex.replace('#', '')
  if (h.length === 3) h = h.split('').map(c => c + c).join('')
  const r = parseInt(h.substring(0, 2), 16)
  const g = parseInt(h.substring(2, 4), 16)
  const b = parseInt(h.substring(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

// Mezcla dos colores hex en proporción `t`. Si t=0 devuelve hexA, si t=1 devuelve hexB.
// Útil para generar un gradient con colores sólidos en lugar de stop-opacity.
function mixHexColors(hexA, hexB, t) {
  const parseHex = (hex) => {
    let h = hex.replace('#', '')
    if (h.length === 3) h = h.split('').map(c => c + c).join('')
    return {
      r: parseInt(h.substring(0, 2), 16),
      g: parseInt(h.substring(2, 4), 16),
      b: parseInt(h.substring(4, 6), 16),
    }
  }
  const a = parseHex(hexA)
  const b = parseHex(hexB)
  const r = Math.round(a.r + (b.r - a.r) * t)
  const g = Math.round(a.g + (b.g - a.g) * t)
  const bl = Math.round(a.b + (b.b - a.b) * t)
  const toHex = (n) => n.toString(16).padStart(2, '0')
  return `#${toHex(r)}${toHex(g)}${toHex(bl)}`
}