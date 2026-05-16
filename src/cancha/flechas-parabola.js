// src/cancha/flechas-parabola.js
import * as THREE from 'three'
import gsap from 'gsap'

const FLECHAS_EJEMPLO = [
  { de: { x: -27, z: 14 }, a: { x: 30, z: -19 } },
]

const COLOR_INICIO  = new THREE.Color(0x2097FF)   // azul oscuro en origen
const COLOR_FIN     = new THREE.Color(0x68D9FF)   // cyan brillante en destino

// ── Generar puntos de la parábola ────────────────────────────────────────────
function generarPuntosParabola(inicio, fin, alturaArco, segmentos) {
  const medio = new THREE.Vector3().addVectors(inicio, fin).multiplyScalar(0.5)
  medio.y += alturaArco
  return new THREE.QuadraticBezierCurve3(inicio, medio, fin).getPoints(segmentos)
}

// ── Crear guiones a lo largo de la curva ────────────────────────────────────
// Cada guión es un plano 3D orientado tangente a la curva en ese punto
function construirGuionesParabola(puntos, dashLong, gapLong, anchoMin, anchoMax) {
  const grupo   = new THREE.Group()
  const guiones = []

  // Calcular longitudes acumuladas entre puntos
  const longAcum = [0]
  for (let i = 1; i < puntos.length; i++) {
    longAcum.push(longAcum[i-1] + puntos[i].distanceTo(puntos[i-1]))
  }
  const longTotal = longAcum[longAcum.length - 1]

  // Helper: posición e interpolación en la curva dado una distancia acumulada
  function puntoPorDistancia(d) {
    d = Math.max(0, Math.min(d, longTotal))
    let i = 0
    while (i < longAcum.length - 1 && longAcum[i+1] < d) i++
    const segLen = longAcum[i+1] - longAcum[i]
    const t = segLen > 0 ? (d - longAcum[i]) / segLen : 0
    const pos = new THREE.Vector3().lerpVectors(puntos[i], puntos[Math.min(i+1, puntos.length-1)], t)
    const dir = new THREE.Vector3().subVectors(
      puntos[Math.min(i+1, puntos.length-1)], puntos[i]
    ).normalize()
    return { pos, dir, t: d / longTotal }
  }

  let d = 0, enDash = true
  while (d < longTotal) {
    const segLen = enDash ? dashLong : gapLong

    if (enDash) {
      const d0   = d
      const d1   = Math.min(d + dashLong, longTotal)
      const tMid = ((d0 + d1) * 0.5) / longTotal

      const { pos: p0, dir: dir0 } = puntoPorDistancia(d0)
      const { pos: p1, dir: dir1 } = puntoPorDistancia(d1)

      // Usar la tangente 3D del punto medio para orientar el plano
      const { dir: dirMid } = puntoPorDistancia((d0+d1)*0.5)
      const up   = Math.abs(dirMid.y) < 0.9 ? new THREE.Vector3(0,1,0) : new THREE.Vector3(1,0,0)
      const perp = new THREE.Vector3().crossVectors(dirMid, up).normalize()

      // Color y alpha interpolados: brillante en el destino
      const col = new THREE.Color().lerpColors(COLOR_INICIO, COLOR_FIN, tMid)
      const alpha = 0.1 + tMid * 0.9

      // Ancho variable: delgado en origen, grueso en destino
      const anchoEn = (t) => anchoMin + (anchoMax - anchoMin) * t
      const a0 = anchoEn(d0 / longTotal)
      const a1 = anchoEn(d1 / longTotal)

      const v0 = p0.clone().addScaledVector(perp,  a0 * 0.5)
      const v1 = p0.clone().addScaledVector(perp, -a0 * 0.5)
      const v2 = p1.clone().addScaledVector(perp, -a1 * 0.5)
      const v3 = p1.clone().addScaledVector(perp,  a1 * 0.5)

      const geo = new THREE.BufferGeometry()
      geo.setAttribute('position', new THREE.BufferAttribute(
        new Float32Array([v0.x,v0.y,v0.z, v1.x,v1.y,v1.z, v2.x,v2.y,v2.z, v3.x,v3.y,v3.z]), 3
      ))
      geo.setIndex(new THREE.BufferAttribute(new Uint16Array([0,1,2, 0,2,3]), 1))

      const mat = new THREE.MeshBasicMaterial({
        color: col, transparent: true, opacity: alpha,
        depthWrite: false, side: THREE.DoubleSide,
      })
      const mesh = new THREE.Mesh(geo, mat)
      mesh.renderOrder = 3
      mesh.visible = false
      grupo.add(mesh)
      guiones.push({ mesh, dFin: d1, longTotal })
    }

    d += segLen
    enDash = !enDash
  }

  return { grupo, guiones, longTotal }
}

