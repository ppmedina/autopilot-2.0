// src/cancha/heatmap-zona.js
import * as THREE from 'three'

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
    offsetY = 1.0,
  } = opciones

  const grupo = new THREE.Group()
  grupo.visible = false
  scene.add(grupo)

  zonas.forEach(zona => {
    const { x = 0, z = 0, ancho = 30, alto = 20, color = 0x1E8CFF, alpha = 0.25 } = zona

    const hw = ancho / 2
    const hh = alto  / 2

    // ── 1. Gradiente radial ──
    const tamCanvas = 512
    const canvas    = document.createElement('canvas')
    canvas.width    = tamCanvas
    canvas.height   = tamCanvas
    const ctx       = canvas.getContext('2d')
    const grad      = ctx.createRadialGradient(
      tamCanvas * 0.35, tamCanvas * 0.3, 0,
      tamCanvas * 0.5,  tamCanvas * 0.5, tamCanvas * 0.7
    )
    grad.addColorStop(0.0,  `rgba(30, 140, 255, ${alpha * 1.8})`)
    grad.addColorStop(0.4,  `rgba(20, 100, 220, ${alpha * 1.2})`)
    grad.addColorStop(0.75, `rgba(10,  60, 180, ${alpha * 0.6})`)
    grad.addColorStop(1.0,  'rgba(0,   30, 120, 0.0)')
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, tamCanvas, tamCanvas)

    const texGrad  = new THREE.CanvasTexture(canvas)
    const geoGrad  = new THREE.PlaneGeometry(ancho, alto)
    const matGrad  = new THREE.MeshBasicMaterial({
      map:         texGrad,
      transparent: true,
      depthWrite:  false,
      depthTest:   false,
      side:        THREE.DoubleSide,
    })
    const meshGrad = new THREE.Mesh(geoGrad, matGrad)
    meshGrad.rotation.x = -Math.PI / 2
    meshGrad.position.set(x, offsetY, z)
    meshGrad.renderOrder = 10
    grupo.add(meshGrad)

    // ── 2. Borde punteado — usando meshes planos para respetar renderOrder ──
    const dashLen = 0.5
    const gapLen  = 0.3
    const grosor  = 0.12

    const matBorde = new THREE.MeshBasicMaterial({
      color:       0x4DAAFF,
      transparent: true,
      opacity:     0.9,
      depthWrite:  false,
      depthTest:   false,
      side:        THREE.DoubleSide,
    })

    function agregarLadoPunteado(x0, z0, x1, z1) {
      const dx   = x1 - x0
      const dz   = z1 - z0
      const len  = Math.sqrt(dx * dx + dz * dz)
      const ux   = dx / len
      const uz   = dz / len
      // Detectar si el lado es horizontal (dx dominante) o vertical (dz dominante)
      const esHorizontal = Math.abs(dx) > Math.abs(dz)
      let t = 0
      let dibujando = true
      while (t < len) {
        const segLen = dibujando ? dashLen : gapLen
        const t2     = Math.min(t + segLen, len)
        if (dibujando) {
          const mid  = (t + t2) / 2
          const cx   = x + x0 + ux * mid
          const cz   = z + z0 + uz * mid
          const largo = t2 - t
          // Horizontal: PlaneGeometry(largo, grosor) acostado normal
          // Vertical:   PlaneGeometry(grosor, largo) acostado — sin rotación Y
          const geo  = esHorizontal
            ? new THREE.PlaneGeometry(largo, grosor)
            : new THREE.PlaneGeometry(grosor, largo)
          const mesh = new THREE.Mesh(geo, matBorde)
          mesh.rotation.x = -Math.PI / 2
          mesh.position.set(cx, offsetY + 0.01, cz)
          mesh.renderOrder = 11
          grupo.add(mesh)
        }
        t += segLen
        dibujando = !dibujando
      }
    }

    agregarLadoPunteado(-hw, -hh,  hw, -hh)
    agregarLadoPunteado( hw, -hh,  hw,  hh)
    agregarLadoPunteado( hw,  hh, -hw,  hh)
    agregarLadoPunteado(-hw,  hh, -hw, -hh)

    // ── 3. Nodos en esquinas ──
    const tamNodo  = 0.7
    const esquinas = [
      [-hw, -hh],
      [ hw, -hh],
      [ hw,  hh],
      [-hw,  hh],
    ]

    esquinas.forEach(([ex, ez]) => {
      const geoNodo = new THREE.PlaneGeometry(tamNodo, tamNodo)
      const matNodo = new THREE.MeshBasicMaterial({
        color:       0x4DAAFF,
        transparent: true,
        opacity:     1.0,
        depthWrite:  false,
        depthTest:   false,
        side:        THREE.DoubleSide,
      })
      const nodo = new THREE.Mesh(geoNodo, matNodo)
      nodo.rotation.x = -Math.PI / 2
      nodo.position.set(x + ex, offsetY + 0.02, z + ez)
      nodo.renderOrder = 12  // ← debajo de jugadores
      grupo.add(nodo)
    })

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

  // ── Función para actualizar zonas en caliente ──
  function updateZonas(nuevasZonas) {
    // Limpiar grupo — dispose de geometrías y materiales
    while (grupo.children.length > 0) {
      const child = grupo.children[0]
      if (child.geometry) child.geometry.dispose()
      if (child.material) {
        if (Array.isArray(child.material)) {
          child.material.forEach(m => m.dispose())
        } else {
          child.material.dispose()
        }
      }
      grupo.remove(child)
    }

    // Reposicionar grupo
    grupo.position.set(0, 0, 0)

    // Reconstruir con nuevos datos
    nuevasZonas.forEach(zona => {
      const { x = 0, z = 0, ancho = 30, alto = 20, color = 0x1E8CFF, alpha = 0.25 } = zona

      const hw = ancho / 2
      const hh = alto  / 2

      // Gradiente
      const tamCanvas = 512
      const canvas    = document.createElement('canvas')
      canvas.width    = tamCanvas
      canvas.height   = tamCanvas
      const ctx       = canvas.getContext('2d')
      const grad      = ctx.createRadialGradient(
        tamCanvas * 0.35, tamCanvas * 0.3, 0,
        tamCanvas * 0.5,  tamCanvas * 0.5, tamCanvas * 0.7
      )
      grad.addColorStop(0.0,  `rgba(30, 140, 255, ${alpha * 1.8})`)
      grad.addColorStop(0.4,  `rgba(20, 100, 220, ${alpha * 1.2})`)
      grad.addColorStop(0.75, `rgba(10,  60, 180, ${alpha * 0.6})`)
      grad.addColorStop(1.0,  'rgba(0,   30, 120, 0.0)')
      ctx.fillStyle = grad
      ctx.fillRect(0, 0, tamCanvas, tamCanvas)

      const texGrad  = new THREE.CanvasTexture(canvas)
      const geoGrad  = new THREE.PlaneGeometry(ancho, alto)
      const matGrad  = new THREE.MeshBasicMaterial({
        map: texGrad, transparent: true,
        depthWrite: false, depthTest: false, side: THREE.DoubleSide,
      })
      const meshGrad = new THREE.Mesh(geoGrad, matGrad)
      meshGrad.rotation.x = -Math.PI / 2
      meshGrad.position.set(x, offsetY, z)
      meshGrad.renderOrder = 10
      grupo.add(meshGrad)

      // Borde punteado
      const dashLen = 0.5
      const gapLen  = 0.3
      const grosor  = 0.12
      const matBorde = new THREE.MeshBasicMaterial({
        color: 0x4DAAFF, transparent: true, opacity: 0.9,
        depthWrite: false, depthTest: false, side: THREE.DoubleSide,
      })

      function agregarLado(x0, z0, x1, z1) {
        const dx  = x1 - x0, dz = z1 - z0
        const len = Math.sqrt(dx*dx + dz*dz)
        const ux  = dx / len, uz = dz / len
        const esHorizontal = Math.abs(dx) > Math.abs(dz)
        let t = 0, dibujando = true
        while (t < len) {
          const segLen = dibujando ? dashLen : gapLen
          const t2     = Math.min(t + segLen, len)
          if (dibujando) {
            const mid = (t + t2) / 2
            const cx  = x + x0 + ux * mid
            const cz  = z + z0 + uz * mid
            const largo = t2 - t
            const geo = esHorizontal
              ? new THREE.PlaneGeometry(largo, grosor)
              : new THREE.PlaneGeometry(grosor, largo)
            const mesh = new THREE.Mesh(geo, matBorde)
            mesh.rotation.x = -Math.PI / 2
            mesh.position.set(cx, offsetY + 0.01, cz)
            mesh.renderOrder = 11
            grupo.add(mesh)
          }
          t += segLen
          dibujando = !dibujando
        }
      }

      agregarLado(-hw, -hh,  hw, -hh)
      agregarLado( hw, -hh,  hw,  hh)
      agregarLado( hw,  hh, -hw,  hh)
      agregarLado(-hw,  hh, -hw, -hh)

      // Nodos esquinas
      const tamNodo = 0.7
      ;[[-hw,-hh],[hw,-hh],[hw,hh],[-hw,hh]].forEach(([ex, ez]) => {
        const matNodo = new THREE.MeshBasicMaterial({
          color: 0x4DAAFF, transparent: true, opacity: 1.0,
          depthWrite: false, depthTest: false, side: THREE.DoubleSide,
        })
        const nodo = new THREE.Mesh(new THREE.PlaneGeometry(tamNodo, tamNodo), matNodo)
        nodo.rotation.x = -Math.PI / 2
        nodo.position.set(x + ex, offsetY + 0.02, z + ez)
        nodo.renderOrder = 12
        grupo.add(nodo)
      })
    })
  }

  return { grupo, updateZonas }
}
