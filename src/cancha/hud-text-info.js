// src/cancha/hud-text-info.js

import gsap from 'gsap'

/**
 * Crea un componente HUD Text Info: pill fijo en pantalla con label + value
 * para mostrar telemetría en vivo de lo que pasa en la cancha.
 *
 * Estética: cyberpunk tactical HUD / military surveillance system.
 * Renderizado: HTML/CSS overlay (no WebGL).
 *
 * @param {Object} opts
 * @param {string} opts.label           - Texto del label (izquierda, mono/cyan)
 * @param {string|number} opts.value    - Texto del value (derecha, sans/blanco)
 * @param {string} opts.color           - Color principal (cyan por defecto)
 * @param {string} opts.labelColor      - Color del label (default = color)
 * @param {string} opts.valueColor      - Color del value (default blanco)
 * @param {string} opts.position        - 'bottom' | 'top' | 'bottom-left' | 'bottom-right' | 'top-left' | 'top-right'
 * @param {number} opts.offsetY         - Offset vertical en píxeles desde el borde
 * @param {number} opts.offsetX         - Offset horizontal en píxeles (para esquinas)
 * @param {number} opts.glitchIntensity - 0..1, fuerza del glitch
 * @param {number} opts.revealSpeed     - Multiplicador de velocidad de entrada
 * @param {number} opts.flickerAmount   - 0..1, intensidad del flicker idle
 * @param {number} opts.glowStrength    - 0..2, fuerza del glow
 * @param {string} opts.fontSizeLabel   - Tamaño del label (con unidad CSS)
 * @param {string} opts.fontSizeValue   - Tamaño del value (con unidad CSS)
 * @param {string} opts.fontMono        - Familia de fuente mono
 * @param {string} opts.fontSans        - Familia de fuente sans
 * @param {string} opts.separator       - Carácter separador entre label y value
 * @param {HTMLElement} opts.container  - Donde montarlo (default: body)
 *
 * @returns {{
 *   el: HTMLElement,
 *   show: () => void,
 *   hide: () => void,
 *   pulse: () => void,
 *   setLabel: (s:string) => void,
 *   setValue: (s:string|number) => void,
 *   destroy: () => void,
 * }}
 */
