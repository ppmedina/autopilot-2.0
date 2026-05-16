// src/cancha/flechas-dash.js
import * as THREE from 'three'
import gsap from 'gsap'

const FLECHAS_DASH_EJEMPLO = [
  { de: { x:  0, z: -15 }, a: { x: 25, z:   5 } },
  { de: { x:-20, z:  10 }, a: { x:  0, z: -15 } },
]

function crearGuion(p0, p1, anchoP0, anchoP1, color, alpha) {
  const dir  = new THREE.Vector3().subVectors(p1, p0).normalize()
  const perp = new THREE.Vector3(-dir.z, 0, dir.x)
  const h0 = anchoP0 * 0.5, h1 = anchoP1 * 0.5
  const v0 = new THREE.Vector3().copy(p0).addScaledVector(perp,  h0)
  const v1 = new THREE.Vector3().copy(p0).addScaledVector(perp, -h0)
  const v2 = new THREE.Vector3().copy(p1).addScaledVector(perp, -h1)
  const v3 = new THREE.Vector3().copy(p1).addScaledVector(perp,  h1)
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(
    new Float32Array([v0.x,v0.y,v0.z, v1.x,v1.y,v1.z, v2.x,v2.y,v2.z, v3.x,v3.y,v3.z]), 3
  ))
  geo.setIndex(new THREE.BufferAttribute(new Uint16Array([0,1,2, 0,2,3]), 1))
  const mat = new THREE.MeshBasicMaterial({
    color, transparent: true, opacity: alpha, depthWrite: false, side: THREE.DoubleSide,
  })
  const mesh = new THREE.Mesh(geo, mat)
  mesh.renderOrder = 3
  return mesh
}

function construirGuiones(inicio, fin, dashSize, gapSize, anchoMin, anchoMax) {
  const dir      = new THREE.Vector3().subVectors(fin, inicio)
  const longitud = dir.length()
  dir.normalize()
  const C_INI = new THREE.Color(0x68D9FF)
  const C_MID = new THREE.Color(0x2097FF)
  const grupo  = new THREE.Group()
  const guiones = []
  let d = 0, enDash = true
  while (d < longitud) {
    const segLen = enDash ? dashSize : gapSize
    if (enDash) {
      const d0 = d, d1 = Math.min(d + dashSize, longitud)
      const tMid = ((d0 + d1) * 0.5) / longitud
      const col  = new THREE.Color()
      if (tMid >= 0.495) col.lerpColors(C_MID, C_INI, (tMid - 0.495) / 0.505)
      else col.copy(C_MID)
      const alpha   = tMid >= 0.495 ? 1.0 : 0.1 + (tMid / 0.495) * 0.9
      const anchoEn = (t) => anchoMin + (anchoMax - anchoMin) * t
      const p0  = new THREE.Vector3().copy(inicio).addScaledVector(dir, d0)
      const p1  = new THREE.Vector3().copy(inicio).addScaledVector(dir, d1)
      const mesh = crearGuion(p0, p1, anchoEn(d0/longitud), anchoEn(d1/longitud), col, alpha)
      mesh.visible = false
      grupo.add(mesh)
      guiones.push({ mesh, dFin: d1 })
    }
    d += segLen
    enDash = !enDash
  }
  return { grupo, guiones, longitud }
}

function crearPuntaMesh(dir, color, tamano) {
  const perp = new THREE.Vector3(-dir.z, 0, dir.x)
  const tip  = new THREE.Vector3().copy(dir).multiplyScalar(tamano * 0.9)
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

export function createFlechasDash(scene, flechas = FLECHAS_DASH_EJEMPLO, opciones = {}) {
  const {
    offsetY         = 0.4,
    dashSize        = 0.5,
    gapSize         = 0.5,
    anchoDash       = 0.12,
    anchoMaxDash    = 0.30,
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
    const inicioAc = new THREE.Vector3().copy(inicio).addScaledVector(dir,  radio)
    const finAc    = new THREE.Vector3().copy(fin).addScaledVector(dir,    -radio)
    const { grupo: grupoLinea, guiones, longitud } = construirGuiones(
      inicioAc, finAc, dashSize, gapSize, anchoDash, anchoMaxDash
    )
    grupo.add(grupoLinea)
    const punta = crearPuntaMesh(dir, 0x68D9FF, 0.98)
    punta.position.copy(inicioAc)
    grupo.add(punta)
    puntasMesh.push(punta)
    flechasDatos.push({ guiones, punta, inicioAc: inicioAc.clone(), finAc: finAc.clone(), longitud })
  })

  function animarEntrada(onComplete) {
    tweensActivos.forEach(t => t.kill())
    tweensActivos = []
    grupo.visible = true
    let completadas = 0
    flechasDatos.forEach((fd, fi) => {
      const { guiones, punta, inicioAc, finAc, longitud } = fd
      guiones.forEach(g => { g.mesh.visible = false })
      punta.position.copy(inicioAc)
      punta.visible = true
      const proxy = { t: 0 }
      const tw = gsap.to(proxy, {
        t: 1, duration: duracionEntrada, delay: fi * delayEntrada, ease: 'power2.inOut',
        onUpdate() {
          punta.position.lerpVectors(inicioAc, finAc, proxy.t)
          const dActual = proxy.t * longitud
          guiones.forEach(g => { g.mesh.visible = g.dFin <= dActual })
        },
        onComplete() {
          guiones.forEach(g => { g.mesh.visible = true })
          punta.position.copy(finAc)
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
    gsap.delayedCall(duracionSalida, () => {
      grupo.visible = false
      if (onComplete) onComplete()
    })
    flechasDatos.forEach(fd => {
      const { guiones, punta, inicioAc, finAc, longitud } = fd
      const proxy = { t: 1 }
      gsap.to(proxy, {
        t: 0, duration: duracionSalida, ease: 'power2.in',
        onUpdate() {
          punta.position.lerpVectors(inicioAc, finAc, proxy.t)
          const dActual = proxy.t * longitud
          guiones.forEach(g => { g.mesh.visible = g.dFin <= dActual })
        },
        onComplete() {
          guiones.forEach(g => { g.mesh.visible = false })
          punta.visible = false
        },
      })
    })
  }

  function tickFlechasDash(dt) {}
  function ocultarPuntasDash() { puntasMesh.forEach(p => { p.visible = false }) }
  function mostrarPuntasDash() { if (grupo.visible) puntasMesh.forEach(p => { p.visible = true }) }

  const btn = document.createElement('button')
  btn.textContent = 'Pases'
  btn.className   = 'btn'
  btn.addEventListener('click', function () {
    if (!grupo.visible) { animarEntrada(); this.classList.add('active') }
    else { animarSalida(() => this.classList.remove('active')) }
    if (onToggle) onToggle(!grupo.visible)
  })
  document.getElementById('cc-controls').appendChild(btn)

  return { grupo, tickFlechasDash, ocultarPuntasDash, mostrarPuntasDash, animarEntrada, animarSalida }
}
