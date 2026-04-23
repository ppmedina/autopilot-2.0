import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'

// ── Genera una textura canvas con el número del jugador ──
function crearTexturaNumero(numero, colorFondo = '#1a3a6b', colorTexto = '#ffffff') {
  const canvas         = document.createElement('canvas')
  canvas.width         = 256
  canvas.height        = 256
  const ctx            = canvas.getContext('2d')

  // Fondo circular
  ctx.fillStyle = colorFondo
  ctx.beginPath()
  ctx.arc(128, 128, 128, 0, Math.PI * 2)
  ctx.fill()

  // Borde
  ctx.strokeStyle = colorTexto
  ctx.lineWidth   = 8
  ctx.stroke()

  // Número
  ctx.fillStyle    = colorTexto
  ctx.font         = 'bold 120px Arial'
  ctx.textAlign    = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(String(numero), 128, 128)

  return new THREE.CanvasTexture(canvas)
}

// ── Actualiza el número de una ficha ya creada ──
export function actualizarFicha(ficha, nuevoNumero) {
  ficha.traverse((child) => {
    if (!child.isMesh) return
    if (child.userData.esNumero) {
      if (child.material.map) child.material.map.dispose()
      child.material.map = crearTexturaNumero(nuevoNumero)
      child.material.needsUpdate = true
    }
  })
  ficha.userData.numero = nuevoNumero
}

// ── Crea y posiciona todas las fichas en la escena ──
export function createFichas(scene, jugadores = []) {

  const loader  = new GLTFLoader()
  const fichas  = []   // referencia a cada ficha creada

  loader.load(
    '/fichas/ficha.gltf',

    (gltf) => {
      const fichaBase = gltf.scene

      jugadores.forEach((jugador) => {
        // Clonar el modelo base para cada jugador
        const clon = fichaBase.clone(true)

        clon.traverse((child) => {
          if (!child.isMesh) return

          // Material del cuerpo de la ficha
          child.material = new THREE.MeshPhysicalMaterial({
            color:           jugador.color ?? 0x1a3a6b,
            roughness:       0.2,
            metalness:       0.85,
            envMapIntensity: 2.0,
          })

          // Panel superior donde va el número
          // Agrega un plano encima de la ficha con la textura del número
          const planeGeo = new THREE.CircleGeometry(0.4, 32)
          const planeMat = new THREE.MeshStandardMaterial({
            map:         crearTexturaNumero(
                           jugador.numero,
                           jugador.colorFondo ?? '#1a3a6b',
                           jugador.colorTexto ?? '#ffffff'
                         ),
            roughness:   0.3,
            metalness:   0.0,
            transparent: false,
          })
          planeMat.userData = { esNumero: true }

          const plano = new THREE.Mesh(planeGeo, planeMat)
          plano.rotation.x      = -Math.PI / 2   // acostado horizontal
          plano.position.y      = 0.51            // encima de la ficha
          plano.userData.esNumero = true
          clon.add(plano)
        })

        // Posición en la cancha (y = offsetY del field)
        clon.position.set(
          jugador.x   ?? 0,
          jugador.y   ?? 0.35,
          jugador.z   ?? 0
        )

        // Escala (ajusta según el tamaño de tu modelo)
        clon.scale.setScalar(jugador.escala ?? 1.0)

        // Guardar referencia con datos del jugador
        clon.userData = {
          ...clon.userData,
          jugadorId: jugador.id,
          numero:    jugador.numero,
        }

        scene.add(clon)
        fichas.push(clon)
      })
    },

    undefined,

    (error) => {
      console.error('Error cargando ficha.glb:', error)
    }
  )

  return fichas
}
