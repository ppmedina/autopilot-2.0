// src/cancha/heatmap-flat.js
import * as THREE from 'three'
import gsap from 'gsap'

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
    opacidad = 1.0,
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
    ctx.fillStyle = '#000000'
    ctx.fillRect(0, 0, resW, resH)

    const mF = 80, mC = 120

    for (let fi = 0; fi < mF; fi++) {
      for (let ci = 0; ci < mC; ci++) {
        const u = fi / (mF - 1)
        const v = ci / (mC - 1)
        const valor = interpolar(dat, u, v)
        if (valor < 0.015) continue

        const px    = v * resW
        const py    = u * resH
        const radio = resW * 0.03 * (0.4 + valor * 0.7)

        const grad = ctx.createRadialGradient(px, py, 0, px, py, radio)

        if (valor >= 0.75) {
          grad.addColorStop(0.00, `rgb(255, 255, 255)`)
          grad.addColorStop(0.15, `rgb(180, 240, 255)`)
          grad.addColorStop(0.35, `rgb(60,  200, 255)`)
          grad.addColorStop(0.60, `rgb(0,   130, 230)`)
          grad.addColorStop(0.80, `rgb(0,    60, 160)`)
          grad.addColorStop(1.00, `rgb(0,     0,   0)`)
        } else if (valor >= 0.4) {
          grad.addColorStop(0.00, `rgb(30,  160, 255)`)
          grad.addColorStop(0.25, `rgb(10,  100, 210)`)
          grad.addColorStop(0.55, `rgb(0,    55, 150)`)
          grad.addColorStop(0.80, `rgb(0,    25,  90)`)
          grad.addColorStop(1.00, `rgb(0,     0,   0)`)
        } else {
          grad.addColorStop(0.00, `rgb(10,   60, 160)`)
          grad.addColorStop(0.40, `rgb(5,    30, 100)`)
          grad.addColorStop(1.00, `rgb(0,     0,   0)`)
        }

        ctx.globalCompositeOperation = 'lighter'
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
    ctxB.filter = `blur(${Math.round(resW * 0.015)}px)`
    ctxB.drawImage(canvas, 0, 0)
    ctxB.filter = 'none'

    return new THREE.CanvasTexture(canvasBlur)
  }

  const textura = generarTextura(datos)

  // ─── Shader sin máscara — muestra la textura completa ───────────────────────
  // Solo anima uOpacidad para fade in/out limpio
  const vertexShader = /* glsl */`
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `

  const fragmentShader = /* glsl */`
    uniform sampler2D uTextura;
    uniform float     uOpacidad;
    varying vec2 vUv;
    void main() {
      vec4 c = texture2D(uTextura, vUv);
      gl_FragColor = vec4(c.rgb * uOpacidad, 1.0);
    }
  `

  const uniforms = {
    uTextura:  { value: textura },
    uOpacidad: { value: 0.0 },
  }

  const mat = new THREE.ShaderMaterial({
    uniforms,
    vertexShader,
    fragmentShader,
    transparent: false,
    depthWrite:  false,
    depthTest:   false,
    blending:    THREE.AdditiveBlending,
    side:        THREE.DoubleSide,
  })

  const geo  = new THREE.PlaneGeometry(ancho, alto)
  const mesh = new THREE.Mesh(geo, mat)
  mesh.rotation.x = -Math.PI / 2
  mesh.position.y  = 0.5
  mesh.visible     = false
  mesh.renderOrder = 0
  scene.add(mesh)

  let tweenActivo = null
  function matarTween() {
    if (tweenActivo) { tweenActivo.kill(); tweenActivo = null }
  }

  function animarEntrada(onComplete) {
    matarTween()
    uniforms.uOpacidad.value = 0.0
    mesh.visible = true
    tweenActivo = gsap.to(uniforms.uOpacidad, {
      value: opacidad, duration: 0.5, ease: 'power2.out', onComplete,
    })
  }

  function animarSalida(onComplete) {
    matarTween()
    tweenActivo = gsap.to(uniforms.uOpacidad, {
      value: 0.0, duration: 0.35, ease: 'power2.in',
      onComplete() {
        mesh.visible = false
        if (onComplete) onComplete()
      }
    })
  }

  const btn = document.createElement('button')
  btn.textContent = 'Heatmap 2'
  btn.className   = 'btn'
  btn.addEventListener('click', function () {
    if (!mesh.visible) {
      animarEntrada()
      btn.classList.add('active')
    } else {
      animarSalida(function() { btn.classList.remove('active') })
    }
  })
  document.getElementById('cc-controls').appendChild(btn)

  return { mesh, animarEntrada, animarSalida }
}
