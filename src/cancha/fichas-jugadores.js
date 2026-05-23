// src/cancha/fichas-jugadores.js
//
// Componente de fichas 3D de jugadores en la cancha.
//
// PATRÓN VISUAL: usa sprites canvas (mismo patrón que conexiones-v2.js).
// Cada ficha es un THREE.Sprite con un canvas 2D que dibuja el aro circular
// con gradiente azul, glow exterior, y el número del jugador en el centro.
// Este patrón se usa porque NO depende de cargar un modelo glb (más rápido)
// y porque los sprites son billboards automáticos (siempre miran a la
// cámara desde cualquier vista).
//
// PATRÓN ESTRUCTURAL: replica jugador-card.js — recibe el array JUGADORES
// y de cada jugador toma `numero`, `x`, `z`. La API expone animarEntrada,
// animarSalida, seleccionar, deseleccionar y tickFichas.
//
// API EXPUESTA:
//   - grupo            : THREE.Group que contiene todas las fichas
//   - fichas           : Array de { sprite, jugador, corners }
//   - animarEntrada()  : todas las fichas suben del suelo con stagger
//   - animarSalida()   : todas bajan al suelo con stagger inverso
//   - seleccionar(n)   : corners cyan alrededor de la ficha del jugador n
//   - deseleccionar()  : oculta todos los corners
//   - tickFichas()     : placeholder (los Sprites son billboard automático)

import * as THREE from 'three'
import gsap from 'gsap'

// ═══════════════════════════════════════════════════════════════════════════
// CANVAS DE LA FICHA — copiado del patrón de conexiones-v2.js
// ═══════════════════════════════════════════════════════════════════════════

function crearCanvasFicha(numero) {
  const size    = 512
  const circleR = 90
  const cx      = size / 2
  const cy      = size / 2

  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  const ctx = canvas.getContext('2d')
  ctx.clearRect(0, 0, size, size)

  // ── Glow exterior (sutil) ──
  const glowGrad = ctx.createRadialGradient(cx, cy, circleR * 0.8, cx, cy, circleR * 1.6)
  glowGrad.addColorStop(0.0, 'rgba(30, 100, 255, 0.0)')
  glowGrad.addColorStop(0.30, 'rgba(50, 130, 255, 0.18)')
  glowGrad.addColorStop(0.7,  'rgba(20,  80, 220, 0.08)')
  glowGrad.addColorStop(1.0,  'rgba(0,   20, 100, 0.0)')
  ctx.beginPath()
  ctx.arc(cx, cy, circleR * 1.6, 0, Math.PI * 2)
  ctx.fillStyle = glowGrad
  ctx.fill()

  // ── Fondo sólido base ──
  ctx.beginPath()
  ctx.arc(cx, cy, circleR, 0, Math.PI * 2)
  ctx.fillStyle = '#060d1e'
  ctx.fill()

  // ── Degradado vertical opaco ──
  ctx.save()
  ctx.beginPath()
  ctx.arc(cx, cy, circleR, 0, Math.PI * 2)
  ctx.clip()
  const bgGrad = ctx.createLinearGradient(cx, cy - circleR, cx, cy + circleR)
  bgGrad.addColorStop(0.0,  '#243870')
  bgGrad.addColorStop(0.45, '#0e1a3a')
  bgGrad.addColorStop(1.0,  '#060d1e')
  ctx.fillStyle = bgGrad
  ctx.fillRect(cx - circleR, cy - circleR, circleR * 2, circleR * 2)
  ctx.restore()

  // ── Borde con glow sutil ──
  ctx.save()
  ctx.shadowColor = '#4DAAFF'
  ctx.shadowBlur  = 12
  const gradBorde = ctx.createLinearGradient(cx, cy - circleR, cx, cy + circleR)
  gradBorde.addColorStop(0.0, 'rgba(10,  36,  81, 0.4)')
  gradBorde.addColorStop(0.5, 'rgba(40, 140, 255, 0.85)')
  gradBorde.addColorStop(1.0, 'rgba(80, 200, 255, 1.0)')
  ctx.beginPath()
  ctx.arc(cx, cy, circleR, 0, Math.PI * 2)
  ctx.strokeStyle = gradBorde
  ctx.lineWidth   = 8
  ctx.stroke()
  ctx.restore()

  // ── Borde interior sutil ──
  ctx.beginPath()
  ctx.arc(cx, cy, circleR - 6, 0, Math.PI * 2)
  ctx.strokeStyle = 'rgba(100, 180, 255, 0.3)'
  ctx.lineWidth   = 2
  ctx.stroke()

  // ── Número centrado ──
  const texto    = String(numero)
  const fontSize = texto.length > 1 ? 84 : 96
  // Usamos Arial Black que está disponible siempre en cualquier navegador,
  // sin necesidad de cargar fuentes web. Si esperamos a Barlow Condensed,
  // las fichas se crean antes de que la fuente esté lista y los números
  // salen como glyphs vacíos.
  ctx.font         = `900 ${fontSize}px "Arial Black", "Arial", sans-serif`
  ctx.fillStyle    = '#ffffff'
  ctx.textAlign    = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(texto, cx, cy + 3)

  return canvas
}

