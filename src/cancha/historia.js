// src/cancha/historia.js

import gsap from 'gsap'

function entradaGrupo(grupo, opciones = {}) {
  const { desde = 'abajo', duracion = 0.7, delay = 0 } = opciones
  grupo.visible = true
  const offsetY = { abajo: -15, arriba: 15, izquierda: -30, derecha: 30 }
  if (desde === 'abajo' || desde === 'arriba') {
    grupo.position.y -= offsetY[desde]
    gsap.to(grupo.position, { y: grupo.position.y + offsetY[desde], duration: duracion, delay, ease: 'power3.out' })
  } else {
    grupo.position.x -= offsetY[desde]
    gsap.to(grupo.position, { x: grupo.position.x + offsetY[desde], duration: duracion, delay, ease: 'power3.out' })
  }
  grupo.scale.set(0.8, 0.8, 0.8)
  gsap.to(grupo.scale, { x: 1, y: 1, z: 1, duration: duracion, delay, ease: 'back.out(1.4)' })
}

function salidaGrupo(grupo, opciones = {}) {
  const { hacia = 'abajo', duracion = 0.5, delay = 0, onComplete } = opciones
  const offsetY = { abajo: -15, arriba: 15, izquierda: -30, derecha: 30 }
  if (hacia === 'abajo' || hacia === 'arriba') {
    gsap.to(grupo.position, {
      y: grupo.position.y - offsetY[hacia], duration: duracion, delay, ease: 'power2.in',
      onComplete: () => { grupo.visible = false; grupo.position.y += offsetY[hacia]; if (onComplete) onComplete() }
    })
  } else {
    gsap.to(grupo.position, {
      x: grupo.position.x - offsetY[hacia], duration: duracion, delay, ease: 'power2.in',
      onComplete: () => { grupo.visible = false; grupo.position.x += offsetY[hacia]; if (onComplete) onComplete() }
    })
  }
  gsap.to(grupo.scale, { x: 0.8, y: 0.8, z: 0.8, duration: duracion, delay, ease: 'power2.in' })
}

function entradaDOM(el, duracion = 0.5, delay = 0) {
  el.style.display = 'block'
  el.style.opacity = '0'
  gsap.to(el, { opacity: 1, duration: duracion, delay, ease: 'power2.out' })
}

function salidaDOM(el, duracion = 0.4, delay = 0) {
  gsap.to(el, { opacity: 0, duration: duracion, delay, ease: 'power2.in', onComplete: () => { el.style.display = 'none' } })
}

function ocultarTodo(refs) {
  const { grupos = [], doms = [] } = refs
  grupos.forEach(g => { if (g && g.visible) { g.visible = false; g.scale.set(1, 1, 1) } })
  doms.forEach(el => { if (el) { el.style.display = 'none'; el.style.opacity = '0' } })
}

