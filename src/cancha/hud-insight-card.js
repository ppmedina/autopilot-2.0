// src/cancha/hud-insight-card.js

import * as THREE from 'three'
import gsap from 'gsap'

/**
 * Crea un componente HUD Insight Card: tarjeta rectangular con número hero,
 * etiqueta descriptiva, barra de loading inferior y línea conectora vertical
 * que apunta a una posición 3D en la cancha.
 *
 * ANIMACIÓN DE ENTRADA (secuencial, ~2 segundos):
 *   1. Aparece el connector dot
 *   2. Se dibuja la línea conectora (scaleY 0 → 1)
 *   3. Se traza el borde del card (stroke-dasharray animado en SVG)
 *   4. Aparece el fondo + glow + blur del card
 *   5. Count up del número (0 → valor target)
 *   6. Aparece el sufijo "%" con fade
 *   7. Aparece la etiqueta con fade + slide
 *   8. Empieza el loop de la loading bar
 *
 * ANIMACIÓN DE SALIDA (secuencial inverso, ~1.8s):
 *   1. Contenido (loading, label, sufijo, hero) → fade out con stagger
 *   2. Glow + fondo del card → fade
 *   3. Borde se desdibuja por completo (sin solape con lo siguiente)
 *   4. Línea conectora se retrae (después de que el borde terminó)
 *   5. Dot se apaga al final
 *
 * Renderizado: HTML/CSS overlay + SVG para el borde animado.
 */
