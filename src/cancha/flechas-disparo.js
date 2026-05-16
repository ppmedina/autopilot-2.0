// src/cancha/flechas-disparo.js
import * as THREE from 'three'
import gsap from 'gsap'

const FLECHAS_DISPARO_EJEMPLO = [
  { de: { x: 25, z:   5 }, a: { x: 52, z:   0 } },
]

function crearGeoTrapecio(inicio, fin, anchoOrigen, anchoDestino) {
  const dir  = new THREE.Vector3().subVectors(fin, inicio).normalize()
  const perp = new THREE.Vector3(-dir.z, 0, dir.x)
  const v0 = new THREE.Vector3().copy(inicio).addScaledVector(perp,  anchoOrigen  * 0.5)
  const v1 = new THREE.Vector3().copy(inicio).addScaledVector(perp, -anchoOrigen  * 0.5)
  const v2 = new THREE.Vector3().copy(fin).addScaledVector(perp,    -anchoDestino * 0.5)
  const v3 = new THREE.Vector3().copy(fin).addScaledVector(perp,     anchoDestino * 0.5)
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(
    new Float32Array([v0.x,v0.y,v0.z,v1.x,v1.y,v1.z,v2.x,v2.y,v2.z,v3.x,v3.y,v3.z]), 3
  ))
  geo.setAttribute('uv', new THREE.BufferAttribute(new Float32Array([0,0,0,1,1,1,1,0]), 2))
  geo.setIndex(new THREE.BufferAttribute(new Uint16Array([0,1,2,0,2,3]), 1))
  return geo
}

function crearTexturaDisparo(color) {
  const w = 256, h = 32
  const canvas = document.createElement('canvas')
  canvas.width = w; canvas.height = h
  const ctx = canvas.getContext('2d')
  ctx.clearRect(0, 0, w, h)
  const c  = new THREE.Color(color)
  const r  = Math.round(c.r * 255)
  const g  = Math.round(c.g * 255)
  const b  = Math.round(c.b * 255)
  const cy = h / 2
  const hGrad = ctx.createLinearGradient(0, 0, w, 0)
  hGrad.addColorStop(0.0, `rgba(${r},${g},${b},0.0)`)
  hGrad.addColorStop(0.3, `rgba(${r},${g},${b},0.7)`)
  hGrad.addColorStop(1.0, `rgba(255,255,220,1.0)`)
  ctx.fillStyle = hGrad
  ctx.fillRect(0, 0, w, h)
  const vGrad = ctx.createLinearGradient(0, 0, 0, h)
  vGrad.addColorStop(0.0,  'rgba(0,0,0,0.85)')
  vGrad.addColorStop(0.35, 'rgba(0,0,0,0.0)')
  vGrad.addColorStop(0.65, 'rgba(0,0,0,0.0)')
  vGrad.addColorStop(1.0,  'rgba(0,0,0,0.85)')
  ctx.globalCompositeOperation = 'destination-out'
  ctx.fillStyle = vGrad
  ctx.fillRect(0, 0, w, h)
  ctx.globalCompositeOperation = 'source-over'
  const lineGrad = ctx.createLinearGradient(0, 0, w, 0)
  lineGrad.addColorStop(0.0, 'rgba(255,255,255,0.0)')
  lineGrad.addColorStop(0.4, 'rgba(255,255,255,0.6)')
  lineGrad.addColorStop(1.0, 'rgba(255,255,255,1.0)')
  ctx.fillStyle = lineGrad
  ctx.fillRect(0, cy - 1, w, 2)
  return new THREE.CanvasTexture(canvas)
}

function crearTexturaEnergia(color) {
  const w = 128, h = 32
  const canvas = document.createElement('canvas')
  canvas.width = w; canvas.height = h
  const ctx = canvas.getContext('2d')
  ctx.clearRect(0, 0, w, h)
  const c = new THREE.Color(color)
  const r = Math.round(c.r * 255), g = Math.round(c.g * 255), b = Math.round(c.b * 255)
  const gx = ctx.createLinearGradient(0, 0, w, 0)
  gx.addColorStop(0.0,  `rgba(${r},${g},${b},0.0)`)
  gx.addColorStop(0.35, `rgba(255,255,200,0.9)`)
  gx.addColorStop(0.5,  `rgba(255,255,255,1.0)`)
  gx.addColorStop(0.65, `rgba(${r},${g},${b},0.9)`)
  gx.addColorStop(1.0,  `rgba(${r},${g},${b},0.0)`)
  ctx.fillStyle = gx
  ctx.fillRect(0, 0, w, h)
  const gy = ctx.createLinearGradient(0, 0, 0, h)
  gy.addColorStop(0.0,  'rgba(0,0,0,0.9)')
  gy.addColorStop(0.3,  'rgba(0,0,0,0.0)')
  gy.addColorStop(0.7,  'rgba(0,0,0,0.0)')
  gy.addColorStop(1.0,  'rgba(0,0,0,0.9)')
  ctx.globalCompositeOperation = 'destination-out'
  ctx.fillStyle = gy
  ctx.fillRect(0, 0, w, h)
  ctx.globalCompositeOperation = 'source-over'
  return new THREE.CanvasTexture(canvas)
}

