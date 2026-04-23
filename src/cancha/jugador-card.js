// src/cancha/jugador-card.js
import * as THREE from 'three'
import { JUGADORES } from './jugadores.js'

const CW         = 420
const CH         = 500
const CX         = CW / 2
const RADIO      = 110
const RADIO_MASK = RADIO - 16
const CY_CIRC    = 230
const MASK_Y     = CY_CIRC - RADIO_MASK

const DEBUG_MASCARA = false
const SCALE         = 2.2

function crearCanvasCard(jugador, img) {
  const canvas = document.createElement('canvas')
  canvas.width  = CW
  canvas.height = CH
  const ctx = canvas.getContext('2d')
  ctx.clearRect(0, 0, CW, CH)

  // ── Glow suave detrás ──
  const glowGrad = ctx.createRadialGradient(CX, CY_CIRC, 0, CX, CY_CIRC, RADIO * 2.0)
  glowGrad.addColorStop(0.0, 'rgba(30, 100, 255, 0.5)')
  glowGrad.addColorStop(0.6, 'rgba(10,  60, 200, 0.25)')
  glowGrad.addColorStop(1.0, 'rgba(0,   20, 100, 0.0)')
  ctx.fillStyle = glowGrad
  ctx.beginPath()
  ctx.arc(CX, CY_CIRC, RADIO * 2.0, 0, Math.PI * 2)
  ctx.fill()

  // ── Fondo oscuro del círculo ──
  const bgGrad = ctx.createRadialGradient(CX, CY_CIRC - 20, 10, CX, CY_CIRC, RADIO)
  bgGrad.addColorStop(0.0, '#1a2a4a')
  bgGrad.addColorStop(1.0, '#0a0f1e')
  ctx.beginPath()
  ctx.arc(CX, CY_CIRC, RADIO, 0, Math.PI * 2)
  ctx.fillStyle = bgGrad
  ctx.fill()

  // ── Borde con gradiente top oscuro → bottom brillante ──
  ctx.save()
  const gradBorde = ctx.createLinearGradient(CX, CY_CIRC - RADIO, CX, CY_CIRC + RADIO)
  gradBorde.addColorStop(0.0, 'rgba(10, 36, 81, 0.4)')
  gradBorde.addColorStop(0.5, 'rgba(40, 140, 255, 0.8)')
  gradBorde.addColorStop(1.0, 'rgba(80, 200, 255, 1.0)')
  ctx.shadowColor = '#4DAAFF'
  ctx.shadowBlur  = 40
  ctx.beginPath()
  ctx.arc(CX, CY_CIRC, RADIO, 0, Math.PI * 2)
  ctx.strokeStyle = gradBorde
  ctx.lineWidth   = 6
  ctx.stroke()
  ctx.restore()

  // Borde interior sutil
  ctx.beginPath()
  ctx.arc(CX, CY_CIRC, RADIO - 3, 0, Math.PI * 2)
  ctx.strokeStyle = 'rgba(100, 180, 255, 0.3)'
  ctx.lineWidth   = 2
  ctx.stroke()

  // ── Foto con máscara ──
  if (img) {
    ctx.save()
    ctx.beginPath()
    ctx.rect(CX - RADIO_MASK, MASK_Y - RADIO_MASK, RADIO_MASK * 2, RADIO_MASK)
    ctx.arc(CX, CY_CIRC, RADIO_MASK, Math.PI, 0, true)
    ctx.lineTo(CX + RADIO_MASK, MASK_Y)
    ctx.lineTo(CX - RADIO_MASK, MASK_Y)
    ctx.closePath()
    ctx.clip()

    if (DEBUG_MASCARA) {
      ctx.fillStyle = 'rgba(255, 0, 0, 0.5)'
      ctx.fillRect(0, 0, CW, CH)
    }

    const escala = (RADIO_MASK * 2.0) / Math.min(img.width, img.height)
    const fw = img.width  * escala
    const fh = img.height * escala
    const fx = CX - fw / 2
    const fy = CY_CIRC - fh * 0.65
    ctx.drawImage(img, fx, fy, fw, fh)
    ctx.restore()
  } else {
    ctx.save()
    ctx.beginPath()
    ctx.arc(CX, CY_CIRC, RADIO_MASK, 0, Math.PI * 2)
    ctx.clip()
    const phGrad = ctx.createLinearGradient(CX, CY_CIRC - RADIO_MASK, CX, CY_CIRC + RADIO_MASK)
    phGrad.addColorStop(0.0, '#1e3060')
    phGrad.addColorStop(1.0, '#0d1a3a')
    ctx.fillStyle = phGrad
    ctx.fillRect(CX - RADIO_MASK, CY_CIRC - RADIO_MASK, RADIO_MASK * 2, RADIO_MASK * 2)
    ctx.fillStyle = 'rgba(50, 90, 160, 0.5)'
    ctx.beginPath()
    ctx.arc(CX, CY_CIRC - 15, 35, 0, Math.PI * 2)
    ctx.fill()
    ctx.beginPath()
    ctx.ellipse(CX, CY_CIRC + 60, 50, 38, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  }

  // ── Contenedor de nombre — tamaño dinámico ────────────────────────────────
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

  // ── Paso 1: backdrop blur ──
  ctx.save()
  ctx.filter = 'blur(6px)'
  ctx.drawImage(canvas, contX, contY, contW, contH, contX, contY, contW, contH)
  ctx.filter = 'none'
  ctx.restore()

  // ── Paso 2: clip al shape del contenedor ──
  ctx.save()
  roundRect(ctx, contX, contY, contW, contH, r)
  ctx.clip()

  ctx.filter = 'blur(6px)'
  ctx.drawImage(canvas, 0, 0)
  ctx.filter = 'none'

  const contBg = ctx.createLinearGradient(contX, contY, contX + contW, contY)
  contBg.addColorStop(0.338, 'rgba(231, 231, 231, 0.04)')
  contBg.addColorStop(0.947, 'rgba(134, 134, 134, 0.24)')
  ctx.fillStyle = contBg
  ctx.fillRect(contX, contY, contW, contH)

  ctx.restore()

  // ── Paso 3: stroke del contenedor ──
  ctx.save()
  roundRect(ctx, contX, contY, contW, contH, r)
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.16)'
  ctx.lineWidth   = 3
  ctx.stroke()
  ctx.restore()

  // ── Bloque número azul ──
  ctx.save()
  ctx.beginPath()
  ctx.moveTo(contX + r, contY)
  ctx.lineTo(contX + numBloqW, contY)
  ctx.lineTo(contX + numBloqW, contY + contH)
  ctx.lineTo(contX + r, contY + contH)
  ctx.quadraticCurveTo(contX, contY + contH, contX, contY + contH - r)
  ctx.lineTo(contX, contY + r)
  ctx.quadraticCurveTo(contX, contY, contX + r, contY)
  ctx.closePath()
  ctx.fillStyle = '#178CEB'
  ctx.fill()

  ctx.font         = `bold ${Math.round(11 * SCALE)}px "Poppins", "Barlow Condensed", sans-serif`
  ctx.fillStyle    = '#FFFFFF'
  ctx.textAlign    = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(String(jugador.numero), contX + numBloqW / 2, contY + contH / 2)
  ctx.restore()

  // ── Nombre ──
  ctx.save()
  ctx.font         = fontNombre
  ctx.fillStyle    = '#FFFFFF'
  ctx.textAlign    = 'left'
  ctx.textBaseline = 'middle'
  ctx.fillText(jugador.nombre, contX + numBloqW + gap + padIzq, contY + contH / 2)
  ctx.restore()

  return canvas
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.quadraticCurveTo(x + w, y,     x + w, y + r)
  ctx.lineTo(x + w, y + h - r)
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  ctx.lineTo(x + r, y + h)
  ctx.quadraticCurveTo(x,     y + h, x,     y + h - r)
  ctx.lineTo(x, y + r)
  ctx.quadraticCurveTo(x,     y,     x + r, y)
  ctx.closePath()
}

