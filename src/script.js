import * as THREE from 'three'
import gsap from 'gsap'
import { createScene }     from './cancha/scene.js'
import { createLights }    from './cancha/lights.js'
import { createField, CANCHA_BLOOM_LAYER } from './cancha/field-02.js'
import * as FieldModule    from './cancha/field-02.js'
import { createLines }     from './cancha/lines.js'
import { createGoals }     from './cancha/goals.js'
import { createControls }  from './cancha/controls.js'
import { createTeam, BLOOM_LAYER } from './cancha/team.js'
import * as TeamModule     from './cancha/team.js'
import { createGrid }      from './cancha/grid.js'
import { EffectComposer }  from 'three/addons/postprocessing/EffectComposer.js'
import { RenderPass }      from 'three/addons/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js'
import { ShaderPass }      from 'three/addons/postprocessing/ShaderPass.js'
import { FXAAShader }      from 'three/addons/shaders/FXAAShader.js'
import { createHeatmap }         from './cancha/heatmap.js'
import { createConexionesJugadores } from './cancha/conexiones-jugadores.js'
import { createHeatmapZona }     from './cancha/heatmap-zona.js'
import { createHeatmapZonasPases } from './cancha/heatmap-zonas-pases.js'
import { createEventosCancha }   from './cancha/eventos-cancha.js'
import { createVentanaChart }    from './cancha/ventana-chart.js'
import { createJugadorCards }    from './cancha/jugador-card.js'
import { createFichasJugadores } from './cancha/fichas-jugadores.js'
import { createEquipoCard }      from './cancha/equipo-card.js'
import { createFlechas }         from './cancha/flechas.js'
import { createFlechasFlow }     from './cancha/flechas-flow.js'
import { createFlechasDash }     from './cancha/flechas-dash.js'
import { createFlechasDisparo }  from './cancha/flechas-disparo.js'
import { JUGADORES }             from './cancha/jugadores.js'
import { createStatCard }        from './cancha/stat-card.js'
import { createChartStatCard }   from './cancha/chart-stat-card.js'
import { createFlechasParabola } from './cancha/flechas-parabola.js'
import { createVentanaChart3D }  from './cancha/ventana-chart-3d.js'
import { createVentanaChart3DV2 } from './cancha/ventana-chart-3d-v2.js'
import { createSpiderChart3D }   from './cancha/spider-chart-3d.js'
import { createHistoria }        from './cancha/historia.js'
import { createHudTextInfo }     from './cancha/hud-text-info.js'
import { createHudInsightCard }  from './cancha/hud-insight-card.js'
import { createHudInsightHorizontal } from './cancha/hud-insight-horizontal.js'
import { createHudInsightChart }      from './cancha/hud-insight-chart.js'
import { createHudInsightRange }      from './cancha/hud-insight-range.js'
import { ScannerEffect }         from './cancha/scanner-effect.js'

// ── Inicializar escena base ──
const { scene, camera, renderer } = createScene()

// ── Fade general de negro a transparente al cargar la intro ──
const fadeOverlay = document.createElement('div')
fadeOverlay.style.cssText = `
  position: fixed;
  inset: 0;
  background: #000;
  z-index: 99999;
  pointer-events: none;
  opacity: 1;
`
document.body.appendChild(fadeOverlay)

const { sombraPlano } = createLights(scene)

const { fieldMaterial, bgTexture } = createField(scene, '/cancha.glb', {
  onReady: (canchaScene, escalaFinal) => {
    canchaScene.scale.setScalar(escalaFinal * 0.60)

    linesGroup.visible   = true
    gridMesh.visible     = true
    goalsGroup.visible   = true
    sombraPlano.visible  = true

    const tl = gsap.timeline()
    tl.to(canchaScene.scale, {
      x: escalaFinal, y: escalaFinal, z: escalaFinal,
      duration: 1.2,
      ease: 'back.out(1.4)',
    }, 0)
    tl.to(linesGroup.scale, {
      x: 1, y: 1, z: 1,
      duration: 1.2,
      ease: 'back.out(1.4)',
    }, 0)
    tl.to(gridMesh.scale, {
      x: 1, y: 1, z: 1,
      duration: 1.2,
      ease: 'back.out(1.4)',
    }, 0)
    tl.to(goalsGroup.scale, {
      x: 1, y: 1, z: 1,
      duration: 1.2,
      ease: 'back.out(1.4)',
    }, 0)
    tl.to(sombraPlano.scale, {
      x: 1, y: 1, z: 1,
      duration: 1.2,
      ease: 'back.out(1.4)',
    }, 0)
    tl.to(fadeOverlay, {
      opacity: 0,
      duration: 0.6,
      ease: 'power2.out',
      onComplete: () => {
        fadeOverlay.remove()
      },
    }, 0)
  },
})
const { allLines, linesGroup, setLinesColor }  = createLines(scene)
const goalsGroup = createGoals(scene)
const gridMesh = createGrid(scene, 0.35, 0)

linesGroup.scale.setScalar(0.60)
gridMesh.scale.setScalar(0.60)
goalsGroup.scale.setScalar(0.60)
sombraPlano.scale.setScalar(0.60)
linesGroup.visible   = false
gridMesh.visible     = false
goalsGroup.visible   = false
sombraPlano.visible  = false

// ── Heatmap 3D ──
const {
  meshGrid: heatmapGrid,
  meshSolid: heatmapSolid,
  animarEntrada: animarEntradaHeatmap,
  animarSalida: animarSalidaHeatmap,
} = createHeatmap(scene)

const excluidos = new Set()

