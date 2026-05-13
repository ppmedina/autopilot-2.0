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
    sprite.renderOrder = 50 + idx * 3
    sprite.layers.set(0)
    sprite.visible = false
    grupo.add(sprite)

    // Sprite nombre
    const canvasNom  = crearCanvasSoloNombre(jugador)
    const texturaNom = new THREE.CanvasTexture(canvasNom)
    const matNom     = crearMat(0)
    matNom.map       = texturaNom
    const spriteNom  = new THREE.Sprite(matNom)
    spriteNom.scale.set(escala, escala * aspect, 1)
    spriteNom.position.set(jugador.x, offsetY, jugador.z)
    spriteNom.renderOrder = 50 + idx * 3 + 1
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
    spriteFoto.renderOrder = 50 + idx * 3 + 2
    spriteFoto.layers.set(0)
    spriteFoto.visible = false
    grupo.add(spriteFoto)

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

    tarjetas.push({ sprite, spriteNom, spriteFoto, redibujar, jugador })
  })

  // ── Animación de entrada — 3 fases ────────────────────────────────────────
  function animarEntrada() {
    grupo.visible = true

    tarjetas.forEach(({ sprite, spriteNom, spriteFoto, redibujar }, i) => {
      const delay = i * 0.08

      // Reset — posición bajo la cancha, el clipPlane los oculta
      sprite.visible        = true
      spriteFoto.visible    = true
      spriteNom.visible     = true
      sprite.position.y     = -8
      spriteFoto.position.y = -8
      spriteNom.position.y  = -8
      sprite.material.opacity    = 1
      spriteFoto.material.opacity = 1
      spriteNom.material.opacity = 0

      // Fase 1 — estructura y foto suben del piso
      redibujar(false)
      gsap.to(sprite.position,    { y: offsetY, duration: 0.7, delay, ease: 'power3.out' })
      gsap.to(spriteFoto.position,{ y: offsetY, duration: 0.7, delay, ease: 'power3.out' })
      gsap.to(spriteNom.position, { y: offsetY, duration: 0.7, delay, ease: 'power3.out' })

      // Fase 2 — nombre hace fade in (0.3s después)
      gsap.delayedCall(delay + 0.3, () => {
        gsap.to(spriteNom.material, { opacity: 1, duration: 0.5, ease: 'power2.out' })
      })
    })
  }

  // ── Animación de salida ───────────────────────────────────────────────────
  function animarSalida(onComplete) {
    tarjetas.forEach(({ sprite, spriteNom, spriteFoto }, i) => {
      const delay = i * 0.03
      gsap.to(sprite.position,    { y: -8, duration: 0.45, delay, ease: 'power2.in' })
      gsap.to(spriteFoto.position,{ y: -8, duration: 0.45, delay, ease: 'power2.in' })
      gsap.to(spriteNom.position, { y: -8, duration: 0.45, delay, ease: 'power2.in' })
      gsap.to(spriteNom.material, { opacity: 0, duration: 0.25, delay, ease: 'power2.in' })
    })

    const duracionTotal = tarjetas.length * 0.03 + 0.5
    gsap.delayedCall(duracionTotal, () => {
      grupo.visible = false
      tarjetas.forEach(({ sprite, spriteNom, spriteFoto, redibujar, jugador }) => {
        sprite.position.set(jugador.x, -8, jugador.z)
        sprite.material.opacity = 1
        sprite.visible = true
        spriteNom.position.set(jugador.x, -8, jugador.z)
        spriteNom.material.opacity = 0
        spriteNom.visible = true
        spriteFoto.position.set(jugador.x, -8, jugador.z)
        spriteFoto.material.opacity = 1
        spriteFoto.visible = true
        redibujar(false)
      })
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
        t.sprite.renderOrder     = 50 + i * 3
        t.spriteNom.renderOrder  = 50 + i * 3 + 1
        t.spriteFoto.renderOrder = 50 + i * 3 + 2
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

  return { grupo, tarjetas, animarEntrada, animarSalida, tickJugadores }
}
