// src/cancha/jugador-card.js
import * as THREE from 'three'
import gsap from 'gsap'
import { JUGADORES } from './jugadores.js'

const CW         = 420
const CH         = 500
const CX         = CW / 2
const RADIO      = 110
const RADIO_MASK = RADIO - 16
const CY_CIRC    = 230
const MASK_Y     = CY_CIRC - RADIO_MASK
const SCALE      = 2.2

// ── Canvas solo nombre — sin estructura ni fondo ─────────────────────────────
function crearCanvasSoloNombre(jugador) {
  const canvas = document.createElement('canvas')
  canvas.width = CW; canvas.height = CH
  const ctx = canvas.getContext('2d')
  ctx.clearRect(0, 0, CW, CH)

  const contH    = Math.round(24 * SCALE)
  const numBloqW = Math.round(25 * SCALE)
  const gap      = Math.round(6  * SCALE)
  const padIzq   = Math.round(6  * SCALE)
  const padDer   = Math.round(8  * SCALE)
  const contY    = CY_CIRC + RADIO + 28
  const r        = Math.round(4  * SCALE)
  const fontNombre = `500 ${Math.round(9 * SCALE)}px "Poppins", "Barlow", sans-serif`

  ctx.font = fontNombre
  const nombreAncho = Math.ceil(ctx.measureText(jugador.nombre).width)
  const contW = numBloqW + gap + padIzq + nombreAncho + padDer
  const contX = CX - contW / 2

  ctx.save()
  roundRect(ctx, contX, contY, contW, contH, r); ctx.clip()
  const contBg = ctx.createLinearGradient(contX, contY, contX + contW, contY)
  contBg.addColorStop(0.338, 'rgba(231, 231, 231, 0.04)')
  contBg.addColorStop(0.947, 'rgba(134, 134, 134, 0.24)')
  ctx.fillStyle = contBg; ctx.fillRect(contX, contY, contW, contH)
  ctx.restore()

  ctx.save()
  roundRect(ctx, contX, contY, contW, contH, r)
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.16)'; ctx.lineWidth = 3; ctx.stroke()
  ctx.restore()

  ctx.save()
  ctx.beginPath()
  ctx.moveTo(contX + r, contY); ctx.lineTo(contX + numBloqW, contY)
  ctx.lineTo(contX + numBloqW, contY + contH); ctx.lineTo(contX + r, contY + contH)
  ctx.quadraticCurveTo(contX, contY + contH, contX, contY + contH - r)
  ctx.lineTo(contX, contY + r)
  ctx.quadraticCurveTo(contX, contY, contX + r, contY)
  ctx.closePath(); ctx.fillStyle = '#178CEB'; ctx.fill()
  ctx.font = `bold ${Math.round(11 * SCALE)}px "Poppins", "Barlow Condensed", sans-serif`
  ctx.fillStyle = '#FFFFFF'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  ctx.fillText(String(jugador.numero), contX + numBloqW / 2, contY + contH / 2)
  ctx.restore()

  ctx.save()
  ctx.font = fontNombre; ctx.fillStyle = '#FFFFFF'
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle'
  ctx.fillText(jugador.nombre, contX + numBloqW + gap + padIzq, contY + contH / 2)
  ctx.restore()

  return canvas
}