// ── Heatmap Zona ──
const {
  grupo: grupoZona,
  animarEntrada: animarEntradaZona,
  animarSalida: animarSalidaZona,
} = createHeatmapZona(scene, [{
  x: 13, z: -25, ancho: 40, alto: 18,
  color: 0x1E8CFF, alpha: 0.25, label: 'Banda derecha',
}])

// ── Heatmap Zonas Pases ──
const { grupo: grupoZonasPases, updatePases, tickZonasPases } = createHeatmapZonasPases(scene, [
  [ 12,  8, 15, 30 ], [ 20, 45, 60, 25 ],
  [ 18, 50, 55, 22 ], [ 10,  6, 12, 28 ],
])

// ── Eventos en cancha ──
const { grupo: grupoEventos, tickEventos } = createEventosCancha(scene, [
  { x:  25, z: -24, tipo: 'circulo',   color: '#EA6500' },
  { x:  25, z:  24, tipo: 'hexagono',  color: '#0752E4' },
  { x:   2, z:   0, tipo: 'cuadrado',  color: '#F7B203' },
  { x:  48, z:   0, tipo: 'diamante',  color: '#7BA4F5' },
  { x:  10, z: -22, tipo: 'triangulo', color: '#EA8900' },
  { x:  10, z:  22, tipo: 'circulo',   color: '#F3D662' },
  { x:  40, z: -22, tipo: 'hexagono',  color: '#EA6500' },
  { x:  40, z:  22, tipo: 'cuadrado',  color: '#FFFFFF' },
  { x:   8, z:  -8, tipo: 'diamante',  color: '#0752E4' },
  { x:   8, z:   8, tipo: 'triangulo', color: '#F7B203' },
  { x:  15, z: -18, tipo: 'circulo',   color: '#EA6500' },
  { x:  15, z:  18, tipo: 'hexagono',  color: '#EA8900' },
  { x:  15, z:  -5, tipo: 'cuadrado',  color: '#7BA4F5' },
  { x:  15, z:   5, tipo: 'diamante',  color: '#F8F899' },
  { x:  25, z: -18, tipo: 'triangulo', color: '#EA6500' },
  { x:  25, z:  18, tipo: 'circulo',   color: '#0752E4' },
  { x:  35, z: -18, tipo: 'hexagono',  color: '#F3D662' },
  { x:  35, z:  18, tipo: 'cuadrado',  color: '#EA6500' },
  { x:  35, z:  -5, tipo: 'diamante',  color: '#F7B203' },
  { x:  35, z:   5, tipo: 'triangulo', color: '#7BA4F5' },
  { x:  42, z:  -8, tipo: 'circulo',   color: '#EA8900' },
  { x:  42, z:   8, tipo: 'hexagono',  color: '#FFFFFF' },
  { x:  12, z:   0, tipo: 'cuadrado',  color: '#EA6500' },
  { x:  18, z: -12, tipo: 'diamante',  color: '#0752E4' },
  { x:  18, z:  12, tipo: 'triangulo', color: '#F7B203' },
  { x:  18, z:   0, tipo: 'circulo',   color: '#EA8900' },
  { x:  25, z: -12, tipo: 'hexagono',  color: '#F3D662' },
  { x:  25, z:  12, tipo: 'cuadrado',  color: '#EA6500' },
  { x:  25, z:  -6, tipo: 'diamante',  color: '#7BA4F5' },
  { x:  25, z:   6, tipo: 'triangulo', color: '#F8F899' },
  { x:  32, z: -12, tipo: 'circulo',   color: '#EA6500' },
  { x:  32, z:  12, tipo: 'hexagono',  color: '#0752E4' },
  { x:  32, z:   0, tipo: 'cuadrado',  color: '#F7B203' },
  { x:  38, z:   0, tipo: 'diamante',  color: '#EA8900' },
  { x:  20, z:  -6, tipo: 'triangulo', color: '#FFFFFF'  },
  { x:  20, z:   6, tipo: 'circulo',   color: '#EA6500'  },
  { x:  25, z:   0, tipo: 'hexagono',  color: '#F7B203'  },
  { x:  28, z:  -8, tipo: 'cuadrado',  color: '#7BA4F5'  },
  { x:  28, z:   8, tipo: 'diamante',  color: '#EA6500'  },
  { x:  22, z:   0, tipo: 'triangulo', color: '#F3D662'  },
  { x:  30, z:  -3, tipo: 'circulo',   color: '#EA8900'  },
  { x:  30, z:   3, tipo: 'hexagono',  color: '#0752E4'  },
  { x:  16, z:  -4, tipo: 'cuadrado',  color: '#F8F899'  },
  { x:  16, z:   4, tipo: 'diamante',  color: '#EA6500'  },
  { x:  34, z:  -4, tipo: 'triangulo', color: '#F7B203'  },
])

// ── Cards de jugadores ──
const {
  grupo: grupoJugadores,
  tarjetas: tarjetasJugadores,
  tickJugadores,
  seleccionar: seleccionarJugador,
  deseleccionar: deseleccionarJugador,
  escanearJugador,
  detenerScan,
  estaEscaneando,
} = createJugadorCards(scene, JUGADORES, {
  escala: 17, offsetY: 8.0,
})

// ── Fichas 3D de jugadores en la cancha ───────────────────────────────────
const {
  grupo: grupoFichas,
  fichas: fichasJugadores,
  animarEntrada: animarEntradaFichas,
  animarSalida: animarSalidaFichas,
  seleccionar: seleccionarFicha,
  deseleccionar: deseleccionarFicha,
  tickFichas,
  highlightFichas,
  unhighlightAll,
} = createFichasJugadores(scene, JUGADORES, {
  offsetY:     4.0,
  escalaFicha: 7.0,
})

