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
import { createHeatmap }    from './cancha/heatmap.js'
import { createConexionesV2 } from './cancha/conexiones-v2.js'
import { createHeatmapFlat } from './cancha/heatmap-flat.js'
import { createHeatmapZona } from './cancha/heatmap-zona.js'
import { createJugadorCards } from './cancha/jugador-card.js'
import { createEquipoCard }   from './cancha/equipo-card.js'
import { createFlechas }      from './cancha/flechas.js'
import { createFlechasFlow }  from './cancha/flechas-flow.js'
import { createFlechasDash }  from './cancha/flechas-dash.js'
import { JUGADORES }          from './cancha/jugadores.js'

// ── Inicializar escena base ──
const { scene, camera, renderer } = createScene()

// ── Agregar elementos ──
createLights(scene)

const { fieldMaterial, bgTexture } = createField(scene)
const { allLines, setLinesColor }  = createLines(scene)
createGoals(scene)
createGrid(scene, 0.35, 0)
createHeatmap(scene)
createHeatmapFlat(scene)
createHeatmapZona(scene, [{
  x: 13, z: -25,
  ancho: 40,
  alto: 18,
  color: 0x1E8CFF,
  alpha: 0.25,
}])

// ── Cards de jugadores ──
const { grupo: grupoJugadores } = createJugadorCards(scene, JUGADORES, {
  escala:  17,
  offsetY: 8.0,
})

// ── Card de equipo ──
const { grupo: grupoEquipo, tickEquipo } = createEquipoCard(scene, {
  nombre: 'Club Deportivo',
  escudo: '/teams/escudo-01.png',
})

// ── Helpers para referenciar jugadores por número ──
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
  { de: jxz(5), a: jxz(9),              estilo: 'dash'    },
  { de: jxz(6), a: jxz(5),              estilo: 'dash'    },
  { de: jxz(6), a: jxz(9),              estilo: 'dash'    },
  { de: jxz(9), a: { x: 51, z: -1 },   estilo: 'disparo', radioDestino: 0 },
]
const { grupo: grupoFlechasDash, tickFlechasDash, ocultarPuntasDash, mostrarPuntasDash } = createFlechasDash(scene, FLECHAS_DASH)

// ── Controles ──
const { tickCamera, getPhi } = createControls({
  renderer,
  camera,
  fieldMaterial,
  allLines,
  setLinesColor,
})

// ── Conexiones V2 (sprites canvas) ──
const CONEXIONES_V2 = [
  { de:  5, a:  9, intensidad: 0.9 },
  { de:  5, a:  6, intensidad: 0.8 },
  { de:  5, a:  7, intensidad: 0.7 },
  { de:  6, a:  9, intensidad: 0.7 },
  { de:  6, a: 29, intensidad: 0.6 },
  { de:  6, a:  4, intensidad: 0.6 },
  { de:  9, a:  7, intensidad: 0.8 },
  { de:  9, a: 10, intensidad: 0.9 },
  { de:  7, a: 10, intensidad: 0.7 },
  { de: 29, a:  4, intensidad: 0.5 },
  { de: 29, a:  6, intensidad: 0.6 },
]
const { grupo: grupoConexionesV2, tickConexionesV2 } = createConexionesV2(
  scene,
  JUGADORES,
  CONEXIONES_V2,
  {
    getPhi,
    alturaBase:   -3,
    alturaCentro: 0,
    umbralTop:    1.1,
    escalaFicha:  7.0,
  }
)

// ── Selective Bloom ──
const bloomLayer = new THREE.Layers()
bloomLayer.set(BLOOM_LAYER)

const darkMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 })
const materialsMap  = {}

function darkenNonBloomed(obj) {
  if (obj.isMesh && !bloomLayer.test(obj.layers)) {
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

// Composer 1 — bloom
const bloomComposer = new EffectComposer(renderer)
bloomComposer.renderToScreen = false
bloomComposer.addPass(new RenderPass(scene, camera))
const bloomPass = new UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight),
  1.5, 0.5, 0.0
)
bloomComposer.addPass(bloomPass)

// Composer 2 — mezcla
const mixPass = new ShaderPass(
  new THREE.ShaderMaterial({
    uniforms: {
      baseTexture:  { value: null },
      bloomTexture: { value: bloomComposer.renderTarget2.texture },
      bloomTint:    { value: new THREE.Color(1.0, 1.0, 1.0) },
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
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

// ── Resize ──
window.addEventListener('resize', () => {
  bloomComposer.setSize(window.innerWidth, window.innerHeight)
  finalComposer.setSize(window.innerWidth, window.innerHeight)
})

// ── Loop de animación ──
const clock = new THREE.Clock()

function animate() {
  requestAnimationFrame(animate)

  const t  = clock.getElapsedTime()
  const dt = clock.getDelta()
  const pulse = 0.85 + Math.sin(t * 1.5) * 0.15
  allLines.forEach(m => { m.material.emissiveIntensity = pulse })

  tickCamera()
  tickConexionesV2(camera)
  tickEquipo(camera)
  tickFlechas(dt, camera)
  tickFlechasFlow(dt)
  tickFlechasDash(dt)

  // ── Fichas GLB miran hacia la cámara ──
  scene.traverse(child => {
    if (child.userData.esFicha === true) {
      child.lookAt(camera.position)
    }
  })

  // 1. Bloom
  const bg = scene.background
  scene.background = null

  const jugadoresEranVisibles   = grupoJugadores.visible
  const equipoEraVisible        = grupoEquipo.visible
  const conexionesV2EranVisible = grupoConexionesV2.visible
  grupoJugadores.visible    = false
  grupoConexionesV2.visible = false
  const spriteEquipo     = grupoEquipo.children.find(c => c.isSprite)
  const spriteEraVisible = spriteEquipo ? spriteEquipo.visible : false
  if (spriteEquipo) spriteEquipo.visible = false
  ocultarPuntas()
  ocultarPuntasFlow()
  ocultarPuntasDash()

  scene.traverse(darkenNonBloomed)
  bloomComposer.render()
  scene.traverse(restoreMaterials)
  scene.background = bg

  grupoJugadores.visible    = jugadoresEranVisibles
  grupoEquipo.visible       = equipoEraVisible
  grupoConexionesV2.visible = conexionesV2EranVisible
  if (spriteEquipo) spriteEquipo.visible = spriteEraVisible
  mostrarPuntas()
  mostrarPuntasFlow()
  mostrarPuntasDash()

  // 2. Render final
  finalComposer.render()
}

animate()