// ── Canvas solo corners — 4 esquinas en forma de L alrededor del círculo ─────
// Se renderiza en un sprite separado para poder animar su opacidad/scale
// independientemente del resto de la tarjeta.
function crearCanvasCorners() {
  const canvas = document.createElement('canvas')
  canvas.width = CW; canvas.height = CH
  const ctx = canvas.getContext('2d')
  ctx.clearRect(0, 0, CW, CH)

  // Geometría de los corners:
  // Las 4 L forman el CUADRADO CIRCUNSCRITO al círculo del jugador
  // (es decir, las líneas tangentes al círculo en los puntos más alejados
  // horizontal y vertical). Cada esquina del cuadrado está a distancia RADIO
  // del centro, por lo que la L toca el círculo de manera tangencial.
  const sep       = 0                   // sin separación: tangente al círculo
  const brazoLen  = 28                  // longitud de cada brazo de la L
  const grosor    = 5                   // grosor de la línea
  const halfSide  = RADIO + sep         // distancia desde el centro a cada lado del cuadrado

  // Esquinas del cuadrado: (xL, yT), (xR, yT), (xR, yB), (xL, yB)
  const xL = CX - halfSide
  const xR = CX + halfSide
  const yT = CY_CIRC - halfSide
  const yB = CY_CIRC + halfSide

  ctx.save()
  ctx.strokeStyle = '#4DD2FF'       // cyan brillante
  ctx.lineWidth   = grosor
  ctx.lineCap     = 'round'
  ctx.shadowColor = '#4DD2FF'
  ctx.shadowBlur  = 24

  // Esquina superior-izquierda (L abre hacia abajo-derecha)
  ctx.beginPath()
  ctx.moveTo(xL, yT + brazoLen)
  ctx.lineTo(xL, yT)
  ctx.lineTo(xL + brazoLen, yT)
  ctx.stroke()

  // Esquina superior-derecha (L abre hacia abajo-izquierda)
  ctx.beginPath()
  ctx.moveTo(xR - brazoLen, yT)
  ctx.lineTo(xR, yT)
  ctx.lineTo(xR, yT + brazoLen)
  ctx.stroke()

  // Esquina inferior-derecha (L abre hacia arriba-izquierda)
  ctx.beginPath()
  ctx.moveTo(xR, yB - brazoLen)
  ctx.lineTo(xR, yB)
  ctx.lineTo(xR - brazoLen, yB)
  ctx.stroke()

  // Esquina inferior-izquierda (L abre hacia arriba-derecha)
  ctx.beginPath()
  ctx.moveTo(xL + brazoLen, yB)
  ctx.lineTo(xL, yB)
  ctx.lineTo(xL, yB - brazoLen)
  ctx.stroke()

  ctx.restore()
  return canvas
}

// Plano de corte — nada se ve por debajo de Y=0 (superficie de la cancha)
const clipPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)

function crearMat(opacity) {
  return new THREE.SpriteMaterial({
    transparent:     true,
    depthWrite:      false,
    sizeAttenuation: true,
    opacity,
    clippingPlanes:  [clipPlane],
  })
}
function crearCanvasSoloFoto(img) {
  const canvas = document.createElement('canvas')
  canvas.width = CW; canvas.height = CH
  const ctx = canvas.getContext('2d')
  ctx.clearRect(0, 0, CW, CH)
  if (!img) return canvas
  ctx.save()
  ctx.beginPath()
  ctx.rect(CX - RADIO_MASK, MASK_Y - RADIO_MASK, RADIO_MASK * 2, RADIO_MASK)
  ctx.arc(CX, CY_CIRC, RADIO_MASK, Math.PI, 0, true)
  ctx.lineTo(CX + RADIO_MASK, MASK_Y)
  ctx.lineTo(CX - RADIO_MASK, MASK_Y)
  ctx.closePath(); ctx.clip()
  const esc = (RADIO_MASK * 2.0) / Math.min(img.width, img.height)
  ctx.drawImage(img, CX - img.width * esc / 2, CY_CIRC - img.height * esc * 0.65, img.width * esc, img.height * esc)
  ctx.restore()
  return canvas
}