// ── Click sobre jugador → seleccionarlo ───────────────────────────────────
const _raycaster = new THREE.Raycaster()
const _mouse = new THREE.Vector2()
renderer.domElement.addEventListener('click', (event) => {
  if (!grupoJugadores.visible) return

  const rect = renderer.domElement.getBoundingClientRect()
  _mouse.x =  ((event.clientX - rect.left) / rect.width)  * 2 - 1
  _mouse.y = -((event.clientY - rect.top)  / rect.height) * 2 + 1

  _raycaster.setFromCamera(_mouse, camera)

  const candidatos = []
  grupoJugadores.traverse(obj => {
    if (obj.userData && obj.userData.esJugadorCard && obj.visible) {
      candidatos.push(obj)
    }
  })

  const intersects = _raycaster.intersectObjects(candidatos, false)
  if (intersects.length > 0) {
    const numero = intersects[0].object.userData.jugadorNumero
    seleccionarJugador(numero)
  } else {
    deseleccionarJugador()
  }
})

// ── Botones de HOLOGRAMA (3 sabores) ──────────────────────────────────────
const hologramaIdxPorTipo = {
  clasico:  0,
  glitch:   0,
  materico: 0,
}

function crearBotonHolograma(label, tipo) {
  const btn = document.createElement('button')
  btn.className = 'btn'
  btn.textContent = label

  btn.onclick = () => {
    if (!grupoJugadores.visible) {
      console.warn('Activa primero las cards de jugadores (botón "Jugadores")')
      return
    }

    const idx = hologramaIdxPorTipo[tipo]
    const jug = JUGADORES[idx]
    escanearJugador(jug.numero, { tipo })
    hologramaIdxPorTipo[tipo] = (idx + 1) % JUGADORES.length
  }

  document.querySelector('#cc-controls')?.appendChild(btn)
  return btn
}

crearBotonHolograma('Holograma Clásico',  'clasico')
crearBotonHolograma('Holograma Glitch',   'glitch')
crearBotonHolograma('Holograma Matérico', 'materico')

// ── Card de equipo ──
const { grupo: grupoEquipo, tickEquipo } = createEquipoCard(scene, {
  nombre: 'Club Deportivo', escudo: '/teams/escudo-01.png',
})

// ── Helpers jugadores ──
const porNumero = (n) => JUGADORES.find(j => j.numero === n)
const jxz       = (n) => { const j = porNumero(n); return { x: j.x, z: j.z } }

// ── Flechas ──
const FLECHAS = [
  { de: jxz(5), a: jxz(9),          estilo: 'pase'       },
  { de: jxz(9), a: { x: 52, z: 0 }, estilo: 'disparo'    },
  { de: jxz(6), a: jxz(5),          estilo: 'movimiento' },
  { de: jxz(6), a: jxz(9),          estilo: 'apoyo'      },
]
const { grupo: grupoFlechas, tickFlechas, ocultarPuntas, mostrarPuntas } = createFlechas(
  scene, [], FLECHAS
)

// ── Flechas Flow ──
const FLECHAS_FLOW = [
  { de: jxz(5), a: jxz(9),          intensidad: 0.9 },
  { de: jxz(9), a: { x: 52, z: 0 }, intensidad: 1.0 },
  { de: jxz(6), a: jxz(5),          intensidad: 0.6 },
  { de: jxz(6), a: jxz(9),          intensidad: 0.7 },
]
const { grupo: grupoFlechasFlow, tickFlechasFlow, ocultarPuntasFlow, mostrarPuntasFlow } = createFlechasFlow(scene, FLECHAS_FLOW)

// ── Flechas Dash ──
const FLECHAS_DASH = [
  { de: jxz(5), a: jxz(9) },
  { de: jxz(6), a: jxz(5) },
  { de: jxz(6), a: jxz(9) },
]
const { grupo: grupoFlechasDash, tickFlechasDash, ocultarPuntasDash, mostrarPuntasDash,
        animarEntrada: animarEntradaDash, animarSalida: animarSalidaDash } = createFlechasDash(scene, FLECHAS_DASH)

// ── Flechas Disparo ──
const FLECHAS_DISPARO = [
  { de: jxz(9), a: { x: 51, z: -1 }, radioDestino: 0 },
]
const { grupo: grupoFlechasDisparo, tickFlechasDisparo,
        ocultarPuntasDisparo, mostrarPuntasDisparo,
        animarEntrada: animarEntradaDisparo, animarSalida: animarSalidaDisparo } = createFlechasDisparo(scene, FLECHAS_DISPARO)

// ── Flechas Parabólicas ──
const FLECHAS_PARABOLA = [
  { de: jxz(29), a: jxz(7) },
]
const {
  grupo:                grupoParabola,
  tickFlechasParabola,
  ocultarPuntasParabola,
  mostrarPuntasParabola,
  animarEntrada:        animarEntradaParabola,
  animarSalida:         animarSalidaParabola,
} = createFlechasParabola(scene, FLECHAS_PARABOLA, {
  offsetY:    4.0,
  alturaArco: 18,
  radioAro:   4.5,
  segmentos:  80,
})

// ── Stat Card ──
const { wrapper: statCardEl, tickStatCard } = createStatCard(scene, camera, {
  jugador: { ...porNumero(9), y: 8.0 },
  datos: { titulo: 'Ball recovery', confianza1: 0.81, confianza2: 0.81 },
})

// ── Chart Stat Card ──
const { wrapper: chartCardEl, tickChartStatCard } = createChartStatCard(scene, camera, {
  jugador: { ...porNumero(9), y: 8.0 },
  datos: {
    valor: 10.1, titulo: 'centros/partido', puntoActual: 87,
    serie: [
      { label: 'Jun', valor: 28 }, { label: 'Jul', valor: 55 },
      { label: 'Aug', valor: 48 }, { label: 'Sep', valor: 87 },
    ],
    stats: [
      { label: 'confianza', valor: 0.81 },
      { label: 'precisión', valor: 0.74 },
    ],
  },
})

