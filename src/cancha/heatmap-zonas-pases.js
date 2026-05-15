// src/cancha/heatmap-zonas-pases.js
import * as THREE from 'three'
import gsap from 'gsap'

const clipPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)

// ── Configuraciones de grid disponibles ──────────────────────────────────────
const CONFIGS_GRID = {
  16: { filas: 4, columnas: 4 },
  30: { filas: 5, columnas: 6 },
  60: { filas: 6, columnas: 10 },
}

// ── Datos de ejemplo por configuración ───────────────────────────────────────
const PASES_EJEMPLO = {
  16: [
    [ 12,  8, 15, 30 ],
    [ 20, 45, 60, 25 ],
    [ 18, 50, 55, 22 ],
    [ 10,  6, 12, 28 ],
  ],
  30: [
    [  8, 12, 20, 35, 15, 10 ],
    [ 18, 45, 60, 55, 30, 20 ],
    [ 22, 50, 65, 70, 40, 25 ],
    [ 15, 38, 55, 60, 28, 18 ],
    [  6, 10, 18, 22, 12,  8 ],
  ],
  60: [
    [  5,  8, 12, 18, 22, 15, 10,  8,  6,  4 ],
    [ 10, 18, 30, 45, 55, 40, 28, 20, 12,  8 ],
    [ 15, 25, 45, 60, 70, 65, 45, 30, 18, 10 ],
    [ 12, 22, 40, 55, 68, 72, 50, 35, 20, 12 ],
    [  8, 15, 28, 40, 55, 60, 40, 25, 15,  8 ],
    [  4,  8, 12, 18, 25, 22, 15, 10,  6,  4 ],
  ],
}

function crearSpritePases(numPases, escalaSprite = 1) {
  const S  = 4 * escalaSprite
  const VW = 56 * S
  const VH = 65 * S

  const canvas = document.createElement('canvas')
  canvas.width  = VW
  canvas.height = VH
  const ctx = canvas.getContext('2d')

  const pad  = 6  * S
  const x1   = pad
  const y1   = pad
  const x2   = VW - pad
  const r    = Math.round(2.7 * S)
  const picH = Math.round(4.7 * S)
  const y2   = VH - picH - pad
  const px   = VW / 2
  const pt   = VH - pad
  const pw   = Math.round(4.7 * S)

  function dibujarForma() {
    ctx.beginPath()
    ctx.moveTo(x1 + r, y1)
    ctx.lineTo(x2 - r, y1)
    ctx.quadraticCurveTo(x2, y1, x2, y1 + r)
    ctx.lineTo(x2, y2 - r)
    ctx.quadraticCurveTo(x2, y2, x2 - r, y2)
    ctx.lineTo(px + pw, y2)
    ctx.lineTo(px, pt)
    ctx.lineTo(px - pw, y2)
    ctx.lineTo(x1 + r, y2)
    ctx.quadraticCurveTo(x1, y2, x1, y2 - r)
    ctx.lineTo(x1, y1 + r)
    ctx.quadraticCurveTo(x1, y1, x1 + r, y1)
    ctx.closePath()
  }

  ctx.save()
  ctx.shadowColor = 'rgba(32, 151, 255, 0.35)'
  ctx.shadowBlur  = 5 * S
  dibujarForma(); ctx.fillStyle = 'rgba(0,0,0,0.01)'; ctx.fill()
  ctx.restore()

  dibujarForma(); ctx.fillStyle = 'rgba(12, 18, 32, 0.62)'; ctx.fill()
  dibujarForma(); ctx.fillStyle = 'rgba(40, 100, 200, 0.08)'; ctx.fill()

  ctx.save()
  dibujarForma(); ctx.clip()
  for (let i = 0; i < VW * VH * 0.18; i++) {
    ctx.fillStyle = `rgba(255,255,255,${Math.random() * 0.04})`
    ctx.fillRect(Math.random() * VW, Math.random() * VH, 1, 1)
  }
  ctx.restore()

  ctx.save()
  dibujarForma(); ctx.clip()
  const hl = ctx.createLinearGradient(0, y1, 0, y1 + (y2 - y1) * 0.4)
  hl.addColorStop(0, 'rgba(160, 210, 255, 0.1)')
  hl.addColorStop(1, 'rgba(160, 210, 255, 0)')
  ctx.fillStyle = hl; ctx.fillRect(x1, y1, x2 - x1, y2 - y1)
  ctx.restore()

  dibujarForma()
  ctx.strokeStyle = '#4ED3FF'; ctx.lineWidth = 1.4 * S; ctx.stroke()

  const midY = (y1 + y2) / 2
  const fs   = 16.8 * S
  ctx.font         = `700 ${fs}px "Poppins", sans-serif`
  ctx.fillStyle    = '#ffffff'
  ctx.textAlign    = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(String(numPases), px, midY)

  return new THREE.CanvasTexture(canvas)
}

