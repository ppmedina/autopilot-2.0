// src/cancha/eventos-cancha.js
import * as THREE from 'three'
import gsap from 'gsap'

function hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r},${g},${b},${alpha})`
}

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
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2)
      ctx.fill(); ctx.stroke()
      break
    }
    case 'hexagono': {
      const r = W * 0.38
      ctx.beginPath()
      for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 3) * i - Math.PI / 6
        i === 0
          ? ctx.moveTo(cx + r * Math.cos(angle), cy + r * Math.sin(angle))
          : ctx.lineTo(cx + r * Math.cos(angle), cy + r * Math.sin(angle))
      }
      ctx.closePath(); ctx.fill(); ctx.stroke()
      break
    }
    case 'cuadrado': {
      const lado = W * 0.62
      ctx.beginPath(); ctx.rect(cx - lado / 2, cy - lado / 2, lado, lado)
      ctx.fill(); ctx.stroke()
      break
    }
    case 'diamante': {
      const r = W * 0.38
      ctx.beginPath()
      ctx.moveTo(cx, cy - r); ctx.lineTo(cx + r, cy)
      ctx.lineTo(cx, cy + r); ctx.lineTo(cx - r, cy)
      ctx.closePath(); ctx.fill(); ctx.stroke()
      break
    }
    case 'triangulo': {
      const r = W * 0.40
      const h = r * Math.sqrt(3)
      ctx.beginPath()
      ctx.moveTo(cx, cy - h * 0.6)
      ctx.lineTo(cx + r, cy + h * 0.4)
      ctx.lineTo(cx - r, cy + h * 0.4)
      ctx.closePath(); ctx.fill(); ctx.stroke()
      break
    }
    default: break
  }

  return new THREE.CanvasTexture(canvas)
}

export function createEventosCancha(scene, eventos = [], opciones = {}) {

  const {
    offsetY = 0.5,
    tamano  = 1.6,
  } = opciones

  const grupo = new THREE.Group()
  grupo.visible = false
  scene.add(grupo)

  const sprites = []

  eventos.forEach(evento => {
    const { x = 0, z = 0, tipo = 'circulo', color = '#FFFFFF' } = evento

    const tex = crearCanvasSimbolo(tipo, color)
    const mat = new THREE.SpriteMaterial({
      map:         tex,
      transparent: true,
      depthWrite:  false,
      opacity:     0,
    })
    const sprite = new THREE.Sprite(mat)
    sprite.scale.set(0, 0, 1)           // empieza en escala 0
    sprite.position.set(x, offsetY, z)
    sprite.renderOrder = 30
    sprite.visible = false
    grupo.add(sprite)
    sprites.push({ sprite, x, z, tipo, color })
  })

  // ── Estado ────────────────────────────────────────────────────────────────
  let timers = []
  let tweens  = []

  function matarTodo() {
    timers.forEach(t => clearTimeout(t))
    timers = []
    tweens.forEach(t => t && t.kill())
    tweens = []
  }

  // ── ENTRADA ───────────────────────────────────────────────────────────────
  // Los símbolos aparecen escalonados con pop de escala:
  //   1. Escala 0 → 1.3 (pop rápido)
  //   2. Escala 1.3 → 1.0 (asentarse)
  //   opacity 0 → 1 en paralelo con el pop
  function animarEntrada(onComplete) {
    matarTodo()
    grupo.visible = true

    // Reset
    sprites.forEach(({ sprite }) => {
      sprite.visible = false
      sprite.material.opacity = 0
      sprite.scale.set(0, 0, 1)
    })

    const stagger = 0.045

    sprites.forEach(({ sprite }, i) => {
      const delay = i * stagger
      timers.push(setTimeout(() => {
        sprite.visible = true

        // Pop de escala suave — sube directo a tamaño final con elastic leve
        tweens.push(gsap.to(sprite.scale, {
          x: tamano,
          y: tamano,
          duration: 0.55,
          ease: 'elastic.out(1, 0.6)',
        }))

        // Fade in en paralelo
        tweens.push(gsap.to(sprite.material, {
          opacity: 1.0,
          duration: 0.3,
          ease: 'power2.out',
        }))

      }, delay * 1000))
    })

    // onComplete cuando termina el último
    if (onComplete) {
      const duracion = sprites.length * stagger + 0.4
      timers.push(setTimeout(onComplete, duracion * 1000))
    }
  }

  // ── SALIDA ────────────────────────────────────────────────────────────────
  // Orden inverso — implosión de escala + fade out
  function animarSalida(onComplete) {
    matarTodo()

    const stagger   = 0.035
    const invertido = [...sprites].reverse()

    invertido.forEach(({ sprite }, i) => {
      const delay = i * stagger
      timers.push(setTimeout(() => {
        // Implosión
        tweens.push(gsap.to(sprite.scale, {
          x: 0,
          y: 0,
          duration: 0.2,
          ease: 'power2.in',
          onComplete() { sprite.visible = false },
        }))
        // Fade out
        tweens.push(gsap.to(sprite.material, {
          opacity: 0,
          duration: 0.15,
          ease: 'power2.in',
        }))
      }, delay * 1000))
    })

    const duracion = invertido.length * stagger + 0.3
    timers.push(setTimeout(() => {
      grupo.visible = false
      // Reset para próxima entrada
      sprites.forEach(({ sprite }) => {
        sprite.scale.set(0, 0, 1)
        sprite.material.opacity = 0
        sprite.visible = false
      })
      if (onComplete) onComplete()
    }, duracion * 1000))
  }

  // ── Botón ──────────────────────────────────────────────────────────────────
  const btn = document.createElement('button')
  btn.textContent = 'Eventos'
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

  // ── Tick ───────────────────────────────────────────────────────────────────
  function tickEventos(camera) {
    if (!grupo.visible) return
    sprites.forEach(({ sprite }) => {
      if (sprite.visible) sprite.lookAt(camera.position)
    })
  }

  // ── Actualizar eventos ─────────────────────────────────────────────────────
  function updateEventos(nuevosEventos) {
    matarTodo()
    while (grupo.children.length > 0) {
      const child = grupo.children[0]
      if (child.material?.map) child.material.map.dispose()
      if (child.material)      child.material.dispose()
      grupo.remove(child)
    }
    sprites.length = 0

    nuevosEventos.forEach(evento => {
      const { x = 0, z = 0, tipo = 'circulo', color = '#FFFFFF' } = evento
      const tex = crearCanvasSimbolo(tipo, color)
      const mat = new THREE.SpriteMaterial({
        map: tex, transparent: true, depthWrite: false, opacity: 0,
      })
      const sprite = new THREE.Sprite(mat)
      sprite.scale.set(0, 0, 1)
      sprite.position.set(x, offsetY, z)
      sprite.renderOrder = 30
      sprite.visible = false
      grupo.add(sprite)
      sprites.push({ sprite, x, z, tipo, color })
    })
  }

  return { grupo, sprites, tickEventos, updateEventos, animarEntrada, animarSalida }
}
