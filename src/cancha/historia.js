// src/cancha/historia.js
// Sistema de capítulos con GSAP para narración secuencial
// Cada capítulo define qué elementos aparecen/desaparecen con animaciones

import gsap from 'gsap'

// ── Helper: animar entrada de un grupo 3D ────────────────────────────────────
function entradaGrupo(grupo, opciones = {}) {
  const { desde = 'abajo', duracion = 0.7, delay = 0 } = opciones
  grupo.visible = true

  const offsetY = { abajo: -15, arriba: 15, izquierda: -30, derecha: 30 }

  if (desde === 'abajo' || desde === 'arriba') {
    grupo.position.y -= offsetY[desde]
    gsap.to(grupo.position, {
      y: grupo.position.y + offsetY[desde],
      duration: duracion, delay, ease: 'power3.out'
    })
  } else {
    grupo.position.x -= offsetY[desde]
    gsap.to(grupo.position, {
      x: grupo.position.x + offsetY[desde],
      duration: duracion, delay, ease: 'power3.out'
    })
  }

  // Fade in via scale
  grupo.scale.set(0.8, 0.8, 0.8)
  gsap.to(grupo.scale, {
    x: 1, y: 1, z: 1,
    duration: duracion, delay, ease: 'back.out(1.4)'
  })
}

// ── Helper: animar salida de un grupo 3D ─────────────────────────────────────
function salidaGrupo(grupo, opciones = {}) {
  const { hacia = 'abajo', duracion = 0.5, delay = 0, onComplete } = opciones
  const offsetY = { abajo: -15, arriba: 15, izquierda: -30, derecha: 30 }

  if (hacia === 'abajo' || hacia === 'arriba') {
    gsap.to(grupo.position, {
      y: grupo.position.y - offsetY[hacia],
      duration: duracion, delay, ease: 'power2.in',
      onComplete: () => {
        grupo.visible = false
        grupo.position.y += offsetY[hacia]
        if (onComplete) onComplete()
      }
    })
  } else {
    gsap.to(grupo.position, {
      x: grupo.position.x - offsetY[hacia],
      duration: duracion, delay, ease: 'power2.in',
      onComplete: () => {
        grupo.visible = false
        grupo.position.x += offsetY[hacia]
        if (onComplete) onComplete()
      }
    })
  }

  gsap.to(grupo.scale, {
    x: 0.8, y: 0.8, z: 0.8,
    duration: duracion, delay, ease: 'power2.in'
  })
}

// ── Helper: mostrar/ocultar elemento DOM con fade ────────────────────────────
function entradaDOM(el, duracion = 0.5, delay = 0) {
  el.style.display = 'block'
  el.style.opacity = '0'
  gsap.to(el, { opacity: 1, duration: duracion, delay, ease: 'power2.out' })
}

function salidaDOM(el, duracion = 0.4, delay = 0) {
  gsap.to(el, {
    opacity: 0, duration: duracion, delay, ease: 'power2.in',
    onComplete: () => { el.style.display = 'none' }
  })
}

// ── Helper: ocultar todo ──────────────────────────────────────────────────────
function ocultarTodo(refs) {
  const { grupos = [], doms = [] } = refs
  grupos.forEach(g => {
    if (g && g.visible) {
      g.visible = false
      g.scale.set(1, 1, 1)
    }
  })
  doms.forEach(el => {
    if (el) { el.style.display = 'none'; el.style.opacity = '0' }
  })
}