function crearCanvasCompleto(jugador, img, mostrarFoto, mostrarNombre) {
  const canvas = document.createElement('canvas')
  canvas.width = CW; canvas.height = CH
  const ctx = canvas.getContext('2d')
  ctx.clearRect(0, 0, CW, CH)

  // Estructura siempre presente
  const glowGrad = ctx.createRadialGradient(CX, CY_CIRC, 0, CX, CY_CIRC, RADIO * 2.0)
  glowGrad.addColorStop(0.0, 'rgba(30, 100, 255, 0.5)')
  glowGrad.addColorStop(0.6, 'rgba(10,  60, 200, 0.25)')
  glowGrad.addColorStop(1.0, 'rgba(0,   20, 100, 0.0)')
  ctx.fillStyle = glowGrad
  ctx.beginPath(); ctx.arc(CX, CY_CIRC, RADIO * 2.0, 0, Math.PI * 2); ctx.fill()

  const bgGrad = ctx.createRadialGradient(CX, CY_CIRC - 20, 10, CX, CY_CIRC, RADIO)
  bgGrad.addColorStop(0.0, '#1a2a4a'); bgGrad.addColorStop(1.0, '#0a0f1e')
  ctx.beginPath(); ctx.arc(CX, CY_CIRC, RADIO, 0, Math.PI * 2)
  ctx.fillStyle = bgGrad; ctx.fill()

  ctx.save()
  const gradBorde = ctx.createLinearGradient(CX, CY_CIRC - RADIO, CX, CY_CIRC + RADIO)
  gradBorde.addColorStop(0.0, 'rgba(10, 36, 81, 0.4)')
  gradBorde.addColorStop(0.5, 'rgba(40, 140, 255, 0.8)')
  gradBorde.addColorStop(1.0, 'rgba(80, 200, 255, 1.0)')
  ctx.shadowColor = '#4DAAFF'; ctx.shadowBlur = 40
  ctx.beginPath(); ctx.arc(CX, CY_CIRC, RADIO, 0, Math.PI * 2)
  ctx.strokeStyle = gradBorde; ctx.lineWidth = 6; ctx.stroke()
  ctx.restore()

  ctx.beginPath(); ctx.arc(CX, CY_CIRC, RADIO - 3, 0, Math.PI * 2)
  ctx.strokeStyle = 'rgba(100, 180, 255, 0.3)'; ctx.lineWidth = 2; ctx.stroke()

  // Foto — solo si mostrarFoto
  if (mostrarFoto) {
    if (img) {
      ctx.save()
      ctx.beginPath()
      ctx.rect(CX - RADIO_MASK, MASK_Y - RADIO_MASK, RADIO_MASK * 2, RADIO_MASK)
      ctx.arc(CX, CY_CIRC, RADIO_MASK, Math.PI, 0, true)
      ctx.lineTo(CX + RADIO_MASK, MASK_Y)
      ctx.lineTo(CX - RADIO_MASK, MASK_Y)
      ctx.closePath(); ctx.clip()
      const esc = (RADIO_MASK * 2.0) / Math.min(img.width, img.height)
      ctx.drawImage(img, CX - img.width * esc / 2, CY_CIRC - img.height * esc * 0.65, img.width * esc, img.height * esc)
      ctx.restore()
    } else {
      ctx.save()
      ctx.beginPath(); ctx.arc(CX, CY_CIRC, RADIO_MASK, 0, Math.PI * 2); ctx.clip()
      const phGrad = ctx.createLinearGradient(CX, CY_CIRC - RADIO_MASK, CX, CY_CIRC + RADIO_MASK)
      phGrad.addColorStop(0.0, '#1e3060'); phGrad.addColorStop(1.0, '#0d1a3a')
      ctx.fillStyle = phGrad
      ctx.fillRect(CX - RADIO_MASK, CY_CIRC - RADIO_MASK, RADIO_MASK * 2, RADIO_MASK * 2)
      ctx.restore()
    }
  }

  // Nombre — solo si mostrarNombre
  if (mostrarNombre) {
    const contH    = Math.round(24 * SCALE)
    const numBloqW = Math.round(25 * SCALE)
    const gap      = Math.round(6  * SCALE)
    const padIzq   = Math.round(6  * SCALE)
    const padDer   = Math.round(8  * SCALE)
    const contY    = CY_CIRC + RADIO + 28
    const r        = Math.round(4  * SCALE)
    const fontNombre = `500 ${Math.round(9 * SCALE)}px "Poppins", "Barlow", sans-serif`

    ctx.font = fontNombre
    const nombreAncho = Math.ceil(ctx.measureText(jugador.nombre).width)
    const contW = numBloqW + gap + padIzq + nombreAncho + padDer
    const contX = CX - contW / 2

    ctx.save()
    roundRect(ctx, contX, contY, contW, contH, r); ctx.clip()
    const contBg = ctx.createLinearGradient(contX, contY, contX + contW, contY)
    contBg.addColorStop(0.338, 'rgba(231, 231, 231, 0.04)')
    contBg.addColorStop(0.947, 'rgba(134, 134, 134, 0.24)')
    ctx.fillStyle = contBg; ctx.fillRect(contX, contY, contW, contH)
    ctx.restore()

    ctx.save()
    roundRect(ctx, contX, contY, contW, contH, r)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.16)'; ctx.lineWidth = 3; ctx.stroke()
    ctx.restore()

    ctx.save()
    ctx.beginPath()
    ctx.moveTo(contX + r, contY); ctx.lineTo(contX + numBloqW, contY)
    ctx.lineTo(contX + numBloqW, contY + contH); ctx.lineTo(contX + r, contY + contH)
    ctx.quadraticCurveTo(contX, contY + contH, contX, contY + contH - r)
    ctx.lineTo(contX, contY + r)
    ctx.quadraticCurveTo(contX, contY, contX + r, contY)
    ctx.closePath(); ctx.fillStyle = '#178CEB'; ctx.fill()
    ctx.font = `bold ${Math.round(11 * SCALE)}px "Poppins", "Barlow Condensed", sans-serif`
    ctx.fillStyle = '#FFFFFF'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.fillText(String(jugador.numero), contX + numBloqW / 2, contY + contH / 2)
    ctx.restore()

    ctx.save()
    ctx.font = fontNombre; ctx.fillStyle = '#FFFFFF'
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle'
    ctx.fillText(jugador.nombre, contX + numBloqW + gap + padIzq, contY + contH / 2)
    ctx.restore()
  }

  return canvas
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + r)
  ctx.lineTo(x + w, y + h - r)
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  ctx.lineTo(x + r, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - r)
  ctx.lineTo(x, y + r)
  ctx.quadraticCurveTo(x, y, x + r, y)
  ctx.closePath()
}