// ── Punta reutilizable con vértices actualizables ────────────────────────────
function crearPuntaMesh(tamano) {
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(9), 3))
  geo.setIndex(new THREE.BufferAttribute(new Uint16Array([0,1,2]), 1))
  const mat = new THREE.MeshBasicMaterial({
    color: COLOR_FIN, transparent: true, opacity: 0.95,
    depthWrite: false, side: THREE.DoubleSide,
  })
  const mesh = new THREE.Mesh(geo, mat)
  mesh.renderOrder = 5
  mesh.visible = false
  mesh.userData.tamano = tamano || 2.5
  return mesh
}

function actualizarPunta(mesh, pos, dir3D) {
  if (!mesh || !dir3D) return
  const tam  = mesh.userData.tamano
  // Usar la tangente 3D completa para orientar la punta
  const up   = Math.abs(dir3D.y) < 0.9 ? new THREE.Vector3(0,1,0) : new THREE.Vector3(1,0,0)
  const perp = new THREE.Vector3().crossVectors(dir3D, up).normalize()
  const tip  = pos.clone().addScaledVector(dir3D,  tam * 0.9)
  const bL   = pos.clone().addScaledVector(perp,   tam * 0.55)
  const bR   = pos.clone().addScaledVector(perp,  -tam * 0.55)
  const pa   = mesh.geometry.attributes.position
  pa.setXYZ(0, tip.x, tip.y, tip.z)
  pa.setXYZ(1, bL.x,  bL.y,  bL.z)
  pa.setXYZ(2, bR.x,  bR.y,  bR.z)
  pa.needsUpdate = true
  mesh.geometry.computeBoundingSphere()
}

// ── Helper: posición + tangente 3D en cualquier punto de la curva ─────────
function getPosDir(puntos, v) {
  const total = puntos.length
  const i  = Math.min(Math.floor(v), total - 2)
  const t  = v - Math.floor(v)
  const pos = new THREE.Vector3().lerpVectors(puntos[i], puntos[i+1], t)
  const dir = new THREE.Vector3().subVectors(puntos[i+1], puntos[i]).normalize()
  return { pos, dir }
}

// ─────────────────────────────────────────────────────────────────────────────