export function createHeatmapZonasPases(scene, pases, opciones = {}) {

  const {
    ancho       = 105,
    alto        = 68,
    offsetY     = 0.3,
    opacidadMax = 0.96,
    zonas       = 16,    // 16 | 30 | 60
  } = opciones

  // ── Estado mutable ────────────────────────────────────────────────────────
  let configActual  = CONFIGS_GRID[zonas] || CONFIGS_GRID[16]
  let pasesActuales = pases || PASES_EJEMPLO[zonas] || PASES_EJEMPLO[16]
  let numZonasActual = zonas

  const grupo = new THREE.Group()
  grupo.visible = false
  scene.add(grupo)

  // Subgrupo que se reconstruye al cambiar grid
  let subgrupo = new THREE.Group()
  grupo.add(subgrupo)

  // Arrays de referencias — se reconstruyen con el subgrupo
  let meshes         = []
  let sprites        = []
  let celdas         = []
  let celdasOrdenadas = []
  let lineas         = []
  let timers         = []
  let tweens         = []
  const staggerLinea = 0.08

  function matarTodo() {
    timers.forEach(t => clearTimeout(t)); timers = []
    tweens.forEach(t => t && t.kill());   tweens = []
  }

  // ── Construir el subgrupo completo ────────────────────────────────────────
  function construir(cfg, pasesData) {
    const { filas, columnas } = cfg

    // Tamaño del sprite — más pequeño para más zonas
    const alturaSprite = numZonasActual === 60 ? 7.2 * 0.65 : numZonasActual === 30 ? 7.2 * 0.8 : 7.2
    const escalaSprite = numZonasActual === 60 ? 0.65        : numZonasActual === 30 ? 0.8        : 1.0

    const anchoZona = ancho / columnas
    const altoZona  = alto  / filas

    const valoresPlanos = pasesData.flat()
    const minP = Math.min(...valoresPlanos)
    const maxP = Math.max(...valoresPlanos)

    meshes          = []
    sprites         = []
    celdas          = []
    lineas          = []

    for (let fila = 0; fila < filas; fila++) {
      for (let col = 0; col < columnas; col++) {
        const numPases = pasesData[fila]?.[col] ?? 0
        const t        = maxP === minP ? 0 : (numPases - minP) / (maxP - minP)
        const opacidad = t * opacidadMax

        const cx = -ancho / 2 + col * anchoZona + anchoZona / 2
        const cz = -alto  / 2 + fila * altoZona  + altoZona  / 2

        // Plano de zona
        const canvasZona = document.createElement('canvas')
        canvasZona.width = canvasZona.height = 128
        const ctxZ    = canvasZona.getContext('2d')
        const radGrad = ctxZ.createLinearGradient(128, 0, 0, 128)
        radGrad.addColorStop(0, `rgba(78, 211, 255, ${opacidad})`)
        radGrad.addColorStop(1, `rgba(78, 211, 255, ${opacidad * 0.7})`)
        ctxZ.fillStyle = radGrad
        ctxZ.fillRect(0, 0, 128, 128)

        const geo = new THREE.PlaneGeometry(anchoZona, altoZona)
        const mat = new THREE.MeshBasicMaterial({
          map: new THREE.CanvasTexture(canvasZona),
          transparent: true, opacity: 0,
          depthWrite: false, depthTest: false, side: THREE.DoubleSide,
        })
        const mesh = new THREE.Mesh(geo, mat)
        mesh.rotation.x = -Math.PI / 2
        mesh.position.set(cx, offsetY, cz)
        mesh.renderOrder = 8
        mesh.userData = { fila, col, numPases, opacidad }
        mesh.visible = false
        subgrupo.add(mesh)
        meshes.push(mesh)

        // Sprite escala según número de zonas
        const altoMundo    = alturaSprite
        const anchoMundo   = altoMundo * (56 / 65)

        const geoV = new THREE.PlaneGeometry(anchoMundo * 0.85, altoMundo * 0.75)
        const matV = new THREE.MeshPhysicalMaterial({
          color: 0x88BBFF, roughness: 0.18, metalness: 0,
          transparent: true, opacity: 0, side: THREE.DoubleSide,
          depthWrite: false, clippingPlanes: [clipPlane],
        })
        const meshVidrio = new THREE.Mesh(geoV, matV)
        meshVidrio.position.set(cx, -8, cz)
        meshVidrio.renderOrder = 19
        meshVidrio.userData = { esContenedor: true, yFinal: offsetY + alturaSprite * 0.55 }
        meshVidrio.visible = false
        subgrupo.add(meshVidrio)

        const matSpr = new THREE.SpriteMaterial({
          map: crearSpritePases(numPases, escalaSprite),
          transparent: true, opacity: 0,
          depthWrite: false, clippingPlanes: [clipPlane],
        })
        const sprite = new THREE.Sprite(matSpr)
        sprite.scale.set(anchoMundo, altoMundo, 1)
        sprite.position.set(cx, -8, cz)
        sprite.renderOrder = 20
        sprite.userData = { fila, col, numPases, yFinal: offsetY + alturaSprite * 0.6 }
        sprite.visible = false
        subgrupo.add(sprite)
        sprites.push(sprite)

        celdas.push({ mesh, meshVidrio, sprite, numPases, opacidad })
      }
    }

    celdasOrdenadas = [...celdas].sort((a, b) => a.numPases - b.numPases)

    // Líneas divisoras
    function crearLinea(p1, p2) {
      const puntos = new Float32Array([p1.x, p1.y, p1.z, p1.x, p1.y, p1.z])
      const geo    = new THREE.BufferGeometry()
      geo.setAttribute('position', new THREE.BufferAttribute(puntos, 3))
      const mat  = new THREE.LineBasicMaterial({ color: 0x00DDFF, transparent: true, opacity: 0.7, depthWrite: false, depthTest: false })
      const line = new THREE.Line(geo, mat)
      line.renderOrder = 9; line.visible = false
      subgrupo.add(line)

      const pG   = new Float32Array([p1.x, p1.y, p1.z, p1.x, p1.y, p1.z])
      const geoG = new THREE.BufferGeometry()
      geoG.setAttribute('position', new THREE.BufferAttribute(pG, 3))
      const matG  = new THREE.LineBasicMaterial({ color: 0x44EEFF, transparent: true, opacity: 0.2, depthWrite: false, depthTest: false })
      const lineG = new THREE.Line(geoG, matG)
      lineG.renderOrder = 9; lineG.visible = false
      subgrupo.add(lineG)

      lineas.push({ line, geo, mat, lineGlow: lineG, geoGlow: geoG, matGlow: matG, p1, p2 })
    }

    for (let col = 1; col < columnas; col++) {
      const x = -ancho / 2 + col * anchoZona
      crearLinea(new THREE.Vector3(x, offsetY + 0.02, -alto / 2), new THREE.Vector3(x, offsetY + 0.02, alto / 2))
    }
    for (let fila = 1; fila < filas; fila++) {
      const z = -alto / 2 + fila * altoZona
      crearLinea(new THREE.Vector3(-ancho / 2, offsetY + 0.02, z), new THREE.Vector3(ancho / 2, offsetY + 0.02, z))
    }
  }

  // ── Limpiar subgrupo ──────────────────────────────────────────────────────
  function limpiarSubgrupo() {
    subgrupo.children.forEach(child => {
      if (child.geometry) child.geometry.dispose()
      if (child.material) {
        if (child.material.map) child.material.map.dispose()
        child.material.dispose()
      }
    })
    subgrupo.clear()
  }

  // ── Construcción inicial ──────────────────────────────────────────────────
  construir(configActual, pasesActuales)

  // ── ENTRADA ───────────────────────────────────────────────────────────────
  function animarEntrada(onComplete) {
    matarTodo()
    grupo.visible = true

    celdas.forEach(({ mesh, meshVidrio, sprite }) => {
      mesh.visible = meshVidrio.visible = sprite.visible = false
      mesh.material.opacity = meshVidrio.material.opacity = sprite.material.opacity = 0
      meshVidrio.position.y = sprite.position.y = -8
    })
    lineas.forEach(({ line, geo, lineGlow, geoGlow, p1 }) => {
      line.visible = lineGlow.visible = false
      const pos = geo.attributes.position.array
      const posG = geoGlow.attributes.position.array
      pos[3] = posG[3] = p1.x; pos[4] = posG[4] = p1.y; pos[5] = posG[5] = p1.z
      geo.attributes.position.needsUpdate = geoGlow.attributes.position.needsUpdate = true
    })

    const tl = gsap.timeline({ onComplete })

    lineas.forEach(({ line, geo, lineGlow, geoGlow, p1, p2 }, i) => {
      timers.push(setTimeout(() => {
        line.visible = lineGlow.visible = true
        const proxy = { t: 0 }
        tweens.push(gsap.to(proxy, {
          t: 1, duration: 0.45, ease: 'power2.inOut',
          onUpdate() {
            const pos = geo.attributes.position.array
            const posG = geoGlow.attributes.position.array
            pos[3] = posG[3] = p1.x + (p2.x - p1.x) * proxy.t
            pos[4] = posG[4] = p1.y + (p2.y - p1.y) * proxy.t
            pos[5] = posG[5] = p1.z + (p2.z - p1.z) * proxy.t
            geo.attributes.position.needsUpdate = geoGlow.attributes.position.needsUpdate = true
          },
        }))
      }, i * staggerLinea * 1000))
    })

    const staggerZona = numZonasActual === 60 ? 0.025 : numZonasActual === 30 ? 0.05 : 0.08
    const inicioZonas = lineas.length * staggerLinea + 0.35
    celdasOrdenadas.forEach(({ mesh }, i) => {
      timers.push(setTimeout(() => {
        mesh.visible = true
        tweens.push(gsap.to(mesh.material, { opacity: 1.0, duration: 0.25, ease: 'power2.out' }))
      }, (inicioZonas + i * staggerZona) * 1000))
    })

    const staggerSprite = numZonasActual === 60 ? 0.02 : numZonasActual === 30 ? 0.04 : 0.07
    const inicioSprites = inicioZonas + celdasOrdenadas.length * staggerZona + 0.1
    celdasOrdenadas.forEach(({ meshVidrio, sprite }, i) => {
      timers.push(setTimeout(() => {
        meshVidrio.visible = sprite.visible = true
        tweens.push(gsap.to(meshVidrio.material, { opacity: 0.12, duration: 0.4, ease: 'power2.out' }))
        tweens.push(gsap.to(sprite.material,     { opacity: 1.0,  duration: 0.4, ease: 'power2.out' }))
        tweens.push(gsap.to(meshVidrio.position, { y: meshVidrio.userData.yFinal, duration: 0.6, ease: 'power3.out' }))
        tweens.push(gsap.to(sprite.position,     { y: sprite.userData.yFinal,     duration: 0.6, ease: 'power3.out' }))
      }, (inicioSprites + i * staggerSprite) * 1000))
    })

    tweens.push(tl)
  }

  // ── SALIDA ────────────────────────────────────────────────────────────────
  function animarSalida(onComplete) {
    matarTodo()

    const staggerSprite = numZonasActual === 60 ? 0.02 : numZonasActual === 30 ? 0.04 : 0.06
    const staggerZona   = numZonasActual === 60 ? 0.02 : numZonasActual === 30 ? 0.04 : 0.06
    const durLinea      = numZonasActual === 60 ? 0.25 : numZonasActual === 30 ? 0.35 : 0.45
    const celdasInverso = [...celdasOrdenadas].reverse()

    celdasInverso.forEach(({ meshVidrio, sprite }, i) => {
      timers.push(setTimeout(() => {
        tweens.push(gsap.to(sprite.material,     { opacity: 0, duration: 0.15, ease: 'power2.in' }))
        tweens.push(gsap.to(meshVidrio.material, { opacity: 0, duration: 0.15, ease: 'power2.in' }))
        tweens.push(gsap.to(sprite.position,     { y: -8, duration: 0.3, ease: 'power2.in', onComplete() { sprite.visible = false } }))
        tweens.push(gsap.to(meshVidrio.position, { y: -8, duration: 0.3, ease: 'power2.in', onComplete() { meshVidrio.visible = false } }))
      }, i * staggerSprite * 1000))
    })

    const inicioZonas = celdasInverso.length * staggerSprite + 0.05
    celdasInverso.forEach(({ mesh }, i) => {
      timers.push(setTimeout(() => {
        tweens.push(gsap.to(mesh.material, { opacity: 0, duration: 0.2, ease: 'power2.in', onComplete() { mesh.visible = false } }))
      }, (inicioZonas + i * staggerZona) * 1000))
    })

    const inicioLineas = inicioZonas + celdasInverso.length * staggerZona + 0.05
    timers.push(setTimeout(() => {
      lineas.forEach(({ line, geo, lineGlow, geoGlow, p1, p2 }, i) => {
        timers.push(setTimeout(() => {
          const proxy = { t: 1.0 }
          tweens.push(gsap.to(proxy, {
            t: 0, duration: durLinea, ease: 'power2.inOut',
            onUpdate() {
              const pos = geo.attributes.position.array
              const posG = geoGlow.attributes.position.array
              pos[0] = posG[0] = p1.x + (p2.x - p1.x) * (1 - proxy.t)
              pos[1] = posG[1] = p1.y + (p2.y - p1.y) * (1 - proxy.t)
              pos[2] = posG[2] = p1.z + (p2.z - p1.z) * (1 - proxy.t)
              geo.attributes.position.needsUpdate = geoGlow.attributes.position.needsUpdate = true
            },
            onComplete() {
              line.visible = lineGlow.visible = false
              const pos = geo.attributes.position.array
              const posG = geoGlow.attributes.position.array
              pos[0] = posG[0] = p1.x; pos[1] = posG[1] = p1.y; pos[2] = posG[2] = p1.z
              geo.attributes.position.needsUpdate = geoGlow.attributes.position.needsUpdate = true
            },
          }))
        }, i * staggerLinea * 1000))
      })
    }, inicioLineas * 1000))

    const duracionTotal = inicioLineas + lineas.length * staggerLinea + 0.35
    timers.push(setTimeout(() => {
      grupo.visible = false
      if (onComplete) onComplete()
    }, duracionTotal * 1000))
  }

  // ── Cambiar número de zonas ───────────────────────────────────────────────
  function cambiarZonas(numZonas, onComplete) {
    const cfg = CONFIGS_GRID[numZonas]
    if (!cfg) return

    numZonasActual = numZonas

    const ejecutar = () => {
      matarTodo()
      limpiarSubgrupo()
      configActual   = cfg
      pasesActuales  = PASES_EJEMPLO[numZonas]
      construir(configActual, pasesActuales)
      if (grupo.visible) animarEntrada(onComplete)
      else if (onComplete) onComplete()
    }

    if (grupo.visible) {
      animarSalida(ejecutar)
    } else {
      ejecutar()
    }

    // Actualizar selector visual
    document.querySelectorAll('.btn-zonas-option').forEach(b => {
      b.classList.toggle('active', parseInt(b.dataset.zonas) === numZonas)
    })
  }

  // ── Botones ───────────────────────────────────────────────────────────────
  const contenedor = document.createElement('div')
  contenedor.style.cssText = 'display:inline-flex; gap:2px;'

  const btn = document.createElement('button')
  btn.textContent = 'Zonas pases'
  btn.className   = 'btn'
  btn.addEventListener('click', function () {
    if (!grupo.visible) {
      animarEntrada()
      this.classList.add('active')
    } else {
      animarSalida(() => this.classList.remove('active'))
    }
  })
  contenedor.appendChild(btn)

  ;[16, 30, 60].forEach(n => {
    const b = document.createElement('button')
    b.textContent       = n
    b.className         = 'btn btn-zonas-option'
    b.dataset.zonas     = n
    b.style.cssText     = 'padding:0 8px; font-size:11px; min-width:32px;'
    if (n === zonas) b.classList.add('active')
    b.addEventListener('click', () => cambiarZonas(n))
    contenedor.appendChild(b)
  })

  document.getElementById('cc-controls').appendChild(contenedor)

  // ── Tick ──────────────────────────────────────────────────────────────────
  function tickZonasPases(camera) {
    if (!grupo.visible) return
    sprites.forEach(s => { if (s.visible) s.lookAt(camera.position) })
    subgrupo.children.forEach(child => {
      if (child.userData.esContenedor && child.visible) child.lookAt(camera.position)
    })
  }

  // ── Actualizar datos ──────────────────────────────────────────────────────
  function updatePases(nuevosPases) {
    pasesActuales = nuevosPases
    const planos  = nuevosPases.flat()
    const minP    = Math.min(...planos)
    const maxP    = Math.max(...planos)

    meshes.forEach(mesh => {
      const { fila, col } = mesh.userData
      const num = nuevosPases[fila]?.[col] ?? 0
      const t   = maxP === minP ? 0 : (num - minP) / (maxP - minP)
      const op  = t * opacidadMax
      const cv  = document.createElement('canvas')
      cv.width = cv.height = 128
      const c3 = cv.getContext('2d')
      const rg = c3.createLinearGradient(128, 0, 0, 128)
      rg.addColorStop(0, `rgba(78,211,255,${op})`)
      rg.addColorStop(1, `rgba(78,211,255,${op * 0.7})`)
      c3.fillStyle = rg; c3.fillRect(0, 0, 128, 128)
      mesh.material.map.dispose()
      mesh.material.map = new THREE.CanvasTexture(cv)
      mesh.material.needsUpdate = true
    })

    const escalaSprite = numZonasActual === 60 ? 0.65 : numZonasActual === 30 ? 0.8 : 1.0
    sprites.forEach(sprite => {
      const { fila, col } = sprite.userData
      const num = nuevosPases[fila]?.[col] ?? 0
      sprite.material.map.dispose()
      sprite.material.map = crearSpritePases(num, escalaSprite)
      sprite.material.needsUpdate = true
    })
  }

  return { grupo, meshes, sprites, tickZonasPases, updatePases, animarEntrada, animarSalida, cambiarZonas }
}
