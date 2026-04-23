// src/cancha/heatmap.js
import * as THREE from 'three'
import GUI from 'lil-gui'

const DATOS_EJEMPLO = [
  [0.0, 0.0, 0.0, 0.1, 0.2, 0.1, 0.0, 0.1, 0.3, 0.2, 0.1, 0.0, 0.0, 0.0, 0.0],
  [0.0, 0.1, 0.3, 0.5, 0.7, 0.4, 0.2, 0.5, 0.8, 0.6, 0.3, 0.2, 0.1, 0.0, 0.0],
  [0.0, 0.2, 0.6, 0.9, 0.5, 0.2, 0.4, 0.9, 0.7, 0.3, 0.5, 0.8, 0.4, 0.1, 0.0],
  [0.0, 0.1, 0.4, 0.8, 0.3, 0.5, 0.8, 0.6, 0.4, 0.7, 0.9, 0.5, 0.2, 0.1, 0.0],
  [0.0, 0.3, 0.7, 0.5, 0.8, 0.9, 0.5, 0.3, 0.8, 0.9, 0.4, 0.3, 0.6, 0.2, 0.0],
  [0.0, 0.2, 0.5, 0.3, 0.6, 1.0, 0.7, 0.4, 0.6, 1.0, 0.7, 0.4, 0.5, 0.1, 0.0],
  [0.0, 0.1, 0.4, 0.6, 0.9, 0.7, 0.4, 0.5, 0.9, 0.8, 0.5, 0.6, 0.3, 0.1, 0.0],
  [0.0, 0.2, 0.5, 0.3, 0.6, 1.0, 0.7, 0.4, 0.6, 1.0, 0.7, 0.4, 0.5, 0.1, 0.0],
  [0.0, 0.3, 0.7, 0.5, 0.8, 0.9, 0.5, 0.3, 0.8, 0.9, 0.4, 0.3, 0.6, 0.2, 0.0],
  [0.0, 0.1, 0.4, 0.8, 0.3, 0.5, 0.8, 0.6, 0.4, 0.7, 0.9, 0.5, 0.2, 0.1, 0.0],
  [0.0, 0.2, 0.6, 0.9, 0.5, 0.2, 0.4, 0.9, 0.7, 0.3, 0.5, 0.8, 0.4, 0.1, 0.0],
  [0.0, 0.1, 0.3, 0.5, 0.7, 0.4, 0.2, 0.5, 0.8, 0.6, 0.3, 0.2, 0.1, 0.0, 0.0],
  [0.0, 0.0, 0.0, 0.1, 0.2, 0.1, 0.0, 0.1, 0.3, 0.2, 0.1, 0.0, 0.0, 0.0, 0.0],
]

