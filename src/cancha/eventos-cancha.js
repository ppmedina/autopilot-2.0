// src/cancha/eventos-cancha.js
// Símbolos de eventos en coordenadas de la cancha
// Siempre miran a la cámara (lookAt en tick)
//
// TIPOS DE SÍMBOLO: 'circulo' | 'hexagono' | 'cuadrado' | 'diamante' | 'triangulo'
//
// COLORES DISPONIBLES:
//   '#0752E4' | '#7BA4F5' | '#FFFFFF' | '#F8F899'
//   '#EA6500' | '#EA8900' | '#F7B203' | '#F3D662'
//
// USO EN script.js:
//
//   import { createEventosCancha } from './cancha/eventos-cancha.js'
//
//   const { grupo: grupoEventos, tickEventos } = createEventosCancha(scene, [
//     { x: -20, z: -10, tipo: 'circulo',   color: '#EA6500' },
//     { x:   5, z:  15, tipo: 'hexagono',  color: '#0752E4' },
//     { x:  30, z:  -5, tipo: 'cuadrado',  color: '#F7B203' },
//     { x: -10, z:  20, tipo: 'diamante',  color: '#FFFFFF' },
//     { x:  15, z: -20, tipo: 'triangulo', color: '#7BA4F5' },
//   ])
//
//   // En el loop:
//   tickEventos(camera)

import * as THREE from 'three'

const COLORES = [
  '#0752E4', '#7BA4F5', '#FFFFFF', '#F8F899',
  '#EA6500', '#EA8900', '#F7B203', '#F3D662',
]

// ── Helpers para convertir hex a rgba ────────────────────────────────────────
function hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r},${g},${b},${alpha})`
}

// ── Canvas por tipo de símbolo ────────────────────────────────────────────────
function crearCanvasSimbolo(tipo, color) {
  const S  = 4
  const W  = 64 * S
  const H  = 64 * S
  const cx = W / 2
  const cy = H / 2

  const canvas = document.createElement('canvas')
  canvas.width  = W
  canvas.height = H
  const ctx = canvas.getContext('2d')

  const stroke = color
  const fill   = hexToRgba(color, 0.3)
  const lw     = 3 * S

  ctx.strokeStyle = stroke
  ctx.fillStyle   = fill
  ctx.lineWidth   = lw
  ctx.lineJoin    = 'round'

  switch (tipo) {

    case 'circulo': {
      const r = W * 0.36
      ctx.beginPath()
      ctx.arc(cx, cy, r, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()
      break
    }

    case 'hexagono': {
      const r = W * 0.38
      ctx.beginPath()
      for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 3) * i - Math.PI / 6
        const x = cx + r * Math.cos(angle)
        const y = cy + r * Math.sin(angle)
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
      }
      ctx.closePath()
      ctx.fill()
      ctx.stroke()
      break
    }

    case 'cuadrado': {
      const lado = W * 0.62
      const x0   = cx - lado / 2
      const y0   = cy - lado / 2
      ctx.beginPath()
      ctx.rect(x0, y0, lado, lado)
      ctx.fill()
      ctx.stroke()
      break
    }

    case 'diamante': {
      const r = W * 0.38
      ctx.beginPath()
      ctx.moveTo(cx,     cy - r)   // top
      ctx.lineTo(cx + r, cy)       // right
      ctx.lineTo(cx,     cy + r)   // bottom
      ctx.lineTo(cx - r, cy)       // left
      ctx.closePath()
      ctx.fill()
      ctx.stroke()
      break
    }

    case 'triangulo': {
      const r  = W * 0.40
      const h  = r * Math.sqrt(3)
      ctx.beginPath()
      ctx.moveTo(cx,         cy - h * 0.6)  // top
      ctx.lineTo(cx + r,     cy + h * 0.4)  // bottom-right
      ctx.lineTo(cx - r,     cy + h * 0.4)  // bottom-left
      ctx.closePath()
      ctx.fill()
      ctx.stroke()
      break
    }

    default:
      break
  }

  return new THREE.CanvasTexture(canvas)
}

// ── Factory ───────────────────────────────────────────────────────────────────
export function createEventosCancha(scene, eventos = [], opciones = {}) {

  const {
    offsetY  = 0.5,    // altura sobre la cancha
    tamano   = 1.6,      // 40% de 4
  } = opciones

  const grupo = new THREE.Group()
  grupo.visible = false
  scene.add(grupo)

  const sprites = []

  eventos.forEach(evento => {
    const {
      x     = 0,
      z     = 0,
      tipo  = 'circulo',
      color = '#FFFFFF',
    } = evento

    const tex = crearCanvasSimbolo(tipo, color)
    const mat    = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false })
    const sprite = new THREE.Sprite(mat)
    sprite.scale.set(tamano, tamano, 1)
    sprite.position.set(x, offsetY, z)
    sprite.renderOrder = 30
    grupo.add(sprite)
    sprites.push(sprite)
  })

  // ── Botón ──────────────────────────────────────────────────────────────────
  const btn = document.createElement('button')
  btn.textContent = 'Eventos'
  btn.className   = 'btn'
  btn.addEventListener('click', function () {
    grupo.visible = !grupo.visible
    this.classList.toggle('active', grupo.visible)
  })
  document.getElementById('cc-controls').appendChild(btn)

  // ── Tick — lookAt cámara ───────────────────────────────────────────────────
  function tickEventos(camera) {
    if (!grupo.visible) return
    sprites.forEach(s => s.lookAt(camera.position))
  }

  // ── Actualizar eventos en caliente ─────────────────────────────────────────
  function updateEventos(nuevosEventos) {
    while (grupo.children.length > 0) {
      const child = grupo.children[0]
      if (child.material?.map) child.material.map.dispose()
      if (child.material)      child.material.dispose()
      grupo.remove(child)
    }
    sprites.length = 0

    nuevosEventos.forEach(evento => {
      const { x = 0, z = 0, tipo = 'circulo', color = '#FFFFFF' } = evento
      const tex    = crearCanvasSimbolo(tipo, color)
      const mat    = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false })
      const sprite = new THREE.Sprite(mat)
      sprite.scale.set(tamano, tamano, 1)
      sprite.position.set(x, offsetY, z)
      sprite.renderOrder = 30
      grupo.add(sprite)
      sprites.push(sprite)
    })
  }

  return { grupo, sprites, tickEventos, updateEventos }
}