function crearPuntaMesh(dir, color, tamano) {
  const perp = new THREE.Vector3(-dir.z, 0, dir.x)
  const tip  = new THREE.Vector3().copy(dir).multiplyScalar( tamano * 0.9)
  const bL   = new THREE.Vector3().copy(perp).multiplyScalar( tamano * 0.55)
  const bR   = new THREE.Vector3().copy(perp).multiplyScalar(-tamano * 0.55)
  const geo  = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(
    new Float32Array([tip.x,tip.y,tip.z, bL.x,bL.y,bL.z, bR.x,bR.y,bR.z]), 3
  ))
  geo.setIndex(new THREE.BufferAttribute(new Uint16Array([0,1,2]), 1))
  const mat  = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 1.0, depthWrite: false, side: THREE.DoubleSide })
  const mesh = new THREE.Mesh(geo, mat)
  mesh.renderOrder = 5
  mesh.visible = false
  return mesh
}

function iniciarEnergiaLoop(fd) {
  if (fd._energiaTl) { fd._energiaTl.kill(); fd._energiaTl = null }
  const { meshEnergia, clipEnergiaBack, clipEnergiaFront, inicioAc, finAc } = fd
  const ventanaFrac = 0.25
  const durPasada   = 0.75
  const durPausa    = 0.8
  const dirN   = new THREE.Vector3().subVectors(finAc, inicioAc).normalize()
  const dirNeg = dirN.clone().negate()
  const ocultarBrillo = () => {
    clipEnergiaBack.constant  = -dirNeg.dot(inicioAc)
    clipEnergiaFront.constant = -dirN.dot(inicioAc)
  }
  ocultarBrillo()
  const proxy = { t: 0 }
  const tl = gsap.timeline({ repeat: -1, repeatDelay: durPausa })
  tl.set(proxy, { t: -ventanaFrac })
  tl.to(proxy, {
    t: 1 + ventanaFrac, duration: durPasada, ease: 'power1.inOut',
    onUpdate() {
      const tBack  = Math.max(proxy.t, 0)
      const tFront = Math.min(proxy.t + ventanaFrac, 1)
      clipEnergiaBack.constant  = -dirNeg.dot(new THREE.Vector3().lerpVectors(inicioAc, finAc, tBack))
      clipEnergiaFront.constant = -dirN.dot(new THREE.Vector3().lerpVectors(inicioAc, finAc, tFront))
    },
    onComplete: ocultarBrillo,
  })
  fd._energiaTl = tl
}

