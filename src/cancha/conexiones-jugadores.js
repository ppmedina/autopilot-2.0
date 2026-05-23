// src/cancha/conexiones-jugadores.js
//
// Componente de conexiones entre jugadores en la cancha.
//
// PATRÓN: replica la arquitectura de fichas-jugadores.js — recibe el array
// JUGADORES + un array de CONEXIONES con pares de números de jugador, la
// intensidad y el número de pases. Crea trapecios brillantes entre cada par
// con gradiente de flujo de origen a destino.
//
// ENTRADA: cada conexión se "dibuja" desde el jugador ORIGEN hacia el
// DESTINO con efecto de trazado (la línea crece progresivamente como si
// se estuviera pintando con un pincel). Las animaciones tienen stagger
// entre conexiones para dar sensación de cadena.
//
// HOVER: al pasar el mouse sobre una conexión:
//   - Aparecen dos labels con el número de pases (uno sobre cada jugador)
//   - Las otras conexiones se atenúan a opacidad 0.4 (efecto highlight)
//   - El cursor cambia a 'pointer'
//   El diseño del label está copiado literalmente de heatmap-zonas-pases.js
//   (forma de bocadillo con pico inferior + sombra cyan + número blanco).
//
// API EXPUESTA:
//   - grupo                : THREE.Group con todos los trapecios + labels
//   - conexiones           : Array con datos de cada conexión
//   - animarEntrada()      : trazado progresivo de todas las líneas
//   - animarSalida()       : fade-out de todas las líneas
//   - tickConexiones()     : actualiza geometría según altura de cámara
//   - setHoverEnabled(b)   : activa/desactiva la detección de hover
//   - showLabelsConexion() : fuerza visibilidad de labels de una conexión

import * as THREE from 'three'
import gsap from 'gsap'

// ═══════════════════════════════════════════════════════════════════════════
// CANVAS DE GRADIENTE DE FLUJO — del patrón de conexiones-v2.js
// ═══════════════════════════════════════════════════════════════════════════

function crearTexturaFlujo(intensidad) {
  const w = 256, h = 32
  const canvas = document.createElement('canvas')
  canvas.width = w; canvas.height = h
  const ctx = canvas.getContext('2d')

  const grad = ctx.createLinearGradient(0, 0, w, 0)
  grad.addColorStop(0.0, `rgba(10,  40, 160, 0.4)`)
  grad.addColorStop(0.2, `rgba(20,  80, 200, ${0.4 * intensidad})`)
  grad.addColorStop(0.6, `rgba(60, 140, 255, ${0.6 * intensidad})`)
  grad.addColorStop(1.0, `rgba(120, 200, 255, ${intensidad})`)
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, w, h)

  const gradV = ctx.createLinearGradient(0, 0, 0, h)
  gradV.addColorStop(0.0,  'rgba(0,0,0,0)')
  gradV.addColorStop(0.15, 'rgba(255,255,255,1)')
  gradV.addColorStop(0.85, 'rgba(255,255,255,1)')
  gradV.addColorStop(1.0,  'rgba(0,0,0,0)')
  ctx.globalCompositeOperation = 'destination-in'
  ctx.fillStyle = gradV
  ctx.fillRect(0, 0, w, h)

  return new THREE.CanvasTexture(canvas)
}

// ═══════════════════════════════════════════════════════════════════════════
// CANVAS DEL LABEL DE PASES — COPIADO LITERALMENTE DE heatmap-zonas-pases.js
// Forma de bocadillo con pico inferior, sombra cyan, fondo oscuro, número
// blanco centrado. Mismo aspecto visual que los labels del heatmap de zonas
// para mantener coherencia en toda la UI de pases.
// ═══════════════════════════════════════════════════════════════════════════

