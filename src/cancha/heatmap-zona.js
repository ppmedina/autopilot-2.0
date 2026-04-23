// src/cancha/heatmap-zona.js
import * as THREE from 'three'

// ── Configuración de la zona ──────────────────────────────────────────────────
// x     → posición horizontal (neg = portería propia, pos = portería rival)
// z     → posición vertical   (neg = banda superior,  pos = banda inferior)
// ancho → tamaño en el eje X (largo de cancha)
// alto  → tamaño en el eje Z (ancho de cancha)
const ZONAS_EJEMPLO = [
  {
    x:     60,
    z:    -17,
    ancho: 60,
    alto:  14,
    color: 0x1E8CFF,
  },
]

export function createHeatmapZona(scene, zonas = ZONAS_EJEMPLO, opciones = {}) {

  const {
    offsetY = 0.6,   // altura sobre la cancha
  } = opciones

  const grupo = new THREE.Group()
  grupo.visible = false
  scene.add(grupo)

  zonas.forEach(zona => {
    const { x = 0, z = 0, ancho = 30, alto = 20, color = 0x1E8CFF } = zona

    const hw = ancho / 2
    const hh = alto  / 2

    // ── 1. Gradiente radial como relleno ─────────────────────────────────────
    const tamCanvas = 512
    const canvas    = document.createElement('canvas')
    canvas.width    = tamCanvas
    canvas.height   = tamCanvas
    const ctx       = canvas.getContext('2d')
    const grad      = ctx.createRadialGradient(
      tamCanvas * 0.35, tamCanvas * 0.3, 0,
      tamCanvas * 0.5,  tamCanvas * 0.5, tamCanvas * 0.7
    )
    // ← ajusta los rgba para cambiar color y opacidad del gradiente
    grad.addColorStop(0.0,  'rgba(30, 140, 255, 0.45)')
    grad.addColorStop(0.4,  'rgba(20, 100, 220, 0.30)')
    grad.addColorStop(0.75, 'rgba(10,  60, 180, 0.15)')
    grad.addColorStop(1.0,  'rgba(0,   30, 120, 0.0)')
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, tamCanvas, tamCanvas)

    const texGrad  = new THREE.CanvasTexture(canvas)
    const geoGrad  = new THREE.PlaneGeometry(ancho, alto)
    const matGrad  = new THREE.MeshBasicMaterial({
      map:         texGrad,
      transparent: true,
      depthWrite:  false,
      depthTest:   false,   // ← ignora z-buffer, renderOrder decide
      side:        THREE.DoubleSide,
    })
    const meshGrad = new THREE.Mesh(geoGrad, matGrad)
    meshGrad.rotation.x = -Math.PI / 2
    meshGrad.position.set(0, offsetY, 0)
    meshGrad.renderOrder = 10  // ← encima de líneas (renderOrder 2)
    grupo.add(meshGrad)

    // ── 2. Borde punteado ────────────────────────────────────────────────────
    const dashLen     = 0.5   // ← longitud de cada guión
    const gapLen      = 0.3   // ← separación entre guiones
    const puntosBorde = []

    function agregarLadoPunteado(x0, z0, x1, z1) {
      const dx  = x1 - x0
      const dz  = z1 - z0
      const len = Math.sqrt(dx * dx + dz * dz)
      const ux  = dx / len
      const uz  = dz / len
      let t = 0
      let dibujando = true
      while (t < len) {
        const segLen = dibujando ? dashLen : gapLen
        const t2     = Math.min(t + segLen, len)
        if (dibujando) {
          puntosBorde.push(
            new THREE.Vector3(x0 + ux * t,  0, z0 + uz * t),
            new THREE.Vector3(x0 + ux * t2, 0, z0 + uz * t2)
          )
        }
        t += segLen
        dibujando = !dibujando
      }
    }

    agregarLadoPunteado(-hw, -hh,  hw, -hh)
    agregarLadoPunteado( hw, -hh,  hw,  hh)
    agregarLadoPunteado( hw,  hh, -hw,  hh)
    agregarLadoPunteado(-hw,  hh, -hw, -hh)

    const geoBorde = new THREE.BufferGeometry().setFromPoints(puntosBorde)
    const matBorde = new THREE.LineBasicMaterial({
      color:       0x4DAAFF,   // ← color del borde
      transparent: true,
      opacity:     0.9,
      depthWrite:  false,
      depthTest:   false,      // ← ignora z-buffer
    })
    const borde = new THREE.LineSegments(geoBorde, matBorde)
    borde.position.set(0, offsetY + 0.01, 0)
    borde.renderOrder = 11   // ← encima del relleno
    grupo.add(borde)

    // ── 3. Nodos en esquinas ─────────────────────────────────────────────────
    const tamNodo  = 0.7   // ← tamaño de los cuadrados de esquina
    const esquinas = [
      [-hw, -hh],
      [ hw, -hh],
      [ hw,  hh],
      [-hw,  hh],
    ]

    esquinas.forEach(([ex, ez]) => {
      const geoNodo = new THREE.PlaneGeometry(tamNodo, tamNodo)
      const matNodo = new THREE.MeshBasicMaterial({
        color:       0x4DAAFF,   // ← color de los nodos
        transparent: true,
        opacity:     1.0,
        depthWrite:  false,
        depthTest:   false,      // ← ignora z-buffer
        side:        THREE.DoubleSide,
      })
      const nodo = new THREE.Mesh(geoNodo, matNodo)
      nodo.rotation.x = -Math.PI / 2
      nodo.position.set(ex, offsetY + 0.02, ez)
      nodo.renderOrder = 12   // ← encima del borde
      grupo.add(nodo)
    })

    // ── Posición del grupo ───────────────────────────────────────────────────
    grupo.position.set(22, 0, z)
  })

  // ── Botón ──
  const btn = document.createElement('button')
  btn.textContent = 'Zona'
  btn.className   = 'btn'
  btn.addEventListener('click', function () {
    grupo.visible = !grupo.visible
    this.classList.toggle('active', grupo.visible)
  })
  document.getElementById('cc-controls').appendChild(btn)

  return { grupo }
}
