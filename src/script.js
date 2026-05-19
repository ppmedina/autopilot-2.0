import * as THREE from 'three'
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
import { createConexionesV2 }    from './cancha/conexiones-v2.js'
import { createHeatmapZona }     from './cancha/heatmap-zona.js'
import { createHeatmapZonasPases } from './cancha/heatmap-zonas-pases.js'
import { createEventosCancha }   from './cancha/eventos-cancha.js'
import { createVentanaChart }    from './cancha/ventana-chart.js'
import { createJugadorCards }    from './cancha/jugador-card.js'
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
import { createSpiderChart3D }   from './cancha/spider-chart-3d.js'
import { createHistoria }        from './cancha/historia.js'
import { createHudTextInfo }     from './cancha/hud-text-info.js'
import { createHudInsightCard }  from './cancha/hud-insight-card.js'
import { ScannerEffect }         from './cancha/scanner-effect.js'

// ── Inicializar escena base ──
const { scene, camera, renderer } = createScene()

createLights(scene)

const { fieldMaterial, bgTexture } = createField(scene)
const { allLines, setLinesColor }  = createLines(scene)
createGoals(scene)
createGrid(scene, 0.35, 0)

// ── Heatmap 3D ──
const { meshGrid: heatmapGrid, meshSolid: heatmapSolid } = createHeatmap(scene)

// ── Set de UUIDs excluidos de darkenNonBloomed ───────────────────────────────
const excluidos = new Set()

// ── Heatmap Zona ──
const { grupo: grupoZona } = createHeatmapZona(scene, [{
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
const { grupo: grupoJugadores, tickJugadores } = createJugadorCards(scene, JUGADORES, {
  escala: 17, offsetY: 8.0,
})

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

// ── Flechas Dash — solo pases, sin disparo ──
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
  { de: jxz(29), a: jxz(7) },  // ← sin estilo
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

// ── Scanner Effect ──────────────────────────────────────────────────────────
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
const { tickCamera, getPhi } = createControls({
  renderer, camera, fieldMaterial, allLines, setLinesColor, scanner,
})

// ── Ventana Chart CSS ──
const { wrapper: ventanaChartEl } = createVentanaChart({
  titulo: 'Centros por partido', subtitulo: 'Resumen mensual',
  badge: '+18% vs anterior', rotacionY: -12, posX: '50%', posY: '50%',
  series: [
    { label: 'Este año',     color: '#4ED3FF', puntos: [15, 21, 18, 19, 26, 32] },
    { label: 'Año anterior', color: '#7BA4F5', puntos: [13, 18, 16, 17, 21, 26] },
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

// ── Spider Chart 3D ──
const { grupo: grupoSpider3D, tickSpiderChart } = createSpiderChart3D(scene, {
  posicion: { x: 30, y: 18, z: -20 }, rotacionY: -0.3,
  anchoMundo: 50, altoMundo: 38, allLines,
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

// ── Conexiones V2 ──
const CONEXIONES_V2 = [
  { de:  5, a:  9, intensidad: 0.9 }, { de:  5, a:  6, intensidad: 0.8 },
  { de:  5, a:  7, intensidad: 0.7 }, { de:  6, a:  9, intensidad: 0.7 },
  { de:  6, a: 29, intensidad: 0.6 }, { de:  6, a:  4, intensidad: 0.6 },
  { de:  9, a:  7, intensidad: 0.8 }, { de:  9, a: 10, intensidad: 0.9 },
  { de:  7, a: 10, intensidad: 0.7 }, { de: 29, a:  4, intensidad: 0.5 },
  { de: 29, a:  6, intensidad: 0.6 },
]
const { grupo: grupoConexionesV2, tickConexionesV2 } = createConexionesV2(
  scene, JUGADORES, CONEXIONES_V2,
  { getPhi, alturaBase: -3, alturaCentro: 0, umbralTop: 1.1, escalaFicha: 7.0 }
)

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
  offsetY: 60,
  glitchIntensity: 1.0,
  flickerAmount: 0.5,
  glowStrength: 1.0,
})

// Lista de textos que se irán mostrando en cada click
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
    // Primer click: animación de entrada con los valores iniciales
    textInfo.show()
    textInfoYaMostrado = true
  } else {
    // Clicks siguientes: escoger escenario random distinto al anterior
    // y reproducir la secuencia ordenada (label → > → value)
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
  anchor3D: { x: 30, y: 0, z: -15 },   // ajusta a un punto real de tu cancha
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

// ── Selective Bloom ──
const bloomLayer   = new THREE.Layers()
bloomLayer.set(BLOOM_LAYER)
const darkMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 })
const materialsMap = {}

function darkenNonBloomed(obj) {
  if (excluidos.has(obj.uuid)) return
  if (obj.isMesh && !obj.layers.isEnabled(BLOOM_LAYER) && !obj.layers.isEnabled(CANCHA_BLOOM_LAYER)) {
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
  scanner.update(dt)
  insightCard.tick()

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