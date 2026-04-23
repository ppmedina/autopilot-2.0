// src/cancha/jugada.js
import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'

// ── Jugada realista: salida desde atrás, combinación por el medio, remate ──
// Portería rival está en x positivo (derecha del campo)
const JUGADORES_JUGADA = [
  { numero: 1,  x: -48, z:  0,   nombre: 'Portero'       },  // portero — saque inicial
  { numero: 5,  x: -30, z:  8,   nombre: 'Defensa'       },  // defensa central
  { numero: 8,  x: -10, z: -6,   nombre: 'Mediocampista' },  // volante de construcción
  { numero: 10, x:   8, z:  10,  nombre: 'Enganche'      },  // enganche
  { numero: 7,  x:  22, z: -14,  nombre: 'Extremo'       },  // extremo derecho
  { numero: 9,  x:  35, z:  4,   nombre: 'Delantero'     },  // delantero centro
]

// Secuencia de pases: índices de JUGADORES_JUGADA
const SECUENCIA_PASES = [0, 1, 2, 3, 4, 5]

// Posición de la portería rival
const PORTERIA = { x: 52, z: 0 }

export function createJugada(scene, opciones = {}) {
  const {
    offsetY       = 4.0,
    escalaFicha   = 3.0,
    rutaFicha     = '/ficha.glb',
    nombreCentro  = 'center',
    nombreBorde   = 'stroke',
    nombreTransparente = 'transparent',
    duracionPase  = 800,   // ms por pase
    duracionPausa = 200,   // ms entre pases
  } = opciones

  const grupo = new THREE.Group()
  grupo.position.y = offsetY
  grupo.visible    = false
  scene.add(grupo)

  // ── Labels DOM ──
  const labelsContainer = document.createElement('div')
  labelsContainer.style.cssText = `
    position: absolute;
    top: 0; left: 0;
    width: 100%; height: 100%;
    pointer-events: none;
    overflow: hidden;
    z-index: 11;
    display: none;
  `
  document.body.appendChild(labelsContainer)

  const labelsData = []

  function crearLabel(numero, x, z) {
    const div = document.createElement('div')
    div.textContent = String(numero)
    div.style.cssText = `
      position: absolute;
      color: white;
      margin-top: 30px;
      font-family: sans-serif;
      font-size: 28px;
      font-weight: bold;
      line-height: 1;
      pointer-events: none;
      user-select: none;
      white-space: nowrap;
    `
    labelsContainer.appendChild(div)
    labelsData.push({ div, x, y: offsetY, z })
    return div
  }

  // ── Materiales fichas ──
  function crearMateriales() {
    return {
      center: new THREE.MeshStandardMaterial({
        color: 0x1a3a9e, roughness: 0.4,
        emissive: 0x0a1550, emissiveIntensity: 0.5,
        depthTest: true, depthWrite: true,
      }),
      stroke: new THREE.MeshStandardMaterial({
        color: 0x2266ff, emissive: 0x4488ff,
        emissiveIntensity: 1.5, metalness: 0.1, roughness: 0.05,
        depthTest: true, depthWrite: true,
      }),
      transparent: new THREE.MeshStandardMaterial({
        color: 0xE2E8FF, emissive: 0xC7DBFF,
        transparent: true, opacity: 0.15,
        metalness: 0.5, roughness: 1.4,
        depthTest: true, depthWrite: false,
      }),
    }
  }

  // ── Cargar fichas GLB ──
  const fichas = []  // { objeto3D, jugador, label }

  function cargarFichas() {
    const loader = new GLTFLoader()
    loader.load(rutaFicha, (gltf) => {
      JUGADORES_JUGADA.forEach((jugador, i) => {
        const clon = gltf.scene.clone(true)
        const mats = crearMateriales()

        clon.traverse(child => {
          if (!child.isMesh) return
          child.renderOrder = 2
          if (child.name === nombreCentro)       child.material = mats.center
          if (child.name === nombreBorde)        child.material = mats.stroke
          if (child.name === nombreTransparente) child.material = mats.transparent
          child.layers.set(0)
        })

        clon.scale.setScalar(escalaFicha)
        clon.position.set(jugador.x, 1.0, jugador.z)
        clon.renderOrder    = 2
        clon.userData.esFicha = true
        grupo.add(clon)

        const label = crearLabel(jugador.numero, jugador.x, jugador.z)

        fichas.push({ obj: clon, jugador, label, mats })
      })
    })
  }

  cargarFichas()

  // ── Línea animada de pase ──
  // Usa una línea que crece desde el origen hasta el destino
  const lineaMat = new THREE.MeshBasicMaterial({
    color:       0x44aaff,
    transparent: true,
    opacity:     0.9,
    depthTest:   true,
    depthWrite:  false,
    blending:    THREE.AdditiveBlending,
    side:        THREE.DoubleSide,
  })
  const lineaGlowMat = new THREE.MeshBasicMaterial({
    color:       0x88ddff,
    transparent: true,
    opacity:     0.3,
    depthTest:   true,
    depthWrite:  false,
    blending:    THREE.AdditiveBlending,
    side:        THREE.DoubleSide,
  })
  // Material especial para el disparo a gol
  const disparoMat = new THREE.MeshBasicMaterial({
    color:       0xffffff,
    transparent: true,
    opacity:     1.0,
    depthTest:   true,
    depthWrite:  false,
    blending:    THREE.AdditiveBlending,
    side:        THREE.DoubleSide,
  })
  const disparoGlowMat = new THREE.MeshBasicMaterial({
    color:       0xffcc00,
    transparent: true,
    opacity:     0.6,
    depthTest:   true,
    depthWrite:  false,
    blending:    THREE.AdditiveBlending,
    side:        THREE.DoubleSide,
  })

  const lineaMesh     = new THREE.Mesh(new THREE.BufferGeometry(), lineaMat)
  const lineaGlowMesh = new THREE.Mesh(new THREE.BufferGeometry(), lineaGlowMat)
  lineaMesh.renderOrder     = 1
  lineaGlowMesh.renderOrder = 1
  lineaMesh.layers.set(0)
  lineaGlowMesh.layers.set(0)
  grupo.add(lineaMesh)
  grupo.add(lineaGlowMesh)

  // ── Función para crear geometría de trapecio animado ──
  function crearTrapecio(inicio, fin, t, anchoO, anchoD, esDisparo) {
    const finParcial = new THREE.Vector3().lerpVectors(inicio, fin, t)
    const anchoFin   = anchoO + (anchoD - anchoO) * t

    const dir  = new THREE.Vector3().subVectors(fin, inicio).normalize()
    const perp = new THREE.Vector3(-dir.z, 0, dir.x)

    const h0 = anchoO   * 0.15
    const h1 = anchoFin * (esDisparo ? 0.5 : 0.25)

    const v0 = new THREE.Vector3().copy(inicio).addScaledVector(perp,  h0)
    const v1 = new THREE.Vector3().copy(inicio).addScaledVector(perp, -h0)
    const v2 = new THREE.Vector3().copy(finParcial).addScaledVector(perp, -h1)
    const v3 = new THREE.Vector3().copy(finParcial).addScaledVector(perp,  h1)

    const positions = new Float32Array([
      v0.x, v0.y, v0.z,
      v1.x, v1.y, v1.z,
      v2.x, v2.y, v2.z,
      v3.x, v3.y, v3.z,
    ])
    const uvs     = new Float32Array([0,0, 0,1, 1,1, 1,0])
    const indices = new Uint16Array([0, 1, 2, 0, 2, 3])

    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geo.setAttribute('uv',       new THREE.BufferAttribute(uvs,       2))
    geo.setIndex(new THREE.BufferAttribute(indices, 1))
    return geo
  }

  // ── Estado de la animación ──
  let animando      = false
  let pasoActual    = 0    // índice del pase actual
  let tiempoInicio  = 0
  let jugadaActiva  = false

  // Historial de líneas ya completadas
  const lineasCompletadas = []

  function limpiarLineasCompletadas() {
    lineasCompletadas.forEach(({ mesh, glow }) => {
      grupo.remove(mesh)
      grupo.remove(glow)
      mesh.geometry.dispose()
      glow.geometry.dispose()
    })
    lineasCompletadas.length = 0
  }

  function iniciarJugada() {
    pasoActual   = 0
    tiempoInicio = performance.now()
    animando     = true
    limpiarLineasCompletadas()

    // Reset materiales fichas — todas normales
    fichas.forEach(f => {
      f.mats.stroke.emissiveIntensity = 1.5
      f.mats.stroke.color.set(0x2266ff)
      f.mats.stroke.emissive.set(0x4488ff)
      f.mats.center.emissiveIntensity = 0.5
    })

    // Iluminar primer jugador
    if (fichas[0]) {
      fichas[0].mats.stroke.emissiveIntensity = 3.0
      fichas[0].mats.stroke.color.set(0x44aaff)
    }
  }

  function detenerJugada() {
    animando = false
    limpiarLineasCompletadas()
    lineaMesh.geometry     = new THREE.BufferGeometry()
    lineaGlowMesh.geometry = new THREE.BufferGeometry()
    lineaMesh.material     = lineaMat
    lineaGlowMesh.material = lineaGlowMat

    fichas.forEach(f => {
      f.mats.stroke.emissiveIntensity = 1.5
      f.mats.stroke.color.set(0x2266ff)
      f.mats.stroke.emissive.set(0x4488ff)
      f.mats.center.emissiveIntensity = 0.5
    })
  }

  // ── Tick de animación — llamar desde el loop principal ──
  function tickJugada(camera) {
    if (!jugadaActiva || !animando || fichas.length < JUGADORES_JUGADA.length) return

    const ahora    = performance.now()
    const totalPasos = SECUENCIA_PASES.length  // 6 jugadores → 5 pases + 1 disparo = 6 pasos
    const esPasoDisparo = pasoActual === totalPasos - 1

    // Obtener origen y destino del paso actual
    let inicio, fin
    if (pasoActual < SECUENCIA_PASES.length - 1) {
      // Pase entre jugadores
      const idxDe = SECUENCIA_PASES[pasoActual]
      const idxA  = SECUENCIA_PASES[pasoActual + 1]
      const jDe   = fichas[idxDe].jugador
      const jA    = fichas[idxA].jugador
      inicio = new THREE.Vector3(jDe.x, 1.0, jDe.z)
      fin    = new THREE.Vector3(jA.x,  1.0, jA.z)
    } else {
      // Disparo a portería
      const idxDe = SECUENCIA_PASES[pasoActual]
      const jDe   = fichas[idxDe].jugador
      inicio = new THREE.Vector3(jDe.x, 1.0, jDe.z)
      fin    = new THREE.Vector3(PORTERIA.x, 1.0, PORTERIA.z)
    }

    const duracion = esPasoDisparo ? duracionPase * 0.7 : duracionPase
    const t = Math.min((ahora - tiempoInicio) / duracion, 1.0)

    // Actualizar línea animada
    const esDisparo = esPasoDisparo
    const anchoO = esDisparo ? 0.3 : 0.2
    const anchoD = esDisparo ? 4.0 : 1.5

    lineaMesh.geometry.dispose()
    lineaMesh.geometry = crearTrapecio(inicio, fin, t, anchoO, anchoD, esDisparo)
    lineaMesh.material = esDisparo ? disparoMat : lineaMat

    lineaGlowMesh.geometry.dispose()
    lineaGlowMesh.geometry = crearTrapecio(inicio, fin, t, anchoO * 2, anchoD * 3, esDisparo)
    lineaGlowMesh.material = esDisparo ? disparoGlowMat : lineaGlowMat

    // Cuando el pase se completa
    if (t >= 1.0) {
      // Guardar línea completada
      const meshFijo     = new THREE.Mesh(crearTrapecio(inicio, fin, 1.0, anchoO, anchoD, esDisparo), (esDisparo ? disparoMat : lineaMat).clone())
      const glowFijo     = new THREE.Mesh(crearTrapecio(inicio, fin, 1.0, anchoO * 2, anchoD * 3, esDisparo), (esDisparo ? disparoGlowMat : lineaGlowMat).clone())
      meshFijo.material.opacity     *= 0.5
      glowFijo.material.opacity     *= 0.5
      meshFijo.renderOrder = 1
      glowFijo.renderOrder = 1
      meshFijo.layers.set(0)
      glowFijo.layers.set(0)
      grupo.add(meshFijo)
      grupo.add(glowFijo)
      lineasCompletadas.push({ mesh: meshFijo, glow: glowFijo })

      // Iluminar siguiente jugador
      if (pasoActual < SECUENCIA_PASES.length - 1) {
        const idxSig = SECUENCIA_PASES[pasoActual + 1]
        fichas[idxSig].mats.stroke.emissiveIntensity = 3.0
        fichas[idxSig].mats.stroke.color.set(0x44aaff)
      }

      pasoActual++

      if (pasoActual >= totalPasos) {
        // Jugada terminada — efecto de gol
        animando = false
        lineaMesh.geometry     = new THREE.BufferGeometry()
        lineaGlowMesh.geometry = new THREE.BufferGeometry()

        // Parpadeo en el delantero
        const delantero = fichas[SECUENCIA_PASES[SECUENCIA_PASES.length - 1]]
        if (delantero) {
          let parpadeos = 0
          const intervalo = setInterval(() => {
            const on = parpadeos % 2 === 0
            delantero.mats.stroke.emissiveIntensity = on ? 5.0 : 1.0
            delantero.mats.stroke.color.set(on ? 0xffcc00 : 0x2266ff)
            parpadeos++
            if (parpadeos >= 8) {
              clearInterval(intervalo)
              delantero.mats.stroke.emissiveIntensity = 3.0
              delantero.mats.stroke.color.set(0xffcc00)
            }
          }, 150)
        }

        // Reiniciar automáticamente después de 2s
        setTimeout(() => {
          if (jugadaActiva) iniciarJugada()
        }, 2000)
        return
      }

      tiempoInicio = ahora + duracionPausa
    }

    // Actualizar labels DOM
    if (camera) {
      const W = window.innerWidth
      const H = window.innerHeight
      const _v = new THREE.Vector3()
      labelsData.forEach(({ div, x, y, z }) => {
        _v.set(x, y, z)
        _v.project(camera)
        const px = ( _v.x * 0.5 + 0.5) * W
        const py = (-_v.y * 0.5 + 0.5) * H
        div.style.left = (px - div.offsetWidth  * 0.5) + 'px'
        div.style.top  = (py - div.offsetHeight * 0.5) + 'px'
      })
    }
  }

  // ── Botón ──
  const btn = document.createElement('button')
  btn.textContent = 'Jugada'
  btn.className   = 'btn'
  btn.addEventListener('click', function() {
    jugadaActiva = !jugadaActiva
    grupo.visible                = jugadaActiva
    labelsContainer.style.display = jugadaActiva ? '' : 'none'
    this.classList.toggle('active', jugadaActiva)

    if (jugadaActiva) {
      iniciarJugada()
    } else {
      detenerJugada()
    }
  })
  document.getElementById('cc-controls').appendChild(btn)

  return { grupo, tickJugada, labelsData }
}