function crearSpritePases(numPases, escalaSprite = 1) {
  const S  = 4 * escalaSprite
  const VW = 56 * S
  const VH = 65 * S

  const canvas = document.createElement('canvas')
  canvas.width  = VW
  canvas.height = VH
  const ctx = canvas.getContext('2d')

  const pad  = 6  * S
  const x1   = pad
  const y1   = pad
  const x2   = VW - pad
  const r    = Math.round(2.7 * S)
  const picH = Math.round(4.7 * S)
  const y2   = VH - picH - pad
  const px   = VW / 2
  const pt   = VH - pad
  const pw   = Math.round(4.7 * S)

  function dibujarForma() {
    ctx.beginPath()
    ctx.moveTo(x1 + r, y1)
    ctx.lineTo(x2 - r, y1)
    ctx.quadraticCurveTo(x2, y1, x2, y1 + r)
    ctx.lineTo(x2, y2 - r)
    ctx.quadraticCurveTo(x2, y2, x2 - r, y2)
    ctx.lineTo(px + pw, y2)
    ctx.lineTo(px, pt)
    ctx.lineTo(px - pw, y2)
    ctx.lineTo(x1 + r, y2)
    ctx.quadraticCurveTo(x1, y2, x1, y2 - r)
    ctx.lineTo(x1, y1 + r)
    ctx.quadraticCurveTo(x1, y1, x1 + r, y1)
    ctx.closePath()
  }

  ctx.save()
  ctx.shadowColor = 'rgba(32, 151, 255, 0.35)'
  ctx.shadowBlur  = 5 * S
  dibujarForma(); ctx.fillStyle = 'rgba(0,0,0,0.01)'; ctx.fill()
  ctx.restore()

  dibujarForma(); ctx.fillStyle = 'rgba(12, 18, 32, 0.62)'; ctx.fill()
  dibujarForma(); ctx.fillStyle = 'rgba(40, 100, 200, 0.08)'; ctx.fill()

  ctx.save()
  dibujarForma(); ctx.clip()
  for (let i = 0; i < VW * VH * 0.18; i++) {
    ctx.fillStyle = `rgba(255,255,255,${Math.random() * 0.04})`
    ctx.fillRect(Math.random() * VW, Math.random() * VH, 1, 1)
  }
  ctx.restore()

  ctx.save()
  dibujarForma(); ctx.clip()
  const hl = ctx.createLinearGradient(0, y1, 0, y1 + (y2 - y1) * 0.4)
  hl.addColorStop(0, 'rgba(160, 210, 255, 0.1)')
  hl.addColorStop(1, 'rgba(160, 210, 255, 0)')
  ctx.fillStyle = hl; ctx.fillRect(x1, y1, x2 - x1, y2 - y1)
  ctx.restore()

  dibujarForma()
  ctx.strokeStyle = '#4ED3FF'; ctx.lineWidth = 1.4 * S; ctx.stroke()

  const midY = (y1 + y2) / 2
  const fs   = 16.8 * S
  ctx.font         = `700 ${fs}px "Poppins", sans-serif`
  ctx.fillStyle    = '#ffffff'
  ctx.textAlign    = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(String(numPases), px, midY)

  return new THREE.CanvasTexture(canvas)
}

// ═══════════════════════════════════════════════════════════════════════════
// GEOMETRÍA DEL TRAPECIO — vectores reutilizables
// ═══════════════════════════════════════════════════════════════════════════

const _dir  = new THREE.Vector3()
const _perp = new THREE.Vector3()
const _v0   = new THREE.Vector3()
const _v1   = new THREE.Vector3()
const _v2   = new THREE.Vector3()
const _v3   = new THREE.Vector3()

function calcularVerticesTrapecio(inicio, fin, anchoOrigen, anchoDestino, out) {
  _dir.subVectors(fin, inicio).normalize()
  _perp.set(-_dir.z, 0, _dir.x)

  const h0 = anchoOrigen  * 0.2
  const h1 = anchoDestino * 0.27

  _v0.copy(inicio).addScaledVector(_perp,  h0)
  _v1.copy(inicio).addScaledVector(_perp, -h0)
  _v2.copy(fin).addScaledVector(_perp,    -h1)
  _v3.copy(fin).addScaledVector(_perp,     h1)

  out[0]  = _v0.x; out[1]  = _v0.y; out[2]  = _v0.z
  out[3]  = _v1.x; out[4]  = _v1.y; out[5]  = _v1.z
  out[6]  = _v2.x; out[7]  = _v2.y; out[8]  = _v2.z
  out[9]  = _v3.x; out[10] = _v3.y; out[11] = _v3.z
}