// ── Scanner Effect ──
const scanner = new ScannerEffect(scene, {
  width:       68,
  height:      105,
  speed:       0.45,
  color:       0x00ccff,
  yOffset:     0.05,
  hexSize:     0.55,
  trailLength: 0.6,
  leadWidth:   5,
})

scanner._group.traverse(obj => {
  if (obj.isMesh || obj.isPoints) excluidos.add(obj.uuid)
})

// ── Controles ──
const { tickCamera, getPhi, getTheta, setView } = createControls({
  renderer, camera, fieldMaterial, allLines, setLinesColor, scanner,
})

// ── Ventana Chart CSS ──
const { wrapper: ventanaChartEl } = createVentanaChart({
  titulo: 'Centros por partido', subtitulo: 'Resumen mensual',
  badge: '+18% vs anterior', rotacionY: -12, posX: '50%', posY: '50%',
  series: [
    { label: 'Este año',     color: '#4ED3FF', puntos: [8,  16, 11, 19, 24, 22] },
    { label: 'Año anterior', color: '#7BA4F5', puntos: [14, 12, 18, 13, 16, 15] },
  ],
  etiquetas: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun'],
})

// ── Ventana Chart 3D ──
const { grupo: grupoVentana3D } = createVentanaChart3D(scene, {
  titulo: 'Centros por partido', subtitulo: 'Resumen mensual',
  badge: '+18% vs anterior', posicion: { x: -30, y: 18, z: -20 },
  rotacionY: 0.3, anchoMundo: 55, altoMundo: 32, allLines,
  series: [
    { label: 'Este año',     color: '#4ED3FF', puntos: [15, 21, 18, 19, 26, 32] },
    { label: 'Año anterior', color: '#7BA4F5', puntos: [13, 18, 16, 17, 21, 26] },
  ],
  etiquetas: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun'],
})

// ── Ventana Chart 3D V2 ──
// Propuesta alternativa del ventana-chart con Three.js (volumen real,
// SpotLight propio, BoxGeometry + CanvasTexture). Coexiste con el otro
// card 3D mediante un botón "Gráfica 3D" propio. La ponemos en x=0
// (centro de la cancha) para que no se solape con el original.
const { tick: tickVentana3DV2 } = createVentanaChart3DV2(scene, camera, {
  titulo: 'Centros por partido',
  subtitulo: 'Resumen mensual',
  badge: '+18% vs anterior',
  series: [
    { label: 'Este año',     color: '#4ED3FF', puntos: [8,  16, 11, 19, 24, 22] },
    { label: 'Año anterior', color: '#7BA4F5', puntos: [14, 12, 18, 13, 16, 15] },
  ],
  etiquetas: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun'],
  posicion:  { x: 0, y: 18, z: -20 },
  rotacionY: 0.3,
})

// ── Spider Chart 3D ──
// Panel flotante del radar con vidrio "premium": MeshPhysicalMaterial con
// clearcoat que recibe los highlights del SpotLight cenital y los 4 PointLights
// de las esquinas. El cristal tiene profundidad 3D real (BoxGeometry interna)
// para que los cantos sean visibles al rotar la cámara.
const { grupo: grupoSpider3D, tickSpiderChart } = createSpiderChart3D(scene, {
  posicion: { x: 30, y: 18, z: -20 }, rotacionY: 0,
  anchoMundo: 64, altoMundo: 44, allLines,
  profundidad: 2.5,                        // grosor 3D del bloque del cristal
  datos: {
    titulo: 'Radar General',
    ejes: [
      { label: 'Goles',                       num: 1 },
      { label: '1vs1 exitosos ofensivos',     num: 2 },
      { label: '1vs1 defensivos exitosos',    num: 3 },
      { label: 'Balones ganados en área',     num: 4 },
      { label: 'Centros por derecha',         num: 5 },
      { label: 'Balones recuperados totales', num: 6 },
    ],
    series: [
      { label: 'LOC', color: '#4ED3FF', valores: [0.75, 0.55, 0.80, 0.40, 0.90, 0.60] },
      { label: 'VIS', color: '#C8E64D', valores: [0.85, 0.70, 0.45, 0.75, 0.55, 0.80] },
    ],
  },
})

// ── Conexiones entre jugadores ──
const CONEXIONES_V2 = [
  { de:  5, a:  9, intensidad: 0.9, pases: 22 },
  { de:  5, a:  6, intensidad: 0.8, pases: 18 },
  { de:  5, a:  7, intensidad: 0.7, pases: 15 },
  { de:  6, a:  9, intensidad: 0.7, pases: 14 },
  { de:  6, a: 29, intensidad: 0.6, pases: 12 },
  { de:  6, a:  4, intensidad: 0.6, pases: 11 },
  { de:  9, a:  7, intensidad: 0.8, pases: 17 },
  { de:  9, a: 10, intensidad: 0.9, pases: 21 },
  { de:  7, a: 10, intensidad: 0.7, pases: 13 },
  { de: 29, a:  4, intensidad: 0.5, pases:  8 },
  { de: 29, a:  6, intensidad: 0.6, pases: 10 },
]
const {
  grupo: grupoConexionesV2,
  animarEntrada: animarEntradaConexiones,
  animarSalida: animarSalidaConexiones,
  tickConexiones: tickConexionesV2,
} = createConexionesJugadores(scene, JUGADORES, CONEXIONES_V2, {
  offsetY:      4.0,
  getPhi,
  getTheta,
  alturaBase:   -3,
  alturaCentro: 0,
  umbralPhi:    1.1,
  canvas:       renderer.domElement,
  camera,
  labelYOffset: 8,
  labelEscala:  0.8,
  fichasAPI: {
    highlightFichas: (numerosArray) => highlightFichas(numerosArray),
    unhighlightAll:  ()              => unhighlightAll(),
  },
})

