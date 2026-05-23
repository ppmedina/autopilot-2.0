// src/cancha/jugador-card.js
import * as THREE from 'three'
import gsap from 'gsap'
import { JUGADORES } from './jugadores.js'

const CW         = 420
const CH         = 500
const CX         = CW / 2
const RADIO      = 110
const RADIO_MASK = RADIO - 16
const CY_CIRC    = 230
const MASK_Y     = CY_CIRC - RADIO_MASK
const SCALE      = 2.2

// ── Canvas solo nombre — sin estructura ni fondo ─────────────────────────────
function crearCanvasSoloNombre(jugador) {
  const canvas = document.createElement('canvas')
  canvas.width = CW; canvas.height = CH
  const ctx = canvas.getContext('2d')
  ctx.clearRect(0, 0, CW, CH)

  const contH    = Math.round(24 * SCALE)
  const numBloqW = Math.round(25 * SCALE)
  const gap      = Math.round(6  * SCALE)
  const padIzq   = Math.round(6  * SCALE)
  const padDer   = Math.round(8  * SCALE)
  const contY    = CY_CIRC + RADIO + 28
  const r        = Math.round(4  * SCALE)
  const fontNombre = `500 ${Math.round(9 * SCALE)}px "Poppins", "Barlow", sans-serif`

  ctx.font = fontNombre
  const nombreAncho = Math.ceil(ctx.measureText(jugador.nombre).width)
  const contW = numBloqW + gap + padIzq + nombreAncho + padDer
  const contX = CX - contW / 2

  ctx.save()
  roundRect(ctx, contX, contY, contW, contH, r); ctx.clip()
  const contBg = ctx.createLinearGradient(contX, contY, contX + contW, contY)
  contBg.addColorStop(0.338, 'rgba(231, 231, 231, 0.04)')
  contBg.addColorStop(0.947, 'rgba(134, 134, 134, 0.24)')
  ctx.fillStyle = contBg; ctx.fillRect(contX, contY, contW, contH)
  ctx.restore()

  ctx.save()
  roundRect(ctx, contX, contY, contW, contH, r)
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.16)'; ctx.lineWidth = 3; ctx.stroke()
  ctx.restore()

  ctx.save()
  ctx.beginPath()
  ctx.moveTo(contX + r, contY); ctx.lineTo(contX + numBloqW, contY)
  ctx.lineTo(contX + numBloqW, contY + contH); ctx.lineTo(contX + r, contY + contH)
  ctx.quadraticCurveTo(contX, contY + contH, contX, contY + contH - r)
  ctx.lineTo(contX, contY + r)
  ctx.quadraticCurveTo(contX, contY, contX + r, contY)
  ctx.closePath(); ctx.fillStyle = '#178CEB'; ctx.fill()
  ctx.font = `bold ${Math.round(11 * SCALE)}px "Poppins", "Barlow Condensed", sans-serif`
  ctx.fillStyle = '#FFFFFF'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  ctx.fillText(String(jugador.numero), contX + numBloqW / 2, contY + contH / 2)
  ctx.restore()

  ctx.save()
  ctx.font = fontNombre; ctx.fillStyle = '#FFFFFF'
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle'
  ctx.fillText(jugador.nombre, contX + numBloqW + gap + padIzq, contY + contH / 2)
  ctx.restore()

  return canvas
}

// ── Canvas solo corners — 4 esquinas en forma de L alrededor del círculo ─────
function crearCanvasCorners() {
  const canvas = document.createElement('canvas')
  canvas.width = CW; canvas.height = CH
  const ctx = canvas.getContext('2d')
  ctx.clearRect(0, 0, CW, CH)

  const sep       = 0
  const brazoLen  = 28
  const grosor    = 5
  const halfSide  = RADIO + sep

  const xL = CX - halfSide
  const xR = CX + halfSide
  const yT = CY_CIRC - halfSide
  const yB = CY_CIRC + halfSide

  ctx.save()
  ctx.strokeStyle = '#4DD2FF'
  ctx.lineWidth   = grosor
  ctx.lineCap     = 'round'
  ctx.shadowColor = '#4DD2FF'
  ctx.shadowBlur  = 24

  ctx.beginPath()
  ctx.moveTo(xL, yT + brazoLen)
  ctx.lineTo(xL, yT)
  ctx.lineTo(xL + brazoLen, yT)
  ctx.stroke()

  ctx.beginPath()
  ctx.moveTo(xR - brazoLen, yT)
  ctx.lineTo(xR, yT)
  ctx.lineTo(xR, yT + brazoLen)
  ctx.stroke()

  ctx.beginPath()
  ctx.moveTo(xR, yB - brazoLen)
  ctx.lineTo(xR, yB)
  ctx.lineTo(xR - brazoLen, yB)
  ctx.stroke()

  ctx.beginPath()
  ctx.moveTo(xL + brazoLen, yB)
  ctx.lineTo(xL, yB)
  ctx.lineTo(xL, yB - brazoLen)
  ctx.stroke()

  ctx.restore()
  return canvas
}




// ── HOLOGRAMA: 3 sabores ─────────────────────────────────────────────────────
// Cada función dibuja un overlay tipo holograma sobre el círculo del jugador,
// usando técnicas sci-fi de proyección holográfica.
//
// Las 3 comparten un state común con campos:
//   state.time         tiempo absoluto en segundos
//   state.material     0..1 — progreso de "materialización Princess Leia"
//                      (0 = aún no aparece, 1 = totalmente materializado)
//   state.opacity      0..1 — opacidad global del holograma
//   state.flicker      0..1 — intensidad del flicker (0 = estable)
//
// Las técnicas comunes a todos los sabores:
//   - Scanlines horizontales (líneas finas cada 3px)
//   - Tinte cyan uniforme sobre el círculo
//   - Materialización: una "máscara" revela la imagen de abajo hacia arriba
//   - Flicker: oscilación de opacidad a ~4Hz
//   - Bordes con glow pulsante

const HOLO_CYAN     = '#4DD2FF'
const HOLO_CYAN_HOT = '#A8F0FF'
const HOLO_TINT     = 'rgba(77, 210, 255, 0.18)'

// Helper: aplica EXACTAMENTE la misma máscara que se usa para recortar la
// foto del jugador (ver crearCanvasSoloFoto y crearCanvasCompleto).
//
// La máscara tiene forma de "lápida vertical" (rectángulo alto + base
// semicircular). Va desde MASK_Y - RADIO_MASK (tope de la cabeza) hasta
// CY_CIRC + RADIO_MASK (abajo del torso). Es decir, cubre TODA la altura
// de la foto del jugador: cabeza, hombros, torso. El semicírculo inferior
// coincide con el círculo visible del card.
//
// Geometría:
//   ┌──────────────┐   ← y = MASK_Y - RADIO_MASK  (tope cabeza)
//   │ rectángulo   │
//   │ vertical     │
//   │ (cabeza/torso)│
//   ├──────────────┤   ← y = MASK_Y = CY_CIRC - RADIO_MASK
//    ╲            ╱    ← semicírculo inferior (radio = RADIO_MASK)
//     ╲──────────╱     ← y = CY_CIRC + RADIO_MASK (abajo del torso)
//
// Esto garantiza que los efectos del holograma cubran TODA la silueta del
// jugador (no solo la cabeza dentro del círculo), igual que la foto.
//
// Debe ser llamado dentro de un ctx.save() ya iniciado por el caller; el
// caller debe llamar ctx.restore() cuando termine de usar el clip.
function aplicarMascaraFoto(ctx) {
  ctx.beginPath()
  ctx.rect(CX - RADIO_MASK, MASK_Y - RADIO_MASK, RADIO_MASK * 2, RADIO_MASK)
  ctx.arc(CX, CY_CIRC, RADIO_MASK, Math.PI, 0, true)
  ctx.lineTo(CX + RADIO_MASK, MASK_Y)
  ctx.lineTo(CX - RADIO_MASK, MASK_Y)
  ctx.closePath()
  ctx.clip()
}