// ═══════════════════════════════════════════════════════════════════════════
// CORNERS DE SELECCIÓN — sprites cyan en forma de L
// ═══════════════════════════════════════════════════════════════════════════

function crearCornersSeleccion(tamano = 1.8) {
  const grupo = new THREE.Group()
  grupo.visible = false

  const canvas  = document.createElement('canvas')
  canvas.width  = 128
  canvas.height = 128
  const ctx     = canvas.getContext('2d')
  ctx.strokeStyle = '#00DDFF'
  ctx.lineWidth   = 14
  ctx.lineCap     = 'round'
  ctx.beginPath()
  ctx.moveTo(20, 60)
  ctx.lineTo(20, 20)
  ctx.lineTo(60, 20)
  ctx.stroke()
  const texturaBase = new THREE.CanvasTexture(canvas)

  const offsets = [
    { rot:  0,           x: -tamano / 2, y:  tamano / 2 },
    { rot:  Math.PI / 2, x:  tamano / 2, y:  tamano / 2 },
    { rot:  Math.PI,     x:  tamano / 2, y: -tamano / 2 },
    { rot: -Math.PI / 2, x: -tamano / 2, y: -tamano / 2 },
  ]

  offsets.forEach(({ rot, x, y }) => {
    const mat = new THREE.SpriteMaterial({
      map:         texturaBase,
      transparent: true,
      depthWrite:  false,
      depthTest:   false,
      rotation:    rot,
      opacity:     1,
    })
    const sprite = new THREE.Sprite(mat)
    sprite.scale.set(tamano * 0.5, tamano * 0.5, 1)
    sprite.position.set(x, y, 0)
    sprite.userData.esCorner = true
    grupo.add(sprite)
  })

  return grupo
}

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════

