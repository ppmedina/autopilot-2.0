import * as THREE from 'three'
import * as TeamModule from './team.js'

export function createControls({ renderer, camera, fieldMaterial, allLines, setLinesColor }) {

  // ── Cámara orbital ──
  let isDragging  = false
  let prevX = 0, prevY = 0
  let theta = 0, phi = 0.5, orbitRadius = 110
  let autoRotate  = false

  // ── Animación entre vistas ──
  let targetTheta  = theta
  let targetPhi    = phi
  let targetRadius = orbitRadius
  let isAnimating  = false

  function animateTo(toTheta, toPhi, toRadius) {
    targetTheta  = toTheta
    targetPhi    = toPhi
    targetRadius = toRadius
    isAnimating  = true
  }

  function setTeamRotation(x, y, z) {
    if (TeamModule.teamObject) {
      TeamModule.teamObject.rotation.set(x, y, z)
    }
  }

  function updateCamera() {
    camera.position.x = orbitRadius * Math.sin(theta) * Math.cos(phi)
    camera.position.y = orbitRadius * Math.sin(phi)
    camera.position.z = orbitRadius * Math.cos(theta) * Math.cos(phi)
    camera.lookAt(0, 0, 0)
  }
  updateCamera()

  const cvs = renderer.domElement

  // Mouse
  cvs.addEventListener('mousedown', e => {
    isDragging  = true
    isAnimating = false
    prevX = e.clientX
    prevY = e.clientY
  })
  cvs.addEventListener('mouseup',   () => { isDragging = false })
  cvs.addEventListener('mousemove', e => {
    if (!isDragging) return
    theta -= (e.clientX - prevX) * 0.008
    phi    = Math.max(0.1, Math.min(1.4, phi - (e.clientY - prevY) * 0.006))
    prevX  = e.clientX
    prevY  = e.clientY
    updateCamera()
  })
  cvs.addEventListener('wheel', e => {
    orbitRadius  = Math.max(30, Math.min(180, orbitRadius + e.deltaY * 0.08))
    targetRadius = orbitRadius
    updateCamera()
  })

  // Touch
  cvs.addEventListener('touchstart', e => {
    isDragging  = true
    isAnimating = false
    prevX = e.touches[0].clientX
    prevY = e.touches[0].clientY
  })
  cvs.addEventListener('touchend',   () => { isDragging = false })
  cvs.addEventListener('touchmove',  e => {
    if (!isDragging) return
    theta -= (e.touches[0].clientX - prevX) * 0.008
    phi    = Math.max(0.1, Math.min(1.4, phi - (e.touches[0].clientY - prevY) * 0.006))
    prevX  = e.touches[0].clientX
    prevY  = e.touches[0].clientY
    updateCamera()
  })

  // ── Botones UI de color ──
  const colorPresets = {
    white: { color: 0xffffff, emissive: 0xaaddff },
    cyan:  { color: 0x00eeff, emissive: 0x00ccff },
    gold:  { color: 0xffdd44, emissive: 0xffaa00 },
  }

  document.querySelectorAll('.btn[data-color]').forEach(btn => {
    btn.addEventListener('click', () => {
      const { color, emissive } = colorPresets[btn.dataset.color]
      setLinesColor(color, emissive)
      document.querySelectorAll('.btn[data-color]').forEach(b => b.classList.remove('active'))
      btn.classList.add('active')
    })
  })

  document.getElementById('btn-rotate').addEventListener('click', function () {
    autoRotate = !autoRotate
    this.classList.toggle('active', autoRotate)
  })

  // ── Botones de vista con animación y rotación de team ──
  const views = {
    'Horizontal top': () => {
      animateTo(0, Math.PI / 2 - 0.01, 120)
      setTeamRotation(Math.PI / 2, 0, Math.PI)
    },
    'Horizontal perspectiva': () => {
      animateTo(0, 0.51, 130)
      setTeamRotation(Math.PI, 0, Math.PI)
    },
    'Vertical top': () => {
      animateTo(Math.PI / 2, Math.PI / 2 - 0.01, 142)
      setTeamRotation(Math.PI / 2, 0, Math.PI / 2)
    },
    'Vertical perspectiva': () => {
      animateTo(Math.PI / 2, 0.52, 130)
      setTeamRotation(Math.PI, Math.PI / 2, Math.PI)
    },
  }

  Object.entries(views).forEach(([label, fn]) => {
    const btn = document.createElement('button')
    btn.textContent = label
    btn.className   = 'btn'
    btn.addEventListener('click', fn)
    document.getElementById('cc-controls').appendChild(btn)
  })

  // ── Loop de animación ──
  function tickCamera() {
    if (autoRotate) {
      theta += 0.004
      targetTheta = theta
      updateCamera()
      return
    }

    if (isAnimating) {
      const speed = 0.3

      let dTheta = targetTheta - theta
      if (dTheta >  Math.PI) dTheta -= Math.PI * 2
      if (dTheta < -Math.PI) dTheta += Math.PI * 2

      theta       += dTheta * speed
      phi         += (targetPhi    - phi)         * speed
      orbitRadius += (targetRadius - orbitRadius) * speed

      const done =
        Math.abs(dTheta)                     < 0.001 &&
        Math.abs(targetPhi    - phi)         < 0.001 &&
        Math.abs(targetRadius - orbitRadius) < 0.1

      if (done) {
        theta       = targetTheta
        phi         = targetPhi
        orbitRadius = targetRadius
        isAnimating = false
      }

      updateCamera()
    }
  }

  // ── Exportar phi actual para que otros módulos detecten la vista ──
  function getPhi() { return phi }

  return { tickCamera, getPhi }
}