// Helper: calcula las posiciones del frente y la zona visible según la fase
// actual del holograma. state.material va de 0 a 3:
//   [0, 1)  ENTRADA  — frente sube de yBot a yTop, revelando hacia atrás
//   [1, 2]  PAUSA    — frente oculto, todo visible (malla "pensando")
//   (2, 3]  SALIDA   — frente baja de yTop a yBot, ocultando hacia atrás
//   > 3     FIN
//
// Retorna { frenteY, visibleY, visibleH, mostrarFrente, fase }
// fase: 'entrada' | 'pausa' | 'salida' | 'fin'
function calcularFaseHolograma(state) {
  const yTop = MASK_Y - RADIO_MASK
  const yBot = CY_CIRC + RADIO_MASK
  const altura = yBot - yTop

  if (state.material < 1.0) {
    // ENTRADA
    const frenteY = yBot - state.material * altura
    return {
      frenteY,
      visibleY: frenteY,
      visibleH: yBot - frenteY,
      mostrarFrente: state.material > 0,
      fase: 'entrada',
    }
  } else if (state.material <= 2.0) {
    // PAUSA — todo visible, frente oculto
    return {
      frenteY: yTop,
      visibleY: yTop,
      visibleH: altura,
      mostrarFrente: false,
      fase: 'pausa',
    }
  } else if (state.material <= 3.0) {
    // SALIDA — material 2→3 se mapea a salidaProgress 0→1
    const salidaProgress = state.material - 2.0
    const frenteY = yTop + salidaProgress * altura
    return {
      frenteY,
      visibleY: frenteY,
      visibleH: yBot - frenteY,
      mostrarFrente: salidaProgress < 1.0,
      fase: 'salida',
    }
  } else {
    // FIN — todo oculto
    return { frenteY: 0, visibleY: 0, visibleH: 0, mostrarFrente: false, fase: 'fin' }
  }
}


// ── Malla hexagonal — DOS MODOS ──────────────────────────────────────────
// Pinta una rejilla de hexágonos sobre la silueta del jugador.
//
// MODO 'crt' (look CRT/osciloscopio):
//   Cada hex flickea como un valor binario a 2-3 Hz. Cuando un hex se
//   "enciende", su brillo decae exponencialmente (~250ms) — persistencia
//   visual de fósforo. Look digital/tecnológico, datos procesándose.
//
//   Estado persistente en state.cellSparkTime (Map: 'col_row' → tStart):
//     - Se popula cuando un hex se enciende
//     - Se limpia cuando edad > 0.5s
//
// MODO 'respiracion' (look orgánico):
//   Cada hex tiene una pulsación sinusoidal continua con frecuencia, fase
//   y amplitud únicas. Brillo continuo entre base..(base+amplitud) sin
//   saltos discretos. Look orgánico, células respirando bajo microscopio.
//   No requiere estado persistente — todo se calcula desde state.time.
//
// Parámetros:
//   intensidadPulso: 0.3 (entrada/salida) o 1.0 (pausa) — modula el brillo
//   fase: 'entrada' | 'pausa' | 'salida' — actualmente no usado pero
//         disponible para variaciones
//   modo: 'crt' | 'respiracion' — qué algoritmo usar (default 'crt')
//
// El caller es responsable de aplicar el clip antes de invocar.
function pintarMallaHexagonal(ctx, state, intensidadPulso, fase, modo = 'crt') {
  const yTop = MASK_Y - RADIO_MASK
  const yBot = CY_CIRC + RADIO_MASK

  // Hexágonos visibles y claramente hexagonales
  const hexRadius = 8
  const hexH      = hexRadius * Math.sqrt(3)
  const hexW      = hexRadius * 2
  const colW      = hexW * 0.85

  // Inicializar Maps de estado CRT solo si se usa el modo 'crt'
  if (modo === 'crt' && !state.cellSparkTime) {
    state.cellSparkTime = new Map()
    state.cellLastTickIdx = new Map()      // último tickIdx visto por celda
  }

  // ── Helpers de hash determinístico ────────────────────────────────────
  // hashA, hashB: dos hashes distintos por celda (col, row) para freq y phase
  function hashA(c, r) {
    const s = Math.sin(c * 12.9898 + r * 78.233) * 43758.5453
    return s - Math.floor(s)
  }
  function hashB(c, r) {
    const s = Math.sin(c * 39.346 + r * 11.135) * 24634.6345
    return s - Math.floor(s)
  }
  // hashTick: hash por (celda, tickIdx) para decidir si "encender" en ese tick
  function hashTick(c, r, k) {
    const s = Math.sin(c * 1.731 + r * 17.901 + k * 91.341) * 51234.235
    return s - Math.floor(s)
  }

  // ── Recorrer la rejilla y actualizar estado + pintar ─────────────────
  const decayConstant = 4.0      // exp(-4 * edad) → ~95% extinguido en 0.75s
  const maxBrilloPico = 0.85     // alpha máximo justo al encender
  const t = state.time

  for (let col = 0; col * colW < CW + hexW; col++) {
    const cx = col * colW + hexRadius
    const yOffset = (col % 2) * (hexH / 2)

    // Skip columnas fuera del rango horizontal de la máscara
    if (cx < CX - RADIO_MASK - hexW) continue
    if (cx > CX + RADIO_MASK + hexW) continue

    for (let row = 0; row * hexH < CH + hexH; row++) {
      const cy = row * hexH + yOffset + hexH / 2

      // Skip filas fuera del rango vertical
      if (cy < yTop - hexH) continue
      if (cy > yBot + hexH) continue

      const key = col + '_' + row
      const h = hashA(col, row)

      let brilloHex = 0
      let bordeIluminado = false

      if (modo === 'respiracion') {
        // ── MODO RESPIRACIÓN — pulsación sinusoidal continua ──────────
        // Cada hex tiene su propia frecuencia, fase y amplitud (todas
        // determinísticas por celda con hashes). El brillo es una sinusoide
        // suave entre base..(base+amplitud).
        const freqR  = 0.4 + h * 0.8                  // 0.4..1.2 Hz
        const phaseR = hashB(col, row) * Math.PI * 2  // 0..2π
        // sin oscila entre -1 y 1 → mapeamos a 0..1 con (sin+1)/2
        const osc = (Math.sin(t * freqR * 2 * Math.PI + phaseR) + 1) * 0.5
        // Brillo base muy bajo + amplitud moderada por hex
        const baseBrillo = 0.06 + h * 0.04            // 0.06..0.10
        const amplitud   = 0.10 + hashB(col, row) * 0.18  // 0.10..0.28
        brilloHex = baseBrillo + osc * amplitud
        // Borde solo si está en su pico alto
        bordeIluminado = brilloHex > 0.20
      } else {
        // ── MODO CRT — ruido binario con decay exponencial ────────────
        const freq   = 2.0 + h * 1.0                  // 2.0..3.0 Hz
        const phase  = hashB(col, row) / freq         // segundos
        const tickIdx = Math.floor((t + phase) * freq)

        // ¿Hubo un nuevo tick desde la última vez que vimos esta celda?
        const lastTick = state.cellLastTickIdx.get(key)
        if (lastTick !== tickIdx) {
          // Nuevo tick — decidir si "enciende" en este tick
          const shouldFire = hashTick(col, row, tickIdx) < 0.45
          if (shouldFire) {
            state.cellSparkTime.set(key, t)
          }
          state.cellLastTickIdx.set(key, tickIdx)
        }

        // Calcular brillo actual desde el último encendido (si lo hubo)
        const sparkTime = state.cellSparkTime.get(key)
        let brilloDecay = 0
        if (sparkTime !== undefined) {
          const edad = t - sparkTime
          if (edad > 0.5) {
            // Ya no contribuye → limpiar para no acumular memoria
            state.cellSparkTime.delete(key)
          } else {
            brilloDecay = Math.exp(-decayConstant * edad) * maxBrilloPico
          }
        }

        const alphaBase = 0.04 + h * 0.03                 // 0.04..0.07
        brilloHex = Math.max(alphaBase, brilloDecay * intensidadPulso) / intensidadPulso
        bordeIluminado = brilloDecay > 0.25
      }

      // Aplicar intensidadPulso al brillo final
      const alpha = brilloHex * intensidadPulso

      // ── Dibujar hexágono ─────────────────────────────────────────────
      ctx.beginPath()
      for (let i = 0; i < 6; i++) {
        const ang = (i * Math.PI / 3) - Math.PI / 2
        const px = cx + Math.cos(ang) * hexRadius * 0.80
        const py = cy + Math.sin(ang) * hexRadius * 0.80
        if (i === 0) ctx.moveTo(px, py)
        else         ctx.lineTo(px, py)
      }
      ctx.closePath()

      ctx.fillStyle = HOLO_CYAN
      ctx.globalAlpha = alpha
      ctx.fill()

      // Borde brillante solo cuando el hex está claramente encendido
      // (evita el look uniforme cuadrado en los hex tenues)
      if (bordeIluminado) {
        ctx.strokeStyle = HOLO_CYAN_HOT
        ctx.globalAlpha = alpha * 1.15
        ctx.lineWidth = 0.8
        ctx.stroke()
      }
    }
  }
  ctx.globalAlpha = 1
}