// ── Sistema de capítulos ──
createHistoria({
  grupoJugadores, grupoEquipo, grupoZona, grupoZonasPases,
  grupoEventos, grupoFlechas, grupoFlechasFlow, grupoFlechasDash,
  grupoParabola, grupoConexionesV2, grupoVentana3D, grupoSpider3D,
  statCardEl, chartCardEl, ventanaChartEl,
  animarEntradaParabola, animarSalidaParabola,
  scanner,
})

// ── HUD Text Info ──
const textInfo = createHudTextInfo({
  label: 'Analizando',
  value: '247 acciones',
  color: '#00f0ff',
  position: 'bottom',
  offsetY: 180,
  glitchIntensity: 1.0,
  flickerAmount: 0.5,
  glowStrength: 1.0,
})

const ESCENARIOS_TEXTO = [
  { label: 'Analizando',  value: '247 acciones' },
  { label: 'Analizando',  value: '99 acciones' },
  { label: 'Analizando',  value: '1247 acciones' },
  { label: 'Procesando',  value: 'Datos del partido completo' },
  { label: 'Detectado',   value: '3 jugadores en zona crítica' },
  { label: 'Conexiones',  value: '38 pases entre líneas' },
  { label: 'Sistema',     value: 'Esperando entrada del usuario' },
  { label: 'Radar',       value: '5%' },
  { label: 'Posesión',    value: '64% del tiempo' },
  { label: 'Defensa',     value: '12 recuperaciones' },
  { label: 'Ataque',      value: '7 tiros a portería' },
  { label: 'Ritmo',       value: 'Alta intensidad' },
]
let textInfoYaMostrado = false
let ultimoEscenarioIdx = -1

const btnTextInfo = document.createElement('button')
btnTextInfo.className = 'btn'
btnTextInfo.textContent = 'Text Info'
btnTextInfo.onclick = () => {
  if (!textInfoYaMostrado) {
    textInfo.show()
    textInfoYaMostrado = true
  } else {
    let idx
    do {
      idx = Math.floor(Math.random() * ESCENARIOS_TEXTO.length)
    } while (idx === ultimoEscenarioIdx && ESCENARIOS_TEXTO.length > 1)
    ultimoEscenarioIdx = idx

    const e = ESCENARIOS_TEXTO[idx]
    textInfo.replay({ label: e.label, value: e.value })
  }
}
document.querySelector('#cc-controls')?.appendChild(btnTextInfo)

// ── HUD Insight Card ──
const insightCard = createHudInsightCard({
  scene,
  camera,
  anchor3D: { x: 30, y: 0, z: -15 },
  valor: 73,
  sufijo: '%',
  etiqueta: 'centros por derecha',
  color: '#00f0ff',
  width: 227.65,
  height: 196.11,
  offsetY: 320,
  countUp: true,
  countDuration: 1.2,
})

const btnInsight = document.createElement('button')
btnInsight.className = 'btn'
btnInsight.textContent = 'Insight Card'
let insightVisible = false
btnInsight.onclick = () => {
  insightVisible = !insightVisible
  if (insightVisible) insightCard.show()
  else insightCard.hide()
}
document.querySelector('#cc-controls')?.appendChild(btnInsight)

// ── HUD Insight Horizontal ──
const insightHorizontal = createHudInsightHorizontal({
  scene,
  camera,
  anchor3D: { x: -20, y: 0, z: 0 },
  valor: 3,
  unidad: 'Segundos',
  maxValor: 10,
  titulo: 'Tras recuperación',
  secuencia: ['recuperación', 'centro'],
  color: '#00f0ff',
  offsetX: 180,
  offsetY: 0,
  countUp: true,
  countDuration: 1.2,
})

const btnInsightH = document.createElement('button')
btnInsightH.className = 'btn'
btnInsightH.textContent = 'Insight Horizontal'
let insightHVisible = false
btnInsightH.onclick = () => {
  insightHVisible = !insightHVisible
  if (insightHVisible) insightHorizontal.show()
  else insightHorizontal.hide()
}
document.querySelector('#cc-controls')?.appendChild(btnInsightH)

// ── HUD Insight Chart ──
const insightChart = createHudInsightChart({
  scene,
  camera,
  anchor3D: { x: -12, y: 0, z: 6 },
  valor: 121,
  etiqueta: 'finalizaciones',
  serie: [
    { label: 'J1', valor: 12 },
    { label: 'J2', valor: 28 },
    { label: 'J3', valor: 35 },
    { label: 'J4', valor: 121 },
  ],
  destacado: { indice: 2.65, label: '+80%' },
  color: '#00f0ff',
  offsetX: 90,
  offsetY: 0,
  anchorRadius3D: 0,
  anchorOffsetX: 0,
  anchorOffsetY: -15,
  countDuration: 1.2,
  chartDuration: 1.6,
})

const btnInsightChart = document.createElement('button')
btnInsightChart.className = 'btn'
btnInsightChart.textContent = 'Insight Chart'
let insightChartVisible = false
btnInsightChart.onclick = () => {
  insightChartVisible = !insightChartVisible
  if (insightChartVisible) insightChart.show()
  else insightChart.hide()
}
document.querySelector('#cc-controls')?.appendChild(btnInsightChart)

