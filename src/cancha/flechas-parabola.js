// src/cancha/flechas-parabola.js
import * as THREE from 'three'
import gsap from 'gsap'

const FLECHAS_EJEMPLO = [
  { de: { x: -27, z: 14 }, a: { x: 30, z: -19 }, estilo: 'linea' },
  { de: { x: -27, z: 14 }, a: { x: 30, z: -19 }, estilo: 'dash'  },
]

const COLOR_ORIGEN  = new THREE.Color(10/255,  40/255, 160/255)
const COLOR_DESTINO = new THREE.Color(120/255, 200/255, 255/255)

function generarPuntosParabola(inicio, fin, alturaArco, segmentos) {
  segmentos = segmentos || 60
  const medio = new THREE.Vector3().addVectors(inicio, fin).multiplyScalar(0.5)
  medio.y += alturaArco
  return new THREE.QuadraticBezierCurve3(inicio, medio, fin).getPoints(segmentos)
}

function crearTexturaDashParabola() {
  const w = 512, h = 16
  const canvas = document.createElement('canvas')
  canvas.width = w; canvas.height = h
  const ctx = canvas.getContext('2d')
  ctx.clearRect(0, 0, w, h)
  let x = 0
  while (x < w) {
    const t    = x / w
    const size = 5 + t * 8
    const gap  = 1 + (1 - t) * 2
    const r    = Math.round(COLOR_ORIGEN.r*255 + t*(COLOR_DESTINO.r-COLOR_ORIGEN.r)*255)
    const g    = Math.round(COLOR_ORIGEN.g*255 + t*(COLOR_DESTINO.g-COLOR_ORIGEN.g)*255)
    const b    = Math.round(COLOR_ORIGEN.b*255 + t*(COLOR_DESTINO.b-COLOR_ORIGEN.b)*255)
    const a    = 0.4 + t * 0.6
    ctx.fillStyle = 'rgba('+r+','+g+','+b+','+a+')'
    ctx.fillRect(x, h/2 - size/2, size, size)
    x += size + gap
  }
  const tex = new THREE.CanvasTexture(canvas)
  tex.wrapS = THREE.RepeatWrapping
  return tex
}

function crearGeoCurvaColoreada(puntos) {
  const positions = [], colors = []
  const total = puntos.length
  puntos.forEach(function(p, i) {
    positions.push(p.x, p.y, p.z)
    const t = i / (total - 1)
    const c = new THREE.Color().lerpColors(COLOR_ORIGEN, COLOR_DESTINO, t)
    const a = 0.3 + t * 0.7
    colors.push(c.r*a, c.g*a, c.b*a)
  })
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geo.setAttribute('color',    new THREE.Float32BufferAttribute(colors, 3))
  return geo
}

function crearPuntaParabola(posicion, dirXZ, tamano) {
  tamano = tamano || 2.5
  const perp  = new THREE.Vector3(-dirXZ.z, 0, dirXZ.x)
  const punta = posicion.clone().addScaledVector(dirXZ,  tamano * 0.8)
  const baseL = posicion.clone().addScaledVector(perp,   tamano * 0.5)
  const baseR = posicion.clone().addScaledVector(perp,  -tamano * 0.5)
  const positions = new Float32Array([
    punta.x, punta.y, punta.z,
    baseL.x, baseL.y, baseL.z,
    baseR.x, baseR.y, baseR.z,
  ])
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geo.setIndex(new THREE.BufferAttribute(new Uint16Array([0,1,2]), 1))
  const mat = new THREE.MeshBasicMaterial({
    color: COLOR_DESTINO, transparent: true, opacity: 0.9,
    depthWrite: false, side: THREE.DoubleSide,
  })
  const mesh = new THREE.Mesh(geo, mat)
  mesh.renderOrder = 4
  return mesh
}

