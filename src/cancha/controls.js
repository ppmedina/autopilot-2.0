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

  // ── Controles manuales BLOQUEADOS PERMANENTEMENTE ─────────────────────
  // Los listeners de mouse/touch/wheel se han desactivado intencionalmente
  // para garantizar que la cámara solo se mueve mediante los botones de
  // vista o programáticamente con setView(). Esto evita que el usuario
  // rompa la composición durante demos cinematográficas.
  //
  // Si quieres restaurar la libertad de exploración manual, descomenta el
  // bloque siguiente:
  //
  // cvs.addEventListener('mousedown',  ...)
  // cvs.addEventListener('mouseup',    ...)
  // cvs.addEventListener('mousemove',  ...)
  // cvs.addEventListener('wheel',      ...)
  // cvs.addEventListener('touchstart', ...)
  // cvs.addEventListener('touchend',   ...)
  // cvs.addEventListener('touchmove',  ...)

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