// ── HUD Insight Range ──
const insightRange = createHudInsightRange({
  scene,
  camera,
  anchor3D: { x: -12, y: 8.0, z: 6 },
  anchorOffsetPxX: 70,
  anchorOffsetPxY: 0,
  rangoMin: 45,
  rangoMax: 60,
  unidad: 'Minutos',
  titulo: 'Segunda parte',
  badge: 'pico de actividad',
  color: '#00f0ff',
  offsetX: 90,
  offsetY: 0,
  countDuration: 0.7,
})

const btnInsightRange = document.createElement('button')
btnInsightRange.className = 'btn'
btnInsightRange.textContent = 'Insight Range'
let insightRangeVisible = false
btnInsightRange.onclick = () => {
  insightRangeVisible = !insightRangeVisible
  if (insightRangeVisible) insightRange.show()
  else insightRange.hide()
}
document.querySelector('#cc-controls')?.appendChild(btnInsightRange)

// ── Botón Fichas ──
const btnFichas = document.createElement('button')
btnFichas.className = 'btn'
btnFichas.textContent = 'Fichas'
let fichasVisibles = false
btnFichas.onclick = () => {
  fichasVisibles = !fichasVisibles
  if (fichasVisibles) {
    animarEntradaFichas()
    btnFichas.classList.add('active')
  } else {
    animarSalidaFichas()
    btnFichas.classList.remove('active')
  }
}
document.querySelector('#cc-controls')?.appendChild(btnFichas)

// ── Botón Conexiones ──
const btnConexiones = document.createElement('button')
btnConexiones.className = 'btn'
btnConexiones.textContent = 'Conexiones'
let conexionesVisibles = false
btnConexiones.onclick = () => {
  conexionesVisibles = !conexionesVisibles
  if (conexionesVisibles) {
    animarEntradaConexiones()
    btnConexiones.classList.add('active')
  } else {
    animarSalidaConexiones()
    btnConexiones.classList.remove('active')
  }
}
document.querySelector('#cc-controls')?.appendChild(btnConexiones)

// ── Botón Radar (Spider Chart) ────────────────────────────────────────────
// Toggle del panel flotante del radar. El panel usa MeshPhysicalMaterial
// con clearcoat que recibe los highlights de las luces de la escena.
const btnRadar = document.createElement('button')
btnRadar.className = 'btn'
btnRadar.textContent = 'Radar'
btnRadar.onclick = () => {
  grupoSpider3D.visible = !grupoSpider3D.visible
  btnRadar.classList.toggle('active', grupoSpider3D.visible)
}
document.querySelector('#cc-controls')?.appendChild(btnRadar)


// ── BOTÓN DEMO SECUENCIA ──
const JUGADOR_DEMO = JUGADORES.find(j => j.numero === 6)

let demoActiva     = false
let demoEnProgreso = false

function wait(seconds) {
  return new Promise(resolve => gsap.delayedCall(seconds, resolve))
}

function fadeInMesh(mesh, duration = 0.6, targetOpacity = 1) {
  if (!mesh) return
  mesh.visible = true
  if (mesh.material) {
    mesh.material.transparent = true
    mesh.material.opacity = 0
    gsap.to(mesh.material, { opacity: targetOpacity, duration, ease: 'power2.out' })
  }
}

function fadeOutMesh(mesh, duration = 0.6) {
  if (!mesh) return
  if (mesh.material) {
    gsap.to(mesh.material, {
      opacity: 0, duration, ease: 'power2.in',
      onComplete: () => { mesh.visible = false },
    })
  } else {
    mesh.visible = false
  }
}

function fadeInGroup(grupo, duration = 0.6, targetOpacity = 1) {
  if (!grupo) return
  grupo.visible = true
  grupo.traverse(obj => {
    if (obj.material) {
      obj.material.transparent = true
      obj.material.opacity = 0
      gsap.to(obj.material, { opacity: targetOpacity, duration, ease: 'power2.out' })
    }
  })
}

function fadeOutGroup(grupo, duration = 0.6) {
  if (!grupo) return
  const materials = []
  grupo.traverse(obj => {
    if (obj.material) materials.push(obj.material)
  })
  if (materials.length === 0) {
    grupo.visible = false
    return
  }
  let completed = 0
  materials.forEach(mat => {
    gsap.to(mat, {
      opacity: 0, duration, ease: 'power2.in',
      onComplete: () => {
        completed++
        if (completed === materials.length) grupo.visible = false
      },
    })
  })
}

function showZona() {
  return new Promise(resolve => {
    if (animarEntradaZona) animarEntradaZona(resolve)
    else { grupoZona.visible = true; resolve() }
  })
}
function hideZona() {
  return new Promise(resolve => {
    if (animarSalidaZona) animarSalidaZona(resolve)
    else { grupoZona.visible = false; resolve() }
  })
}

function showHeatmap() {
  return new Promise(resolve => {
    if (animarEntradaHeatmap) animarEntradaHeatmap(resolve)
    else { heatmapGrid.visible = true; heatmapSolid.visible = true; resolve() }
  })
}
function hideHeatmap() {
  return new Promise(resolve => {
    if (animarSalidaHeatmap) animarSalidaHeatmap(resolve)
    else { heatmapGrid.visible = false; heatmapSolid.visible = false; resolve() }
  })
}

function mostrarSoloJugadorEnTarjetas(numero) {
  tarjetasJugadores.forEach(t => {
    const esElegido = (numero == null) || (t.jugador.numero === numero)
    t.sprite.visible        = esElegido
    t.spriteNom.visible     = esElegido
    t.spriteFoto.visible    = esElegido
  })
}