function crearSprite(canvas, escala, jugador, renderOrder, polygonOffsetFactor) {
  const aspect  = CH / CW
  const textura = new THREE.CanvasTexture(canvas)
  const mat     = new THREE.SpriteMaterial({
    map: textura, transparent: true, depthWrite: false,
    sizeAttenuation: true, opacity: 1,
  })
  const sprite = new THREE.Sprite(mat)
  sprite.scale.set(escala, escala * aspect, 1)
  sprite.position.set(jugador.x, -8, jugador.z)
  sprite.renderOrder = renderOrder
  sprite.layers.set(0)
  return sprite
}

export function createJugadorCards(scene, jugadores = JUGADORES, opciones = {}) {

  const {
    offsetY = 8.0,
    escala  = 20,
  } = opciones

  const grupo = new THREE.Group()
  grupo.visible = false
  scene.add(grupo)

  const tarjetas = []
  // Una sola textura de corners compartida por todos los jugadores
  // (es idéntica en todos: el contenido depende solo de la geometría del círculo)
  const corNersCanvasShared = crearCanvasCorners()

  // ── Estado de selección (solo uno puede estar seleccionado) ──────────────
  let seleccionadoActual = null   // número del jugador seleccionado, o null

  jugadores.forEach((jugador, idx) => {
    let imgCargada = null

    // Canvas y sprite principal — estructura
    const canvas  = crearCanvasCompleto(jugador, null, false, false)
    const textura = new THREE.CanvasTexture(canvas)
    const aspect  = CH / CW
    const mat     = crearMat(1)
    mat.map       = textura
    const sprite  = new THREE.Sprite(mat)
    sprite.scale.set(escala, escala * aspect, 1)
    sprite.position.set(jugador.x, offsetY, jugador.z)
    sprite.renderOrder = 50 + idx * 4
    sprite.layers.set(0)
    sprite.visible = false
    // Guardar referencia al número del jugador para raycaster click
    sprite.userData.esJugadorCard = true
    sprite.userData.jugadorNumero = jugador.numero
    grupo.add(sprite)

    // Sprite nombre
    const canvasNom  = crearCanvasSoloNombre(jugador)
    const texturaNom = new THREE.CanvasTexture(canvasNom)
    const matNom     = crearMat(0)
    matNom.map       = texturaNom
    const spriteNom  = new THREE.Sprite(matNom)
    spriteNom.scale.set(escala, escala * aspect, 1)
    spriteNom.position.set(jugador.x, offsetY, jugador.z)
    spriteNom.renderOrder = 50 + idx * 4 + 1
    spriteNom.layers.set(0)
    spriteNom.visible = false
    grupo.add(spriteNom)

    // Sprite foto
    const texFoto    = new THREE.CanvasTexture(crearCanvasSoloFoto(null))
    const matFoto    = crearMat(1)
    matFoto.map      = texFoto
    const spriteFoto = new THREE.Sprite(matFoto)
    spriteFoto.scale.set(escala, escala * aspect, 1)
    spriteFoto.position.set(jugador.x, offsetY, jugador.z)
    spriteFoto.renderOrder = 50 + idx * 4 + 2
    spriteFoto.layers.set(0)
    spriteFoto.visible = false
    grupo.add(spriteFoto)

    // ── Sprite corners — solo visible cuando el jugador está seleccionado ──
    const texCorners = new THREE.CanvasTexture(corNersCanvasShared)
    const matCorners = crearMat(0)            // opacidad 0 al inicio (oculto)
    matCorners.map   = texCorners
    const spriteCorners = new THREE.Sprite(matCorners)
    // Empieza con escala ligeramente más grande para el efecto pop al seleccionar
    spriteCorners.scale.set(escala * 1.15, escala * aspect * 1.15, 1)
    spriteCorners.position.set(jugador.x, offsetY, jugador.z)
    spriteCorners.renderOrder = 50 + idx * 4 + 3   // por encima del resto
    spriteCorners.layers.set(0)
    spriteCorners.visible = false
    grupo.add(spriteCorners)

    // Redibujar solo el sprite principal (estructura + foto si está lista)
    function redibujar(mostrarFoto) {
      const nuevo = crearCanvasCompleto(jugador, mostrarFoto ? imgCargada : null, mostrarFoto, false)
      textura.image = nuevo
      textura.needsUpdate = true
    }

    // Cargar foto — actualiza spriteFoto cuando esté lista
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      imgCargada = img
      texFoto.image = crearCanvasSoloFoto(img)
      texFoto.needsUpdate = true
    }
    img.onerror = () => {}
    img.src = jugador.foto

    tarjetas.push({
      sprite, spriteNom, spriteFoto, spriteCorners,
      redibujar, jugador,
    })
  })

  // ── Selección: muestra las esquinas para informar que has seleccionado un jugador, oculta los demás ────────
  function seleccionar(numero) {
    if (numero == null) {
      deseleccionar()
      return
    }
    seleccionadoActual = numero
    tarjetas.forEach(({ spriteCorners, jugador }) => {
      if (jugador.numero === numero) {
        spriteCorners.visible = true
        // Mata cualquier tween previo en este sprite
        gsap.killTweensOf(spriteCorners.material)
        gsap.killTweensOf(spriteCorners.scale)
        // Anima: opacity 0→1 + scale 1.15→1.0 (efecto "pop in")
        const aspect = CH / CW
        gsap.to(spriteCorners.material, {
          opacity: 1,
          duration: 0.35,
          ease: 'power2.out',
        })
        gsap.to(spriteCorners.scale, {
          x: escala,
          y: escala * aspect,
          duration: 0.45,
          ease: 'back.out(2)',
        })
      } else {
        // Animar salida de cualquier otro que estuviera seleccionado
        if (spriteCorners.material.opacity > 0) {
          ocultarCorners(spriteCorners)
        }
      }
    })
  }

  function deseleccionar() {
    seleccionadoActual = null
    tarjetas.forEach(({ spriteCorners }) => {
      if (spriteCorners.material.opacity > 0 || spriteCorners.visible) {
        ocultarCorners(spriteCorners)
      }
    })
  }

  function ocultarCorners(spriteCorners) {
    gsap.killTweensOf(spriteCorners.material)
    gsap.killTweensOf(spriteCorners.scale)
    const aspect = CH / CW
    gsap.to(spriteCorners.material, {
      opacity: 0,
      duration: 0.25,
      ease: 'power2.in',
      onComplete: () => { spriteCorners.visible = false },
    })
    gsap.to(spriteCorners.scale, {
      x: escala * 1.15,
      y: escala * aspect * 1.15,
      duration: 0.25,
      ease: 'power2.in',
    })
  }

  function getSeleccionado() {
    return seleccionadoActual
  }

  // ── Animación de entrada — 3 fases ────────────────────────────────────────
  function animarEntrada() {
    grupo.visible = true

    tarjetas.forEach(({ sprite, spriteNom, spriteFoto, spriteCorners, redibujar }, i) => {
      const delay = i * 0.08

      // Reset — posición bajo la cancha, el clipPlane los oculta
      sprite.visible        = true
      spriteFoto.visible    = true
      spriteNom.visible     = true
      sprite.position.y     = -8
      spriteFoto.position.y = -8
      spriteNom.position.y  = -8
      spriteCorners.position.y = -8
      sprite.material.opacity    = 1
      spriteFoto.material.opacity = 1
      spriteNom.material.opacity = 0

      // Fase 1 — estructura y foto suben del piso
      redibujar(false)
      gsap.to(sprite.position,    { y: offsetY, duration: 0.7, delay, ease: 'power3.out' })
      gsap.to(spriteFoto.position,{ y: offsetY, duration: 0.7, delay, ease: 'power3.out' })
      gsap.to(spriteNom.position, { y: offsetY, duration: 0.7, delay, ease: 'power3.out' })
      gsap.to(spriteCorners.position, { y: offsetY, duration: 0.7, delay, ease: 'power3.out' })

      // Fase 2 — nombre hace fade in (0.3s después)
      gsap.delayedCall(delay + 0.3, () => {
        gsap.to(spriteNom.material, { opacity: 1, duration: 0.5, ease: 'power2.out' })
      })
    })
  }

  // ── Animación de salida ───────────────────────────────────────────────────
  function animarSalida(onComplete) {
    tarjetas.forEach(({ sprite, spriteNom, spriteFoto, spriteCorners }, i) => {
      const delay = i * 0.03
      gsap.to(sprite.position,    { y: -8, duration: 0.45, delay, ease: 'power2.in' })
      gsap.to(spriteFoto.position,{ y: -8, duration: 0.45, delay, ease: 'power2.in' })
      gsap.to(spriteNom.position, { y: -8, duration: 0.45, delay, ease: 'power2.in' })
      gsap.to(spriteCorners.position, { y: -8, duration: 0.45, delay, ease: 'power2.in' })
      gsap.to(spriteNom.material, { opacity: 0, duration: 0.25, delay, ease: 'power2.in' })
    })

    const duracionTotal = tarjetas.length * 0.03 + 0.5
    gsap.delayedCall(duracionTotal, () => {
      grupo.visible = false
      tarjetas.forEach(({ sprite, spriteNom, spriteFoto, spriteCorners, redibujar, jugador }) => {
        sprite.position.set(jugador.x, -8, jugador.z)
        sprite.material.opacity = 1
        sprite.visible = true
        spriteNom.position.set(jugador.x, -8, jugador.z)
        spriteNom.material.opacity = 0
        spriteNom.visible = true
        spriteFoto.position.set(jugador.x, -8, jugador.z)
        spriteFoto.material.opacity = 1
        spriteFoto.visible = true
        spriteCorners.position.set(jugador.x, -8, jugador.z)
        spriteCorners.material.opacity = 0
        spriteCorners.visible = false
        redibujar(false)
      })
      seleccionadoActual = null
      if (onComplete) onComplete()
    })
  }

  // ── Tick — reordenar por distancia a la cámara ───────────────────────────
  const _v = new THREE.Vector3()
  function tickJugadores(camera) {
    if (!grupo.visible) return
    tarjetas
      .slice()
      .sort((a, b) => {
        const da = _v.copy(a.sprite.position).distanceTo(camera.position)
        const db = _v.copy(b.sprite.position).distanceTo(camera.position)
        return db - da
      })
      .forEach((t, i) => {
        t.sprite.renderOrder        = 50 + i * 4
        t.spriteNom.renderOrder     = 50 + i * 4 + 1
        t.spriteFoto.renderOrder    = 50 + i * 4 + 2
        t.spriteCorners.renderOrder = 50 + i * 4 + 3
      })
  }

  // ── Botón ─────────────────────────────────────────────────────────────────
  const btn = document.createElement('button')
  btn.textContent = 'Jugadores'
  btn.className   = 'btn'
  btn.addEventListener('click', function () {
    if (!grupo.visible) {
      animarEntrada()
      this.classList.add('active')
    } else {
      animarSalida(() => this.classList.remove('active'))
    }
  })
  document.getElementById('cc-controls').appendChild(btn)

  return {
    grupo, tarjetas, animarEntrada, animarSalida, tickJugadores,
    seleccionar, deseleccionar, getSeleccionado,
  }
}