function crearGeoTrapecioMutable(inicio, fin, anchoOrigen, anchoDestino) {
  const positions = new Float32Array(12)
  calcularVerticesTrapecio(inicio, fin, anchoOrigen, anchoDestino, positions)
  const uvs     = new Float32Array([0, 0,  0, 1,  1, 1,  1, 0])
  const indices = new Uint16Array([0, 1, 2,  0, 2, 3])
  const geo = new THREE.BufferGeometry()
  const posAttr = new THREE.BufferAttribute(positions, 3)
  posAttr.setUsage(THREE.DynamicDrawUsage)
  geo.setAttribute('position', posAttr)
  geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2))
  geo.setIndex(new THREE.BufferAttribute(indices, 1))
  return geo
}

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════

export function createConexionesJugadores(scene, jugadores = [], conexiones = [], opciones = {}) {
  const {
    offsetY      = 4.0,
    getPhi       = null,
    getTheta     = null,   // función que retorna el theta de la cámara (rotación horizontal)
    alturaBase   = -3,
    alturaCentro = 0,
    umbralPhi    = 1.1,
    anchoOrigen  = 0.6,
    anchoDestino = 1.2,
    canvas       = null,    // canvas del renderer para el hover (mousemove)
    camera       = null,    // cámara para el raycaster
    labelYOffset = 8,       // altura sobre la ficha donde flota el label en vista PERSPECTIVA
    labelZOffsetTop = 6,    // desplazamiento en Z hacia "arriba en pantalla" cuando la vista es TOP
    labelEscala  = 0.8,     // tamaño del label (1.0 = como en heatmap-zonas-pases)
    fichasAPI    = null,    // { highlightFichas, unhighlightAll } — para oscurecer fichas no involucradas en hover
    textoLeyenda = 'Posicionate sobre las lineas de conexiones para ver la cantidad de pases entre ambos jugadores',
    mostrarLeyenda = true,  // si true, crea y muestra una leyenda HTML al pie de la pantalla cuando las conexiones están visibles
  } = opciones

  const grupo = new THREE.Group()
  grupo.position.y = offsetY
  grupo.visible    = false
  scene.add(grupo)

  // ─── Leyenda HTML (overlay al pie de pantalla) ────────────────────────────
  // Aparece junto con la animación de entrada de las conexiones, y desaparece
  // junto con la salida. Es un overlay fixed que apunta al usuario a usar el
  // hover. Estilo coherente con el resto del HUD (fondo oscuro semitransparente
  // con blur + borde sutil cyan + texto Poppins).
  let leyendaEl = null
  if (mostrarLeyenda) {
    const STYLE_ID = 'cc-leyenda-conexiones-styles'
    if (!document.getElementById(STYLE_ID)) {
      const style = document.createElement('style')
      style.id = STYLE_ID
      style.textContent = `
        .cc-leyenda-conexiones {
          position: fixed;
          left: 50%;
          bottom: 16%;
          transform: translateX(-50%);
          z-index: 9997;
          pointer-events: none;
          padding: 12px 28px;
          background: rgba(5, 8, 14, 0.6);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border: 1px solid rgba(0, 221, 255, 0.35);
          border-radius: 20px;
          box-shadow: 0 6px 24px rgba(3, 2, 4, 0.4);
          font-family: 'Poppins', system-ui, sans-serif;
          font-weight: 400;
          font-size: 14px;
          color: #c8d0dc;
          letter-spacing: 0.01em;
          white-space: nowrap;
          opacity: 0;
        }
      `
      document.head.appendChild(style)
    }
    leyendaEl = document.createElement('div')
    leyendaEl.className = 'cc-leyenda-conexiones'
    leyendaEl.textContent = textoLeyenda
    document.body.appendChild(leyendaEl)
  }

  const mapaJugadores = {}
  jugadores.forEach((j) => { mapaJugadores[j.numero] = j })

  // ─── Crear trapecios + labels ─────────────────────────────────────────────
  const conexionesData = []
  const _origenTmp = new THREE.Vector3(0, alturaBase, 0)
  const _finTmp    = new THREE.Vector3(1, alturaBase, 0)

  conexiones.forEach((con) => {
    const jDe = mapaJugadores[con.de]
    const jA  = mapaJugadores[con.a]
    if (!jDe || !jA) {
      console.warn(`[conexiones-jugadores] Conexión ${con.de} → ${con.a} ignorada: jugador no encontrado`)
      return
    }

    const intensidad = con.intensidad ?? 1.0
    const numPases   = con.pases ?? Math.round(intensidad * 20)

    // ── Repartir el total de pases entre origen y destino ────────────────
    // CONEXIONES_V2 tiene un solo campo `pases` que representa el TOTAL
    // de pases intercambiados entre los dos jugadores. La dirección del
    // trapecio (de: origen angosto → a: destino ancho) indica que el
    // origen es quien dio MENOS y el destino quien dio MÁS.
    //
    // Fórmula: la intensidad de la relación guía qué tan asimétrica es.
    //   - intensidad alta (~0.9) → relación muy asimétrica (uno dio mucho más)
    //   - intensidad baja (~0.5) → relación más equilibrada
    //
    // ratio_origen va de 0.275 (asim.) a 0.375 (equilibrada).
    const ratioOrigen = 0.5 - intensidad * 0.25
    const pasesDeDio  = Math.round(numPases * ratioOrigen)   // origen (menor)
    const pasesADio   = numPases - pasesDeDio                 // destino (mayor)

    const tex = crearTexturaFlujo(intensidad)

    // Trapecio principal
    const mat = new THREE.MeshBasicMaterial({
      map: tex, transparent: true, depthWrite: false, depthTest: true,
      blending: THREE.AdditiveBlending, side: THREE.DoubleSide, opacity: 0,
    })
    // Glow (más ancho)
    const matGlow = new THREE.MeshBasicMaterial({
      map: tex, transparent: true, depthWrite: false, depthTest: true,
      blending: THREE.AdditiveBlending, side: THREE.DoubleSide, opacity: 0,
    })

    const geoMesh = crearGeoTrapecioMutable(_origenTmp, _finTmp, anchoOrigen, anchoDestino * intensidad)
    const geoGlow = crearGeoTrapecioMutable(_origenTmp, _finTmp, anchoOrigen * 1.5, anchoDestino * intensidad * 2.5)

    const mesh     = new THREE.Mesh(geoMesh, mat)
    const meshGlow = new THREE.Mesh(geoGlow, matGlow)

    mesh.renderOrder     = 1
    meshGlow.renderOrder = 1
    mesh.layers.set(0)
    meshGlow.layers.set(0)
    // Asociar la conexión al mesh para que el raycaster pueda identificarla
    mesh.userData.conexionIdx = conexionesData.length

    grupo.add(meshGlow)
    grupo.add(mesh)

    // ── Labels de pases (dos: uno sobre cada jugador) ──────────────────────
    // Cada label muestra el número de pases que dio ESE jugador:
    //   - labelDe (sobre el origen) → muestra pasesDeDio (menor)
    //   - labelA  (sobre el destino) → muestra pasesADio (mayor)
    // Empieza oculto y aparece solo en hover.
    const altoMundo  = 7.2 * labelEscala
    const anchoMundo = altoMundo * (56 / 65)

    const matLabelDe = new THREE.SpriteMaterial({
      map: crearSpritePases(pasesDeDio, labelEscala),
      transparent: true, depthWrite: false, depthTest: false, opacity: 0,
    })
    const matLabelA = new THREE.SpriteMaterial({
      map: crearSpritePases(pasesADio, labelEscala),
      transparent: true, depthWrite: false, depthTest: false, opacity: 0,
    })

    const labelDe = new THREE.Sprite(matLabelDe)
    labelDe.scale.set(anchoMundo, altoMundo, 1)
    labelDe.position.set(jDe.x, labelYOffset, jDe.z)
    labelDe.renderOrder = 30
    labelDe.visible = false
    grupo.add(labelDe)

    const labelA = new THREE.Sprite(matLabelA)
    labelA.scale.set(anchoMundo, altoMundo, 1)
    labelA.position.set(jA.x, labelYOffset, jA.z)
    labelA.renderOrder = 30
    labelA.visible = false
    grupo.add(labelA)

    conexionesData.push({
      mesh,
      meshGlow,
      jDe,
      jA,
      intensidad,
      numPases,        // total
      pasesDeDio,      // lo que dio el origen (menor)
      pasesADio,       // lo que dio el destino (mayor)
      labelDe,
      labelA,
      opacidadFinal:     1.0,
      opacidadGlowFinal: 0.25,
    })
  })

  // ─── Tick: actualizar geometría según altura de cámara ────────────────────
  let ultimoPhi = null
  const _inicio   = new THREE.Vector3()
  const _fin      = new THREE.Vector3()
  const _tmpVerts = new Float32Array(12)

  function tickConexiones(/* camera */) {
    const phi = getPhi ? getPhi() : 0.5
    const phiCambio = ultimoPhi === null || Math.abs(phi - ultimoPhi) >= 0.005
    if (!phiCambio) return

    ultimoPhi = phi
    const esTop  = phi > umbralPhi
    const lineaY = esTop ? alturaCentro : alturaBase

    conexionesData.forEach(({ mesh, meshGlow, jDe, jA, intensidad }) => {
      _inicio.set(jDe.x, lineaY, jDe.z)
      _fin.set(jA.x,    lineaY, jA.z)

      calcularVerticesTrapecio(_inicio, _fin, anchoOrigen, anchoDestino * intensidad, _tmpVerts)
      mesh.geometry.attributes.position.array.set(_tmpVerts)
      mesh.geometry.attributes.position.needsUpdate = true
      mesh.geometry.computeBoundingSphere()

      calcularVerticesTrapecio(_inicio, _fin, anchoOrigen * 1.5, anchoDestino * intensidad * 2.5, _tmpVerts)
      meshGlow.geometry.attributes.position.array.set(_tmpVerts)
      meshGlow.geometry.attributes.position.needsUpdate = true
      meshGlow.geometry.computeBoundingSphere()
    })
  }

  // ─── Animación de entrada: trazado progresivo ─────────────────────────────
  function animarEntrada(onComplete) {
    grupo.visible = true

    const total = conexionesData.length
    if (total === 0) {
      if (onComplete) onComplete()
      return
    }
    let completados = 0

    // Matar tweens previos. Las conexiones tienen muchos targets animables
    // (materiales del mesh, materiales del glow, materiales de labels,
    // escalas de labels, posiciones), así que limpiamos todos antes de
    // arrancar para evitar conflictos con animaciones previas.
    conexionesData.forEach(c => {
      gsap.killTweensOf(c.mesh.material)
      gsap.killTweensOf(c.meshGlow.material)
      gsap.killTweensOf(c.labelDe.material)
      gsap.killTweensOf(c.labelA.material)
      gsap.killTweensOf(c.labelDe.scale)
      gsap.killTweensOf(c.labelA.scale)
    })

    // ── Animar fade-in + slide-up de la leyenda en paralelo con las conexiones
    if (leyendaEl) {
      gsap.killTweensOf(leyendaEl)
      gsap.fromTo(leyendaEl,
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.6, ease: 'power2.out', delay: 0.2 }
      )
    }

    const phi    = getPhi ? getPhi() : 0.5
    const esTop  = phi > umbralPhi
    const lineaY = esTop ? alturaCentro : alturaBase

    conexionesData.forEach((c, idx) => {
      const stagger = idx * 0.15

      c.mesh.material.opacity     = 0
      c.meshGlow.material.opacity = 0

      const proxy = { t: 0 }

      gsap.to(proxy, {
        t:        1,
        duration: 0.6,
        delay:    stagger,
        ease:     'power2.out',
        onUpdate: () => {
          _inicio.set(c.jDe.x, lineaY, c.jDe.z)
          _fin.set(
            c.jDe.x + (c.jA.x - c.jDe.x) * proxy.t,
            lineaY,
            c.jDe.z + (c.jA.z - c.jDe.z) * proxy.t,
          )

          const anchoFinAhora     = anchoOrigen + (anchoDestino * c.intensidad - anchoOrigen) * proxy.t
          const anchoFinAhoraGlow = anchoOrigen * 1.5 + (anchoDestino * c.intensidad * 2.5 - anchoOrigen * 1.5) * proxy.t

          calcularVerticesTrapecio(_inicio, _fin, anchoOrigen, anchoFinAhora, _tmpVerts)
          c.mesh.geometry.attributes.position.array.set(_tmpVerts)
          c.mesh.geometry.attributes.position.needsUpdate = true

          calcularVerticesTrapecio(_inicio, _fin, anchoOrigen * 1.5, anchoFinAhoraGlow, _tmpVerts)
          c.meshGlow.geometry.attributes.position.array.set(_tmpVerts)
          c.meshGlow.geometry.attributes.position.needsUpdate = true
        },
        onComplete: () => {
          _inicio.set(c.jDe.x, lineaY, c.jDe.z)
          _fin.set(c.jA.x, lineaY, c.jA.z)
          calcularVerticesTrapecio(_inicio, _fin, anchoOrigen, anchoDestino * c.intensidad, _tmpVerts)
          c.mesh.geometry.attributes.position.array.set(_tmpVerts)
          c.mesh.geometry.attributes.position.needsUpdate = true
          c.mesh.geometry.computeBoundingSphere()
          calcularVerticesTrapecio(_inicio, _fin, anchoOrigen * 1.5, anchoDestino * c.intensidad * 2.5, _tmpVerts)
          c.meshGlow.geometry.attributes.position.array.set(_tmpVerts)
          c.meshGlow.geometry.attributes.position.needsUpdate = true
          c.meshGlow.geometry.computeBoundingSphere()

          completados++
          if (completados === total && onComplete) onComplete()
        },
      })

      gsap.to(c.mesh.material, {
        opacity:  c.opacidadFinal,
        duration: 0.5,
        delay:    stagger,
        ease:     'power2.out',
      })
      gsap.to(c.meshGlow.material, {
        opacity:  c.opacidadGlowFinal,
        duration: 0.5,
        delay:    stagger,
        ease:     'power2.out',
      })
    })
  }

  // ─── Animación de salida ──────────────────────────────────────────────────
  function animarSalida(onComplete) {
    const total = conexionesData.length
    if (total === 0) {
      grupo.visible = false
      if (onComplete) onComplete()
      return
    }
    let completados = 0

    // Limpiar cualquier hover activo al salir
    ocultarTodosLosLabels()

    // Matar tweens previos para evitar conflictos con la salida
    conexionesData.forEach(c => {
      gsap.killTweensOf(c.mesh.material)
      gsap.killTweensOf(c.meshGlow.material)
    })

    // ── Animar fade-out + slide-down de la leyenda en paralelo con la salida
    if (leyendaEl) {
      gsap.killTweensOf(leyendaEl)
      gsap.to(leyendaEl, {
        opacity: 0,
        y: 20,
        duration: 0.4,
        ease: 'power2.in',
      })
    }

    conexionesData.forEach((c, idx) => {
      const stagger = idx * 0.03

      gsap.to(c.mesh.material, {
        opacity:  0,
        duration: 0.4,
        delay:    stagger,
        ease:     'power2.in',
        onComplete: () => {
          completados++
          if (completados === total) {
            grupo.visible = false
            if (onComplete) onComplete()
          }
        },
      })
      gsap.to(c.meshGlow.material, {
        opacity:  0,
        duration: 0.4,
        delay:    stagger,
        ease:     'power2.in',
      })
    })
  }

  // ═════════════════════════════════════════════════════════════════════════
  // SISTEMA DE HOVER — labels + highlight + cursor pointer
  // ═════════════════════════════════════════════════════════════════════════

  let hoverEnabled    = true       // toggle público para deshabilitar durante demos
  let conexionHover   = -1         // índice de la conexión actualmente con hover (-1 = ninguna)
  const _raycaster    = new THREE.Raycaster()
  const _mouseNDC     = new THREE.Vector2()

  // Mostrar labels de una conexión específica + atenuar las demás
  function mostrarLabelsConexion(idx) {
    if (idx < 0 || idx >= conexionesData.length) return
    const c = conexionesData[idx]

    // ── Posicionar los labels según la vista actual ──────────────────────
    // En vista PERSPECTIVA (cámara lateral): el label flota arriba de la
    //   ficha con offset Y, su pico apunta hacia abajo a la ficha.
    // En vista TOP (cámara cenital): como los sprites son billboard,
    //   un offset Y se proyecta sobre el plano y solapa con la ficha.
    //   En este caso usamos theta (rotación horizontal de la cámara) para
    //   calcular el vector "arriba en pantalla" en coordenadas del mundo:
    //
    //     theta = 0      → cámara mira hacia +Z, "arriba" = -Z
    //     theta = π/2    → cámara mira hacia +X, "arriba" = -X
    //     theta = π      → cámara mira hacia -Z, "arriba" = +Z
    //     theta = -π/2   → cámara mira hacia -X, "arriba" = +X
    //
    //   Vector "arriba en pantalla" = (-sin(theta), 0, -cos(theta))
    //
    //   Esto funciona para CUALQUIER rotación cenital (horizontal top,
    //   vertical top, diagonal top, etc.) y deja el label correctamente
    //   posicionado encima de la ficha en pantalla.
    const phi   = getPhi ? getPhi() : 0.5
    const esTop = phi > umbralPhi
    if (esTop) {
      const theta = getTheta ? getTheta() : 0
      const upX = -Math.sin(theta) * labelZOffsetTop
      const upZ = -Math.cos(theta) * labelZOffsetTop
      c.labelDe.position.set(c.jDe.x + upX, alturaCentro + 0.5, c.jDe.z + upZ)
      c.labelA.position.set(c.jA.x  + upX, alturaCentro + 0.5, c.jA.z  + upZ)
    } else {
      // Vista PERSPECTIVA: flota arriba con offset Y
      c.labelDe.position.set(c.jDe.x, labelYOffset, c.jDe.z)
      c.labelA.position.set(c.jA.x,  labelYOffset, c.jA.z)
    }

    // Pop scale + fade-in para ambos labels
    c.labelDe.visible = true
    c.labelA.visible  = true
    c.labelDe.scale.x = c.labelDe.scale.y = 0.01
    c.labelA.scale.x  = c.labelA.scale.y  = 0.01
    const altoMundo  = 7.2 * labelEscala
    const anchoMundo = altoMundo * (56 / 65)

    // Matar tweens previos de los labels (caso típico: hover rápido entre
    // conexiones, fade-out del label anterior aún corriendo cuando entra el nuevo)
    gsap.killTweensOf(c.labelDe.scale)
    gsap.killTweensOf(c.labelA.scale)
    gsap.killTweensOf(c.labelDe.material)
    gsap.killTweensOf(c.labelA.material)

    gsap.to(c.labelDe.scale, {
      x: anchoMundo, y: altoMundo,
      duration: 0.3, ease: 'back.out(2.0)',
    })
    gsap.to(c.labelA.scale, {
      x: anchoMundo, y: altoMundo,
      duration: 0.3, ease: 'back.out(2.0)',
    })
    gsap.to(c.labelDe.material, { opacity: 1, duration: 0.2, ease: 'power2.out' })
    gsap.to(c.labelA.material,  { opacity: 1, duration: 0.2, ease: 'power2.out' })

    // Matar tweens de opacidad de TODAS las líneas antes de re-aplicar
    // (importante para que el highlight cambie limpio entre conexiones)
    conexionesData.forEach(other => {
      gsap.killTweensOf(other.mesh.material)
      gsap.killTweensOf(other.meshGlow.material)
    })

    // Atenuar todas las otras conexiones (highlight effect)
    conexionesData.forEach((other, i) => {
      if (i === idx) {
        // La conexión activa vuelve a su opacidad completa
        gsap.to(other.mesh.material,     { opacity: other.opacidadFinal,     duration: 0.25, ease: 'power2.out' })
        gsap.to(other.meshGlow.material, { opacity: other.opacidadGlowFinal, duration: 0.25, ease: 'power2.out' })
      } else {
        // Las demás se atenúan fuertemente (15% del brillo) para que la
        // conexión activa quede claramente como protagonista visual
        gsap.to(other.mesh.material,     { opacity: 0.15 * other.opacidadFinal,     duration: 0.25, ease: 'power2.out' })
        gsap.to(other.meshGlow.material, { opacity: 0.15 * other.opacidadGlowFinal, duration: 0.25, ease: 'power2.out' })
      }
    })

    // Oscurecer las fichas NO involucradas en esta conexión (focus mode).
    // Si el componente recibió una fichasAPI con highlightFichas, le pedimos
    // que resalte SOLO las dos fichas involucradas (jDe y jA). Todas las
    // demás se oscurecen con un tint gris para crear contraste visual sin
    // perder la opacidad (los sprites siguen siendo sólidos, no se ve a
    // través de ellos).
    if (fichasAPI && fichasAPI.highlightFichas) {
      fichasAPI.highlightFichas([c.jDe.numero, c.jA.numero])
    }
  }

  // Ocultar todos los labels y restaurar opacidades originales
  function ocultarTodosLosLabels() {
    conexionesData.forEach((c) => {
      // Matar tweens previos antes de animar
      gsap.killTweensOf(c.labelDe.material)
      gsap.killTweensOf(c.labelA.material)
      gsap.killTweensOf(c.mesh.material)
      gsap.killTweensOf(c.meshGlow.material)

      if (c.labelDe.visible) {
        gsap.to(c.labelDe.material, {
          opacity: 0, duration: 0.15, ease: 'power2.in',
          onComplete: () => { c.labelDe.visible = false },
        })
        gsap.to(c.labelA.material, {
          opacity: 0, duration: 0.15, ease: 'power2.in',
          onComplete: () => { c.labelA.visible = false },
        })
      }
      // Restaurar opacidades de la línea
      gsap.to(c.mesh.material,     { opacity: c.opacidadFinal,     duration: 0.25, ease: 'power2.out' })
      gsap.to(c.meshGlow.material, { opacity: c.opacidadGlowFinal, duration: 0.25, ease: 'power2.out' })
    })

    // Restaurar todas las fichas a su brillo normal (sin tint)
    if (fichasAPI && fichasAPI.unhighlightAll) {
      fichasAPI.unhighlightAll()
    }
  }

  // ─── Listener de mousemove sobre el canvas del renderer ───────────────────
  function onMouseMove(event) {
    if (!hoverEnabled || !grupo.visible || !canvas || !camera) return

    // Convertir coordenadas de mouse a NDC (-1 a 1)
    const rect = canvas.getBoundingClientRect()
    _mouseNDC.x = ((event.clientX - rect.left) / rect.width)  * 2 - 1
    _mouseNDC.y = -((event.clientY - rect.top)  / rect.height) * 2 + 1

    _raycaster.setFromCamera(_mouseNDC, camera)
    // Solo raycast contra los mesh principales (no contra glow, no contra labels)
    const meshesParaRay = conexionesData.map(c => c.mesh)
    const hits = _raycaster.intersectObjects(meshesParaRay, false)

    if (hits.length > 0) {
      const idx = hits[0].object.userData.conexionIdx
      if (idx !== conexionHover) {
        // Hover cambió a otra conexión
        conexionHover = idx
        // Ocultar labels previos sin restaurar opacidades (las maneja mostrarLabelsConexion)
        conexionesData.forEach((c, i) => {
          if (i !== idx && c.labelDe.visible) {
            gsap.to(c.labelDe.material, {
              opacity: 0, duration: 0.1, ease: 'power2.in',
              onComplete: () => { c.labelDe.visible = false },
            })
            gsap.to(c.labelA.material, {
              opacity: 0, duration: 0.1, ease: 'power2.in',
              onComplete: () => { c.labelA.visible = false },
            })
          }
        })
        mostrarLabelsConexion(idx)
        canvas.style.cursor = 'pointer'
      }
    } else if (conexionHover !== -1) {
      // El mouse salió de cualquier conexión
      conexionHover = -1
      ocultarTodosLosLabels()
      canvas.style.cursor = ''
    }
  }

  // Registrar listener (solo si tenemos canvas + cámara)
  if (canvas && camera) {
    canvas.addEventListener('mousemove', onMouseMove)
  }

  // ─── API pública adicional ────────────────────────────────────────────────
  // Activar/desactivar el hover (útil durante demos para evitar interferencias)
  function setHoverEnabled(enabled) {
    hoverEnabled = enabled
    if (!enabled && conexionHover !== -1) {
      conexionHover = -1
      ocultarTodosLosLabels()
      if (canvas) canvas.style.cursor = ''
    }
  }

  // Mostrar labels de una conexión específica (por números de jugadores).
  // Útil para usar desde la demo: showLabelsConexion(5, 9) → enseña los
  // labels de pases entre el jugador 5 y el 9.
  function showLabelsConexion(deNumero, aNumero) {
    const idx = conexionesData.findIndex(c =>
      (c.jDe.numero === deNumero && c.jA.numero === aNumero) ||
      (c.jDe.numero === aNumero  && c.jA.numero === deNumero)
    )
    if (idx === -1) return
    mostrarLabelsConexion(idx)
    conexionHover = idx
  }

  function hideLabels() {
    conexionHover = -1
    ocultarTodosLosLabels()
  }

  return {
    grupo,
    conexiones: conexionesData,
    animarEntrada,
    animarSalida,
    tickConexiones,
    setHoverEnabled,
    showLabelsConexion,
    hideLabels,
  }
}