export function createJugadorCards(scene, jugadores = JUGADORES, opciones = {}) {

  const {
    offsetY = 8.0,
    escala  = 20,
  } = opciones

  const sprites = []
  const grupo   = new THREE.Group()
  grupo.visible = false
  scene.add(grupo)

  jugadores.forEach(jugador => {
    const img = new Image()
    img.crossOrigin = 'anonymous'

    img.onload = () => {
      const canvas  = crearCanvasCard(jugador, img)
      const textura = new THREE.CanvasTexture(canvas)
      const mat     = new THREE.SpriteMaterial({
        map: textura, transparent: true, depthWrite: false, sizeAttenuation: true,
      })
      const sprite  = new THREE.Sprite(mat)
      const aspect  = CH / CW
      sprite.scale.set(escala, escala * aspect, 1)
      sprite.position.set(jugador.x, offsetY, jugador.z)
      sprite.renderOrder = 5
      sprite.layers.set(0)
      grupo.add(sprite)
      sprites.push({ sprite, jugador })
    }

    img.onerror = () => {
      const canvas  = crearCanvasCard(jugador, null)
      const textura = new THREE.CanvasTexture(canvas)
      const mat     = new THREE.SpriteMaterial({
        map: textura, transparent: true, depthWrite: false, sizeAttenuation: true,
      })
      const sprite  = new THREE.Sprite(mat)
      const aspect  = CH / CW
      sprite.scale.set(escala, escala * aspect, 1)
      sprite.position.set(jugador.x, offsetY, jugador.z)
      sprite.renderOrder = 5
      sprite.layers.set(0)
      grupo.add(sprite)
      sprites.push({ sprite, jugador })
    }

    img.src = jugador.foto
  })

  const btn = document.createElement('button')
  btn.textContent = 'Jugadores'
  btn.className   = 'btn'
  btn.addEventListener('click', function () {
    grupo.visible = !grupo.visible
    this.classList.toggle('active', grupo.visible)
  })
  document.getElementById('cc-controls').appendChild(btn)

  function updateJugador(index, datos) {
    const entry = sprites[index]
    if (!entry) return
    const jugadorActualizado = { ...entry.jugador, ...datos }
    if (datos.foto) {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => {
        const canvas = crearCanvasCard(jugadorActualizado, img)
        entry.sprite.material.map.dispose()
        entry.sprite.material.map = new THREE.CanvasTexture(canvas)
        entry.sprite.material.needsUpdate = true
        entry.jugador = jugadorActualizado
      }
      img.src = datos.foto
    } else {
      const canvas = crearCanvasCard(jugadorActualizado, null)
      entry.sprite.material.map.dispose()
      entry.sprite.material.map = new THREE.CanvasTexture(canvas)
      entry.sprite.material.needsUpdate = true
      entry.jugador = jugadorActualizado
    }
  }

  return { grupo, sprites, updateJugador }
}