export function createFichasJugadores(scene, jugadores = [], opciones = {}) {
  const {
    offsetY       = 4.0,    // altura Y del grupo entero sobre la cancha
    escalaFicha   = 7.0,    // tamaño visual del círculo de la ficha
    tamanoCorners = 4.0,    // tamaño del rectángulo de corners de selección
    yFinal        = 0,      // posición Y final del sprite dentro del grupo
  } = opciones

  // Grupo padre con la misma altura que conexiones-v2.js para consistencia
  const grupo = new THREE.Group()
  grupo.position.y = offsetY
  grupo.visible    = false   // arranca oculto, se activa con animarEntrada()
  scene.add(grupo)

  const fichas = []

  // ─── Crear sprite + corners por cada jugador ─────────────────────────────
  jugadores.forEach((jugador) => {
    // Sprite canvas con el aro y el número (patrón de conexiones-v2.js)
    const canvas  = crearCanvasFicha(jugador.numero)
    const textura = new THREE.CanvasTexture(canvas)
    const matSprite = new THREE.SpriteMaterial({
      map:             textura,
      transparent:     true,
      depthWrite:      false,
      sizeAttenuation: true,
    })
    const sprite = new THREE.Sprite(matSprite)

    // Escala calculada igual que en conexiones-v2.js para que el círculo
    // visible tenga el tamaño deseado:
    //   El canvas es 512px pero el círculo solo ocupa el centro (radio 90px),
    //   así que el sprite real es ~2.84x el círculo visible.
    const escalaSprite = escalaFicha * (512 / (90 * 2))
    sprite.scale.set(escalaSprite, escalaSprite, 1)

    // Posición inicial: y=-8 (debajo del suelo, para animarEntrada())
    sprite.position.set(jugador.x ?? 0, -8, jugador.z ?? 0)
    sprite.renderOrder = 2
    sprite.userData.esFicha   = true
    sprite.userData.numero    = jugador.numero
    sprite.userData.jugadorId = jugador.id
    sprite.userData.yFinal    = yFinal   // guardar para animarEntrada
    grupo.add(sprite)

    // Corners cyan de selección — sprite group que sigue a la ficha
    // Lo añadimos al grupo (no al sprite) porque los Sprites no pueden
    // tener hijos en Three.js. Para que sigan a la ficha, usamos su
    // misma x/z y ajustamos su position en animarEntrada/Salida.
    const corners = crearCornersSeleccion(tamanoCorners)
    corners.position.set(jugador.x ?? 0, -8, jugador.z ?? 0)
    grupo.add(corners)

    fichas.push({ sprite, jugador, corners })
  })

  // ─── Animación de entrada ─────────────────────────────────────────────────
  // La ficha sube desde y=-8 (debajo del suelo) hasta su posición Y final
  // (yFinal, normalmente 0 dentro del grupo + offsetY del grupo = altura
  // visible sobre la cancha). La curva es back.out(1.7) que crea un
  // pequeño "overshoot" — la ficha sube un poco MÁS de lo necesario y
  // luego se asienta en su posición final, dando una sensación de
  // bouncing orgánico (como si tuviera inercia).
  //
  // En paralelo: fade-in de opacidad de 0 a 1 para que la materialización
  // sea suave y no aparezca de golpe a media altura.
  //
  // El stagger de 0.1s entre fichas permite apreciar la entrada como
  // una cadena escalonada.
  function animarEntrada(onComplete) {
    grupo.visible = true

    const total = fichas.length
    if (total === 0) {
      if (onComplete) onComplete()
      return
    }
    let completados = 0

    fichas.forEach((f, idx) => {
      const yObjetivo = f.sprite.userData.yFinal
      f.sprite.position.y  = -8
      f.corners.position.y = -8

      // Empezar invisible para que el fade-in sea visible
      f.sprite.material.opacity = 0

      const stagger = idx * 0.1

      // Subir con bouncing (back.out aplica un pequeño overshoot al final)
      gsap.to(f.sprite.position, {
        y:        yObjetivo,
        duration: 1.0,
        delay:    stagger,
        ease:     'back.out(1.7)',
        onComplete: () => {
          completados++
          if (completados === total && onComplete) onComplete()
        },
      })

      // Fade-in de opacidad en paralelo (más rápido que el movimiento
      // para que la ficha esté completamente visible cuando llegue arriba)
      gsap.to(f.sprite.material, {
        opacity:  1,
        duration: 0.5,
        delay:    stagger + 0.1,
        ease:     'power2.out',
      })

      // Corners suben en paralelo con la misma curva bouncing
      gsap.to(f.corners.position, {
        y:        yObjetivo,
        duration: 1.0,
        delay:    stagger,
        ease:     'back.out(1.7)',
      })
    })
  }

  // ─── Animación de salida ──────────────────────────────────────────────────
  // Las fichas bajan al suelo con stagger inverso (la última en aparecer
  // es la primera en irse). Fade-out de opacidad en paralelo para que la
  // desaparición sea suave en vez de un corte abrupto.
  function animarSalida(onComplete) {
    const total = fichas.length
    if (total === 0) {
      grupo.visible = false
      if (onComplete) onComplete()
      return
    }
    let completados = 0

    fichas.forEach((f, idx) => {
      const stagger = (total - 1 - idx) * 0.06

      gsap.to(f.sprite.position, {
        y:        -8,
        duration: 0.5,
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
      gsap.to(f.sprite.material, {
        opacity:  0,
        duration: 0.35,
        delay:    stagger + 0.1,
        ease:     'power2.in',
      })
      gsap.to(f.corners.position, {
        y:        -8,
        duration: 0.5,
        delay:    stagger,
        ease:     'power2.in',
      })
    })
  }

  // ─── Selección con corners cyan ───────────────────────────────────────────
  function seleccionar(numero) {
    if (numero == null) {
      deseleccionar()
      return
    }
    fichas.forEach((f) => {
      const esElegido = (f.jugador.numero === numero)
      if (esElegido && !f.corners.visible) {
        f.corners.visible = true
        f.corners.scale.set(0.01, 0.01, 0.01)
        gsap.to(f.corners.scale, {
          x: 1, y: 1, z: 1,
          duration: 0.45,
          ease: 'back.out(2.2)',
        })
      } else if (!esElegido && f.corners.visible) {
        gsap.to(f.corners.scale, {
          x: 0.01, y: 0.01, z: 0.01,
          duration: 0.25,
          ease: 'power2.in',
          onComplete: () => { f.corners.visible = false },
        })
      }
    })
  }

  function deseleccionar() {
    fichas.forEach((f) => {
      if (f.corners.visible) {
        gsap.to(f.corners.scale, {
          x: 0.01, y: 0.01, z: 0.01,
          duration: 0.25,
          ease: 'power2.in',
          onComplete: () => { f.corners.visible = false },
        })
      }
    })
  }

  // ─── Helper para actualizar el número en caliente ─────────────────────────
  function updateFicha(numero, nuevosDatos) {
    const entry = fichas.find(f => f.jugador.numero === numero)
    if (!entry) return
    const nuevoNumero = nuevosDatos.numero ?? entry.jugador.numero
    const canvas = crearCanvasFicha(nuevoNumero)
    entry.sprite.material.map.dispose()
    entry.sprite.material.map = new THREE.CanvasTexture(canvas)
    entry.sprite.material.needsUpdate = true
    entry.jugador = { ...entry.jugador, ...nuevosDatos }
  }

  // ─── tick: placeholder (sprites son billboard automático) ────────────────
  function tickFichas(/* camera */) {
    // no-op: los Sprites siempre miran a la cámara
  }

  // ─── Sistema de highlight/dim para hover desde otros componentes ──────────
  // Permite que componentes externos (ej. conexiones-jugadores.js durante
  // un hover) oscurezcan ciertas fichas para crear un "focus mode".
  //
  // Técnica: usamos la propiedad .color del SpriteMaterial, que MULTIPLICA
  // los píxeles de la textura. Color blanco (0xffffff) = sin cambio. Color
  // gris oscuro (0x444444) = textura multiplicada por 0.27 → fichas se ven
  // mucho más tenues pero SIGUEN SIENDO OPACAS (no se ve a través de ellas).
  //
  // El cambio se anima con gsap para una transición suave entre estados.
  const COLOR_NORMAL = new THREE.Color(0xffffff)   // sin tint (full brillo)
  const COLOR_DIM    = new THREE.Color(0x999999)   // tenue (~60% del brillo)
  let highlightActivo = false

  // Resalta las fichas con los números dados; oscurece todas las demás.
  // Si la fórmula necesita resaltar SOLO una ficha, pasar [numero] como array.
  function highlightFichas(numerosArray) {
    highlightActivo = true
    fichas.forEach((f) => {
      const esResaltada = numerosArray.includes(f.jugador.numero)
      const colorObjetivo = esResaltada ? COLOR_NORMAL : COLOR_DIM
      // Animar color con gsap usando un proxy (THREE.Color no se anima
      // directamente con gsap.to, pero podemos interpolar sus componentes)
      gsap.to(f.sprite.material.color, {
        r: colorObjetivo.r,
        g: colorObjetivo.g,
        b: colorObjetivo.b,
        duration: 0.25,
        ease: 'power2.out',
      })
    })
  }

  // Restaura todas las fichas a su estado normal (sin tint)
  function unhighlightAll() {
    if (!highlightActivo) return
    highlightActivo = false
    fichas.forEach((f) => {
      gsap.to(f.sprite.material.color, {
        r: COLOR_NORMAL.r,
        g: COLOR_NORMAL.g,
        b: COLOR_NORMAL.b,
        duration: 0.25,
        ease: 'power2.out',
      })
    })
  }

  return {
    grupo,
    fichas,
    animarEntrada,
    animarSalida,
    seleccionar,
    deseleccionar,
    updateFicha,
    tickFichas,
    highlightFichas,
    unhighlightAll,
  }
}