export function createHudTextInfo({
  label = 'Analizando',
  value = '247 acciones',
  color = '#00f0ff',
  labelColor = null,
  valueColor = '#ffffff',
  position = 'bottom',
  offsetY = 40,
  offsetX = 40,
  glitchIntensity = 1.0,
  revealSpeed = 1.4,
  flickerAmount = 0.5,
  glowStrength = 1.0,
  fontSizeLabel = '18px',
  fontSizeValue = '18px',
  fontMono = "'JetBrains Mono', 'Fira Code', 'Courier New', monospace",
  fontSans = "'Inter', 'Helvetica Neue', system-ui, sans-serif",
  separator = '>',
  container = document.body,
} = {}) {

  const finalLabelColor = labelColor || color

  // ---------------------------------------------------------------------------
  // 1. Inyectar estilos una sola vez (id único)
  // ---------------------------------------------------------------------------
  const STYLE_ID = 'hud-text-info-styles'
  if (!document.getElementById(STYLE_ID)) {
    const style = document.createElement('style')
    style.id = STYLE_ID
    style.textContent = `
      .hud-text-info {
        position: fixed;
        z-index: 9999;
        display: inline-flex;
        align-items: center;
        gap: 0.6em;
        padding: 0.55em 1.4em 0.55em 1em;
        border: 1.2px solid var(--hti-color);
        border-radius: 999px;
        background: rgba(0, 12, 20, 0.55);
        backdrop-filter: blur(6px);
        -webkit-backdrop-filter: blur(6px);
        white-space: nowrap;
        pointer-events: none;
        user-select: none;
        opacity: 0;
        box-shadow:
          0 0 12px var(--hti-glow-outer),
          inset 0 0 8px var(--hti-glow-inner);
        transition: box-shadow 0.3s ease;
        will-change: transform, opacity, clip-path;
      }
      .hud-text-info__dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: var(--hti-color);
        box-shadow:
          0 0 6px var(--hti-color),
          0 0 12px var(--hti-color),
          0 0 20px var(--hti-glow-outer);
        flex-shrink: 0;
      }
      .hud-text-info__label {
        font-family: var(--hti-font-mono);
        font-size: var(--hti-size-label);
        font-weight: 700;
        color: var(--hti-label-color);
        letter-spacing: 0.08em;
        text-shadow:
          0 0 6px var(--hti-glow-outer),
          0 0 14px var(--hti-glow-inner);
        display: inline-block;
        position: relative;
      }
      .hud-text-info__sep {
        font-family: var(--hti-font-mono);
        font-size: var(--hti-size-label);
        font-weight: 400;
        color: var(--hti-label-color);
        opacity: 0.85;
        text-shadow: 0 0 4px var(--hti-glow-outer);
      }
      .hud-text-info__value {
        font-family: var(--hti-font-sans);
        font-size: var(--hti-size-value);
        font-weight: 400;
        color: var(--hti-value-color);
        letter-spacing: 0.04em;
        display: inline-block;
        position: relative;
      }
      /* Chromatic aberration: aplicado SOLO a los caracteres random del scramble
         (noise children), nunca a los caracteres finales (real children) ni al
         texto en idle. Esto da el efecto glitch durante la "búsqueda" del dato
         pero la letra final siempre se ve limpia y al grosor correcto. */
      .hud-text-info--ca .hud-text-info__char-noise {
        text-shadow:
          -1.5px 0 0 rgba(255, 0, 80, 0.85),
          1.5px 0 0 rgba(0, 220, 255, 0.85),
          0 0 8px var(--hti-glow-outer);
      }
      /* Banda horizontal de signal loss (clip-path animable) */
      .hud-text-info--loss .hud-text-info__inner {
        clip-path: polygon(
          0 0, 100% 0,
          100% 35%, 0 35%,
          0 45%, 100% 45%,
          100% 70%, 0 70%,
          0 80%, 100% 80%,
          100% 100%, 0 100%
        );
      }
      .hud-text-info__inner {
        display: inline-flex;
        align-items: center;
        gap: 0.6em;
      }
      .hud-text-info__char {
        display: inline-block;
        position: relative;       /* ancla para el hijo absoluto del scramble */
        opacity: 0;
      }
      .hud-text-info__char--scrambling {
        opacity: 1;
      }
      .hud-text-info__char--locked {
        opacity: 1;
      }
      /* El hijo "real" tiene el carácter final y reserva el ancho.
         Solo es visible en estado locked. Cambio instantáneo (sin transition)
         para evitar superposición con el noise durante el cross-fade, que
         producía un efecto de doble-trazo (texto que se ve "bold"). */
      .hud-text-info__char-real {
        opacity: 0;
      }
      .hud-text-info__char--locked .hud-text-info__char-real {
        opacity: 1;
      }
      /* El hijo "noise" muestra el carácter random durante el scramble.
         Position:absolute para no afectar el ancho del padre.
         Solo visible en estado scrambling. */
      .hud-text-info__char-noise {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        text-align: center;
        opacity: 0;
        pointer-events: none;
      }
      .hud-text-info__char--scrambling .hud-text-info__char-noise {
        opacity: 0.5;
      }
    `
    document.head.appendChild(style)
  }

  // ---------------------------------------------------------------------------
  // 2. Construir DOM
  // ---------------------------------------------------------------------------
  const el = document.createElement('div')
  el.className = 'hud-text-info'

  // CSS variables locales (no contaminan globalmente)
  el.style.setProperty('--hti-color', color)
  el.style.setProperty('--hti-glow-outer', hexToRgba(color, 0.3 * glowStrength))
  el.style.setProperty('--hti-glow-inner', hexToRgba(color, 0.3 * glowStrength))
  el.style.setProperty('--hti-label-color', finalLabelColor)
  el.style.setProperty('--hti-value-color', valueColor)
  el.style.setProperty('--hti-font-mono', fontMono)
  el.style.setProperty('--hti-font-sans', fontSans)
  el.style.setProperty('--hti-size-label', fontSizeLabel)
  el.style.setProperty('--hti-size-value', fontSizeValue)

  // Posicionamiento
  applyPosition(el, position, offsetX, offsetY)

  const inner = document.createElement('div')
  inner.className = 'hud-text-info__inner'

  const dotEl = document.createElement('div')
  dotEl.className = 'hud-text-info__dot'

  const labelEl = document.createElement('span')
  labelEl.className = 'hud-text-info__label'
  labelEl.textContent = label

  const sepEl = document.createElement('span')
  sepEl.className = 'hud-text-info__sep'
  sepEl.textContent = separator
  sepEl.style.display = 'none'  // ← oculto hasta su turno en la secuencia

  const valueEl = document.createElement('span')
  valueEl.className = 'hud-text-info__value'
  valueEl.textContent = String(value)
  valueEl.style.display = 'none'  // ← oculto hasta su turno en la secuencia

  inner.appendChild(dotEl)
  inner.appendChild(labelEl)
  inner.appendChild(sepEl)
  inner.appendChild(valueEl)
  el.appendChild(inner)
  container.appendChild(el)

  // ---------------------------------------------------------------------------
  // 3. Estado interno
  // ---------------------------------------------------------------------------
  // Valores iniciales (inmutables, usados por reset() cuando no se le pasan args)
  const initialLabel = label
  const initialValue = String(value)

  const state = {
    currentLabel: initialLabel,
    currentValue: initialValue,
    visible: false,
    idleTween: null,
    dotIdleTween: null,
    glitchTween: null,
    scrambleAnimId: null,
  }

  const SCRAMBLE_CHARS = '!<>-_\\/[]{}—=+*^?#█▓▒░ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'

  function scrambleString(target, lockedRatio) {
    let out = ''
    for (let i = 0; i < target.length; i++) {
      const ch = target[i]
      if (ch === ' ') { out += ' '; continue }
      const pos = i / Math.max(1, target.length - 1)
      if (pos < lockedRatio) {
        out += Math.random() < 0.92 ? ch : SCRAMBLE_CHARS[(Math.random() * SCRAMBLE_CHARS.length) | 0]
      } else {
        out += SCRAMBLE_CHARS[(Math.random() * SCRAMBLE_CHARS.length) | 0]
      }
    }
    return out
  }

  // ---------------------------------------------------------------------------
  // 4. Helpers de spans por carácter
  // ---------------------------------------------------------------------------
  //
  // Estrategia para evitar el efecto "el contenedor cambia de tamaño todo el
  // tiempo": construimos los spans con el TEXTO FINAL desde el frame 0. Esto
  // garantiza que el ancho del contenedor está reservado desde el principio.
  //
  // El reveal funciona así:
  //   - Inicialmente, todos los spans tienen el carácter correcto pero opacity 0
  //   - Un cursor avanza progresivamente posición por posición
  //   - El span en el cursor entra en estado "scrambling" (opacity 0.5,
  //     carácter random rotando ~80ms) durante un breve window
  //   - Tras ese window, el span se fija (opacity 1, carácter correcto)
  //   - Como cada span ya tiene el carácter correcto reservando su ancho final,
  //     el contenedor crece de forma monótona y predecible
  //
  function buildCharSpans(targetEl, finalText) {
    targetEl.innerHTML = ''
    const spans = []
    for (let i = 0; i < finalText.length; i++) {
      const ch = finalText[i]
      const span = document.createElement('span')
      span.className = 'hud-text-info__char'

      if (ch === ' ') {
        // Los espacios no tienen scramble: solo nbsp directo en el padre
        span.textContent = '\u00A0'
        span.classList.add('hud-text-info__char--locked')
      } else {
        // Estructura: padre tiene 2 hijos
        //   - "real": el carácter final correcto, reserva el ancho
        //   - "noise": el carácter random, position:absolute, no afecta ancho
        const realSpan = document.createElement('span')
        realSpan.className = 'hud-text-info__char-real'
        realSpan.textContent = ch

        const noiseSpan = document.createElement('span')
        noiseSpan.className = 'hud-text-info__char-noise'
        noiseSpan.textContent = ''

        span.appendChild(realSpan)
        span.appendChild(noiseSpan)
        span._real = realSpan
        span._noise = noiseSpan
      }

      targetEl.appendChild(span)
      spans.push(span)
    }
    return spans
  }

  // ---------------------------------------------------------------------------
  // 5. Reveal secuencial: cursor avanza, cada carácter scramblea brevemente
  // ---------------------------------------------------------------------------
  function revealAnimation(targetEl, finalText, durationMs = 2100) {
    return new Promise(resolve => {
      const spans = buildCharSpans(targetEl, finalText)
      const nonSpaceIndices = []
      for (let i = 0; i < finalText.length; i++) {
        if (finalText[i] !== ' ') nonSpaceIndices.push(i)
      }

      // Duración del scramble por carácter (solapado con el cursor).
      // Cada carácter scramblea durante 2.2 "slots" del cursor → da sensación
      // de que varios caracteres adyacentes están en scramble al mismo tiempo,
      // pero el cursor avanza monótonamente y los caracteres se locked en orden.
      const totalChars = Math.max(1, nonSpaceIndices.length)
      const slotMs = durationMs / totalChars
      const scrambleWindowMs = slotMs * 2.2

      // Estado por carácter
      const charStates = spans.map(() => ({
        phase: 'hidden',           // 'hidden' | 'scrambling' | 'locked'
        scrambleStart: 0,
        lastScrambleSwap: 0,
      }))

      // Espacios se locked al instante (ya lo hizo buildCharSpans)
      for (let i = 0; i < finalText.length; i++) {
        if (finalText[i] === ' ') {
          charStates[i].phase = 'locked'
        }
      }

      const startTime = performance.now()
      const SCRAMBLE_SWAP_MS = 60  // cada cuánto cambia el carácter random durante scramble

      function tick() {
        const now = performance.now()
        const elapsed = now - startTime

        // Cursor: índice del carácter no-espacio que debería iniciar scramble ahora
        // (basado en tiempo, no en frames → independiente de FPS)
        const cursorFloat = elapsed / slotMs
        const cursorIdx = Math.floor(cursorFloat)

        // 1. Activar scramble en caracteres cuyo turno haya llegado
        for (let n = 0; n <= cursorIdx && n < nonSpaceIndices.length; n++) {
          const i = nonSpaceIndices[n]
          if (charStates[i].phase === 'hidden') {
            charStates[i].phase = 'scrambling'
            charStates[i].scrambleStart = startTime + n * slotMs
            charStates[i].lastScrambleSwap = 0
            spans[i].classList.add('hud-text-info__char--scrambling')
          }
        }

        // 2. Procesar caracteres en estado scrambling
        for (let i = 0; i < spans.length; i++) {
          const st = charStates[i]
          if (st.phase !== 'scrambling') continue

          const scrambleElapsed = now - st.scrambleStart

          if (scrambleElapsed >= scrambleWindowMs) {
            // Pasar a locked: ocultar noise, mostrar real
            spans[i]._noise.textContent = ''
            spans[i].classList.remove('hud-text-info__char--scrambling')
            spans[i].classList.add('hud-text-info__char--locked')
            st.phase = 'locked'
          } else if (now - st.lastScrambleSwap >= SCRAMBLE_SWAP_MS) {
            // Cambiar carácter random en el hijo noise (no afecta el ancho)
            spans[i]._noise.textContent = SCRAMBLE_CHARS[(Math.random() * SCRAMBLE_CHARS.length) | 0]
            st.lastScrambleSwap = now
          }
        }

        // ¿Terminamos? cuando todos los no-espacios están locked
        let allLocked = true
        for (let n = 0; n < nonSpaceIndices.length; n++) {
          if (charStates[nonSpaceIndices[n]].phase !== 'locked') {
            allLocked = false
            break
          }
        }

        if (!allLocked) {
          state.scrambleAnimId = requestAnimationFrame(tick)
        } else {
          // Garantizar estado final limpio: noise vacío, locked en todos
          for (let i = 0; i < spans.length; i++) {
            if (finalText[i] === ' ') {
              spans[i].textContent = '\u00A0'
            } else {
              if (spans[i]._noise) spans[i]._noise.textContent = ''
            }
            spans[i].classList.remove('hud-text-info__char--scrambling')
            spans[i].classList.add('hud-text-info__char--locked')
          }
          state.scrambleAnimId = null
          resolve()
        }
      }
      state.scrambleAnimId = requestAnimationFrame(tick)
    })
  }

  // ---------------------------------------------------------------------------
  // Helper: medir ancho final que tendría un texto dado dentro de targetEl,
  // usando los mismos estilos (clase) para que la métrica sea exacta.
  // ---------------------------------------------------------------------------
  function measureTextWidth(targetEl, newText) {
    const measureEl = document.createElement('span')
    measureEl.className = targetEl.className
    measureEl.style.position = 'absolute'
    measureEl.style.visibility = 'hidden'
    measureEl.style.whiteSpace = 'nowrap'
    measureEl.style.pointerEvents = 'none'
    measureEl.style.width = 'auto'
    measureEl.textContent = newText
    inner.appendChild(measureEl)
    const w = Math.ceil(measureEl.getBoundingClientRect().width)
    inner.removeChild(measureEl)
    return w
  }

  // ---------------------------------------------------------------------------
  // Helper: anima el ancho de targetEl desde su ancho actual hasta el ancho
  // necesario para el newText. Si los anchos son iguales (o muy parecidos),
  // no hace nada. Útil para que cualquier cambio de texto en vivo sea suave.
  //
  // No bloquea: devuelve una Promise que resuelve cuando termina la animación,
  // pero el caller puede ignorarla y seguir con el scramble en paralelo.
  // ---------------------------------------------------------------------------
  function animateWidthForNewText(targetEl, newText, durationMs = 200) {
    return new Promise(resolve => {
      const currentWidth = targetEl.getBoundingClientRect().width
      const targetWidth = measureTextWidth(targetEl, newText)

      // Si la diferencia es despreciable, no animar (evita micro-jitter)
      if (Math.abs(currentWidth - targetWidth) < 1) {
        resolve()
        return
      }

      // Fijar el ancho actual antes de empezar (para que GSAP no tome 'auto')
      targetEl.style.overflow = 'hidden'
      targetEl.style.whiteSpace = 'nowrap'
      targetEl.style.width = `${currentWidth}px`

      gsap.to(targetEl, {
        width: targetWidth,
        duration: durationMs / 1000,
        ease: 'power2.out',
        onComplete: () => {
          // Restaurar a auto para que setValue siguientes funcionen bien
          targetEl.style.width = ''
          targetEl.style.overflow = ''
          targetEl.style.whiteSpace = ''
          resolve()
        },
      })
    })
  }

  // Scramble breve para cambios de valor en vivo. Ahora con crecimiento
  // progresivo del ancho del elemento si el nuevo texto cambia de longitud.
  // El width se anima en paralelo con el scramble (ambos arrancan a la vez).
  function scrambleSwap(targetEl, newText, durationMs = 750) {
    const finalText = String(newText)
    // Lanzar la animación de ancho en paralelo (no esperamos)
    animateWidthForNewText(targetEl, finalText, 200)
    // Scramble de los caracteres (el ancho ya está siendo controlado por la
    // animación de width, así que los spans pueden tener el texto final desde
    // el frame 0 sin causar saltos)
    return revealAnimation(targetEl, finalText, durationMs)
  }

  // ---------------------------------------------------------------------------
  // 5. Glitch micro-desplazamientos (loop random)
  // ---------------------------------------------------------------------------
  function startGlitchBursts() {
    function nextBurst() {
      const delay = 2 + Math.random() * 4 // cada 2-6s
      state.glitchTween = gsap.delayedCall(delay, () => {
        // Probabilidad de tipo de glitch
        const r = Math.random()
        if (r < 0.5) {
          // Micro-desplazamiento horizontal
          const dx = (Math.random() - 0.5) * 4 * glitchIntensity
          gsap.timeline()
            .to(el, { x: `+=${dx}`, duration: 0.04, ease: 'steps(1)' })
            .to(el, { x: `-=${dx}`, duration: 0.04, ease: 'steps(1)' })
        } else if (r < 0.8) {
          // Chromatic aberration flash
          el.classList.add('hud-text-info--ca')
          gsap.delayedCall(0.08 + Math.random() * 0.1, () => {
            el.classList.remove('hud-text-info--ca')
          })
        } else {
          // Signal loss breve
          el.classList.add('hud-text-info--loss')
          gsap.delayedCall(0.05 + Math.random() * 0.08, () => {
            el.classList.remove('hud-text-info--loss')
          })
        }
        nextBurst()
      })
    }
    nextBurst()
  }

  function stopGlitchBursts() {
    if (state.glitchTween) {
      state.glitchTween.kill()
      state.glitchTween = null
    }
    el.classList.remove('hud-text-info--ca')
    el.classList.remove('hud-text-info--loss')
  }

  // ---------------------------------------------------------------------------
  // 6. Idle flicker muy sutil (opacidad random ocasional)
  // ---------------------------------------------------------------------------
  function startIdleFlicker() {
    function nextFlicker() {
      const delay = 3 + Math.random() * 5
      state.idleTween = gsap.delayedCall(delay, () => {
        const dropTo = 1 - flickerAmount * 0.25 * Math.random()
        gsap.timeline()
          .to(el, { opacity: dropTo, duration: 0.04, ease: 'steps(1)' })
          .to(el, { opacity: 1, duration: 0.08, ease: 'power2.out' })
        nextFlicker()
      })
    }
    nextFlicker()
  }

  function stopIdleFlicker() {
    if (state.idleTween) {
      state.idleTween.kill()
      state.idleTween = null
    }
  }

  // ---------------------------------------------------------------------------
  // 7. Idle del dot: respiración sutil
  // ---------------------------------------------------------------------------
  function startDotBreathing() {
    state.dotIdleTween = gsap.to(dotEl, {
      opacity: 0.55,
      duration: 1.4,
      ease: 'sine.inOut',
      repeat: -1,
      yoyo: true,
    })
  }

  function stopDotBreathing() {
    if (state.dotIdleTween) {
      state.dotIdleTween.kill()
      state.dotIdleTween = null
    }
    gsap.set(dotEl, { opacity: 1 })
  }

  // Anima la aparición del separador con un breve scramble (similar a un char solo).
  // Usa la misma estructura padre+real+noise para mantener ancho estable.
  function revealSeparatorAnim(targetEl, finalChar, durationMs = 400) {
    return new Promise(resolve => {
      targetEl.style.display = ''
      targetEl.innerHTML = ''

      const span = document.createElement('span')
      span.className = 'hud-text-info__char hud-text-info__char--scrambling'

      const realSpan = document.createElement('span')
      realSpan.className = 'hud-text-info__char-real'
      realSpan.textContent = finalChar

      const noiseSpan = document.createElement('span')
      noiseSpan.className = 'hud-text-info__char-noise'
      noiseSpan.textContent = SCRAMBLE_CHARS[(Math.random() * SCRAMBLE_CHARS.length) | 0]

      span.appendChild(realSpan)
      span.appendChild(noiseSpan)
      targetEl.appendChild(span)

      const startTime = performance.now()
      let lastSwap = 0
      const SWAP_MS = 50

      function tick() {
        const now = performance.now()
        const elapsed = now - startTime

        if (elapsed >= durationMs) {
          noiseSpan.textContent = ''
          span.classList.remove('hud-text-info__char--scrambling')
          span.classList.add('hud-text-info__char--locked')
          resolve()
          return
        }

        if (now - lastSwap >= SWAP_MS) {
          noiseSpan.textContent = SCRAMBLE_CHARS[(Math.random() * SCRAMBLE_CHARS.length) | 0]
          lastSwap = now
        }
        requestAnimationFrame(tick)
      }
      requestAnimationFrame(tick)
    })
  }

  // ---------------------------------------------------------------------------
  // 8. API: show / hide / pulse / setLabel / setValue
  // ---------------------------------------------------------------------------
  async function show() {
    if (state.visible) return
    state.visible = true
    const D = 1 / revealSpeed

    // Estado inicial: label vacío, separador y value ocultos (display:none)
    // → el contenedor arrancará dimensionado solo para el dot
    gsap.set(el, { opacity: 0, scale: 0.92, x: 0 })
    gsap.set(dotEl, { scale: 0 })
    labelEl.innerHTML = ''
    sepEl.style.display = 'none'
    sepEl.innerHTML = ''
    valueEl.style.display = 'none'
    valueEl.innerHTML = ''

    // 1. Pill aparece con scale + opacity (tamaño mínimo: solo dot)
    gsap.to(el, {
      opacity: 1,
      scale: 1,
      duration: 0.35 * D,
      ease: 'back.out(1.6)',
    })

    // 2. Dot enciende con flash
    gsap.to(dotEl, {
      scale: 1,
      duration: 0.3 * D,
      delay: 0.1 * D,
      ease: 'back.out(2)',
    })

    // 3. Chromatic aberration durante toda la entrada
    el.classList.add('hud-text-info--ca')

    // Pequeña espera para que el pill se asiente antes de empezar el reveal
    await new Promise(r => setTimeout(r, 250 * D))

    // ─────────────────────────────────────────────────────────────────────────
    // 4. SECUENCIA ESTRICTA: label → separador → value
    //    Cada fase ocurre completa antes de la siguiente. El contenedor crece
    //    automáticamente porque cada span pasa de display:none a display:''.
    // ─────────────────────────────────────────────────────────────────────────

    // Fase A: revelar el label (palabra en cyan/verde)
    await revealAnimation(labelEl, state.currentLabel, 1400 * D)

    // Breve respiro antes de pasar al separador
    await new Promise(r => setTimeout(r, 180 * D))

    // Fase B: revelar el separador (>)
    await revealSeparatorAnim(sepEl, separator, 350 * D)

    // Breve respiro antes del value
    await new Promise(r => setTimeout(r, 180 * D))

    // ─────────────────────────────────────────────────────────────────────────
    // Fase C: revelar el value con CRECIMIENTO PROGRESIVO del contenedor.
    // El valueEl arranca con width:0 y crece hasta su ancho final medido,
    // en paralelo con el scramble de los caracteres.
    // ─────────────────────────────────────────────────────────────────────────

    // Preparar valueEl: visible pero comprimido a 0px de ancho
    valueEl.style.display = ''
    const finalValueWidth = measureTextWidth(valueEl, state.currentValue)
    valueEl.style.overflow = 'hidden'
    valueEl.style.whiteSpace = 'nowrap'
    valueEl.style.width = '0px'

    // Animar el ancho del valueEl en paralelo con el scramble de los chars.
    // El padre (inner) crecerá automáticamente porque es inline-flex.
    const valueRevealMs = 1600 * D
    gsap.to(valueEl, {
      width: finalValueWidth,
      duration: (valueRevealMs / 1000) * 0.95,
      ease: 'power2.out',
    })

    // Scramble de los caracteres (no afecta el ancho porque está clip-eado)
    await revealAnimation(valueEl, state.currentValue, valueRevealMs)

    // Restaurar valueEl a tamaño auto para que setValue() siguientes
    // funcionen sin width inline pegado
    valueEl.style.width = ''
    valueEl.style.overflow = ''
    valueEl.style.whiteSpace = ''

    // 5. Quitar chromatic aberration
    el.classList.remove('hud-text-info--ca')

    // 6. Activar idle states
    startDotBreathing()
    startIdleFlicker()
    startGlitchBursts()
  }

  function hide({ instant = false } = {}) {
    if (!state.visible) return
    state.visible = false

    stopIdleFlicker()
    stopGlitchBursts()
    stopDotBreathing()
    if (state.scrambleAnimId) {
      cancelAnimationFrame(state.scrambleAnimId)
      state.scrambleAnimId = null
    }

    // Cancelar cualquier tween activo de GSAP sobre el elemento
    gsap.killTweensOf(el)
    gsap.killTweensOf(dotEl)
    gsap.killTweensOf(valueEl)
    gsap.killTweensOf(labelEl)

    if (instant) {
      gsap.set(el, { opacity: 0, scale: 0.94 })
    } else {
      gsap.to(el, {
        opacity: 0,
        scale: 0.94,
        duration: 0.3,
        ease: 'power2.in',
      })
    }
  }

  // Resetea el componente a su estado inicial (oculto, sin contenido visible)
  // sin animación. Útil para preparar el componente para una nueva animación
  // de show() limpia.
  //
  // - reset() sin argumentos → restaura label y value a los valores con los
  //   que se creó el componente (initialLabel, initialValue).
  // - reset({ label, value }) → usa los valores que se le pasen.
  function reset({ label: newLabel, value: newValue } = {}) {
    // Cortar todo lo que esté en marcha
    hide({ instant: true })

    // Si no se pasa label/value explícitos, volver a los iniciales
    state.currentLabel = newLabel !== undefined ? String(newLabel) : initialLabel
    state.currentValue = newValue !== undefined ? String(newValue) : initialValue

    // Limpiar visualmente: labels vacíos, separador y value ocultos,
    // pill encogida e invisible. Próximo show() arranca limpio.
    labelEl.innerHTML = ''
    sepEl.innerHTML = separator
    sepEl.style.display = 'none'
    valueEl.innerHTML = ''
    valueEl.style.display = 'none'
    valueEl.style.width = ''
    valueEl.style.overflow = ''
    valueEl.style.whiteSpace = ''
    el.classList.remove('hud-text-info--ca')
    el.classList.remove('hud-text-info--loss')
    gsap.set(el, { opacity: 0, scale: 0.94, x: 0 })
    gsap.set(dotEl, { scale: 0, opacity: 1 })
  }

  function pulse() {
    // Pulso visual: dot crece y glow se intensifica brevemente
    gsap.timeline()
      .to(dotEl, { scale: 1.5, duration: 0.12, ease: 'power2.out' }, 0)
      .to(dotEl, { scale: 1, duration: 0.3, ease: 'power2.inOut' })
  }

  // ---------------------------------------------------------------------------
  // replay({ label, value }): reproduce la secuencia ordenada label → > → value
  // sin la animación inicial del pill (asume que ya está visible).
  //
  // Diferencia con show():
  //   - No anima la entrada del pill (ya está mostrado)
  //   - No vuelve a animar el separador (ya está visible y locked)
  //   - Sí anima label primero, espera, y luego value (en orden)
  //   - Tiempos más cortos que show() porque es un "swap de datos"
  //
  // Si no se le pasa label/value, usa los actuales del state (no muy útil,
  // pero soportado por consistencia).
  // ---------------------------------------------------------------------------
  async function replay({ label: newLabel, value: newValue } = {}) {
    // Cancelar cualquier scramble en marcha para evitar solapamientos
    if (state.scrambleAnimId) {
      cancelAnimationFrame(state.scrambleAnimId)
      state.scrambleAnimId = null
    }
    gsap.killTweensOf(labelEl)
    gsap.killTweensOf(valueEl)

    // Actualizar textos en el state si vienen como parámetros
    if (newLabel !== undefined) state.currentLabel = String(newLabel)
    if (newValue !== undefined) state.currentValue = String(newValue)

    const D = 1 / revealSpeed

    // ─────────────────────────────────────────────────────────────────────────
    // Resetear contenido visual de label y value: empezar desde vacío
    // (igual que el primer click). El separador queda intacto.
    // Ambos arrancan con width=0 para que crezcan progresivamente.
    // ─────────────────────────────────────────────────────────────────────────
    labelEl.innerHTML = ''
    labelEl.style.overflow = 'hidden'
    labelEl.style.whiteSpace = 'nowrap'
    labelEl.style.width = '0px'

    valueEl.innerHTML = ''
    valueEl.style.overflow = 'hidden'
    valueEl.style.whiteSpace = 'nowrap'
    valueEl.style.width = '0px'

    // Chromatic aberration breve durante el replay
    el.classList.add('hud-text-info--ca')

    // ─────────────────────────────────────────────────────────────────────────
    // Fase A: revelar label desde 0 al ancho final
    // ─────────────────────────────────────────────────────────────────────────
    const finalLabelWidth = measureTextWidth(labelEl, state.currentLabel)
    const labelRevealMs = 800 * D

    gsap.to(labelEl, {
      width: finalLabelWidth,
      duration: (labelRevealMs / 1000) * 0.95,
      ease: 'power2.out',
    })
    await revealAnimation(labelEl, state.currentLabel, labelRevealMs)

    // Limpiar estilos inline del label
    labelEl.style.width = ''
    labelEl.style.overflow = ''
    labelEl.style.whiteSpace = ''

    // Breve respiro
    await new Promise(r => setTimeout(r, 150 * D))

    // ─────────────────────────────────────────────────────────────────────────
    // Fase B: revelar value desde 0 al ancho final
    // ─────────────────────────────────────────────────────────────────────────
    const finalValueWidth = measureTextWidth(valueEl, state.currentValue)
    const valueRevealMs = 1000 * D

    gsap.to(valueEl, {
      width: finalValueWidth,
      duration: (valueRevealMs / 1000) * 0.95,
      ease: 'power2.out',
    })
    await revealAnimation(valueEl, state.currentValue, valueRevealMs)

    // Limpiar estilos inline del value
    valueEl.style.width = ''
    valueEl.style.overflow = ''
    valueEl.style.whiteSpace = ''

    // Quitar chromatic aberration
    el.classList.remove('hud-text-info--ca')
  }

  async function setLabel(newLabel) {
    state.currentLabel = String(newLabel)
    if (!state.visible) {
      labelEl.textContent = state.currentLabel
      return
    }
    await scrambleSwap(labelEl, state.currentLabel, 660)
  }

  async function setValue(newValue) {
    state.currentValue = String(newValue)
    if (!state.visible) {
      valueEl.textContent = state.currentValue
      return
    }
    // Chromatic aberration micro-flash + scramble del value
    el.classList.add('hud-text-info--ca')
    pulse()
    await scrambleSwap(valueEl, state.currentValue, 750)
    el.classList.remove('hud-text-info--ca')
  }

  function destroy() {
    stopIdleFlicker()
    stopGlitchBursts()
    stopDotBreathing()
    if (state.scrambleAnimId) cancelAnimationFrame(state.scrambleAnimId)
    if (el.parentNode) el.parentNode.removeChild(el)
  }

  return {
    el,
    show,
    hide,
    reset,
    replay,
    pulse,
    setLabel,
    setValue,
    destroy,
  }
}