export function createHistoria(refs) {
  const {
    grupoJugadores, grupoEquipo, grupoZona, grupoZonasPases,
    grupoEventos, grupoFlechas, grupoFlechasFlow, grupoFlechasDash,
    grupoParabola, grupoConexionesV2, grupoVentana3D, grupoSpider3D,
    statCardEl, chartCardEl, ventanaChartEl,
    scanner,  // ← recibido desde script.js
  } = refs

  const todosLosGrupos = [
    grupoJugadores, grupoEquipo, grupoZona, grupoZonasPases,
    grupoEventos, grupoFlechas, grupoFlechasFlow, grupoFlechasDash,
    grupoParabola, grupoConexionesV2, grupoVentana3D, grupoSpider3D,
  ]
  const todosLosDOM = [statCardEl, chartCardEl, ventanaChartEl]

  const CAPITULOS = [
    {
      nombre: 'Inicio', icono: '⚽',
      entrada() { ocultarTodo({ grupos: todosLosGrupos, doms: todosLosDOM }) },
      salida() {}
    },
    {
      nombre: 'Equipo', icono: '🏆',
      entrada() {
        ocultarTodo({ grupos: todosLosGrupos, doms: todosLosDOM })
        entradaGrupo(grupoEquipo,    { desde: 'arriba', duracion: 0.8 })
        entradaGrupo(grupoJugadores, { desde: 'abajo',  duracion: 0.9, delay: 0.2 })
      },
      salida() {
        salidaGrupo(grupoEquipo,    { hacia: 'arriba', duracion: 0.5 })
        salidaGrupo(grupoJugadores, { hacia: 'abajo',  duracion: 0.5, delay: 0.1 })
      }
    },
    {
      nombre: 'Stats jugador', icono: '📊',
      entrada() {
        ocultarTodo({ grupos: todosLosGrupos, doms: todosLosDOM })
        entradaGrupo(grupoJugadores, { desde: 'izquierda', duracion: 0.7 })
        entradaDOM(statCardEl,  0.6, 0.3)
        entradaDOM(chartCardEl, 0.6, 0.6)
      },
      salida() {
        salidaGrupo(grupoJugadores, { hacia: 'izquierda', duracion: 0.5 })
        salidaDOM(statCardEl,  0.4)
        salidaDOM(chartCardEl, 0.4, 0.1)
      }
    },
    {
      nombre: 'Zona', icono: '📍',
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
    {
      nombre: 'Pases', icono: '🔥',
      entrada() {
        ocultarTodo({ grupos: todosLosGrupos, doms: todosLosDOM })
        grupoZonasPases.visible = true
        gsap.from(grupoZonasPases.scale, { x: 0.5, y: 0.5, z: 0.5, duration: 0.8, ease: 'power3.out' })
      },
      salida() {
        gsap.to(grupoZonasPases.scale, {
          x: 0.5, y: 0.5, z: 0.5, duration: 0.5, ease: 'power2.in',
          onComplete: () => { grupoZonasPases.visible = false; grupoZonasPases.scale.set(1,1,1) }
        })
      }
    },
    {
      nombre: 'Jugada', icono: '⚡',
      entrada() {
        ocultarTodo({ grupos: todosLosGrupos, doms: todosLosDOM })
        entradaGrupo(grupoJugadores, { desde: 'abajo', duracion: 0.6 })
        gsap.delayedCall(0.5, () => {
          grupoFlechasDash.visible = true
          gsap.from(grupoFlechasDash.scale, { x: 0, y: 0, z: 0, duration: 0.6, ease: 'power3.out' })
        })
      },
      salida() {
        salidaGrupo(grupoJugadores,   { hacia: 'abajo', duracion: 0.4 })
        salidaGrupo(grupoFlechasDash, { hacia: 'abajo', duracion: 0.4, delay: 0.1 })
      }
    },
    {
      nombre: 'Pase largo', icono: '🎯',
      entrada() {
        ocultarTodo({ grupos: todosLosGrupos, doms: todosLosDOM })
        entradaGrupo(grupoJugadores, { desde: 'abajo', duracion: 0.6 })
        gsap.delayedCall(0.4, () => {
          grupoParabola.visible = true
          gsap.from(grupoParabola.scale, { x: 0, y: 0, z: 0, duration: 0.8, ease: 'back.out(1.2)' })
        })
      },
      salida() {
        salidaGrupo(grupoJugadores, { hacia: 'abajo',  duracion: 0.4 })
        salidaGrupo(grupoParabola,  { hacia: 'arriba', duracion: 0.4, delay: 0.1 })
      }
    },
    {
      nombre: 'Conexiones', icono: '🕸️',
      entrada() {
        ocultarTodo({ grupos: todosLosGrupos, doms: todosLosDOM })
        entradaGrupo(grupoJugadores, { desde: 'abajo', duracion: 0.6 })
        gsap.delayedCall(0.5, () => {
          grupoConexionesV2.visible = true
          gsap.from(grupoConexionesV2.scale, { x: 0, y: 0, z: 0, duration: 0.7, ease: 'power3.out' })
        })
      },
      salida() {
        salidaGrupo(grupoJugadores,    { hacia: 'abajo', duracion: 0.4 })
        salidaGrupo(grupoConexionesV2, { hacia: 'abajo', duracion: 0.4, delay: 0.1 })
      }
    },
    {
      nombre: 'Eventos', icono: '📌',
      entrada() {
        ocultarTodo({ grupos: todosLosGrupos, doms: todosLosDOM })
        grupoEventos.visible = true
        grupoEventos.children.forEach((child, i) => {
          child.scale.set(0, 0, 0)
          gsap.to(child.scale, { x: 1, y: 1, z: 1, duration: 0.4, delay: i * 0.02, ease: 'back.out(1.7)' })
        })
      },
      salida() {
        grupoEventos.children.forEach((child, i) => {
          gsap.to(child.scale, {
            x: 0, y: 0, z: 0, duration: 0.3, delay: i * 0.01, ease: 'power2.in',
            onComplete: i === grupoEventos.children.length - 1
              ? () => { grupoEventos.visible = false } : undefined
          })
        })
      }
    },
    {
      nombre: 'Radar', icono: '🎭',
      entrada() {
        ocultarTodo({ grupos: todosLosGrupos, doms: todosLosDOM })
        entradaGrupo(grupoSpider3D, { desde: 'derecha', duracion: 0.8 })
      },
      salida() { salidaGrupo(grupoSpider3D, { hacia: 'derecha', duracion: 0.5 }) }
    },
    {
      nombre: 'Tendencia', icono: '📈',
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

  let capituloActual = 0

  function irA(indice) {
    if (indice < 0 || indice >= CAPITULOS.length) return
    CAPITULOS[capituloActual].salida()
    gsap.delayedCall(0.3, () => {
      capituloActual = indice
      CAPITULOS[indice].entrada()
      actualizarUI()
    })
  }

  function siguiente() { irA(capituloActual + 1) }
  function anterior()  { irA(capituloActual - 1) }

  function actualizarUI() {
    // Sin nav visible — solo actualizar estado interno
  }

  // Teclado: flechas para navegar capítulos
  window.addEventListener('keydown', e => {
    if (e.key === 'ArrowRight') siguiente()
    if (e.key === 'ArrowLeft')  anterior()
  })

  CAPITULOS[0].entrada()

  return { irA, siguiente, anterior, CAPITULOS }
}
