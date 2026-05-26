import * as THREE from 'three'
import * as TeamModule from './team.js'

export function createControls({ renderer, camera, fieldMaterial, allLines, setLinesColor, scanner }) {

  // ── Cámara orbital ──
  let isDragging  = false
  let prevX = 0, prevY = 0
  let theta = 0, phi = 0.51, orbitRadius = 130
  let autoRotate  = false

  // ── Animación entre vistas ──
  let targetTheta  = theta
  let targetPhi    = 0.51
  let targetRadius = 130
  let isAnimating  = false

  // ── Free Orbit: controles manuales activables/desactivables ───────────────
  // Cuando freeOrbit = true, el usuario puede arrastrar / hacer zoom / pan
  // con el mouse. Cuando es false (default), solo los presets de vista
  // mueven la cámara. Esto permite tener UX cinemática estricta por defecto
  // y un modo "debug/exploración" cuando se necesita.
  let freeOrbit = false

  // ── Sistema de promesas para esperar a que termine una transición ──
  // Cuando se llama setView(), se guarda aquí un resolver. tickCamera() lo
  // llama cuando la animación termina (done=true), lo que permite usar
  // await setView('vertical perspectiva') en código async.
  let onArrived = null

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

  // ── Controles manuales — activados solo cuando freeOrbit = true ───────────
  // Los listeners siempre están enganchados, pero cada handler hace early
  // return si freeOrbit está apagado. Así el toggle es instantáneo.
  //
  // Mouse: drag = orbit, wheel = zoom
  // Touch: 1 dedo = orbit, 2 dedos = pinch zoom
  cvs.addEventListener('mousedown', (e) => {
    if (!freeOrbit) return
    isDragging = true
    prevX = e.clientX
    prevY = e.clientY
    cvs.style.cursor = 'grabbing'
  })

  cvs.addEventListener('mouseup', () => {
    if (!freeOrbit) return
    isDragging = false
    cvs.style.cursor = 'grab'
  })

  cvs.addEventListener('mouseleave', () => {
    isDragging = false
    if (freeOrbit) cvs.style.cursor = 'grab'
  })

  cvs.addEventListener('mousemove', (e) => {
    if (!freeOrbit || !isDragging) return
    const dx = e.clientX - prevX
    const dy = e.clientY - prevY
    prevX = e.clientX
    prevY = e.clientY

    // Sensibilidad del drag
    theta -= dx * 0.005
    phi   -= dy * 0.005

    // Clamp phi para no dar vueltas verticales (queda entre casi cenital y casi suelo)
    const PHI_MIN = 0.05
    const PHI_MAX = Math.PI / 2 - 0.05
    phi = Math.max(PHI_MIN, Math.min(PHI_MAX, phi))

    updateCamera()
  })

  cvs.addEventListener('wheel', (e) => {
    if (!freeOrbit) return
    e.preventDefault()
    // Zoom in/out con clamps razonables
    orbitRadius += e.deltaY * 0.1
    orbitRadius = Math.max(50, Math.min(300, orbitRadius))
    updateCamera()
  }, { passive: false })

  // Touch — 1 dedo = orbit, 2 dedos = pinch zoom
  let touchStartDist = 0
  cvs.addEventListener('touchstart', (e) => {
    if (!freeOrbit) return
    if (e.touches.length === 1) {
      isDragging = true
      prevX = e.touches[0].clientX
      prevY = e.touches[0].clientY
    } else if (e.touches.length === 2) {
      isDragging = false
      const dx = e.touches[0].clientX - e.touches[1].clientX
      const dy = e.touches[0].clientY - e.touches[1].clientY
      touchStartDist = Math.sqrt(dx * dx + dy * dy)
    }
  })

  cvs.addEventListener('touchend', () => {
    if (!freeOrbit) return
    isDragging = false
  })

  cvs.addEventListener('touchmove', (e) => {
    if (!freeOrbit) return
    e.preventDefault()
    if (e.touches.length === 1 && isDragging) {
      const dx = e.touches[0].clientX - prevX
      const dy = e.touches[0].clientY - prevY
      prevX = e.touches[0].clientX
      prevY = e.touches[0].clientY
      theta -= dx * 0.005
      phi   -= dy * 0.005
      const PHI_MIN = 0.05
      const PHI_MAX = Math.PI / 2 - 0.05
      phi = Math.max(PHI_MIN, Math.min(PHI_MAX, phi))
      updateCamera()
    } else if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX
      const dy = e.touches[0].clientY - e.touches[1].clientY
      const dist = Math.sqrt(dx * dx + dy * dy)
      const delta = (touchStartDist - dist) * 0.3
      orbitRadius += delta
      orbitRadius = Math.max(50, Math.min(300, orbitRadius))
      touchStartDist = dist
      updateCamera()
    }
  }, { passive: false })

  // ── Botones de vista ──
  // Cada vista es un objeto { theta, phi, radius, teamRotation: [x,y,z] }
  // para que setView() pueda invocar la misma config tanto desde botón como
  // programáticamente. Los nombres son keys lowercase sin acentos para usar
  // setView('horizontal perspectiva') más fácilmente.
  const views = {
    'horizontal top': {
      theta: 0,
      phi: Math.PI / 2 - 0.01,
      radius: 120,
      teamRotation: [Math.PI / 2, 0, Math.PI],
    },
    'horizontal perspectiva': {
      theta: 0,
      phi: 0.51,
      radius: 130,
      teamRotation: [Math.PI, 0, Math.PI],
    },
    'vertical top': {
      theta: Math.PI / 2,
      phi: Math.PI / 2 - 0.01,
      radius: 142,
      teamRotation: [Math.PI / 2, 0, Math.PI / 2],
    },
    'vertical perspectiva': {
      theta: Math.PI / 2,
      phi: 0.52,
      radius: 130,
      teamRotation: [Math.PI, Math.PI / 2, Math.PI],
    },
    'diagonal': {
      theta: Math.PI * 0.62,
      phi: 0.44,
      radius: 148,
      teamRotation: [Math.PI, Math.PI * 0.72, Math.PI],
    },
  }

  // Aplicar una vista por nombre. Retorna una Promise que resuelve cuando
  // la animación llega al destino (útil para encadenar con await).
  // Si el nombre no existe, retorna una Promise resuelta inmediatamente y
  // emite un warning.
  function setView(nombre) {
    const v = views[nombre.toLowerCase()]
    if (!v) {
      console.warn(`[controls] setView: vista desconocida "${nombre}"`)
      return Promise.resolve()
    }
    // Si ya hay una promesa pendiente, la resolvemos antes de aplicar la nueva
    // (la animación anterior queda interrumpida por la nueva, no debe quedar
    // colgada esperando).
    if (onArrived) {
      const prev = onArrived
      onArrived = null
      prev()
    }
    animateTo(v.theta, v.phi, v.radius)
    setTeamRotation(...v.teamRotation)
    return new Promise(resolve => {
      onArrived = resolve
    })
  }

  // ── Crear botones HTML para cada vista (mismo comportamiento que antes) ─
  // El label visible mantiene la capitalización original; la key interna es
  // lowercase porque así la consultamos en setView().
  const viewLabels = {
    'horizontal top':          'Horizontal top',
    'horizontal perspectiva':  'Horizontal perspectiva',
    'vertical top':            'Vertical top',
    'vertical perspectiva':    'Vertical perspectiva',
    'diagonal':                'Diagonal',
  }
  Object.entries(viewLabels).forEach(([key, label]) => {
    const btn = document.createElement('button')
    btn.textContent = label
    btn.className   = 'btn'
    btn.addEventListener('click', () => setView(key))
    document.getElementById('cc-controls').appendChild(btn)
  })

  // ── Botón Scanner — mismo estilo que los demás botones ──
  if (scanner) {
    const scanBtn = document.createElement('button')
    scanBtn.textContent = 'Scan Field'
    scanBtn.className   = 'btn'
    scanBtn.addEventListener('click', () => {
      scanner.toggle()
      scanBtn.classList.toggle('active', scanner.active)
    })
    document.getElementById('cc-controls').appendChild(scanBtn)
  }

  // ── Botón Free Orbit — toggle de controles manuales del mouse ────────────
  // Permite arrastrar/zoom con el mouse o touch. Cuando se activa, la
  // animación de presets queda interrumpida y la cámara queda en la pose
  // exacta donde está cuando se hizo el toggle. Los botones de vista siguen
  // funcionando: si tocás uno con free orbit activado, la cámara se anima
  // a la vista pero podés seguir moviéndola libre cuando termine.
  const freeOrbitBtn = document.createElement('button')
  freeOrbitBtn.textContent = 'Free Orbit'
  freeOrbitBtn.className   = 'btn'
  freeOrbitBtn.addEventListener('click', () => {
    freeOrbit = !freeOrbit
    freeOrbitBtn.classList.toggle('active', freeOrbit)
    cvs.style.cursor = freeOrbit ? 'grab' : 'default'
    // Si activamos free orbit en medio de una animación, la cortamos para
    // que el usuario tenga control inmediato (si no, la cámara seguiría
    // moviéndose sola hacia el target del último preset).
    if (freeOrbit && isAnimating) {
      isAnimating = false
      if (onArrived) {
        const resolver = onArrived
        onArrived = null
        resolver()
      }
    }
  })
  document.getElementById('cc-controls').appendChild(freeOrbitBtn)

  // ── Loop de animación ──
  function tickCamera() {
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
        // Resolver promesa pendiente de setView()
        if (onArrived) {
          const resolver = onArrived
          onArrived = null
          resolver()
        }
      }

      updateCamera()
    }
  }

  function getPhi()   { return phi }
  function getTheta() { return theta }

  return { tickCamera, getPhi, getTheta, setView }
}