export function createFlechasDisparo(scene, flechas = FLECHAS_DISPARO_EJEMPLO, opciones = {}) {
  const {
    offsetY         = 0.4,
    color           = 0xD6F221,
    anchoDisparo    = 0.5,
    duracionEntrada = 0.55,
    duracionSalida  = 0.9,
    delayEntrada    = 0.1,
    onToggle        = null,
    getPhi          = null,
    radioAro        = 4.5,
    radioAroTop     = 6.5,
    umbralTop       = 1.1,
  } = opciones

  const grupo = new THREE.Group()
  grupo.position.y = offsetY
  grupo.visible    = false
  scene.add(grupo)

  const flechasDatos = []
  const puntasMesh   = []
  let tweensActivos  = []

  flechas.forEach((flecha, fi) => {
    const inicio = new THREE.Vector3(flecha.de.x, 0, flecha.de.z)
    const fin    = new THREE.Vector3(flecha.a.x,  0, flecha.a.z)
    const dir    = new THREE.Vector3().subVectors(fin, inicio).normalize()
    const radio  = getPhi && getPhi() > umbralTop ? radioAroTop : radioAro
    const radioDestino = flecha.radioDestino ?? radio
    const inicioAc = new THREE.Vector3().copy(inicio).addScaledVector(dir,  radio)
    const finAc    = new THREE.Vector3().copy(fin).addScaledVector(dir,    -radioDestino)
    const longitud = inicioAc.distanceTo(finAc)

    const clipNormal    = dir.clone().negate()
    const clipPlaneDisp = new THREE.Plane(clipNormal, 0)
    const clipsDisp     = [clipPlaneDisp]

    // Glow exterior
    const matGlow = new THREE.MeshBasicMaterial({
      color, transparent: true, opacity: 0.18, depthWrite: false,
      side: THREE.DoubleSide, blending: THREE.NormalBlending, clippingPlanes: clipsDisp,
    })
    const meshGlow = new THREE.Mesh(crearGeoTrapecio(inicioAc, finAc, anchoDisparo * 1.2, anchoDisparo * 3.5), matGlow)
    meshGlow.renderOrder = 2
    meshGlow.visible = false
    grupo.add(meshGlow)

    // Cuerpo principal
    const tex = crearTexturaDisparo(color)
    const mat = new THREE.MeshBasicMaterial({
      map: tex, transparent: true, opacity: 1, depthWrite: false,
      side: THREE.DoubleSide, blending: THREE.NormalBlending, clippingPlanes: clipsDisp,
    })
    const mesh = new THREE.Mesh(crearGeoTrapecio(inicioAc, finAc, anchoDisparo * 0.4, anchoDisparo * 1.2), mat)
    mesh.renderOrder = 3
    mesh.visible = false
    grupo.add(mesh)

    // Brillo corriente con clipPlanes propios
    const clipEnergiaBack  = new THREE.Plane(dir.clone().negate(), 0)
    const clipEnergiaFront = new THREE.Plane(dir.clone(), 0)
    const texEnergia = crearTexturaEnergia(color)
    const matEnergia = new THREE.MeshBasicMaterial({
      map: texEnergia, transparent: true, opacity: 0.95, depthWrite: false,
      side: THREE.DoubleSide, blending: THREE.AdditiveBlending,
      clippingPlanes: [clipEnergiaBack, clipEnergiaFront],
    })
    const meshEnergia = new THREE.Mesh(crearGeoTrapecio(inicioAc, finAc, anchoDisparo * 1.0, anchoDisparo * 2.8), matEnergia)
    meshEnergia.renderOrder = 5
    meshEnergia.visible = false
    grupo.add(meshEnergia)

    const punta = crearPuntaMesh(dir, color, 1.4)
    punta.position.copy(inicioAc)
    grupo.add(punta)
    puntasMesh.push(punta)

    clipPlaneDisp.constant = -clipNormal.dot(inicioAc)

    flechasDatos.push({
      mesh, meshGlow, meshEnergia, punta,
      clipPlaneDisp, clipNormal, clipsDisp,
      clipEnergiaBack, clipEnergiaFront,
      inicioAc: inicioAc.clone(), finAc: finAc.clone(), longitud,
    })
  })

  function animarEntrada(onComplete) {
    tweensActivos.forEach(t => t.kill())
    tweensActivos = []
    grupo.visible = true
    let completadas = 0

    flechasDatos.forEach((fd, fi) => {
      const { mesh, meshGlow, meshEnergia, punta, clipPlaneDisp, clipNormal, inicioAc, finAc } = fd
      mesh.visible = true; meshGlow.visible = true; meshEnergia.visible = true; punta.visible = true
      punta.position.copy(inicioAc)
      clipPlaneDisp.constant = -clipNormal.dot(inicioAc)

      const proxy = { t: 0 }
      const tw = gsap.to(proxy, {
        t: 1, duration: duracionEntrada, delay: fi * delayEntrada, ease: 'power2.inOut',
        onUpdate() {
          punta.position.lerpVectors(inicioAc, finAc, proxy.t)
          clipPlaneDisp.constant = -clipNormal.dot(punta.position)
        },
        onComplete() {
          punta.position.copy(finAc)
          clipPlaneDisp.constant = -clipNormal.dot(finAc)
          iniciarEnergiaLoop(fd)
          completadas++
          if (completadas >= flechasDatos.length && onComplete) onComplete()
        },
      })
      tweensActivos.push(tw)
    })
  }

  function animarSalida(onComplete) {
    tweensActivos.forEach(t => t.kill())
    tweensActivos = []
    flechasDatos.forEach(fd => {
      if (fd._energiaTl) { fd._energiaTl.kill(); fd._energiaTl = null }
    })

    gsap.delayedCall(duracionSalida, () => {
      grupo.visible = false
      if (onComplete) onComplete()
    })

    flechasDatos.forEach(fd => {
      const { mesh, meshGlow, meshEnergia, punta, clipPlaneDisp, clipNormal, inicioAc, finAc } = fd
      const proxy = { t: 1 }
      gsap.to(proxy, {
        t: 0, duration: duracionSalida, ease: 'power2.in',
        onUpdate() {
          punta.position.lerpVectors(inicioAc, finAc, proxy.t)
          clipPlaneDisp.constant = -clipNormal.dot(punta.position)
        },
        onComplete() {
          mesh.visible = false; meshGlow.visible = false
          meshEnergia.visible = false; punta.visible = false
        },
      })
    })
  }

  function tickFlechasDisparo(dt) {}
  function ocultarPuntasDisparo() { puntasMesh.forEach(p => { p.visible = false }) }
  function mostrarPuntasDisparo() { if (grupo.visible) puntasMesh.forEach(p => { p.visible = true }) }

  const btn = document.createElement('button')
  btn.textContent = 'Disparos'
  btn.className   = 'btn'
  btn.addEventListener('click', function () {
    if (!grupo.visible) { animarEntrada(); this.classList.add('active') }
    else { animarSalida(() => this.classList.remove('active')) }
    if (onToggle) onToggle(!grupo.visible)
  })
  document.getElementById('cc-controls').appendChild(btn)

  return { grupo, tickFlechasDisparo, ocultarPuntasDisparo, mostrarPuntasDisparo, animarEntrada, animarSalida }
}