function entradaJugadorSolo(t) {
  t.sprite.position.y     = -8
  t.spriteFoto.position.y = -8
  t.spriteNom.position.y  = -8
  t.sprite.material.opacity     = 1
  t.spriteFoto.material.opacity = 1
  t.spriteNom.material.opacity  = 0

  gsap.to(t.sprite.position,     { y: 8.0, duration: 0.7, ease: 'power3.out' })
  gsap.to(t.spriteFoto.position, { y: 8.0, duration: 0.7, ease: 'power3.out' })
  gsap.to(t.spriteNom.position,  { y: 8.0, duration: 0.7, ease: 'power3.out' })
  gsap.delayedCall(0.3, () => {
    gsap.to(t.spriteNom.material, { opacity: 1, duration: 0.5, ease: 'power2.out' })
  })
}

function salidaJugadorSolo(t) {
  gsap.to(t.sprite.position,     { y: -8, duration: 0.45, ease: 'power2.in' })
  gsap.to(t.spriteFoto.position, { y: -8, duration: 0.45, ease: 'power2.in' })
  gsap.to(t.spriteNom.position,  { y: -8, duration: 0.45, ease: 'power2.in' })
  gsap.to(t.spriteNom.material,  { opacity: 0, duration: 0.25, ease: 'power2.in' })
}

let textInfoYaIniciado = false

const btnDemo = document.createElement('button')
btnDemo.className = 'btn'
btnDemo.textContent = 'Demo Secuencia'
btnDemo.onclick = async () => {
  if (demoEnProgreso) {
    console.warn('Demo en progreso, espera a que termine la animación.')
    return
  }
  demoEnProgreso = true

  if (!demoActiva) {
    btnDemo.textContent = 'Demo Secuencia ● activa'

    await setView('horizontal top')

    if (!textInfoYaIniciado) {
      textInfo.show()
      textInfoYaIniciado = true
    } else {
      textInfo.replay({ label: 'Analizando', value: '247 acciones' })
    }
    await scanner.scanNTimes(2)

    const p3a = setView('diagonal')
    showZona()
    textInfo.replay({
      label: 'Ataque',
      value: 'América concentra su ataque por la banda izquierda',
    })
    await p3a
    await wait(5.0)

    await hideZona()
    showHeatmap()
    textInfo.replay({
      label: 'Centros',
      value: '73% del total son en esta zona',
    })
    await wait(3.0)

    await setView('horizontal perspectiva')
    if (!insightVisible) {
      insightCard.show()
      insightVisible = true
    }
    await wait(5.0)

    insightCard.hide()
    insightVisible = false
    await wait(1.0)

    if (heatmapGrid.visible) {
      hideHeatmap()
    }
    if (textInfo.el) {
      gsap.to(textInfo.el, { opacity: 0, duration: 0.5, ease: 'power2.in' })
    }
    await wait(2.0)

    const p6vista = setView('vertical perspectiva')

    if (!grupoJugadores.visible) {
      mostrarSoloJugadorEnTarjetas(JUGADOR_DEMO.numero)
      grupoJugadores.visible = true
    } else {
      mostrarSoloJugadorEnTarjetas(JUGADOR_DEMO.numero)
    }
    const t = tarjetasJugadores.find(x => x.jugador.numero === JUGADOR_DEMO.numero)
    if (t) entradaJugadorSolo(t)

    await p6vista
    await wait(0.3)

    seleccionarJugador(JUGADOR_DEMO.numero)
    await wait(0.6)

    escanearJugador(JUGADOR_DEMO.numero, { tipo: 'glitch' })
    await wait(2.8)

    if (!insightRangeVisible) {
      insightRange.show()
      insightRangeVisible = true
    }
    if (textInfo.el) {
      textInfo.el.style.opacity = ''
    }
    textInfo.replay({
      label: 'Líder de recuperación',
      value: 'J. Dos Santos es el jugador con más balones recuperados',
    })
    await wait(3.0)

    demoActiva = true
    demoEnProgreso = false
  } else {
    btnDemo.textContent = 'Demo Secuencia'

    if (insightRangeVisible) {
      insightRange.hide()
      insightRangeVisible = false
    }
    await wait(0.4)

    deseleccionarJugador()
    await wait(0.3)

    if (estaEscaneando(JUGADOR_DEMO.numero)) {
      detenerScan(JUGADOR_DEMO.numero)
      await wait(0.5)
    }

    const t = tarjetasJugadores.find(x => x.jugador.numero === JUGADOR_DEMO.numero)
    if (t) salidaJugadorSolo(t)
    await wait(0.5)

    mostrarSoloJugadorEnTarjetas(null)
    grupoJugadores.visible = false
    if (t) {
      t.sprite.material.opacity     = 1
      t.spriteFoto.material.opacity = 1
      t.spriteNom.material.opacity  = 0
    }

    if (insightVisible) {
      insightCard.hide()
      insightVisible = false
      await wait(0.3)
    }
    if (heatmapGrid.visible) {
      hideHeatmap()
    }
    if (grupoZona.visible) {
      hideZona()
    }
    await wait(0.7)

    if (textInfoYaIniciado) {
      if (textInfo.el) {
        gsap.to(textInfo.el, { opacity: 0, duration: 0.4, ease: 'power2.in' })
      }
    }

    await setView('horizontal perspectiva')

    if (textInfo.el) {
      textInfo.el.style.opacity = ''
    }

    demoActiva = false
    demoEnProgreso = false
  }
}
document.querySelector('#cc-controls')?.appendChild(btnDemo)





// ── Selective Bloom ──
const bloomLayer   = new THREE.Layers()
bloomLayer.set(BLOOM_LAYER)
const darkMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 })
const materialsMap = {}