// Helper común a los 3 sabores: pinta scanlines + tinte + línea de frente.
// Retorna sin restore(), el caller debe ctx.restore() después.
//
// `opciones.conMalla` (boolean): si true, pinta también la malla hexagonal
//                                densa (estilo scanner-effect). Solo el sabor
//                                Clásico la activa por ahora.
//
// CICLO DE VIDA del holograma (state.material va de 0 a 3):
//   material ∈ [0, 1):  ENTRADA — frente sube revelando
//   material ∈ [1, 2]:  PAUSA   — todo visible, frente oculto
//   material ∈ (2, 3]:  SALIDA  — frente baja ocultando
//   material > 3:       FIN
function pintarBaseHolograma(ctx, state, opciones = {}) {
  const { conMalla = false, modoMalla = 'crt' } = opciones

  const yTop = MASK_Y - RADIO_MASK
  const yBot = CY_CIRC + RADIO_MASK
  const altura = yBot - yTop

  // Calcular fase actual: dónde está el frente y qué zona está visible
  const { frenteY, visibleY, visibleH, mostrarFrente, fase } = calcularFaseHolograma(state)

  // Si no hay zona visible (post-salida), no se pinta nada
  if (visibleH <= 0 || fase === 'fin') return

  // ── Tinte cyan uniforme sobre la zona visible ──────────────────────────
  ctx.save()
  aplicarMascaraFoto(ctx)
  ctx.beginPath()
  ctx.rect(CX - RADIO_MASK, visibleY, RADIO_MASK * 2, visibleH)
  ctx.clip()
  ctx.fillStyle = HOLO_TINT
  ctx.fillRect(CX - RADIO_MASK, yTop, RADIO_MASK * 2, altura)
  ctx.restore()

  // ── Malla hexagonal densa (solo si conMalla = true) ───────────────────
  // Se pinta DESPUÉS del tinte y ANTES de las scanlines para que las
  // scanlines pasen por encima de la malla.
  if (conMalla) {
    ctx.save()
    aplicarMascaraFoto(ctx)
    ctx.beginPath()
    ctx.rect(CX - RADIO_MASK, visibleY, RADIO_MASK * 2, visibleH)
    ctx.clip()
    // Intensidad de pulsación según el modo y la fase:
    //   - Modo 'respiracion' (clásico): intensidad MÁXIMA siempre (1.0)
    //     → la respiración orgánica se ve igual durante entrada, pausa y salida
    //   - Modo 'crt': alta en pausa (1.0), baja en entrada/salida (0.3)
    //     → marca claramente las fases con cambio de intensidad
    const intensidadPulso = (modoMalla === 'respiracion')
      ? 1.0
      : ((fase === 'pausa') ? 1.0 : 0.3)
    pintarMallaHexagonal(ctx, state, intensidadPulso, fase, modoMalla)
    ctx.restore()
  }

  // ── Scanlines horizontales finas (solo en la zona visible) ─────────────
  ctx.save()
  aplicarMascaraFoto(ctx)
  ctx.beginPath()
  ctx.rect(CX - RADIO_MASK, visibleY, RADIO_MASK * 2, visibleH)
  ctx.clip()

  const scanOffset = (state.time * 30) % 4
  ctx.strokeStyle = 'rgba(168, 240, 255, 0.18)'
  ctx.lineWidth = 1
  for (let y = yTop - scanOffset; y < yBot + 4; y += 4) {
    ctx.beginPath()
    ctx.moveTo(CX - RADIO_MASK, y)
    ctx.lineTo(CX + RADIO_MASK, y)
    ctx.stroke()
  }
  ctx.restore()

  // ── Línea brillante del "frente" (entrada o salida) ────────────────────
  if (mostrarFrente) {
    ctx.save()
    aplicarMascaraFoto(ctx)

    ctx.shadowColor = HOLO_CYAN
    ctx.shadowBlur = 20
    ctx.strokeStyle = HOLO_CYAN_HOT
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(CX - RADIO_MASK, frenteY)
    ctx.lineTo(CX + RADIO_MASK, frenteY)
    ctx.stroke()

    // Core blanco fino
    ctx.strokeStyle = '#FFFFFF'
    ctx.lineWidth = 0.8
    ctx.shadowBlur = 8
    ctx.beginPath()
    ctx.moveTo(CX - RADIO_MASK, frenteY)
    ctx.lineTo(CX + RADIO_MASK, frenteY)
    ctx.stroke()
    ctx.restore()
  }
}

// ── SABOR 1: CLÁSICO — scanlines + tinte + flicker + MALLA RESPIRANDO ──────
// El más etéreo y limpio + malla hexagonal con pulsación SINUSOIDAL CONTINUA
// (modo 'respiracion'). Cada hex tiene su propia frecuencia/fase/amplitud
// y respira suavemente entre alpha bajo y alto sin saltos discretos. Look
// orgánico, como células bajo microscopio respirando, ideal para atmósfera
// calmada/etérea.
function crearCanvasHologramaClasico(state) {
  const canvas = document.createElement('canvas')
  canvas.width = CW; canvas.height = CH
  const ctx = canvas.getContext('2d')
  ctx.clearRect(0, 0, CW, CH)

  // Aplicar opacidad global con flicker incluido
  const flickerMul = 1.0 - state.flicker * 0.15 * Math.abs(Math.sin(state.time * 11.7))
  ctx.globalAlpha = state.opacity * flickerMul

  pintarBaseHolograma(ctx, state, { conMalla: true, modoMalla: 'respiracion' })

  return canvas
}

// ── SABOR 2: GLITCH — clásico + glitches horizontales ocasionales ──────────
// Cada ~1.5s aparece un breve glitch donde una franja horizontal se desplaza
// 5-10px y vuelve. Da sensación de señal con interferencia.
function crearCanvasHologramaGlitch(state) {
  const canvas = document.createElement('canvas')
  canvas.width = CW; canvas.height = CH
  const ctx = canvas.getContext('2d')
  ctx.clearRect(0, 0, CW, CH)

  const flickerMul = 1.0 - state.flicker * 0.15 * Math.abs(Math.sin(state.time * 11.7))
  ctx.globalAlpha = state.opacity * flickerMul

  // Detectar si estamos en un "momento de glitch" (cada ~1.5s, dura 80ms)
  const glitchCycle = state.time % 1.5
  const inGlitch = glitchCycle < 0.08
  const glitchIntensity = inGlitch ? Math.sin((glitchCycle / 0.08) * Math.PI) : 0

  // Si hay glitch, desplazar todo horizontalmente un poco
  if (glitchIntensity > 0) {
    ctx.save()
    const offsetX = (Math.random() - 0.5) * 14 * glitchIntensity
    ctx.translate(offsetX, 0)
  }

  pintarBaseHolograma(ctx, state)

  if (glitchIntensity > 0) {
    ctx.restore()

    // Además, pintar una franja horizontal con offset aleatorio (efecto
    // "tear" característico del glitch holográfico)
    // Límites: alto total de la máscara compuesta (cabeza hasta torso).
    const yTop = MASK_Y - RADIO_MASK
    const yBot = CY_CIRC + RADIO_MASK
    const tearY = yTop + Math.random() * (yBot - yTop)
    const tearHeight = 4 + Math.random() * 8
    const tearOffset = (Math.random() - 0.5) * 25 * glitchIntensity

    ctx.save()
    aplicarMascaraFoto(ctx)
    ctx.fillStyle = `rgba(168, 240, 255, ${0.3 * glitchIntensity})`
    ctx.fillRect(CX - RADIO_MASK + tearOffset, tearY, RADIO_MASK * 2, tearHeight)
    ctx.restore()
  }

  return canvas
}