// =============================================================================
// Helpers
// =============================================================================
function hexToRgba(hex, alpha = 1) {
  // Acepta #rrggbb o #rgb
  let h = hex.replace('#', '')
  if (h.length === 3) h = h.split('').map(c => c + c).join('')
  const r = parseInt(h.substring(0, 2), 16)
  const g = parseInt(h.substring(2, 4), 16)
  const b = parseInt(h.substring(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

function applyPosition(el, position, offsetX, offsetY) {
  // Resetear todo
  el.style.top = 'auto'
  el.style.bottom = 'auto'
  el.style.left = 'auto'
  el.style.right = 'auto'
  el.style.transform = ''

  switch (position) {
    case 'top':
      el.style.top = `${offsetY}px`
      el.style.left = '50%'
      el.style.transform = 'translateX(-50%)'
      break
    case 'bottom':
      el.style.bottom = `${offsetY}px`
      el.style.left = '50%'
      el.style.transform = 'translateX(-50%)'
      break
    case 'top-left':
      el.style.top = `${offsetY}px`
      el.style.left = `${offsetX}px`
      break
    case 'top-right':
      el.style.top = `${offsetY}px`
      el.style.right = `${offsetX}px`
      break
    case 'bottom-left':
      el.style.bottom = `${offsetY}px`
      el.style.left = `${offsetX}px`
      break
    case 'bottom-right':
      el.style.bottom = `${offsetY}px`
      el.style.right = `${offsetX}px`
      break
    default:
      el.style.bottom = `${offsetY}px`
      el.style.left = '50%'
      el.style.transform = 'translateX(-50%)'
  }
}