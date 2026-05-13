// src/cancha/heatmap.js
import * as THREE from 'three'
import gsap from 'gsap'
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
    segX      = 160,
    segZ      = 104,
    alturaMax = 14,
    offsetY   = 0.4,
  } = opciones

  function interpolarDato(u, v) {
    const filas = datos.length
    const cols  = datos[0].length
    const fi = u * (filas - 1)
    const ci = v * (cols  - 1)
    const f0 = Math.floor(fi), f1 = Math.min(f0 + 1, filas - 1)
    const c0 = Math.floor(ci), c1 = Math.min(c0 + 1, cols  - 1)
    const tf = fi - f0, tc = ci - c0
    const stf = tf * tf * (3 - 2 * tf)
    const stc = tc * tc * (3 - 2 * tc)
    return datos[f0][c0] * (1-stf) * (1-stc)
         + datos[f1][c0] * stf     * (1-stc)
         + datos[f0][c1] * (1-stf) * stc
         + datos[f1][c1] * stf     * stc
  }

  function muestrearSuavizado(u, v, radio = 0.018) {
    let suma = 0, peso = 0
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

  function valorConBordes(u, v) {
    const margen = 1.5 / Math.min(segX, segZ)
    const bordeU = Math.min(u, 1 - u) / margen
    const bordeV = Math.min(v, 1 - v) / margen
    const factor = Math.min(1, bordeU, bordeV)
    const s = factor * factor * (3 - 2 * factor)
    return Math.pow(muestrearSuavizado(u, v), 1.4) * s
  }

  const PALETA = [
    { t: 0.00, r:  4/255, g: 15/255, b:  50/255 },
    { t: 0.12, r:  6/255, g: 30/255, b: 120/255 },
    { t: 0.25, r: 10/255, g: 55/255, b: 180/255 },
    { t: 0.40, r: 20/255, g: 90/255, b: 240/255 },
    { t: 0.55, r: 30/255, g:140/255, b: 255/255 },
    { t: 0.68, r: 60/255, g:190/255, b: 255/255 },
    { t: 0.80, r:140/255, g:225/255, b: 255/255 },
    { t: 0.90, r:210/255, g:245/255, b: 255/255 },
    { t: 1.00, r:255/255, g:255/255, b: 255/255 },
  ]

  function colorPorAltura(t) {
    const color = new THREE.Color()
    let i = 0
    while (i < PALETA.length - 2 && t > PALETA[i + 1].t) i++
    const c0 = PALETA[i], c1 = PALETA[i + 1]
    const rango = c1.t - c0.t
    const local = rango > 0 ? (t - c0.t) / rango : 0
    const s = local * local * (3 - 2 * local)
    color.setRGB(
      c0.r + (c1.r - c0.r) * s,
      c0.g + (c1.g - c0.g) * s,
      c0.b + (c1.b - c0.b) * s,
    )
    return color
  }

  // ─── Pre-calcula las alturas base normalizadas [0..1] ────────────────────────
  // Durante la animación solo se multiplica por (mult * alturaMax),
  // así evitamos recalcular la interpolación y suavizado cada frame.
  const alturasBase = []   // valores [0..1]
  for (let iz = 0; iz <= segZ; iz++) {
    alturasBase[iz] = []
    for (let ix = 0; ix <= segX; ix++) {
      alturasBase[iz][ix] = valorConBordes(iz / segZ, ix / segX)
    }
  }

  // ─── Crea geometrías con un multiplicador de altura ──────────────────────────
  function crearGridCuadros(mult) {
    const points = [], colors = []
    const stepX = ancho / segX
    const stepZ = alto  / segZ
    const altMax = mult * alturaMax

    function pushPoint(ix, iz) {
      const x = -ancho / 2 + ix * stepX
      const z = -alto  / 2 + iz * stepZ
      const y = alturasBase[iz][ix] * altMax
      points.push(x, y, z)
      const t     = altMax > 0 ? y / altMax : 0
      // Alpha mínimo visible en cero, sube suavemente hasta 1 en los picos
      const MIN = 0.055
      const alpha = MIN + (1 - MIN) * Math.pow(t, 0.5)
      const c     = colorPorAltura(t)
      colors.push(c.r * alpha, c.g * alpha, c.b * alpha)
    }

    for (let iz = 0; iz <= segZ; iz++) {
      for (let ix = 0; ix < segX; ix++) {
        pushPoint(ix, iz); pushPoint(ix + 1, iz)
      }
    }
    for (let ix = 0; ix <= segX; ix++) {
      for (let iz = 0; iz < segZ; iz++) {
        pushPoint(ix, iz); pushPoint(ix, iz + 1)
      }
    }

    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.Float32BufferAttribute(points, 3))
    geo.setAttribute('color',    new THREE.Float32BufferAttribute(colors, 3))
    return geo
  }

  function crearMeshSolido(mult) {
    const positions = [], colors = [], indices = []
    const stepX = ancho / segX
    const stepZ = alto  / segZ
    const altMax = mult * alturaMax

    for (let iz = 0; iz <= segZ; iz++) {
      for (let ix = 0; ix <= segX; ix++) {
        const x = -ancho / 2 + ix * stepX
        const z = -alto  / 2 + iz * stepZ
        const y = alturasBase[iz][ix] * altMax
        positions.push(x, y, z)
        const t     = altMax > 0 ? y / altMax : 0
        const MIN = 0.055
        const alpha = MIN + (1 - MIN) * Math.pow(t, 0.7)
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
        indices.push(a, b, c, b, d, c)
      }
    }

    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    geo.setAttribute('color',    new THREE.Float32BufferAttribute(colors,    3))
    geo.setIndex(indices)
    geo.computeVertexNormals()
    return geo
  }

  // ─── Actualiza buffers existentes sin recrear geometría ──────────────────────
  // Mucho más rápido que dispose + new BufferGeometry cada frame.
  function actualizarBuffers(mult) {
    const altMax = mult * alturaMax
    const posGrid  = meshGrid.geometry.attributes.position.array
    const colGrid  = meshGrid.geometry.attributes.color.array
    const posSolid = meshSolid.geometry.attributes.position.array
    const colSolid = meshSolid.geometry.attributes.color.array

    const stepX = ancho / segX
    const stepZ = alto  / segZ

    // Grid — líneas horizontales + verticales
    let gi = 0
    for (let iz = 0; iz <= segZ; iz++) {
      for (let ix = 0; ix < segX; ix++) {
        for (const [iix, iiz] of [[ix, iz], [ix + 1, iz]]) {
          const y = alturasBase[iiz][iix] * altMax
          posGrid[gi * 3 + 0] = -ancho / 2 + iix * stepX
          posGrid[gi * 3 + 1] = y
          posGrid[gi * 3 + 2] = -alto  / 2 + iiz * stepZ
          const t = altMax > 0 ? y / altMax : 0
          const MIN = 0.055
          const a = MIN + (1 - MIN) * Math.pow(t, 0.5)
          const c = colorPorAltura(t)
          colGrid[gi * 3 + 0] = c.r * a
          colGrid[gi * 3 + 1] = c.g * a
          colGrid[gi * 3 + 2] = c.b * a
          gi++
        }
      }
    }
    for (let ix = 0; ix <= segX; ix++) {
      for (let iz = 0; iz < segZ; iz++) {
        for (const [iix, iiz] of [[ix, iz], [ix, iz + 1]]) {
          const y = alturasBase[iiz][iix] * altMax
          posGrid[gi * 3 + 0] = -ancho / 2 + iix * stepX
          posGrid[gi * 3 + 1] = y
          posGrid[gi * 3 + 2] = -alto  / 2 + iiz * stepZ
          const t = altMax > 0 ? y / altMax : 0
          const MIN = 0.055
          const a = MIN + (1 - MIN) * Math.pow(t, 0.5)
          const c = colorPorAltura(t)
          colGrid[gi * 3 + 0] = c.r * a
          colGrid[gi * 3 + 1] = c.g * a
          colGrid[gi * 3 + 2] = c.b * a
          gi++
        }
      }
    }
    meshGrid.geometry.attributes.position.needsUpdate = true
    meshGrid.geometry.attributes.color.needsUpdate    = true

    // Solid
    let si = 0
    for (let iz = 0; iz <= segZ; iz++) {
      for (let ix = 0; ix <= segX; ix++) {
        const y = alturasBase[iz][ix] * altMax
        posSolid[si * 3 + 0] = -ancho / 2 + ix * stepX
        posSolid[si * 3 + 1] = y
        posSolid[si * 3 + 2] = -alto  / 2 + iz * stepZ
        const t = altMax > 0 ? y / altMax : 0
        const MIN = 0.055
        const a = MIN + (1 - MIN) * Math.pow(t, 0.7)
        const c = colorPorAltura(t)
        colSolid[si * 3 + 0] = c.r * a
        colSolid[si * 3 + 1] = c.g * a
        colSolid[si * 3 + 2] = c.b * a
        si++
      }
    }
    meshSolid.geometry.attributes.position.needsUpdate = true
    meshSolid.geometry.attributes.color.needsUpdate    = true
    meshSolid.geometry.computeVertexNormals()
  }

  // ─── Setup inicial con mult = 1 ──────────────────────────────────────────────
  const meshGrid  = new THREE.LineSegments(crearGridCuadros(1), new THREE.LineBasicMaterial({
    vertexColors: true,
    transparent:  true,
    opacity:      0.68,
    blending:     THREE.AdditiveBlending,
    depthWrite:   false,
  }))
  const meshSolid = new THREE.Mesh(crearMeshSolido(1), new THREE.MeshBasicMaterial({
    vertexColors: true,
    transparent:  true,
    opacity:      0.08,
    side:         THREE.DoubleSide,
    blending:     THREE.AdditiveBlending,
    depthWrite:   false,
  }))

  meshGrid.position.y  = offsetY
  meshSolid.position.y = offsetY
  meshGrid.visible     = false
  meshSolid.visible    = false

  scene.add(meshGrid)
  scene.add(meshSolid)

  // ─── Estado de animación ─────────────────────────────────────────────────────
  const estado = { mult: 0.0 }
  let tweenActivo = null

  function matarTween() {
    if (tweenActivo) { tweenActivo.kill(); tweenActivo = null }
  }

  // ─── ENTRADA — la malla crece desde el suelo ─────────────────────────────────
  // mult va de 0 a 1 con ease elastic para que los picos "reboten" levemente
  // al llegar a su altura final, como si los datos emergieran con inercia.
  function animarEntrada(onComplete) {
    matarTween()

    estado.mult = 0
    actualizarBuffers(0)
    meshGrid.visible           = true
    meshSolid.visible          = true
    meshGrid.material.opacity  = 0
    meshSolid.material.opacity = 0

    const tl = gsap.timeline({ onComplete })
    tweenActivo = tl

    // Paso 1 — fade in de la malla plana (mult sigue en 0)
    tl.to(meshGrid.material,  { opacity: 0.68, duration: 0.7, ease: 'power2.out' })
    tl.to(meshSolid.material, { opacity: 0.08, duration: 0.7, ease: 'power2.out' }, '<')

    // Paso 2 — una vez visible, crece la altura con rebote elástico
    tl.to(estado, {
      mult:     1.0,
      duration: 2.2,
      ease:     'elastic.out(1, 0.5)',
      onUpdate() { actualizarBuffers(estado.mult) },
    })
  }

  // ─── SALIDA ──────────────────────────────────────────────────────────────────
  function animarSalida(onComplete) {
    matarTween()

    const tl = gsap.timeline({
      onComplete() {
        meshGrid.visible  = false
        meshSolid.visible = false
        estado.mult       = 0
        if (onComplete) onComplete()
      }
    })
    tweenActivo = tl

    // Paso 1 — la altura colapsa a cero
    tl.to(estado, {
      mult:     0.0,
      duration: 1.6,
      ease:     'power2.inOut',
      onUpdate() { actualizarBuffers(estado.mult) },
    })

    // Paso 2 — fade out de la malla plana
    tl.to(meshGrid.material,  { opacity: 0, duration: 0.6, ease: 'power2.in' })
    tl.to(meshSolid.material, { opacity: 0, duration: 0.6, ease: 'power2.in' }, '<')
  }

  // ─── GUI ─────────────────────────────────────────────────────────────────────
  const params = { visible: false, opacidad: 0.68, alturaMax }
  const gui = new GUI({ title: 'Heatmap' })
  gui.domElement.style.position = 'fixed'
  gui.domElement.style.bottom   = '120px'
  gui.domElement.style.right    = '10px'
  gui.domElement.style.top      = 'auto'

  gui.add(params, 'visible').name('Visible').onChange(v => {
    if (v) animarEntrada()
    else   animarSalida()
  })
  gui.add(params, 'opacidad', 0, 1, 0.01).name('Opacidad').onChange(v => {
    meshGrid.material.opacity = v
  })
  gui.add(params, 'alturaMax', 1, 40, 0.5).name('Altura máx').onChange(v => {
    opciones.alturaMax = v
    actualizarBuffers(estado.mult)
  })

  // ─── Botón ───────────────────────────────────────────────────────────────────
  const btn = document.createElement('button')
  btn.textContent = 'Volumétrica'
  btn.className   = 'btn'
  btn.addEventListener('click', function () {
    if (!meshGrid.visible) {
      animarEntrada()
      this.classList.add('active')
    } else {
      animarSalida(() => this.classList.remove('active'))
    }
  })
  document.getElementById('cc-controls').appendChild(btn)

  return { meshGrid, meshSolid, animarEntrada, animarSalida }
}