// ── Spinner Loader (usado por el sabor Matérico) ──────────────────────────
// Pinta un loader circular pequeño centrado horizontalmente debajo del
// círculo del jugador. Estados visuales:
//
//   FASE 1 (entrada): el spinner aparece con fade-in (apenas visible)
//   FASE 2 (pausa):   el anillo se llena progresivamente de 0° a 360°
//                     mostrando el avance de la "carga de datos"
//   FASE 3 (post-pausa = salida): el anillo queda 100% lleno y aparece un
//                                 check ✓ blanco/cyan en el centro indicando
//                                 "datos cargados con éxito"
//
// La posición es centrada horizontalmente (CX) a una Y debajo del círculo
// pero antes del badge del nombre. El badge del nombre está en contY ≈ 368
// (CY_CIRC + RADIO + 28 = 230+110+28). El círculo termina en CY_CIRC + RADIO
// = 340. Hay un espacio de ~28px entre los dos. Centramos el spinner en
// (CX, 354) con radio ~10px.
function pintarSpinnerLoader(ctx, state) {
  // Posición y geometría del spinner
  const sx = CX                       // centro horizontal
  const sy = CY_CIRC + RADIO + 14     // centrado en el espacio entre círculo y badge
  const radio = 11                     // radio del spinner

  // Calcular progreso del spinner según la fase del holograma
  // state.material ∈ [0,3]:
  //   [0,1)   entrada → progreso 0 (no se llena aún, solo fade-in)
  //   [1,2]   pausa   → progreso 0..1 (se llena el anillo)
  //   (2,3]   salida  → progreso 1 (lleno + check)
  let progresoLleno          // 0..1: cuánto del anillo está lleno
  let opacidadSpinner        // 0..1: opacidad global del spinner
  let mostrarCheck = false   // si dibujar el check ✓

  if (state.material < 1.0) {
    // Entrada: fade-in lento, sin avanzar el anillo aún
    progresoLleno = 0
    opacidadSpinner = state.material        // 0..1 (sigue la entrada)
  } else if (state.material <= 2.0) {
    // Pausa: el anillo se llena
    const t01 = state.material - 1.0        // 0..1 durante la pausa
    progresoLleno = t01
    opacidadSpinner = 1
    // Mostrar el check apenas el anillo se completa (cerca del final de pausa)
    if (progresoLleno >= 0.98) mostrarCheck = true
  } else {
    // Salida: queda lleno + check, va perdiendo opacidad con la salida
    progresoLleno = 1
    mostrarCheck = true
    const salidaProgress = state.material - 2.0   // 0..1
    opacidadSpinner = 1 - salidaProgress * 0.6    // desvanece progresivamente
  }

  if (opacidadSpinner <= 0.01) return

  ctx.save()
  ctx.globalAlpha = opacidadSpinner

  // ── Pista del anillo (círculo gris tenue de fondo) ───────────────────
  ctx.strokeStyle = 'rgba(168, 240, 255, 0.20)'
  ctx.lineWidth = 2.5
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.arc(sx, sy, radio, 0, Math.PI * 2)
  ctx.stroke()

  // ── Anillo de progreso ─────────────────────────────────────────────────
  if (progresoLleno > 0) {
    const angInicio = -Math.PI / 2                          // arrancar en arriba (12 horas)
    const angFin = angInicio + progresoLleno * Math.PI * 2
    ctx.shadowColor = HOLO_CYAN
    ctx.shadowBlur = 8
    ctx.strokeStyle = HOLO_CYAN_HOT
    ctx.lineWidth = 2.5
    ctx.beginPath()
    ctx.arc(sx, sy, radio, angInicio, angFin)
    ctx.stroke()
    ctx.shadowBlur = 0
  }

  // ── Check ✓ cuando está completo ──────────────────────────────────────
  if (mostrarCheck) {
    ctx.strokeStyle = '#FFFFFF'
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.shadowColor = HOLO_CYAN
    ctx.shadowBlur = 6
    ctx.beginPath()
    // ✓ pequeño en el centro del spinner
    ctx.moveTo(sx - 5,  sy + 0)
    ctx.lineTo(sx - 1,  sy + 4)
    ctx.lineTo(sx + 5,  sy - 4)
    ctx.stroke()
    ctx.shadowBlur = 0
  }

  ctx.restore()
}

// ── SABOR 3: MATÉRICO — glitch + líneas de ruido digital + RGB shift ─────
// El más caótico/cyberpunk. Líneas blancas finas que aparecen aleatoriamente
// y un sutil RGB shift en los bordes. Además: un SPINNER LOADER debajo del
// círculo del jugador que se llena durante la pausa y muestra un check ✓
// al completar (señalando "datos cargados con éxito").
function crearCanvasHologramaMaterico(state) {
  const canvas = document.createElement('canvas')
  canvas.width = CW; canvas.height = CH
  const ctx = canvas.getContext('2d')
  ctx.clearRect(0, 0, CW, CH)

  const flickerMul = 1.0 - state.flicker * 0.20 * Math.abs(Math.sin(state.time * 11.7))
  ctx.globalAlpha = state.opacity * flickerMul

  // RGB shift: pintar 2 capas del base ligeramente desplazadas (una cyan, otra magenta)
  // antes del normal, para crear sensación de aberración cromática
  ctx.save()
  ctx.globalAlpha = state.opacity * 0.20
  ctx.translate(-2, 0)
  ctx.globalCompositeOperation = 'screen'
  pintarBaseHolograma(ctx, state)
  ctx.restore()

  ctx.save()
  ctx.globalAlpha = state.opacity * 0.15
  ctx.translate(2, 0)
  ctx.globalCompositeOperation = 'screen'
  pintarBaseHolograma(ctx, state)
  ctx.restore()

  // Glitches horizontales (más frecuentes que en el sabor 2)
  const glitchCycle = state.time % 0.9
  const inGlitch = glitchCycle < 0.06
  const glitchIntensity = inGlitch ? Math.sin((glitchCycle / 0.06) * Math.PI) : 0

  if (glitchIntensity > 0) {
    ctx.save()
    const offsetX = (Math.random() - 0.5) * 16 * glitchIntensity
    ctx.translate(offsetX, 0)
  }

  // Base principal
  ctx.globalAlpha = state.opacity * flickerMul
  pintarBaseHolograma(ctx, state)

  if (glitchIntensity > 0) {
    ctx.restore()
  }

  // Líneas de ruido digital: rayas blancas muy finas que aparecen aleatoriamente
  ctx.save()
  aplicarMascaraFoto(ctx)

  // Límites: alto total de la máscara compuesta (cabeza hasta torso).
  const yTop = MASK_Y - RADIO_MASK
  const yBot = CY_CIRC + RADIO_MASK

  // Cantidad de líneas de ruido (3-6 por frame, distribuidas aleatoriamente)
  const numLines = 3 + Math.floor(Math.random() * 4)
  for (let i = 0; i < numLines; i++) {
    const noiseY = yTop + Math.random() * (yBot - yTop)
    const noiseLen = (0.3 + Math.random() * 0.7) * RADIO_MASK * 2
    const noiseStart = CX - RADIO_MASK + Math.random() * (RADIO_MASK * 2 - noiseLen)
    ctx.strokeStyle = `rgba(255, 255, 255, ${0.15 + Math.random() * 0.20})`
    ctx.lineWidth = 0.5
    ctx.beginPath()
    ctx.moveTo(noiseStart, noiseY)
    ctx.lineTo(noiseStart + noiseLen, noiseY)
    ctx.stroke()
  }
  ctx.restore()

  // ── Spinner Loader (centrado debajo del círculo) ──────────────────────
  // Se pinta SIN clip de máscara (queda fuera de la silueta del jugador).
  // Indica progreso de "carga de datos": durante la pausa llena el anillo,
  // y al completar muestra un check ✓.
  ctx.globalAlpha = state.opacity * flickerMul
  pintarSpinnerLoader(ctx, state)

  return canvas
}


// Plano de corte — nada se ve por debajo de Y=0 (superficie de la cancha)
const clipPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)

function crearMat(opacity) {
  return new THREE.SpriteMaterial({
    transparent:     true,
    depthWrite:      false,
    sizeAttenuation: true,
    opacity,
    clippingPlanes:  [clipPlane],
  })
}
function crearCanvasSoloFoto(img) {
  const canvas = document.createElement('canvas')
  canvas.width = CW; canvas.height = CH
  const ctx = canvas.getContext('2d')
  ctx.clearRect(0, 0, CW, CH)
  if (!img) return canvas
  ctx.save()
  ctx.beginPath()
  ctx.rect(CX - RADIO_MASK, MASK_Y - RADIO_MASK, RADIO_MASK * 2, RADIO_MASK)
  ctx.arc(CX, CY_CIRC, RADIO_MASK, Math.PI, 0, true)
  ctx.lineTo(CX + RADIO_MASK, MASK_Y)
  ctx.lineTo(CX - RADIO_MASK, MASK_Y)
  ctx.closePath(); ctx.clip()
  const esc = (RADIO_MASK * 2.0) / Math.min(img.width, img.height)
  ctx.drawImage(img, CX - img.width * esc / 2, CY_CIRC - img.height * esc * 0.65, img.width * esc, img.height * esc)
  ctx.restore()
  return canvas
}