export function createFlechasParabola(scene, flechas, opciones) {
  flechas  = flechas  || FLECHAS_EJEMPLO
  opciones = opciones || {}

  const offsetY    = opciones.offsetY    !== undefined ? opciones.offsetY    : 4.0
  const alturaArco = opciones.alturaArco !== undefined ? opciones.alturaArco : 18
  const radioAro   = opciones.radioAro   !== undefined ? opciones.radioAro   : 4.5
  const segmentos  = opciones.segmentos  !== undefined ? opciones.segmentos  : 60

  const grupo = new THREE.Group()
  grupo.position.y = offsetY
  grupo.visible    = false
  scene.add(grupo)

  const lineasDashAnim = []
  const puntasMesh     = []
  const animables      = []

  flechas.forEach(function(flecha) {
    const esDash  = flecha.estilo === 'dash'
    const inicio  = new THREE.Vector3(flecha.de.x, 0, flecha.de.z)
    const fin     = new THREE.Vector3(flecha.a.x,  0, flecha.a.z)
    const dir     = new THREE.Vector3().subVectors(fin, inicio).normalize()
    const inicioA = inicio.clone().addScaledVector(dir,  radioAro)
    const finA    = fin.clone().addScaledVector(dir,    -radioAro)
    const puntos  = generarPuntosParabola(inicioA, finA, alturaArco, segmentos)

    if (esDash) {
      const medio  = new THREE.Vector3().addVectors(inicioA, finA).multiplyScalar(0.5).setY(alturaArco)
      const curva  = new THREE.QuadraticBezierCurve3(inicioA, medio, finA)
      const tuboGeo = new THREE.TubeGeometry(curva, segmentos, 0.18, 6, false)
      const tex     = crearTexturaDashParabola()
      const tuboMat = new THREE.MeshBasicMaterial({
        map: tex, transparent: true, depthWrite: false,
        blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
      })
      const tubo = new THREE.Mesh(tuboGeo, tuboMat)
      tubo.renderOrder = 3
      grupo.add(tubo)
      lineasDashAnim.push({ tex, velocidad: 0.4 })
      animables.push({ tipo: 'dash', obj: tubo, puntos })
    } else {
      const geo = crearGeoCurvaColoreada(puntos)
      geo.setDrawRange(0, 0)
      const mat = new THREE.LineBasicMaterial({
        vertexColors: true, transparent: true, opacity: 0.85,
        blending: THREE.AdditiveBlending, linewidth: 1,
      })
      const linea = new THREE.Line(geo, mat)
      linea.renderOrder = 3
      grupo.add(linea)
      animables.push({ tipo: 'linea', obj: linea, puntos })
    }

    // Punta estática al final
    const penultimo = puntos[puntos.length - 2]
    const ultimo    = puntos[puntos.length - 1]
    const dirFinal  = new THREE.Vector3().subVectors(ultimo, penultimo).normalize()
    const dirXZ     = new THREE.Vector3(dirFinal.x, 0, dirFinal.z).normalize()
    const punta     = crearPuntaParabola(ultimo, dirXZ, 2.5)
    punta.visible   = false
    grupo.add(punta)
    puntasMesh.push(punta)
  })

  // ── Animación de entrada — punta viaja, línea se revela ───────────────────
  function animarEntrada(onComplete) {
    grupo.visible = true
    puntasMesh.forEach(function(p) { p.visible = false })

    // Punta móvil temporal
    var puntaMovil = null
    var puntaMovilIdx = -1

    animables.forEach(function(anim, idx) {
      const pts    = anim.puntos
      const total  = pts.length

      if (anim.tipo === 'linea') {
        anim.obj.geometry.setDrawRange(0, 0)

        // Crear punta móvil
        const dir0  = new THREE.Vector3().subVectors(pts[1], pts[0]).normalize()
        const dirXZ = new THREE.Vector3(dir0.x, 0, dir0.z).normalize()
        puntaMovil    = crearPuntaParabola(pts[0], dirXZ, 2.5)
        puntaMovilIdx = idx
        grupo.add(puntaMovil)

        const proxy = { v: 0 }
        gsap.to(proxy, {
          v: total - 1, duration: 1.4, delay: idx * 0.15, ease: 'power1.inOut',
          onUpdate: function() {
            const i   = Math.floor(proxy.v)
            const iN  = Math.min(i + 1, total - 1)
            const t   = proxy.v - i
            const pos = new THREE.Vector3().lerpVectors(pts[i], pts[iN], t)
            const dir = new THREE.Vector3().subVectors(pts[iN], pts[i]).normalize()
            const dXZ = new THREE.Vector3(dir.x, 0, dir.z).normalize()

            anim.obj.geometry.setDrawRange(0, i + 2)

            // Actualizar vértices de la punta móvil
            if (puntaMovil && dXZ.length() > 0.001) {
              const tam  = 2.5
              const perp = new THREE.Vector3(-dXZ.z, 0, dXZ.x)
              const tip  = pos.clone().addScaledVector(dXZ,  tam * 0.8)
              const bL   = pos.clone().addScaledVector(perp,  tam * 0.5)
              const bR   = pos.clone().addScaledVector(perp, -tam * 0.5)
              const pa   = puntaMovil.geometry.attributes.position
              pa.setXYZ(0, tip.x, tip.y, tip.z)
              pa.setXYZ(1, bL.x,  bL.y,  bL.z)
              pa.setXYZ(2, bR.x,  bR.y,  bR.z)
              pa.needsUpdate = true
              puntaMovil.geometry.computeBoundingSphere()
            }
          },
          onComplete: function() {
            anim.obj.geometry.setDrawRange(0, total)
            // Reemplazar punta móvil por la estática
            if (puntaMovil) { grupo.remove(puntaMovil); puntaMovil = null }
            puntasMesh[idx].visible = true
            if (onComplete) onComplete()
          }
        })

      } else {
        // Dash — fade in completo
        anim.obj.material.opacity = 0
        gsap.to(anim.obj.material, {
          opacity: 1, duration: 1.4, delay: idx * 0.15, ease: 'power1.inOut',
          onComplete: function() {
            puntasMesh[idx].visible = true
          }
        })
      }
    })
  }

  // ── Animación de salida ──────────────────────────────────────────────────
  function animarSalida(onComplete) {
    puntasMesh.forEach(function(p) { p.visible = false })
    animables.forEach(function(anim, i) {
      if (anim.tipo === 'linea') {
        const total = anim.puntos.length
        const proxy = { v: total }
        gsap.to(proxy, {
          v: 0, duration: 0.6, delay: i * 0.05, ease: 'power2.in',
          onUpdate:   function() { anim.obj.geometry.setDrawRange(0, Math.round(proxy.v)) },
          onComplete: function() { anim.obj.geometry.setDrawRange(0, 0) }
        })
      } else {
        gsap.to(anim.obj.material, { opacity: 0, duration: 0.6, delay: i * 0.05, ease: 'power2.in' })
      }
    })
    gsap.delayedCall(0.8, function() {
      grupo.visible = false
      if (onComplete) onComplete()
    })
  }

  function tickFlechasParabola(dt) {
    if (!grupo.visible) return
    lineasDashAnim.forEach(function(item) { item.tex.offset.x -= item.velocidad * dt })
  }

  function ocultarPuntasParabola() { puntasMesh.forEach(function(p) { p.visible = false }) }
  function mostrarPuntasParabola() { puntasMesh.forEach(function(p) { p.visible = true  }) }

  var btn = document.createElement('button')
  btn.textContent = 'Pase largo'
  btn.className   = 'btn'
  btn.addEventListener('click', function() {
    if (!grupo.visible) { animarEntrada(); btn.classList.add('active') }
    else { animarSalida(function() { btn.classList.remove('active') }) }
  })
  document.getElementById('cc-controls').appendChild(btn)

  return { grupo, tickFlechasParabola, ocultarPuntasParabola, mostrarPuntasParabola, animarEntrada, animarSalida }
}