export function createHudInsightCard({
  scene,
  camera,
  anchor3D = { x: 0, y: 0, z: 0 },
  valor = 73,
  sufijo = '%',
  etiqueta = 'centros por derecha',
  color = '#00f0ff',
  valorColor = '#ffffff',
  etiquetaColor = '#9EA5B2',
  sufijoColor = '#9EA5B2',
  width = 227.65,
  offsetY = 540,
  offsetX = 0,
  countUp = true,
  countDuration = 1.2,
  container = document.body,
} = {}) {

  // ---------------------------------------------------------------------------
  // 1. Inyectar estilos (una sola vez)
  // ---------------------------------------------------------------------------
  const STYLE_ID = 'hud-insight-card-styles'
  if (!document.getElementById(STYLE_ID)) {
    const style = document.createElement('style')
    style.id = STYLE_ID
    style.textContent = `
      .hud-insight {
        position: fixed;
        z-index: 9998;
        pointer-events: none;
        opacity: 0;
      }
      .hud-insight__card {
        position: relative;
        width: 260px;
        background: rgba(14, 20, 33, 0);
        box-shadow: 0px 10.1834px 40.7337px rgba(3, 2, 4, 0);
        backdrop-filter: blur(0px);
        -webkit-backdrop-filter: blur(0px);
        border-radius: 25.4585px;
        padding: 32px;
        text-align: center;
        transform-origin: center center;
        will-change: transform, background-color, box-shadow, backdrop-filter;
        overflow: hidden;
        transition:
          background-color 0.45s ease-out,
          box-shadow      0.45s ease-out,
          backdrop-filter 0.45s ease-out,
          -webkit-backdrop-filter 0.45s ease-out;
      }
      .hud-insight__card--filled {
        background: rgba(14, 20, 33, 0.45);
        box-shadow: 0px 10.1834px 40.7337px rgba(3, 2, 4, 0.37);
        backdrop-filter: blur(15px);
        -webkit-backdrop-filter: blur(15px);
      }
      .hud-insight__border-svg {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        z-index: 2;
      }
      .hud-insight__border-rect {
        fill: none;
        stroke: rgba(0, 221, 255, 0.8);
        stroke-width: 1.6;
      }
      .hud-insight__glow {
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
      .hud-insight__hero,
      .hud-insight__label,
      .hud-insight__loading {
        position: relative;
        z-index: 1;
      }
      .hud-insight__hero {
        display: flex;
        align-items: flex-end;
        justify-content: center;
        gap: 6px;
        line-height: 1;
      }
      .hud-insight__number {
        font-family: 'Poppins', var(--hi-font-sans);
        font-style: normal;
        font-weight: 400;
        font-size: 88px;
        color: var(--hi-valor-color);
        letter-spacing: -0.02em;
        line-height: 1;
        font-variant-numeric: tabular-nums;
      }
      .hud-insight__suffix {
        font-family: 'Poppins', var(--hi-font-sans);
        font-style: normal;
        font-weight: 600;
        font-size: 28px;
        color: var(--hi-sufijo-color);
        margin-bottom: 12px;
      }
      .hud-insight__label {
        font-family: 'Poppins', var(--hi-font-sans);
        font-style: normal;
        font-weight: 400;
        font-size: 16px;
        color: var(--hi-etiqueta-color);
        margin-top: 14px;
        letter-spacing: 0.01em;
      }
      .hud-insight__loading {
        position: relative;
        height: 1.5px;
        margin: 22px 12px 0;
        background: rgba(120, 140, 160, 0.18);
        border-radius: 2px;
        overflow: hidden;
        opacity: 0;
      }
      .hud-insight__loading::after {
        content: '';
        position: absolute;
        top: -1px;
        left: 0;
        width: 60%;
        height: 3.5px;
        background: linear-gradient(
          90deg,
          transparent 0%,
          var(--hi-color) 50%,
          transparent 100%
        );
        box-shadow: 0 0 12px var(--hi-color);
        animation: hud-insight-loading 2.4s ease-in-out infinite;
        animation-play-state: paused;
      }
      .hud-insight__loading--playing::after {
        animation-play-state: running;
      }
      @keyframes hud-insight-loading {
        0%   { transform: translateX(-100%); }
        50%  { transform: translateX(100%); }
        100% { transform: translateX(100%); }
      }
      .hud-insight__connector {
        position: absolute;
        left: 50%;
        top: 100%;
        transform: translateX(-50%);
        width: 1.5px;
        background: linear-gradient(
          180deg,
          var(--hi-color) 0%,
          var(--hi-color) 90%,
          transparent 100%
        );
        box-shadow: 0 0 6px var(--hi-glow-outer);
        opacity: 0;
        transform-origin: bottom center;
      }
      .hud-insight__connector-dot {
        position: absolute;
        left: 50%;
        bottom: -4px;
        transform: translateX(-50%) scale(0);
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
  el.className = 'hud-insight'

  el.style.setProperty('--hi-color', color)
  el.style.setProperty('--hi-glow-outer', hexToRgba(color, 0.45))
  el.style.setProperty('--hi-glow-inner', hexToRgba(color, 0.25))
  el.style.setProperty('--hi-valor-color', valorColor)
  el.style.setProperty('--hi-etiqueta-color', etiquetaColor)
  el.style.setProperty('--hi-sufijo-color', sufijoColor)
  el.style.setProperty('--hi-font-sans', "'Inter', 'Helvetica Neue', system-ui, sans-serif")

  const cardEl = document.createElement('div')
  cardEl.className = 'hud-insight__card'

  const glowEl = document.createElement('div')
  glowEl.className = 'hud-insight__glow'
  cardEl.appendChild(glowEl)

  const SVG_NS = 'http://www.w3.org/2000/svg'
  const borderSvg = document.createElementNS(SVG_NS, 'svg')
  borderSvg.setAttribute('class', 'hud-insight__border-svg')
  borderSvg.setAttribute('preserveAspectRatio', 'none')

  const borderRect = document.createElementNS(SVG_NS, 'rect')
  borderRect.setAttribute('class', 'hud-insight__border-rect')
  borderRect.setAttribute('rx', '25.4585')
  borderRect.setAttribute('ry', '25.4585')
  borderSvg.appendChild(borderRect)
  cardEl.appendChild(borderSvg)

  const heroEl = document.createElement('div')
  heroEl.className = 'hud-insight__hero'

  const numberEl = document.createElement('div')
  numberEl.className = 'hud-insight__number'
  numberEl.textContent = '0'

  const suffixEl = document.createElement('div')
  suffixEl.className = 'hud-insight__suffix'
  suffixEl.textContent = sufijo

  heroEl.appendChild(numberEl)
  heroEl.appendChild(suffixEl)

  const labelEl = document.createElement('div')
  labelEl.className = 'hud-insight__label'
  labelEl.textContent = etiqueta

  const loadingEl = document.createElement('div')
  loadingEl.className = 'hud-insight__loading'

  cardEl.appendChild(heroEl)
  cardEl.appendChild(labelEl)
  cardEl.appendChild(loadingEl)

  const connectorEl = document.createElement('div')
  connectorEl.className = 'hud-insight__connector'

  const connectorDotEl = document.createElement('div')
  connectorDotEl.className = 'hud-insight__connector-dot'
  connectorEl.appendChild(connectorDotEl)

  el.appendChild(cardEl)
  el.appendChild(connectorEl)
  container.appendChild(el)

  // ---------------------------------------------------------------------------
  // 3. Estado interno
  // ---------------------------------------------------------------------------
  const state = {
    currentValor: 0,
    targetValor: valor,
    visible: false,
    anchor3D: new THREE.Vector3(anchor3D.x, anchor3D.y, anchor3D.z),
    countTween: null,
    masterTimeline: null,
    borderPerimeter: 0,
  }

  const _projVec = new THREE.Vector3()

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

    const cardX = screenX + offsetX
    const cardY = screenY - offsetY

    const cardRect = cardEl.getBoundingClientRect()
    const cardWidth = cardRect.width

    el.style.left = `${cardX - cardWidth / 2}px`
    el.style.top  = `${cardY}px`

    const cardBottomY = cardY + cardRect.height
    const connectorHeight = Math.max(0, screenY - cardBottomY)
    connectorEl.style.height = `${connectorHeight}px`
  }

  // ---------------------------------------------------------------------------
  // 5. Setup del borde SVG
  // ---------------------------------------------------------------------------
  function setupBorderSvg() {
    const cardRect = cardEl.getBoundingClientRect()
    const w = cardRect.width
    const h = cardRect.height

    if (w === 0 || h === 0) return

    const sw = 1.6
    const half = sw / 2

    borderSvg.setAttribute('viewBox', `0 0 ${w} ${h}`)
    borderRect.setAttribute('x', half)
    borderRect.setAttribute('y', half)
    borderRect.setAttribute('width', w - sw)
    borderRect.setAttribute('height', h - sw)

    const r = 25.4585
    const perim = 2 * (w + h) - 8 * r + 2 * Math.PI * r
    state.borderPerimeter = perim

    borderRect.style.strokeDasharray  = `${perim}`
    borderRect.style.strokeDashoffset = `${perim}`
  }

  // ---------------------------------------------------------------------------
  // 6. API: show / hide / setValor / setEtiqueta / setAnchor
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

    cardEl.classList.remove('hud-insight__card--filled')
    loadingEl.classList.remove('hud-insight__loading--playing')

    gsap.set(connectorDotEl, { scale: 0 })
    gsap.set(connectorEl,    { opacity: 0, scaleY: 0 })
    gsap.set(glowEl,         { opacity: 0 })
    gsap.set(borderRect,     { strokeDashoffset: state.borderPerimeter })
    gsap.set(heroEl,         { opacity: 0 })
    gsap.set(suffixEl,       { opacity: 0, y: 0 })
    gsap.set(labelEl,        { opacity: 0, y: 8 })
    gsap.set(loadingEl,      { opacity: 0 })

    state.currentValor = 0
    numberEl.textContent = '0'

    const tl = gsap.timeline()
    state.masterTimeline = tl

    tl.to(connectorDotEl, {
      scale: 1,
      duration: 0.25,
      ease: 'back.out(2.5)',
    }, 0)

    tl.to(connectorEl, {
      opacity: 1,
      scaleY: 1,
      duration: 0.45,
      ease: 'power2.out',
    }, 0.15)

    tl.to(borderRect, {
      strokeDashoffset: 0,
      duration: 0.75,
      ease: 'power2.inOut',
    }, 0.5)

    tl.add(() => {
      cardEl.classList.add('hud-insight__card--filled')
    }, 1.10)

    tl.to(glowEl, {
      opacity: 1,
      duration: 0.5,
      ease: 'power2.out',
    }, 1.15)

    tl.to(heroEl, {
      opacity: 1,
      duration: 0.3,
      ease: 'power2.out',
    }, 1.20)

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
      }, 1.20)
    } else {
      state.currentValor = state.targetValor
      numberEl.textContent = String(Math.round(state.targetValor))
    }

    tl.to(suffixEl, {
      opacity: 1,
      duration: 0.35,
      ease: 'power2.out',
    }, 1.20 + countDuration * 0.6)

    tl.to(labelEl, {
      opacity: 1,
      y: 0,
      duration: 0.4,
      ease: 'power2.out',
    }, 1.20 + countDuration * 0.75)

    tl.to(loadingEl, {
      opacity: 1,
      duration: 0.3,
      ease: 'power2.out',
      onStart: () => loadingEl.classList.add('hud-insight__loading--playing'),
    }, 1.20 + countDuration * 0.9)
  }

  function hide() {
    if (!state.visible) return
    state.visible = false

    if (state.masterTimeline) state.masterTimeline.kill()
    if (state.countTween) state.countTween.kill()

    // ─── Salida secuencial (~1.8s total) ──────────────────────────────────
    // Orden estricto sin solapes en el tramo final:
    //   1) Contenido + glow (paralelo, ~0.25s)
    //   2) Fondo del card desaparece (0.45s, via transition CSS)
    //   3) Borde se desdibuja completo (0.55s, sin pisar lo siguiente)
    //   4) Línea conectora se retrae (0.35s, después del borde)
    //   5) Dot se apaga al final (0.2s)
    const tl = gsap.timeline({
      onComplete: () => {
        loadingEl.classList.remove('hud-insight__loading--playing')
        cardEl.classList.remove('hud-insight__card--filled')
        el.style.opacity = '0'
      },
    })
    state.masterTimeline = tl

    // [0.00s] Contenido desaparece (stagger 0.04s)
    tl.to([loadingEl, labelEl, suffixEl, heroEl], {
      opacity: 0,
      duration: 0.2,
      stagger: 0.04,
      ease: 'power2.in',
    }, 0)

    // [0.00s] Glow decorativo desaparece junto con el contenido
    tl.to(glowEl, {
      opacity: 0,
      duration: 0.25,
      ease: 'power2.in',
    }, 0)

    // [0.30s] El card pierde su fondo (background + box-shadow + blur)
    //         La transition CSS dura 0.45s → estable a los 0.75s
    tl.add(() => {
      cardEl.classList.remove('hud-insight__card--filled')
    }, 0.30)

    // [0.75s] Borde se desdibuja COMPLETO antes de tocar el connector
    //         Duración 0.55s → termina en 1.30s
    tl.to(borderRect, {
      strokeDashoffset: state.borderPerimeter,
      duration: 0.55,
      ease: 'power2.inOut',
    }, 0.75)

    // [1.35s] DESPUÉS de que el borde terminó completamente, la línea conectora se retrae
    //         Duración 0.35s → termina en 1.70s
    tl.to(connectorEl, {
      opacity: 0,
      scaleY: 0,
      duration: 0.35,
      ease: 'power2.in',
    }, 1.35)

    // [1.65s] AL FINAL, el dot se apaga (ligero solape de 0.05s con el final
    //         de la línea conectora, queda más natural que pegado al frame)
    //         Duración 0.2s → termina en 1.85s
    tl.to(connectorDotEl, {
      scale: 0,
      duration: 0.2,
      ease: 'power2.in',
    }, 1.65)
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

  function setEtiqueta(nueva) {
    labelEl.textContent = String(nueva)
  }

  function setAnchor(xyz) {
    state.anchor3D.set(xyz.x, xyz.y, xyz.z)
  }

  function destroy() {
    if (state.masterTimeline) state.masterTimeline.kill()
    if (state.countTween) state.countTween.kill()
    gsap.killTweensOf([el, cardEl, connectorEl, glowEl, heroEl, suffixEl, labelEl, loadingEl, borderRect, connectorDotEl])
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