// ── crearCanvasFotoConGlitch ─────────────────────────────────────────────
// Variante de crearCanvasSoloFoto que aplica efectos del holograma glitch:
//   - TINTE AZUL CONSTANTE: la foto siempre se ve azulada mientras el
//     holograma está activo (sutilmente, ~25% de fuerza de color).
//   - CHROMATIC ABERRATION: una capa cyan ligeramente desplazada -3px y otra
//     magenta +3px, dando look de "señal RGB desincronizada" (intensidad
//     ligeramente mayor durante glitches).
//   - DESPLAZAMIENTO HORIZONTAL: durante un glitch puntual, toda la foto se
//     desplaza ±5-12px lateralmente.
//   - TEAR HORIZONTAL: durante un glitch, una franja horizontal se desplaza
//     con un offset diferente, dando look de "señal partida".
//
// Parámetros:
//   - img: la imagen del jugador (HTMLImageElement)
//   - glitchIntensity: 0..1 — intensidad del glitch puntual EN ESTE FRAME
//                      0 = sin distorsión, solo tinte; 1 = distorsión máxima.
//     Se calcula desde escanearJugador con la misma fórmula que el holograma
//     para que ambos sprites se sincronicen.
//
// Retorna un canvas listo para ser asignado como textura.image del spriteFoto.
// ── crearCanvasFotoConGlitch ─────────────────────────────────────────────
// Variante de crearCanvasSoloFoto que aplica efectos del holograma glitch:
//   - DESPLAZAMIENTO HORIZONTAL: durante un glitch puntual (cada 1.5s, 80ms),
//     toda la foto se desplaza ±5-12px lateralmente.
//   - CHROMATIC ABERRATION: SOLO durante los glitches, dos copias adicionales
//     (cyan a la izquierda, magenta a la derecha) producen el halo de "señal
//     RGB desincronizada" momentáneamente. Fuera del glitch, la foto se ve
//     totalmente limpia sin halos alrededor.
//   - TEAR HORIZONTAL: durante un glitch, una franja horizontal se desplaza
//     con un offset diferente, dando look de "señal partida".
//
// En estado ESTABLE (la mayor parte del tiempo) la foto se ve completamente
// natural, idéntica a la versión sin holograma. Los efectos solo aparecen
// durante los momentos puntuales de glitch, sincronizados con el holograma.
//
// Parámetros:
//   - img: la imagen del jugador (HTMLImageElement)
//   - glitchIntensity: 0..1 — intensidad del glitch puntual EN ESTE FRAME
//                      0 = sin efectos (foto normal); 1 = glitch máximo
function crearCanvasFotoConGlitch(img, glitchIntensity) {
  const canvas = document.createElement('canvas')
  canvas.width = CW; canvas.height = CH
  const ctx = canvas.getContext('2d')
  ctx.clearRect(0, 0, CW, CH)
  if (!img) return canvas

  // Offset horizontal del glitch (solo si glitchIntensity > 0)
  const dxGlobal = glitchIntensity > 0
    ? (Math.random() - 0.5) * 14 * glitchIntensity
    : 0

  // Geometría de la foto (idéntica a crearCanvasSoloFoto)
  const esc = (RADIO_MASK * 2.0) / Math.min(img.width, img.height)
  const drawX = CX - img.width * esc / 2
  const drawY = CY_CIRC - img.height * esc * 0.65
  const drawW = img.width * esc
  const drawH = img.height * esc

  // Bounding box de la máscara compuesta (rect arriba + semicírculo abajo)
  const maskX = CX - RADIO_MASK
  const maskY = MASK_Y - RADIO_MASK            // = 42
  const maskW = RADIO_MASK * 2                 // = 188
  const maskH = (CY_CIRC + RADIO_MASK) - maskY // = 324 - 42 = 282

  // ── Helper: aplicar la máscara compuesta de la foto ────────────────────
  function aplicarClipFoto() {
    ctx.beginPath()
    ctx.rect(CX - RADIO_MASK, MASK_Y - RADIO_MASK, RADIO_MASK * 2, RADIO_MASK)
    ctx.arc(CX, CY_CIRC, RADIO_MASK, Math.PI, 0, true)
    ctx.lineTo(CX + RADIO_MASK, MASK_Y)
    ctx.lineTo(CX - RADIO_MASK, MASK_Y)
    ctx.closePath()
    ctx.clip()
  }

  // Cantidad de offset de la aberración cromática: SOLO se activa durante
  // los momentos de glitch (cada 1.5s por 80ms). Cuando glitchIntensity > 0
  // se pintan las dos copias cyan/magenta que producen el halo de "señal
  // RGB desincronizada". Fuera de los glitches, la foto se ve totalmente
  // limpia sin halo alrededor.
  const aberrAmount = glitchIntensity * 6    // 0..6 px (0 fuera de glitch)

  // ── Capas 1 y 2: aberración cromática — SOLO durante glitch ───────────
  // Pintamos copias cyan/magenta desplazadas ANTES de la foto principal.
  // Sólo aparecen durante los 80ms del glitch puntual → produce un "halo
  // de señal corrupta" momentáneo que desaparece junto con el glitch.
  if (glitchIntensity > 0) {
    // ── Capa 1: copia CYAN desplazada a la izquierda ────────────────────
    // Estrategia: pintar la foto desplazada → tintar SOLO los píxeles pintados
    // con cyan usando source-atop → el resultado es una "sombra cyan" del jugador
    // a la izquierda.
    ctx.save()
    aplicarClipFoto()
    ctx.globalCompositeOperation = 'source-over'
    ctx.globalAlpha = 0.35 * glitchIntensity      // se atenúa con la intensidad del glitch
    ctx.drawImage(img, drawX + dxGlobal - aberrAmount, drawY, drawW, drawH)
    // Tintar solo los píxeles ya pintados con cyan saturado
    ctx.globalCompositeOperation = 'source-atop'
    ctx.globalAlpha = 1
    ctx.fillStyle = 'rgba(0, 200, 255, 0.85)'
    ctx.fillRect(maskX, maskY, maskW, maskH)
    ctx.restore()

    // ── Capa 2: copia MAGENTA desplazada a la derecha ───────────────────
    ctx.save()
    aplicarClipFoto()
    ctx.globalCompositeOperation = 'source-over'
    ctx.globalAlpha = 0.30 * glitchIntensity
    ctx.drawImage(img, drawX + dxGlobal + aberrAmount, drawY, drawW, drawH)
    ctx.globalCompositeOperation = 'source-atop'
    ctx.globalAlpha = 1
    ctx.fillStyle = 'rgba(255, 60, 180, 0.80)'
    ctx.fillRect(maskX, maskY, maskW, maskH)
    ctx.restore()
  }

  // ── Capa 3 (PRINCIPAL): foto desplazada (SIN TINTE) ───────────────────
  // Esta es la foto "real" del jugador. Va encima de las copias cyan/magenta
  // de aberración cromática. Sin tinte azul: la foto se ve con sus colores
  // originales, solo desplazada horizontalmente durante un glitch.
  ctx.save()
  aplicarClipFoto()
  ctx.globalCompositeOperation = 'source-over'
  ctx.globalAlpha = 1
  ctx.drawImage(img, drawX + dxGlobal, drawY, drawW, drawH)
  ctx.restore()

  // ── Capa 4: TEAR HORIZONTAL — solo durante glitch ─────────────────────
  // Una franja horizontal de la foto se "corre" lateralmente con offset
  // diferente al desplazamiento global. Da sensación de señal partida.
  if (glitchIntensity > 0.2) {
    const tearY = maskY + Math.random() * maskH
    const tearHeight = 8 + Math.random() * 18
    const tearOffset = (Math.random() - 0.5) * 30 * glitchIntensity

    ctx.save()
    aplicarClipFoto()
    // Clip rectangular adicional sobre la franja a "rasgar"
    ctx.beginPath()
    ctx.rect(maskX, tearY, maskW, tearHeight)
    ctx.clip()
    // Pintar la foto con el offset diferente — esto reemplaza la franja con
    // un trozo desplazado lateralmente (sin tinte, colores originales)
    ctx.globalCompositeOperation = 'source-over'
    ctx.globalAlpha = 1
    ctx.drawImage(img, drawX + dxGlobal + tearOffset, drawY, drawW, drawH)
    // Línea brillante cyan en el borde superior del tear (efecto "scanline")
    ctx.globalCompositeOperation = 'source-over'
    ctx.globalAlpha = 0.7
    ctx.strokeStyle = 'rgba(168, 240, 255, 1.0)'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(maskX, tearY)
    ctx.lineTo(maskX + maskW, tearY)
    ctx.stroke()
    ctx.restore()
  }

  return canvas
}

