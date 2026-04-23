// src/cancha/heatmap-flat.js
import * as THREE from 'three'

const DATOS_EJEMPLO = [
  //  0    1    2    3    4    5    6    7    8    9   10   11   12   13   14
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

export function createHeatmapFlat(scene, datos = DATOS_EJEMPLO, opciones = {}) {

  const {
    ancho    = 105,
    alto     = 68,
    offsetY  = 2.0,
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

  function generarTextura(dat) {
    const canvas = document.createElement('canvas')
    canvas.width  = resW
    canvas.height = resH
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, resW, resH)

    const mF = 80
    const mC = 120

    for (let fi = 0; fi < mF; fi++) {
      for (let ci = 0; ci < mC; ci++) {
        const u = fi / (mF - 1)
        const v = ci / (mC - 1)
        const valor = interpolar(dat, u, v)
        if (valor < 0.015) continue

        const px = v * resW
        const py = u * resH
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

    // Blur en canvas transparente — fondo clearRect garantiza alpha=0 en zonas vacías
    const canvasBlur = document.createElement('canvas')
    canvasBlur.width  = resW
    canvasBlur.height = resH
    const ctxB = canvasBlur.getContext('2d')
    // Fondo negro puro — con AdditiveBlending el negro se suma como cero (invisible)
    ctxB.fillStyle = '#000000'
    ctxB.fillRect(0, 0, resW, resH)
    ctxB.filter = `blur(${Math.round(resW * 0.02)}px)`
    ctxB.drawImage(canvas, 0, 0)
    ctxB.filter = 'none'

    return new THREE.CanvasTexture(canvasBlur)
  }

  const textura = generarTextura(datos)
  const geo     = new THREE.PlaneGeometry(ancho, alto)
  const mat     = new THREE.MeshBasicMaterial({
    map:         textura,
    transparent: true,
    opacity:     opacidad,
    depthWrite:  false,
    depthTest:   false,  // ← ignora el depth buffer, siempre visible debajo de todo
    blending:    THREE.AdditiveBlending,
    side:        THREE.DoubleSide,
  })

  const mesh = new THREE.Mesh(geo, mat)
  mesh.rotation.x = -Math.PI / 2
  mesh.position.y  = 0.5
  mesh.visible     = false
  mesh.renderOrder = 0
  scene.add(mesh)

  const btn = document.createElement('button')
  btn.textContent = 'Heatmap 2'
  btn.className   = 'btn'
  btn.addEventListener('click', function () {
    mesh.visible = !mesh.visible
    this.classList.toggle('active', mesh.visible)
  })
  document.getElementById('cc-controls').appendChild(btn)

  return { mesh }
}