export function createHeatmap(scene, datos = DATOS_EJEMPLO, opciones = {}) {

  const {
    ancho     = 105,
    alto      = 68,
    segX      = 160,  // ← más subdivisiones para más suavidad
    segZ      = 104,
    alturaMax = 14,
    offsetY   = 0.4,
  } = opciones

  // ── Interpolación bilineal base ──
  function interpolarDato(u, v) {
    const filas = datos.length
    const cols  = datos[0].length

    const fi = u * (filas - 1)
    const ci = v * (cols  - 1)
    const f0 = Math.floor(fi), f1 = Math.min(f0 + 1, filas - 1)
    const c0 = Math.floor(ci), c1 = Math.min(c0 + 1, cols  - 1)
    const tf = fi - f0, tc = ci - c0

    // Smoothstep en los factores de interpolación para curvas más suaves
    const stf = tf * tf * (3 - 2 * tf)
    const stc = tc * tc * (3 - 2 * tc)

    return datos[f0][c0] * (1-stf) * (1-stc)
         + datos[f1][c0] * stf     * (1-stc)
         + datos[f0][c1] * (1-stf) * stc
         + datos[f1][c1] * stf     * stc
  }

  // ── Suavizado adicional por vecinos (blur 3x3) para aspecto orgánico ──
  function muestrearSuavizado(u, v, radio = 0.018) {
    let suma = 0
    let peso = 0
    const pasos = 4
    for (let du = -pasos; du <= pasos; du++) {
      for (let dv = -pasos; dv <= pasos; dv++) {
        const uu = Math.max(0, Math.min(1, u + du * radio / pasos))
        const vv = Math.max(0, Math.min(1, v + dv * radio / pasos))
        const w  = 1 - Math.sqrt((du * du + dv * dv) / (pasos * pasos * 2))
        if (w <= 0) continue
        suma += interpolarDato(uu, vv) * w
        peso += w
      }
    }
    return suma / peso
  }

  // ── Bordes forzados a 0 con smoothstep ──
  function valorConBordes(u, v) {
    const margen = 1.5 / Math.min(segX, segZ)
    const bordeU = Math.min(u, 1 - u) / margen
    const bordeV = Math.min(v, 1 - v) / margen
    const factor = Math.min(1, bordeU, bordeV)
    const s = factor * factor * (3 - 2 * factor)
    // Potencia suave — 1.4 da colinas redondeadas en lugar de picos puntiagudos
    return Math.pow(muestrearSuavizado(u, v), 1.4) * s
  }

  // ── Color por altura ──
  function colorPorAltura(t) {
    const color = new THREE.Color()
    color.setHSL(0.66 - t * 0.66, 0.65, 0.25 + t * 0.12)
    return color
  }

  // ── Calcular alturas ──
  function calcularAlturas(altMax) {
    const alturas = []
    for (let iz = 0; iz <= segZ; iz++) {
      alturas[iz] = []
      for (let ix = 0; ix <= segX; ix++) {
        const u = iz / segZ
        const v = ix / segX
        alturas[iz][ix] = valorConBordes(u, v) * altMax
      }
    }
    return alturas
  }

  // ── Grid de cuadros sin diagonales con opacidad por altura ──
  function crearGridCuadros(alturas) {
    const points = []
    const colors = []

    const stepX = ancho / segX
    const stepZ = alto  / segZ

    function pushPoint(ix, iz) {
      const x = -ancho / 2 + ix * stepX
      const z = -alto  / 2 + iz * stepZ
      const y = alturas[iz][ix]
      points.push(x, y, z)

      const t     = y / alturaMax
      const alpha = Math.pow(t, 0.6)  // opacidad 0 en zonas sin elevación
      const c     = colorPorAltura(t)
      colors.push(c.r * alpha, c.g * alpha, c.b * alpha)
    }

    for (let iz = 0; iz <= segZ; iz++) {
      for (let ix = 0; ix < segX; ix++) {
        pushPoint(ix, iz)
        pushPoint(ix + 1, iz)
      }
    }

    for (let ix = 0; ix <= segX; ix++) {
      for (let iz = 0; iz < segZ; iz++) {
        pushPoint(ix, iz)
        pushPoint(ix, iz + 1)
      }
    }

    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.Float32BufferAttribute(points, 3))
    geo.setAttribute('color',    new THREE.Float32BufferAttribute(colors, 3))
    return geo
  }

  // ── Mesh sólido semitransparente con opacidad por altura ──
  function crearMeshSolido(alturas) {
    const positions = []
    const colors    = []
    const indices   = []

    const stepX = ancho / segX
    const stepZ = alto  / segZ

    for (let iz = 0; iz <= segZ; iz++) {
      for (let ix = 0; ix <= segX; ix++) {
        const x = -ancho / 2 + ix * stepX
        const z = -alto  / 2 + iz * stepZ
        const y = alturas[iz][ix]
        positions.push(x, y, z)
        const t     = y / alturaMax
        const alpha = Math.pow(t, 0.8)
        const c     = colorPorAltura(t)
        colors.push(c.r * alpha, c.g * alpha, c.b * alpha)
      }
    }

    for (let iz = 0; iz < segZ; iz++) {
      for (let ix = 0; ix < segX; ix++) {
        const a = iz       * (segX + 1) + ix
        const b = iz       * (segX + 1) + ix + 1
        const c = (iz + 1) * (segX + 1) + ix
        const d = (iz + 1) * (segX + 1) + ix + 1
        indices.push(a, b, c)
        indices.push(b, d, c)
      }
    }

    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    geo.setAttribute('color',    new THREE.Float32BufferAttribute(colors,    3))
    geo.setIndex(indices)
    geo.computeVertexNormals()
    return geo
  }

  // ── Construir ──
  let alturas  = calcularAlturas(alturaMax)
  let geoGrid  = crearGridCuadros(alturas)
  let geoSolid = crearMeshSolido(alturas)

  const matGrid = new THREE.LineBasicMaterial({
    vertexColors: true,
    transparent:  true,
    opacity:      0.5,
  })

  const matSolid = new THREE.MeshBasicMaterial({
    vertexColors: true,
    transparent:  true,
    opacity:      0.08,
    side:         THREE.DoubleSide,
  })

  const meshGrid  = new THREE.LineSegments(geoGrid,  matGrid)
  const meshSolid = new THREE.Mesh(geoSolid, matSolid)

  meshGrid.position.y  = offsetY
  meshSolid.position.y = offsetY

  scene.add(meshGrid)
  scene.add(meshSolid)

  function reconstruir(altMax) {
    alturas = calcularAlturas(altMax)
    meshGrid.geometry.dispose()
    meshSolid.geometry.dispose()
    meshGrid.geometry  = crearGridCuadros(alturas)
    meshSolid.geometry = crearMeshSolido(alturas)
  }

  // ── GUI ──
  const params = { visible: true, opacidad: 0.5, alturaMax }

  const gui = new GUI({ title: 'Heatmap' })
  gui.domElement.style.position = 'fixed'
  gui.domElement.style.bottom   = '120px'
  gui.domElement.style.right    = '10px'
  gui.domElement.style.top      = 'auto'

  gui.add(params, 'visible').name('Visible').onChange(v => {
    meshGrid.visible  = v
    meshSolid.visible = v
  })
  gui.add(params, 'opacidad', 0, 1, 0.01).name('Opacidad').onChange(v => {
    matGrid.opacity = v
  })
  gui.add(params, 'alturaMax', 1, 40, 0.5).name('Altura máx').onChange(v => {
    reconstruir(v)
  })
  // ── Botón en la barra de controles ──
  const btn = document.createElement('button')
  btn.textContent = 'Heatmap'
  btn.className   = 'btn'
  btn.addEventListener('click', function() {
    const visible = !meshGrid.visible
    meshGrid.visible  = visible
    meshSolid.visible = visible
    this.classList.toggle('active', visible)
  })
  document.getElementById('cc-controls').appendChild(btn)

  return { meshGrid, meshSolid }
}