function crearCanvasCompleto(jugador, img, mostrarFoto, mostrarNombre) {
  const canvas = document.createElement('canvas')
  canvas.width = CW; canvas.height = CH
  const ctx = canvas.getContext('2d')
  ctx.clearRect(0, 0, CW, CH)

  // Estructura siempre presente
  const glowGrad = ctx.createRadialGradient(CX, CY_CIRC, 0, CX, CY_CIRC, RADIO * 2.0)
  glowGrad.addColorStop(0.0, 'rgba(30, 100, 255, 0.5)')
  glowGrad.addColorStop(0.6, 'rgba(10,  60, 200, 0.25)')
  glowGrad.addColorStop(1.0, 'rgba(0,   20, 100, 0.0)')
  ctx.fillStyle = glowGrad
  ctx.beginPath(); ctx.arc(CX, CY_CIRC, RADIO * 2.0, 0, Math.PI * 2); ctx.fill()

  const bgGrad = ctx.createRadialGradient(CX, CY_CIRC - 20, 10, CX, CY_CIRC, RADIO)
  bgGrad.addColorStop(0.0, '#1a2a4a'); bgGrad.addColorStop(1.0, '#0a0f1e')
  ctx.beginPath(); ctx.arc(CX, CY_CIRC, RADIO, 0, Math.PI * 2)
  ctx.fillStyle = bgGrad; ctx.fill()

  ctx.save()
  const gradBorde = ctx.createLinearGradient(CX, CY_CIRC - RADIO, CX, CY_CIRC + RADIO)
  gradBorde.addColorStop(0.0, 'rgba(10, 36, 81, 0.4)')
  gradBorde.addColorStop(0.5, 'rgba(40, 140, 255, 0.8)')
  gradBorde.addColorStop(1.0, 'rgba(80, 200, 255, 1.0)')
  ctx.shadowColor = '#4DAAFF'; ctx.shadowBlur = 40
  ctx.beginPath(); ctx.arc(CX, CY_CIRC, RADIO, 0, Math.PI * 2)
  ctx.strokeStyle = gradBorde; ctx.lineWidth = 6; ctx.stroke()
  ctx.restore()

  ctx.beginPath(); ctx.arc(CX, CY_CIRC, RADIO - 3, 0, Math.PI * 2)
  ctx.strokeStyle = 'rgba(100, 180, 255, 0.3)'; ctx.lineWidth = 2; ctx.stroke()

  if (mostrarFoto) {
    if (img) {
      ctx.save()
      ctx.beginPath()
      ctx.rect(CX - RADIO_MASK, MASK_Y - RADIO_MASK, RADIO_MASK * 2, RADIO_MASK)
      ctx.arc(CX, CY_CIRC, RADIO_MASK, Math.PI, 0, true)
      ctx.lineTo(CX + RADIO_MASK, MASK_Y)
      ctx.lineTo(CX - RADIO_MASK, MASK_Y)
      ctx.closePath(); ctx.clip()
      const esc = (RADIO_MASK * 2.0) / Math.min(img.width, img.height)
      ctx.drawImage(img, CX - img.width * esc / 2, CY_CIRC - img.height * esc * 0.65, img.width * esc, img.height * esc)
      ctx.restore()
    } else {
      ctx.save()
      ctx.beginPath(); ctx.arc(CX, CY_CIRC, RADIO_MASK, 0, Math.PI * 2); ctx.clip()
      const phGrad = ctx.createLinearGradient(CX, CY_CIRC - RADIO_MASK, CX, CY_CIRC + RADIO_MASK)
      phGrad.addColorStop(0.0, '#1e3060'); phGrad.addColorStop(1.0, '#0d1a3a')
      ctx.fillStyle = phGrad
      ctx.fillRect(CX - RADIO_MASK, CY_CIRC - RADIO_MASK, RADIO_MASK * 2, RADIO_MASK * 2)
      ctx.restore()
    }
  }

  if (mostrarNombre) {
    const contH    = Math.round(24 * SCALE)
    const numBloqW = Math.round(25 * SCALE)
    const gap      = Math.round(6  * SCALE)
    const padIzq   = Math.round(6  * SCALE)
    const padDer   = Math.round(8  * SCALE)
    const contY    = CY_CIRC + RADIO + 28
    const r        = Math.round(4  * SCALE)
    const fontNombre = `500 ${Math.round(9 * SCALE)}px "Poppins", "Barlow", sans-serif`

    ctx.font = fontNombre
    const nombreAncho = Math.ceil(ctx.measureText(jugador.nombre).width)
    const contW = numBloqW + gap + padIzq + nombreAncho + padDer
    const contX = CX - contW / 2

    ctx.save()
    roundRect(ctx, contX, contY, contW, contH, r); ctx.clip()
    const contBg = ctx.createLinearGradient(contX, contY, contX + contW, contY)
    contBg.addColorStop(0.338, 'rgba(231, 231, 231, 0.04)')
    contBg.addColorStop(0.947, 'rgba(134, 134, 134, 0.24)')
    ctx.fillStyle = contBg; ctx.fillRect(contX, contY, contW, contH)
    ctx.restore()

    ctx.save()
    roundRect(ctx, contX, contY, contW, contH, r)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.16)'; ctx.lineWidth = 3; ctx.stroke()
    ctx.restore()

    ctx.save()
    ctx.beginPath()
    ctx.moveTo(contX + r, contY); ctx.lineTo(contX + numBloqW, contY)
    ctx.lineTo(contX + numBloqW, contY + contH); ctx.lineTo(contX + r, contY + contH)
    ctx.quadraticCurveTo(contX, contY + contH, contX, contY + contH - r)
    ctx.lineTo(contX, contY + r)
    ctx.quadraticCurveTo(contX, contY, contX + r, contY)
    ctx.closePath(); ctx.fillStyle = '#178CEB'; ctx.fill()
    ctx.font = `bold ${Math.round(11 * SCALE)}px "Poppins", "Barlow Condensed", sans-serif`
    ctx.fillStyle = '#FFFFFF'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.fillText(String(jugador.numero), contX + numBloqW / 2, contY + contH / 2)
    ctx.restore()

    ctx.save()
    ctx.font = fontNombre; ctx.fillStyle = '#FFFFFF'
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle'
    ctx.fillText(jugador.nombre, contX + numBloqW + gap + padIzq, contY + contH / 2)
    ctx.restore()
  }

  return canvas
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + r)
  ctx.lineTo(x + w, y + h - r)
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  ctx.lineTo(x + r, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - r)
  ctx.lineTo(x, y + r)
  ctx.quadraticCurveTo(x, y, x + r, y)
  ctx.closePath()
}

function crearSprite(canvas, escala, jugador, renderOrder, polygonOffsetFactor) {
  const aspect  = CH / CW
  const textura = new THREE.CanvasTexture(canvas)
  const mat     = new THREE.SpriteMaterial({
    map: textura, transparent: true, depthWrite: false,
    sizeAttenuation: true, opacity: 1,
  })
  const sprite = new THREE.Sprite(mat)
  sprite.scale.set(escala, escala * aspect, 1)
  sprite.position.set(jugador.x, -8, jugador.z)
  sprite.renderOrder = renderOrder
  sprite.layers.set(0)
  return sprite
}