// ── CAPÍTULOS ─────────────────────────────────────────────────────────────────
export function createHistoria(refs) {
  const {
    grupoJugadores,
    grupoEquipo,
    grupoZona,
    grupoZonasPases,
    grupoEventos,
    grupoFlechas,
    grupoFlechasFlow,
    grupoFlechasDash,
    grupoParabola,
    grupoConexionesV2,
    grupoVentana3D,
    grupoSpider3D,
    meshHeatmapFlat,
    statCardEl,
    chartCardEl,
    ventanaChartEl,
  } = refs

  const todosLosGrupos = [
    grupoJugadores, grupoEquipo, grupoZona, grupoZonasPases,
    grupoEventos, grupoFlechas, grupoFlechasFlow, grupoFlechasDash,
    grupoParabola, grupoConexionesV2, grupoVentana3D, grupoSpider3D,
  ]
  if (meshHeatmapFlat) todosLosGrupos.push(meshHeatmapFlat)
  const todosLosDOM = [statCardEl, chartCardEl, ventanaChartEl]

  // ── Definición de capítulos ──────────────────────────────────────────────
  const CAPITULOS = [

    // ── 0. Estado inicial — cancha vacía ─────────────────────────────────
    {
      nombre: 'Inicio',
      icono:  '⚽',
      entrada() {
        ocultarTodo({ grupos: todosLosGrupos, doms: todosLosDOM })
      },
      salida() {}
    },

    // ── 1. Presentación del equipo ────────────────────────────────────────
    {
      nombre: 'Equipo',
      icono:  '🏆',
      entrada() {
        ocultarTodo({ grupos: todosLosGrupos, doms: todosLosDOM })
        entradaGrupo(grupoEquipo, { desde: 'arriba', duracion: 0.8 })
        entradaGrupo(grupoJugadores, { desde: 'abajo', duracion: 0.9, delay: 0.2 })
      },
      salida() {
        salidaGrupo(grupoEquipo,    { hacia: 'arriba', duracion: 0.5 })
        salidaGrupo(grupoJugadores, { hacia: 'abajo',  duracion: 0.5, delay: 0.1 })
      }
    },

    // ── 2. Estadísticas individuales del jugador ──────────────────────────
    {
      nombre: 'Stats jugador',
      icono:  '📊',
      entrada() {
        ocultarTodo({ grupos: todosLosGrupos, doms: todosLosDOM })
        entradaGrupo(grupoJugadores, { desde: 'izquierda', duracion: 0.7 })
        entradaDOM(statCardEl, 0.6, 0.3)
        entradaDOM(chartCardEl, 0.6, 0.6)
      },
      salida() {
        salidaGrupo(grupoJugadores, { hacia: 'izquierda', duracion: 0.5 })
        salidaDOM(statCardEl, 0.4)
        salidaDOM(chartCardEl, 0.4, 0.1)
      }
    },

    // ── 3. Zona de influencia ────────────────────────────────────────────
    {
      nombre: 'Zona',
      icono:  '📍',
      entrada() {
        ocultarTodo({ grupos: todosLosGrupos, doms: todosLosDOM })
        entradaGrupo(grupoJugadores, { desde: 'izquierda', duracion: 0.6 })
        gsap.delayedCall(0.4, () => {
          grupoZona.visible = true
          gsap.from(grupoZona.scale, { x: 0, y: 0, z: 0, duration: 0.7, ease: 'back.out(1.4)' })
        })
      },
      salida() {
        salidaGrupo(grupoJugadores, { hacia: 'izquierda', duracion: 0.4 })
        salidaGrupo(grupoZona,      { hacia: 'abajo',     duracion: 0.4, delay: 0.1 })
      }
    },

    // ── 4. Heatmap de pases ──────────────────────────────────────────────
    {
      nombre: 'Pases',
      icono:  '🔥',
      entrada() {
        ocultarTodo({ grupos: todosLosGrupos, doms: todosLosDOM })
        grupoZonasPases.visible = true
        gsap.from(grupoZonasPases.scale, {
          x: 0.5, y: 0.5, z: 0.5, duration: 0.8, ease: 'power3.out'
        })
      },
      salida() {
        gsap.to(grupoZonasPases.scale, {
          x: 0.5, y: 0.5, z: 0.5, duration: 0.5, ease: 'power2.in',
          onComplete: () => {
            grupoZonasPases.visible = false
            grupoZonasPases.scale.set(1, 1, 1)
          }
        })
      }
    },

    // ── 5. Análisis de jugada — flechas ──────────────────────────────────
    {
      nombre: 'Jugada',
      icono:  '⚡',
      entrada() {
        ocultarTodo({ grupos: todosLosGrupos, doms: todosLosDOM })
        entradaGrupo(grupoJugadores, { desde: 'abajo', duracion: 0.6 })
        gsap.delayedCall(0.5, () => {
          grupoFlechasDash.visible = true
          gsap.from(grupoFlechasDash.scale, { x: 0, y: 0, z: 0, duration: 0.6, ease: 'power3.out' })
        })
      },
      salida() {
        salidaGrupo(grupoJugadores,  { hacia: 'abajo', duracion: 0.4 })
        salidaGrupo(grupoFlechasDash,{ hacia: 'abajo', duracion: 0.4, delay: 0.1 })
      }
    },

    // ── 6. Pase largo parabólico ─────────────────────────────────────────
    {
      nombre: 'Pase largo',
      icono:  '🎯',
      entrada() {
        ocultarTodo({ grupos: todosLosGrupos, doms: todosLosDOM })
        entradaGrupo(grupoJugadores, { desde: 'abajo', duracion: 0.6 })
        gsap.delayedCall(0.4, () => {
          grupoParabola.visible = true
          gsap.from(grupoParabola.scale, { x: 0, y: 0, z: 0, duration: 0.8, ease: 'back.out(1.2)' })
        })
      },
      salida() {
        salidaGrupo(grupoJugadores, { hacia: 'abajo', duracion: 0.4 })
        salidaGrupo(grupoParabola,  { hacia: 'arriba', duracion: 0.4, delay: 0.1 })
      }
    },

    // ── 7. Red de conexiones ────────────────────────────────────────────
    {
      nombre: 'Conexiones',
      icono:  '🕸️',
      entrada() {
        ocultarTodo({ grupos: todosLosGrupos, doms: todosLosDOM })
        entradaGrupo(grupoJugadores,   { desde: 'abajo', duracion: 0.6 })
        gsap.delayedCall(0.5, () => {
          grupoConexionesV2.visible = true
          gsap.from(grupoConexionesV2.scale, { x: 0, y: 0, z: 0, duration: 0.7, ease: 'power3.out' })
        })
      },
      salida() {
        salidaGrupo(grupoJugadores,  { hacia: 'abajo', duracion: 0.4 })
        salidaGrupo(grupoConexionesV2,{ hacia: 'abajo', duracion: 0.4, delay: 0.1 })
      }
    },

    // ── 8. Eventos en cancha ────────────────────────────────────────────
    {
      nombre: 'Eventos',
      icono:  '📌',
      entrada() {
        ocultarTodo({ grupos: todosLosGrupos, doms: todosLosDOM })
        grupoEventos.visible = true
        grupoEventos.children.forEach((child, i) => {
          child.scale.set(0, 0, 0)
          gsap.to(child.scale, {
            x: 1, y: 1, z: 1,
            duration: 0.4,
            delay: i * 0.02,
            ease: 'back.out(1.7)'
          })
        })
      },
      salida() {
        grupoEventos.children.forEach((child, i) => {
          gsap.to(child.scale, {
            x: 0, y: 0, z: 0,
            duration: 0.3,
            delay: i * 0.01,
            ease: 'power2.in',
            onComplete: i === grupoEventos.children.length - 1
              ? () => { grupoEventos.visible = false }
              : undefined
          })
        })
      }
    },

    // ── 9. Radar General ────────────────────────────────────────────────
    {
      nombre: 'Radar',
      icono:  '🎭',
      entrada() {
        ocultarTodo({ grupos: todosLosGrupos, doms: todosLosDOM })
        entradaGrupo(grupoSpider3D, { desde: 'derecha', duracion: 0.8 })
      },
      salida() {
        salidaGrupo(grupoSpider3D, { hacia: 'derecha', duracion: 0.5 })
      }
    },

    // ── 10. Conclusión — gráfica de tendencia ───────────────────────────
    {
      nombre: 'Tendencia',
      icono:  '📈',
      entrada() {
        ocultarTodo({ grupos: todosLosGrupos, doms: todosLosDOM })
        entradaGrupo(grupoVentana3D, { desde: 'izquierda', duracion: 0.8 })
        entradaDOM(ventanaChartEl, 0.6, 0.4)
      },
      salida() {
        salidaGrupo(grupoVentana3D, { hacia: 'izquierda', duracion: 0.5 })
        salidaDOM(ventanaChartEl, 0.4)
      }
    },

  ]

  // ── Estado del navegador ────────────────────────────────────────────────
  let capituloActual = 0

  function irA(indice) {
    if (indice < 0 || indice >= CAPITULOS.length) return
    const anterior = CAPITULOS[capituloActual]
    const siguiente = CAPITULOS[indice]
    anterior.salida()
    gsap.delayedCall(0.3, () => {
      capituloActual = indice
      siguiente.entrada()
      actualizarUI()
    })
  }

  function siguiente() { irA(capituloActual + 1) }
  function anterior()  { irA(capituloActual - 1) }

  // ── UI de navegación ────────────────────────────────────────────────────
  function actualizarUI() {
    const cap = CAPITULOS[capituloActual]
    labelEl.textContent  = `${cap.icono} ${cap.nombre}`
    contadorEl.textContent = `${capituloActual + 1} / ${CAPITULOS.length}`
    btnAnterior.disabled = capituloActual === 0
    btnSiguiente.disabled = capituloActual === CAPITULOS.length - 1

    // Actualizar dots
    dots.forEach((dot, i) => {
      dot.classList.toggle('historia-dot-activo', i === capituloActual)
    })
  }

  // ── Crear controles de navegación ──────────────────────────────────────
  if (!document.getElementById('historia-styles')) {
    const style = document.createElement('style')
    style.id = 'historia-styles'
    style.textContent = `
      #historia-nav {
        position: fixed;
        bottom: 32px;
        left: 50%;
        transform: translateX(-50%);
        display: flex;
        align-items: center;
        gap: 16px;
        background: rgba(6, 12, 26, 0.82);
        border: 1px solid rgba(78, 211, 255, 0.3);
        border-radius: 50px;
        padding: 10px 20px;
        backdrop-filter: blur(12px);
        z-index: 1000;
        user-select: none;
      }
      .historia-btn {
        background: rgba(78, 211, 255, 0.1);
        border: 1px solid rgba(78, 211, 255, 0.4);
        border-radius: 50%;
        width: 36px; height: 36px;
        color: #4ED3FF;
        font-size: 16px;
        cursor: pointer;
        display: flex; align-items: center; justify-content: center;
        transition: background 0.2s;
      }
      .historia-btn:hover:not(:disabled) { background: rgba(78, 211, 255, 0.25); }
      .historia-btn:disabled { opacity: 0.3; cursor: default; }
      #historia-label {
        font-family: 'JetBrains Mono', monospace;
        font-size: 13px;
        color: #ffffff;
        min-width: 140px;
        text-align: center;
      }
      #historia-contador {
        font-family: 'JetBrains Mono', monospace;
        font-size: 11px;
        color: rgba(255,255,255,0.4);
      }
      #historia-dots {
        display: flex; gap: 6px; align-items: center;
      }
      .historia-dot {
        width: 6px; height: 6px;
        border-radius: 50%;
        background: rgba(255,255,255,0.25);
        cursor: pointer;
        transition: background 0.2s, transform 0.2s;
      }
      .historia-dot-activo {
        background: #4ED3FF;
        transform: scale(1.4);
      }
    `
    document.head.appendChild(style)
  }

  const nav = document.createElement('div')
  nav.id = 'historia-nav'

  const btnAnterior = document.createElement('button')
  btnAnterior.className = 'historia-btn'
  btnAnterior.innerHTML = '‹'
  btnAnterior.addEventListener('click', anterior)

  const labelEl = document.createElement('div')
  labelEl.id = 'historia-label'

  const contadorEl = document.createElement('div')
  contadorEl.id = 'historia-contador'

  const dotsEl = document.createElement('div')
  dotsEl.id = 'historia-dots'
  const dots = CAPITULOS.map((cap, i) => {
    const dot = document.createElement('div')
    dot.className = 'historia-dot'
    dot.title = cap.nombre
    dot.addEventListener('click', () => irA(i))
    dotsEl.appendChild(dot)
    return dot
  })

  const btnSiguiente = document.createElement('button')
  btnSiguiente.className = 'historia-btn'
  btnSiguiente.innerHTML = '›'
  btnSiguiente.addEventListener('click', siguiente)

  nav.appendChild(btnAnterior)
  nav.appendChild(labelEl)
  nav.appendChild(dotsEl)
  nav.appendChild(contadorEl)
  nav.appendChild(btnSiguiente)
  document.body.appendChild(nav)

  // Teclado
  window.addEventListener('keydown', e => {
    if (e.key === 'ArrowRight') siguiente()
    if (e.key === 'ArrowLeft')  anterior()
  })

  // Inicializar en capítulo 0
  CAPITULOS[0].entrada()
  actualizarUI()

  return { irA, siguiente, anterior, CAPITULOS }
}