function darkenNonBloomed(obj) {
  if (excluidos.has(obj.uuid)) return
  if ((obj.isMesh || obj.isSprite) && !obj.layers.isEnabled(BLOOM_LAYER) && !obj.layers.isEnabled(CANCHA_BLOOM_LAYER)) {
    materialsMap[obj.uuid] = obj.material
    obj.material = darkMaterial
  }
}
function restoreMaterials(obj) {
  if (materialsMap[obj.uuid]) {
    obj.material = materialsMap[obj.uuid]
    delete materialsMap[obj.uuid]
  }
}

const bloomComposer = new EffectComposer(renderer)
bloomComposer.renderToScreen = false
bloomComposer.addPass(new RenderPass(scene, camera))
const bloomPass = new UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight), 0.9, 0.4, 0.0
)
bloomComposer.addPass(bloomPass)

const mixPass = new ShaderPass(
  new THREE.ShaderMaterial({
    uniforms: {
      baseTexture:  { value: null },
      bloomTexture: { value: bloomComposer.renderTarget2.texture },
      bloomTint:    { value: new THREE.Color(1.0, 1.0, 1.0) },
    },
    vertexShader: `
      varying vec2 vUv;
      void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
    `,
    fragmentShader: `
      uniform sampler2D baseTexture;
      uniform sampler2D bloomTexture;
      uniform vec3 bloomTint;
      varying vec2 vUv;
      void main() {
        vec4 bloom = texture2D(bloomTexture, vUv);
        bloom.rgb *= bloomTint;
        gl_FragColor = texture2D(baseTexture, vUv) + bloom;
      }
    `,
  }),
  'baseTexture'
)
mixPass.needsSwap = true

const finalComposer = new EffectComposer(renderer)
finalComposer.addPass(new RenderPass(scene, camera))
finalComposer.addPass(mixPass)

const fxaaPass = new ShaderPass(FXAAShader)
fxaaPass.uniforms['resolution'].value.set(
  1 / (window.innerWidth  * window.devicePixelRatio),
  1 / (window.innerHeight * window.devicePixelRatio)
)
finalComposer.addPass(fxaaPass)

window.addEventListener('resize', () => {
  bloomComposer.setSize(window.innerWidth, window.innerHeight)
  finalComposer.setSize(window.innerWidth, window.innerHeight)
  fxaaPass.uniforms['resolution'].value.set(
    1 / (window.innerWidth  * window.devicePixelRatio),
    1 / (window.innerHeight * window.devicePixelRatio)
  )
})

// ── Loop ──
const clock = new THREE.Clock()

function animate() {
  requestAnimationFrame(animate)

  const dt = clock.getDelta()
  const t  = clock.getElapsedTime()
  const pulse = 0.85 + Math.sin(t * 1.5) * 0.15
  allLines.forEach(m => { m.material.emissiveIntensity = pulse })

  tickCamera()
  tickJugadores(camera)
  tickFichas(camera)
  tickConexionesV2(camera)
  tickEquipo(camera)
  tickFlechas(dt, camera)
  tickFlechasFlow(dt)
  tickFlechasDash(dt)
  tickFlechasDisparo(dt)
  tickFlechasParabola(dt)
  tickStatCard()
  tickChartStatCard()
  tickZonasPases(camera)
  tickEventos(camera)
  tickSpiderChart(camera)
  tickVentana3DV2()
  scanner.update(dt)
  insightCard.tick()
  insightHorizontal.tick()
  insightChart.tick()
  insightRange.tick()

  scene.traverse(child => {
    if (child.userData.esFicha === true) child.lookAt(camera.position)
  })

  const bg = scene.background
  scene.background = null

  const jugadoresEranVisibles   = grupoJugadores.visible
  const equipoEraVisible        = grupoEquipo.visible
  const conexionesV2EranVisible = grupoConexionesV2.visible
  const zonaEraVisible          = grupoZona.visible
  const zonasPasesEranVisibles  = grupoZonasPases.visible
  const eventosEranVisibles     = grupoEventos.visible
  const ventana3DEraVisible     = grupoVentana3D.visible
  const spider3DEraVisible      = grupoSpider3D.visible

  grupoJugadores.visible    = false
  grupoConexionesV2.visible = false
  grupoZona.visible         = false
  grupoZonasPases.visible   = false
  grupoEventos.visible      = false
  grupoVentana3D.visible    = false
  grupoSpider3D.visible     = false

  const spriteEquipo     = grupoEquipo.children.find(c => c.isSprite)
  const spriteEraVisible = spriteEquipo ? spriteEquipo.visible : false
  if (spriteEquipo) spriteEquipo.visible = false
  ocultarPuntas()
  ocultarPuntasFlow()
  ocultarPuntasDash()
  ocultarPuntasDisparo()
  ocultarPuntasParabola()

  const scannerEraVisible = scanner._group.visible
  scanner._group.visible  = false

  scene.traverse(darkenNonBloomed)
  bloomComposer.render()
  scene.traverse(restoreMaterials)
  scene.background = bg

  scanner._group.visible = scannerEraVisible

  grupoJugadores.visible    = jugadoresEranVisibles
  grupoEquipo.visible       = equipoEraVisible
  grupoConexionesV2.visible = conexionesV2EranVisible
  grupoZona.visible         = zonaEraVisible
  grupoZonasPases.visible   = zonasPasesEranVisibles
  grupoEventos.visible      = eventosEranVisibles
  grupoVentana3D.visible    = ventana3DEraVisible
  grupoSpider3D.visible     = spider3DEraVisible
  if (spriteEquipo) spriteEquipo.visible = spriteEraVisible
  mostrarPuntas()
  mostrarPuntasFlow()
  mostrarPuntasDash()
  mostrarPuntasDisparo()
  mostrarPuntasParabola()

  finalComposer.render()
}

animate()