export function createJugadorCards(scene, jugadores = JUGADORES, opciones = {}) {

  const {
    offsetY = 8.0,
    escala  = 20,
  } = opciones

  const grupo = new THREE.Group()
  grupo.visible = false
  scene.add(grupo)

  const tarjetas = []
  const corNersCanvasShared = crearCanvasCorners()

  let seleccionadoActual = null

  jugadores.forEach((jugador, idx) => {
    let imgCargada = null

    // Sprite principal — estructura (renderOrder base + 0)
    const canvas  = crearCanvasCompleto(jugador, null, false, false)
    const textura = new THREE.CanvasTexture(canvas)
    const aspect  = CH / CW
    const mat     = crearMat(1)
    mat.map       = textura
    const sprite  = new THREE.Sprite(mat)
    sprite.scale.set(escala, escala * aspect, 1)
    sprite.position.set(jugador.x, offsetY, jugador.z)
    sprite.renderOrder = 50 + idx * 5
    sprite.layers.set(0)
    sprite.visible = false
    sprite.userData.esJugadorCard = true
    sprite.userData.jugadorNumero = jugador.numero
    grupo.add(sprite)

    // Sprite nombre (renderOrder base + 1)
    const canvasNom  = crearCanvasSoloNombre(jugador)
    const texturaNom = new THREE.CanvasTexture(canvasNom)
    const matNom     = crearMat(0)
    matNom.map       = texturaNom
    const spriteNom  = new THREE.Sprite(matNom)
    spriteNom.scale.set(escala, escala * aspect, 1)
    spriteNom.position.set(jugador.x, offsetY, jugador.z)
    spriteNom.renderOrder = 50 + idx * 5 + 1
    spriteNom.layers.set(0)
    spriteNom.visible = false
    grupo.add(spriteNom)

    // Sprite foto (renderOrder base + 2)
    const texFoto    = new THREE.CanvasTexture(crearCanvasSoloFoto(null))
    const matFoto    = crearMat(1)
    matFoto.map      = texFoto
    const spriteFoto = new THREE.Sprite(matFoto)
    spriteFoto.scale.set(escala, escala * aspect, 1)
    spriteFoto.position.set(jugador.x, offsetY, jugador.z)
    spriteFoto.renderOrder = 50 + idx * 5 + 2
    spriteFoto.layers.set(0)
    spriteFoto.visible = false
    grupo.add(spriteFoto)

    // Sprite corners (renderOrder base + 3)
    const texCorners = new THREE.CanvasTexture(corNersCanvasShared)
    const matCorners = crearMat(0)
    matCorners.map   = texCorners
    const spriteCorners = new THREE.Sprite(matCorners)
    spriteCorners.scale.set(escala * 1.15, escala * aspect * 1.15, 1)
    spriteCorners.position.set(jugador.x, offsetY, jugador.z)
    spriteCorners.renderOrder = 50 + idx * 5 + 3
    spriteCorners.layers.set(0)
    spriteCorners.visible = false
    grupo.add(spriteCorners)

    // ── Sprite SCAN tipo HOLOGRAMA — overlay holográfico sobre la foto ──
    // El canvas se actualiza dinámicamente cada frame mientras el holograma
    // esté activo (state.material 0→1 = materialización Princess Leia, luego
    // loop continuo con scanlines + tinte + flicker + glitches según sabor).
    // Cuando no está activo, visible=false y no consume tiempo.
    // renderOrder = base + 4 → POR ENCIMA DE TODO (corners incluidos).
    const estadoHologramaInicial = {
      time: 0, material: 0, opacity: 0, flicker: 0,
    }
    const canvasScan = crearCanvasHologramaClasico(estadoHologramaInicial)
    const texScan    = new THREE.CanvasTexture(canvasScan)
    const matScan    = crearMat(1)
    matScan.map      = texScan
    const spriteScan = new THREE.Sprite(matScan)
    spriteScan.scale.set(escala, escala * aspect, 1)
    spriteScan.position.set(jugador.x, offsetY, jugador.z)
    spriteScan.renderOrder = 50 + idx * 5 + 4
    spriteScan.layers.set(0)
    spriteScan.visible = false
    grupo.add(spriteScan)

    function redibujar(mostrarFoto) {
      const nuevo = crearCanvasCompleto(jugador, mostrarFoto ? imgCargada : null, mostrarFoto, false)
      textura.image = nuevo
      textura.needsUpdate = true
    }

    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      imgCargada = img
      texFoto.image = crearCanvasSoloFoto(img)
      texFoto.needsUpdate = true
    }
    img.onerror = () => {}
    img.src = jugador.foto

    tarjetas.push({
      sprite, spriteNom, spriteFoto, spriteCorners, spriteScan, texScan,
      // Exponer texFoto y un getter de img para que escanearJugador pueda
      // modificar temporalmente la textura del spriteFoto durante el sabor
      // 'glitch' (tinte azul + chromatic aberration + tear).
      texFoto,
      getImg: () => imgCargada,
      redibujar, jugador,
    })
  })

  function seleccionar(numero) {
    if (numero == null) {
      deseleccionar()
      return
    }
    seleccionadoActual = numero
    tarjetas.forEach(({ spriteCorners, jugador }) => {
      if (jugador.numero === numero) {
        spriteCorners.visible = true
        gsap.killTweensOf(spriteCorners.material)
        gsap.killTweensOf(spriteCorners.scale)
        const aspect = CH / CW
        gsap.to(spriteCorners.material, {
          opacity: 1,
          duration: 0.35,
          ease: 'power2.out',
        })
        gsap.to(spriteCorners.scale, {
          x: escala,
          y: escala * aspect,
          duration: 0.45,
          ease: 'back.out(2)',
        })
      } else {
        if (spriteCorners.material.opacity > 0) {
          ocultarCorners(spriteCorners)
        }
      }
    })
  }

  function deseleccionar() {
    seleccionadoActual = null
    tarjetas.forEach(({ spriteCorners }) => {
      if (spriteCorners.material.opacity > 0 || spriteCorners.visible) {
        ocultarCorners(spriteCorners)
      }
    })
  }

  function ocultarCorners(spriteCorners) {
    gsap.killTweensOf(spriteCorners.material)
    gsap.killTweensOf(spriteCorners.scale)
    const aspect = CH / CW
    gsap.to(spriteCorners.material, {
      opacity: 0,
      duration: 0.25,
      ease: 'power2.in',
      onComplete: () => { spriteCorners.visible = false },
    })
    gsap.to(spriteCorners.scale, {
      x: escala * 1.15,
      y: escala * aspect * 1.15,
      duration: 0.25,
      ease: 'power2.in',
    })
  }

  function getSeleccionado() {
    return seleccionadoActual
  }

  // ── Holograma: ciclo Entrada + Pausa + Salida (~2.6s total) ───────────────
  // Ejecuta un ciclo completo:
  //   1) ENTRADA (0.8s): la imagen aparece desmaterializándose de abajo a
  //      arriba (Princess Leia), una línea brillante sube revelando.
  //   2) PAUSA (1.0s): la línea desaparece, todo el holograma queda visible
  //      y la malla hexagonal "piensa" (hexágonos pulsando intensamente).
  //   3) SALIDA (0.8s): una línea baja de arriba a abajo, ocultando el
  //      holograma. La malla hexagonal desaparece de arriba a abajo.
  //
  // Recibe parámetro `tipo` que elige el sabor:
  //   - 'clasico'  → scanlines + tinte + flicker + MALLA HEXAGONAL (con pausa)
  //   - 'glitch'   → clásico + glitches horizontales (sin malla por ahora)
  //   - 'materico' → glitch + ruido digital + RGB shift (sin malla por ahora)
  //
  // Timeline (state.material va de 0 a 3):
  //   0.00s ─ 0.80s   ENTRADA: material 0 → 1
  //   0.80s ─ 1.80s   PAUSA:   material 1 → 2 (lineal, frente oculto)
  //   1.80s ─ 2.60s   SALIDA:  material 2 → 3
  //   2.60s           Sprite oculto + limpieza
  function escanearJugador(numero, opciones = {}) {
    const { tipo = 'clasico' } = opciones

    const t = tarjetas.find(x => x.jugador.numero === numero)
    if (!t) return

    // Cancelar cualquier scan previo en este jugador
    if (t._scanState) {
      gsap.killTweensOf(t._scanState)
    }
    if (t._scanTicker) {
      gsap.ticker.remove(t._scanTicker)
      t._scanTicker = null
    }
    gsap.killTweensOf(t.spriteScan.material)

    t.spriteScan.visible = true
    t.spriteScan.material.opacity = 1

    // Estado del holograma. material va de 0 → 1 (entrada) → 2 (pausa) → 3 (salida)
    const state = {
      time:     0,
      material: 0,
      opacity:  1,
      flicker:  1,
      // Estado persistente del ruido binario (lo maneja pintarMallaHexagonal):
      //   cellSparkTime: Map<'col_row', tStart>  cuándo se encendió cada hex
      //   cellLastTickIdx: Map<'col_row', idx>   último tick procesado por hex
      // Se inicializan en el primer frame de pintarMallaHexagonal.
    }
    t._scanState = state
    t._scanTipo  = tipo

    const startTime = performance.now() / 1000

    // Seleccionar la función de canvas según el sabor
    const fnCanvas =
      tipo === 'glitch'    ? crearCanvasHologramaGlitch :
      tipo === 'materico'  ? crearCanvasHologramaMaterico :
                             crearCanvasHologramaClasico

    // ── Transformación de la FOTO durante sabor 'glitch' ─────────────────
    // Solo el sabor 'glitch' modifica temporalmente la textura del spriteFoto
    // para añadir tinte azul + chromatic aberration constantes, más
    // desplazamiento + tear horizontal durante los momentos de glitch puntual.
    //
    // Guardamos la imagen original (canvas) para restaurarla al terminar.
    const aplicaEfectoFoto = (tipo === 'glitch')
    let fotoOriginalCanvas = null
    if (aplicaEfectoFoto) {
      // Guardar referencia al canvas original (img.image es el canvas usado
      // como source de la CanvasTexture). Lo restauraremos al final.
      fotoOriginalCanvas = t.texFoto.image
    }

    // Ticker que redibuja el canvas cada frame con el state actualizado
    const ticker = () => {
      state.time = performance.now() / 1000 - startTime
      t.texScan.image = fnCanvas(state)
      t.texScan.needsUpdate = true

      // Si es sabor 'glitch', actualizar también la foto del jugador
      if (aplicaEfectoFoto) {
        const imgCargada = t.getImg()
        if (imgCargada) {
          // Misma fórmula de detección de glitch que crearCanvasHologramaGlitch:
          //   glitchCycle = state.time % 1.5
          //   inGlitch = glitchCycle < 0.08 (ventana de 80ms cada 1.5s)
          //   glitchIntensity = sin((glitchCycle/0.08) * π) durante la ventana
          const glitchCycle = state.time % 1.5
          const inGlitch = glitchCycle < 0.08
          const glitchIntensity = inGlitch
            ? Math.sin((glitchCycle / 0.08) * Math.PI)
            : 0
          t.texFoto.image = crearCanvasFotoConGlitch(imgCargada, glitchIntensity)
          t.texFoto.needsUpdate = true
        }
      }
    }
    t._scanTicker = ticker
    gsap.ticker.add(ticker)

    // Timeline maestro: 3 fases encadenadas
    const tl = gsap.timeline({
      onComplete: () => {
        if (t._scanTicker) {
          gsap.ticker.remove(t._scanTicker)
          t._scanTicker = null
        }
        t.spriteScan.visible = false
        t.spriteScan.material.opacity = 0
        t._scanState = null
        t._scanTipo = null

        // Restaurar la foto original si la habíamos modificado
        if (aplicaEfectoFoto && fotoOriginalCanvas) {
          const imgCargada = t.getImg()
          if (imgCargada) {
            // Volver a generar el canvas de la foto sin efectos
            t.texFoto.image = crearCanvasSoloFoto(imgCargada)
          } else {
            t.texFoto.image = fotoOriginalCanvas
          }
          t.texFoto.needsUpdate = true
        }
      },
    })

    // ENTRADA: material 0 → 1 en 0.8s (línea sube revelando)
    tl.to(state, { material: 1.0, duration: 0.8, ease: 'power1.inOut' })

    // PAUSA: material 1 → 2 en 1.0s (lineal, frente oculto, malla "piensa")
    // Durante esta fase calcularFaseHolograma() retorna fase='pausa' y la
    // malla hexagonal usa intensidadPulso=1.0 (pulsación intensa).
    tl.to(state, { material: 2.0, duration: 1.0, ease: 'none' })

    // SALIDA: material 2 → 3 en 0.8s (línea baja ocultando)
    tl.to(state, { material: 3.0, duration: 0.8, ease: 'power1.inOut' })
  }

  function detenerScan(numero) {
    const t = tarjetas.find(x => x.jugador.numero === numero)
    if (!t) return

    // Cancelar tweens y remover el ticker
    if (t._scanState) gsap.killTweensOf(t._scanState)
    if (t._scanTicker) {
      gsap.ticker.remove(t._scanTicker)
      t._scanTicker = null
    }
    gsap.killTweensOf(t.spriteScan.material)

    // Fade-out del sprite
    gsap.to(t.spriteScan.material, {
      opacity: 0,
      duration: 0.4,
      ease: 'power2.in',
      onComplete: () => {
        t.spriteScan.visible = false
        t._scanState = null
        t._scanTipo = null
      },
    })
  }

  // Devuelve true si el jugador tiene un holograma activo
  function estaEscaneando(numero) {
    const t = tarjetas.find(x => x.jugador.numero === numero)
    return t && t._scanState !== null && t._scanState !== undefined
  }

  function animarEntrada() {
    grupo.visible = true

    tarjetas.forEach(({ sprite, spriteNom, spriteFoto, spriteCorners, spriteScan, redibujar }, i) => {
      const delay = i * 0.08

      sprite.visible        = true
      spriteFoto.visible    = true
      spriteNom.visible     = true
      sprite.position.y     = -8
      spriteFoto.position.y = -8
      spriteNom.position.y  = -8
      spriteCorners.position.y = -8
      spriteScan.position.y    = -8
      sprite.material.opacity    = 1
      spriteFoto.material.opacity = 1
      spriteNom.material.opacity = 0

      redibujar(false)
      gsap.to(sprite.position,    { y: offsetY, duration: 0.7, delay, ease: 'power3.out' })
      gsap.to(spriteFoto.position,{ y: offsetY, duration: 0.7, delay, ease: 'power3.out' })
      gsap.to(spriteNom.position, { y: offsetY, duration: 0.7, delay, ease: 'power3.out' })
      gsap.to(spriteCorners.position, { y: offsetY, duration: 0.7, delay, ease: 'power3.out' })
      gsap.to(spriteScan.position,    { y: offsetY, duration: 0.7, delay, ease: 'power3.out' })

      gsap.delayedCall(delay + 0.3, () => {
        gsap.to(spriteNom.material, { opacity: 1, duration: 0.5, ease: 'power2.out' })
      })
    })
  }

  function animarSalida(onComplete) {
    tarjetas.forEach(({ sprite, spriteNom, spriteFoto, spriteCorners, spriteScan }, i) => {
      const delay = i * 0.03
      gsap.to(sprite.position,    { y: -8, duration: 0.45, delay, ease: 'power2.in' })
      gsap.to(spriteFoto.position,{ y: -8, duration: 0.45, delay, ease: 'power2.in' })
      gsap.to(spriteNom.position, { y: -8, duration: 0.45, delay, ease: 'power2.in' })
      gsap.to(spriteCorners.position, { y: -8, duration: 0.45, delay, ease: 'power2.in' })
      gsap.to(spriteScan.position,    { y: -8, duration: 0.45, delay, ease: 'power2.in' })
      gsap.to(spriteNom.material, { opacity: 0, duration: 0.25, delay, ease: 'power2.in' })
    })

    const duracionTotal = tarjetas.length * 0.03 + 0.5
    gsap.delayedCall(duracionTotal, () => {
      grupo.visible = false
      tarjetas.forEach(({ sprite, spriteNom, spriteFoto, spriteCorners, spriteScan, redibujar, jugador }) => {
        sprite.position.set(jugador.x, -8, jugador.z)
        sprite.material.opacity = 1
        sprite.visible = true
        spriteNom.position.set(jugador.x, -8, jugador.z)
        spriteNom.material.opacity = 0
        spriteNom.visible = true
        spriteFoto.position.set(jugador.x, -8, jugador.z)
        spriteFoto.material.opacity = 1
        spriteFoto.visible = true
        spriteCorners.position.set(jugador.x, -8, jugador.z)
        spriteCorners.material.opacity = 0
        spriteCorners.visible = false
        spriteScan.position.set(jugador.x, -8, jugador.z)
        spriteScan.material.opacity = 0
        spriteScan.visible = false
        redibujar(false)
      })
      seleccionadoActual = null
      if (onComplete) onComplete()
    })
  }

  const _v = new THREE.Vector3()
  function tickJugadores(camera) {
    if (!grupo.visible) return
    tarjetas
      .slice()
      .sort((a, b) => {
        const da = _v.copy(a.sprite.position).distanceTo(camera.position)
        const db = _v.copy(b.sprite.position).distanceTo(camera.position)
        return db - da
      })
      .forEach((t, i) => {
        t.sprite.renderOrder        = 50 + i * 5
        t.spriteNom.renderOrder     = 50 + i * 5 + 1
        t.spriteFoto.renderOrder    = 50 + i * 5 + 2
        t.spriteCorners.renderOrder = 50 + i * 5 + 3
        t.spriteScan.renderOrder    = 50 + i * 5 + 4
      })
  }

  const btn = document.createElement('button')
  btn.textContent = 'Jugadores'
  btn.className   = 'btn'
  btn.addEventListener('click', function () {
    if (!grupo.visible) {
      animarEntrada()
      this.classList.add('active')
    } else {
      animarSalida(() => this.classList.remove('active'))
    }
  })
  document.getElementById('cc-controls').appendChild(btn)

  return {
    grupo, tarjetas, animarEntrada, animarSalida, tickJugadores,
    seleccionar, deseleccionar, getSeleccionado,
    escanearJugador, detenerScan, estaEscaneando,
  }
}