export function createFlechasParabola(scene, flechas, opciones) {
  flechas  = flechas  || FLECHAS_EJEMPLO
  opciones = opciones || {}

  const offsetY    = opciones.offsetY    ?? 4.0
  const alturaArco = opciones.alturaArco ?? 18
  const radioAro   = opciones.radioAro   ?? 4.5
  const segmentos  = opciones.segmentos  ?? 80
  const dashLong   = opciones.dashLong   ?? 0.6   // largo de cada guión en metros
  const gapLong    = opciones.gapLong    ?? 0.4   // espacio entre guiones
  const anchoMin   = opciones.anchoMin   ?? 0.28
  const anchoMax   = opciones.anchoMax   ?? 0.56
  const durEntrada = opciones.durEntrada ?? 1.2
  const durSalida  = opciones.durSalida  ?? 0.9
  const delayEntre = opciones.delayEntre ?? 0.15

  const grupo = new THREE.Group()
  grupo.position.y = offsetY
  grupo.visible    = false
  scene.add(grupo)

  const flechasDatos = []
  let   tweensActivos = []

  flechas.forEach((flecha, fi) => {
    const inicio  = new THREE.Vector3(flecha.de.x, 0, flecha.de.z)
    const fin     = new THREE.Vector3(flecha.a.x,  0, flecha.a.z)
    const dir     = new THREE.Vector3().subVectors(fin, inicio).normalize()
    const inicioA = inicio.clone().addScaledVector(dir,  radioAro)
    const finA    = fin.clone().addScaledVector(dir,    -radioAro)
    const puntos  = generarPuntosParabola(inicioA, finA, alturaArco, segmentos)

    const { grupo: grupoGuiones, guiones, longTotal } = construirGuionesParabola(
      puntos, dashLong, gapLong, anchoMin, anchoMax
    )
    grupo.add(grupoGuiones)

    const punta = crearPuntaMesh(2.2)
    grupo.add(punta)

    // Posicionar punta en el inicio
    const { pos: pos0, dir: dir0 } = getPosDir(puntos, 0)
    actualizarPunta(punta, pos0, dir0)

    flechasDatos.push({ puntos, guiones, punta, longTotal })
  })

  // ── Entrada ───────────────────────────────────────────────────────────────
  function animarEntrada(onComplete) {
    tweensActivos.forEach(t => t.kill())
    tweensActivos = []
    grupo.visible = true

    let completadas = 0
    const check = () => {
      completadas++
      if (completadas >= flechasDatos.length && onComplete) onComplete()
    }

    flechasDatos.forEach((fd, fi) => {
      const { puntos, guiones, punta, longTotal } = fd
      const total = puntos.length

      // Reset
      guiones.forEach(g => { g.mesh.visible = false })
      const { pos: pos0, dir: dir0 } = getPosDir(puntos, 0)
      actualizarPunta(punta, pos0, dir0)
      punta.visible = true

      const proxy = { v: 0 }
      const tw = gsap.to(proxy, {
        v: total - 1,
        duration: durEntrada,
        delay: fi * delayEntre,
        ease: 'power1.inOut',
        onUpdate() {
          const { pos, dir } = getPosDir(puntos, proxy.v)
          actualizarPunta(punta, pos, dir)

          // Distancia acumulada hasta la punta
          const fraccion = proxy.v / (total - 1)
          const dActual  = fraccion * longTotal
          guiones.forEach(g => { g.mesh.visible = g.dFin <= dActual })
        },
        onComplete() {
          const { pos, dir } = getPosDir(puntos, total - 1)
          actualizarPunta(punta, pos, dir)
          guiones.forEach(g => { g.mesh.visible = true })
          check()
        },
      })
      tweensActivos.push(tw)
    })
  }

  // ── Salida ────────────────────────────────────────────────────────────────
  function animarSalida(onComplete) {
    tweensActivos.forEach(t => t.kill())
    tweensActivos = []

    gsap.delayedCall(durSalida, () => {
      grupo.visible = false
      if (onComplete) onComplete()
    })

    flechasDatos.forEach(fd => {
      const { puntos, guiones, punta, longTotal } = fd
      const total = puntos.length

      const proxy = { v: total - 1 }
      gsap.to(proxy, {
        v: 0,
        duration: durSalida,
        ease: 'power2.in',
        onUpdate() {
          const { pos, dir } = getPosDir(puntos, proxy.v)
          actualizarPunta(punta, pos, dir)

          const fraccion = proxy.v / (total - 1)
          const dActual  = fraccion * longTotal
          guiones.forEach(g => { g.mesh.visible = g.dFin <= dActual })
        },
        onComplete() {
          guiones.forEach(g => { g.mesh.visible = false })
          punta.visible = false
        },
      })
    })
  }

  function tickFlechasParabola(dt) {}

  function ocultarPuntasParabola() { flechasDatos.forEach(fd => { fd.punta.visible = false }) }
  function mostrarPuntasParabola() {
    if (grupo.visible) flechasDatos.forEach(fd => { fd.punta.visible = true })
  }

  const btn = document.createElement('button')
  btn.textContent = 'Pase largo'
  btn.className   = 'btn'
  btn.addEventListener('click', function () {
    if (!grupo.visible) { animarEntrada(); this.classList.add('active') }
    else { animarSalida(() => this.classList.remove('active')) }
  })
  document.getElementById('cc-controls').appendChild(btn)

  return { grupo, tickFlechasParabola, ocultarPuntasParabola, mostrarPuntasParabola, animarEntrada, animarSalida }
}
