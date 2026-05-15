// src/cancha/heatmap-flat-v2.js
// Versión 2 — animación por capas de intensidad progresiva
// Basada en el heatmap-flat original con MeshBasicMaterial + AdditiveBlending

import * as THREE from 'three'
import gsap from 'gsap'

const DATOS_EJEMPLO = [
  [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.1, 0.4, 0.6, 0.5, 0.7, 0.9, 0.7, 0.5, 0.1],
  [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.2, 0.5, 0.8, 0.7, 1.0, 0.8, 0.6, 0.4, 0.1],
  [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.1, 0.3, 0.5, 0.9, 0.7, 0.5, 0.4, 0.2, 0.0],
  [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.1, 0.3, 0.4, 0.3, 0.2, 0.1, 0.1, 0.0],
  [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.1, 0.1, 0.1, 0.0, 0.0, 0.0, 0.0],
  [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
  [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
  [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
  [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
  [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
  [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
  [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
  [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
]

// Cada capa tiene su umbral y su opacidad target independiente
// Las opacidades bajas evitan saturación con AdditiveBlending
const CAPAS_CONFIG = [
  { umbral: 0.01, opacidad: 0.25 },
  { umbral: 0.30, opacidad: 0.20 },
  { umbral: 0.50, opacidad: 0.18 },
  { umbral: 0.68, opacidad: 0.15 },
  { umbral: 0.82, opacidad: 0.12 },
]

export function createHeatmapFlat(scene, datos = DATOS_EJEMPLO, opciones = {}) {

  const {
    ancho    = 105,
    alto     = 68,
    resW     = 1024,
    resH     = 664,
    opacidad = 0.6,
  } = opciones

  function interpolar(dat, u, v) {
    const filas = dat.length
    const cols  = dat[0].length
    const fi = u * (filas - 1)
    const ci = v * (cols  - 1)
    const f0 = Math.floor(fi), f1 = Math.min(f0 + 1, filas - 1)
    const c0 = Math.floor(ci), c1 = Math.min(c0 + 1, cols  - 1)
    const tf = fi - f0, tc = ci - c0
    const sf = tf * tf * (3 - 2 * tf)
    const sc = tc * tc * (3 - 2 * tc)
    return dat[f0][c0] * (1-sf) * (1-sc)
         + dat[f1][c0] * sf     * (1-sc)
         + dat[f0][c1] * (1-sf) * sc
         + dat[f1][c1] * sf     * sc
  }

  // ─── Genera textura igual al original — solo pinta puntos >= umbralMin ────
  function generarTextura(dat, umbralMin = 0.015) {
    const canvas = document.createElement('canvas')
    canvas.width  = resW
    canvas.height = resH
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, resW, resH)

    const mF = 80, mC = 120

    for (let fi = 0; fi < mF; fi++) {
      for (let ci = 0; ci < mC; ci++) {
        const u = fi / (mF - 1)
        const v = ci / (mC - 1)
        const valor = interpolar(dat, u, v)
        if (valor < umbralMin) continue

        const px    = v * resW
        const py    = u * resH
        const radio = resW * 0.03 * (0.4 + valor * 0.7)

        const grad = ctx.createRadialGradient(px, py, 0, px, py, radio)

        if (valor >= 0.75) {
          grad.addColorStop(0.00, `rgba(255, 255, 255, ${valor * 0.95})`)
          grad.addColorStop(0.15, `rgba(180, 240, 255, ${valor * 0.90})`)
          grad.addColorStop(0.35, `rgba(60,  200, 255, ${valor * 0.75})`)
          grad.addColorStop(0.60, `rgba(0,   130, 230, ${valor * 0.45})`)
          grad.addColorStop(0.80, `rgba(0,    60, 160, ${valor * 0.15})`)
          grad.addColorStop(1.00, `rgba(0,    20,  80, 0)`)
        } else if (valor >= 0.4) {
          grad.addColorStop(0.00, `rgba(30,  160, 255, ${valor * 0.85})`)
          grad.addColorStop(0.25, `rgba(10,  100, 210, ${valor * 0.70})`)
          grad.addColorStop(0.55, `rgba(0,    55, 150, ${valor * 0.40})`)
          grad.addColorStop(0.80, `rgba(0,    25,  90, ${valor * 0.15})`)
          grad.addColorStop(1.00, `rgba(0,    10,  50, 0)`)
        } else {
          grad.addColorStop(0.00, `rgba(10,   60, 160, ${valor * 0.55})`)
          grad.addColorStop(0.40, `rgba(5,    30, 100, ${valor * 0.25})`)
          grad.addColorStop(1.00, `rgba(0,    10,  50, 0)`)
        }

        ctx.globalCompositeOperation = 'screen'
        ctx.fillStyle = grad
        ctx.beginPath()
        ctx.arc(px, py, radio, 0, Math.PI * 2)
        ctx.fill()
      }
    }

    const canvasBlur = document.createElement('canvas')
    canvasBlur.width  = resW
    canvasBlur.height = resH
    const ctxB = canvasBlur.getContext('2d')
    ctxB.fillStyle = '#000000'
    ctxB.fillRect(0, 0, resW, resH)
    ctxB.filter = `blur(${Math.round(resW * 0.02)}px)`
    ctxB.drawImage(canvas, 0, 0)
    ctxB.filter = 'none'

    return new THREE.CanvasTexture(canvasBlur)
  }

  // ─── Crear una capa por umbral — igual que el original ───────────────────
  const capas = CAPAS_CONFIG.map(({ umbral, opacidad: opTarget }, i) => {
    const textura = generarTextura(datos, umbral)
    const geo     = new THREE.PlaneGeometry(ancho, alto)
    const mat     = new THREE.MeshBasicMaterial({
      map:         textura,
      transparent: true,
      opacity:     0,
      depthWrite:  false,
      depthTest:   false,
      blending:    THREE.AdditiveBlending,
      side:        THREE.DoubleSide,
    })
    const mesh = new THREE.Mesh(geo, mat)
    mesh.rotation.x = -Math.PI / 2
    mesh.position.y  = 0.5
    mesh.visible     = false
    mesh.renderOrder = i
    mesh.userData.esHeatmapFlatV2 = true
    scene.add(mesh)
    return { mesh, mat, opTarget }
  })

  // ─── Estado ──────────────────────────────────────────────────────────────
  let tweens = [], timers = []
  const estaVisible = { valor: false }

  function matarTodo() {
    tweens.forEach(t => t && t.kill()); tweens = []
    timers.forEach(t => clearTimeout(t)); timers = []
  }

  // ─── ENTRADA — de menor a mayor intensidad ───────────────────────────────
  function animarEntrada(onComplete) {
    matarTodo()
    estaVisible.valor = true

    capas.forEach(({ mesh, mat }) => {
      mesh.visible = true
      mat.opacity  = 0
    })

    const duracion = 0.5
    const stagger  = 0.35

    capas.forEach(({ mat, opTarget }, i) => {
      timers.push(setTimeout(() => {
        tweens.push(gsap.to(mat, {
          opacity:  opTarget,
          duration: duracion,
          ease:     'power2.out',
        }))
      }, i * stagger * 1000))
    })

    if (onComplete) {
      const total = (capas.length - 1) * stagger + duracion
      timers.push(setTimeout(onComplete, total * 1000))
    }
  }

  // ─── SALIDA — de mayor a menor intensidad ────────────────────────────────
  function animarSalida(onComplete) {
    matarTodo()
    estaVisible.valor = false

    const duracion = 0.35
    const stagger  = 0.25

    ;[...capas].reverse().forEach(({ mesh, mat }, i) => {
      timers.push(setTimeout(() => {
        tweens.push(gsap.to(mat, {
          opacity:  0,
          duration: duracion,
          ease:     'power2.in',
          onComplete() {
            mesh.visible = false
            if (i === capas.length - 1 && onComplete) onComplete()
          },
        }))
      }, i * stagger * 1000))
    })
  }

  // ─── Botón ────────────────────────────────────────────────────────────────
  const btn = document.createElement('button')
  btn.textContent = 'Heatmap Flat V2'
  btn.className   = 'btn'
  btn.addEventListener('click', function () {
    if (!estaVisible.valor) {
      animarEntrada()
      this.classList.add('active')
    } else {
      animarSalida(() => this.classList.remove('active'))
    }
  })
  document.getElementById('cc-controls').appendChild(btn)

  // Primer mesh como referencia para script.js
  const mesh = capas[0].mesh

  return { mesh, animarEntrada, animarSalida }
}
