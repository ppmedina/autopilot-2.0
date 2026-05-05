// src/cancha/heatmap-zonas-pases.js
import * as THREE from 'three'

const PASES_EJEMPLO = [
  [ 12,  8, 15, 30 ],
  [ 20, 45, 60, 25 ],
  [ 18, 50, 55, 22 ],
  [ 10,  6, 12, 28 ],
]

// ── Canvas para el sprite — forma exacta del SVG de Figma ────────────────────
function crearSpritePases(numPases) {
  const S  = 4
  const VW = 56 * S
  const VH = 65 * S

  const canvas = document.createElement('canvas')
  canvas.width  = VW
  canvas.height = VH
  const ctx = canvas.getContext('2d')

  const pad = 6  * S
  const x1  = pad
  const y1  = pad
  const x2  = VW - pad
  const r   = Math.round(2.7 * S)   // esquinas ≈ 1/3 del original (8 → 2.7)
  const picH = Math.round(4.7 * S)  // alto del pico ≈ 1/3 del original (14 → 4.7)
  const y2  = VH - picH - pad
  const px  = VW / 2
  const pt  = VH - pad               // punta del pico
  const pw  = Math.round(4.7 * S)   // semiancho del pico ≈ 1/3 (7 → 4.7)

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

  // ── Glow sutil alrededor ──
  ctx.save()
  ctx.shadowColor = 'rgba(32, 151, 255, 0.35)'
  ctx.shadowBlur  = 5 * S
  dibujarForma()
  ctx.fillStyle = 'rgba(0,0,0,0.01)'
  ctx.fill()
  ctx.restore()

  // ── Cristal esmerilado — 4 capas ──

  // Capa 1: base oscura semitransparente
  dibujarForma()
  ctx.fillStyle = 'rgba(12, 18, 32, 0.62)'
  ctx.fill()

  // Capa 2: tinte azul sutil
  dibujarForma()
  ctx.fillStyle = 'rgba(40, 100, 200, 0.08)'
  ctx.fill()

  // Capa 3: ruido — textura esmerilada
  ctx.save()
  dibujarForma()
  ctx.clip()
  for (let i = 0; i < VW * VH * 0.18; i++) {
    const nx = Math.random() * VW
    const ny = Math.random() * VH
    ctx.fillStyle = `rgba(255,255,255,${Math.random() * 0.04})`
    ctx.fillRect(nx, ny, 1, 1)
  }
  ctx.restore()

  // Capa 4: highlight en el borde superior (reflejo del vidrio)
  ctx.save()
  dibujarForma()
  ctx.clip()
  const hl = ctx.createLinearGradient(0, y1, 0, y1 + (y2 - y1) * 0.4)
  hl.addColorStop(0,   'rgba(160, 210, 255, 0.1)')
  hl.addColorStop(1,   'rgba(160, 210, 255, 0)')
  ctx.fillStyle = hl
  ctx.fillRect(x1, y1, x2 - x1, y2 - y1)
  ctx.restore()

  // ── Borde ──
  dibujarForma()
  ctx.strokeStyle = '#4ED3FF'
  ctx.lineWidth   = 1.4 * S
  ctx.stroke()

  // ── Número — mitad del tamaño original (28 → 14) ──
  const midY = (y1 + y2) / 2
  const fs   = 16.8 * S
  ctx.font         = `700 ${fs}px "Poppins", sans-serif`
  ctx.fillStyle    = '#ffffff'
  ctx.textAlign    = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(String(numPases), px, midY)

  return new THREE.CanvasTexture(canvas)
}

export function createHeatmapZonasPases(scene, pases = PASES_EJEMPLO, opciones = {}) {

  const {
    ancho        = 105,
    alto         = 68,
    offsetY      = 0.3,
    opacidadMax  = 0.96,   // opacidad máxima (zona con más pases)
    filas        = 4,
    columnas     = 4,
    alturaSprite = 7.2,
  } = opciones

  const grupo = new THREE.Group()
  grupo.visible = false
  scene.add(grupo)

  const anchoZona = ancho / columnas
  const altoZona  = alto  / filas

  const valoresPlanos = pases.flat()
  const minPases = Math.min(...valoresPlanos)
  const maxPases = Math.max(...valoresPlanos)

  const meshes  = []
  const sprites = []

  for (let fila = 0; fila < filas; fila++) {
    for (let col = 0; col < columnas; col++) {

      const numPases = pases[fila]?.[col] ?? 0
      const t = maxPases === minPases
        ? 0
        : (numPases - minPases) / (maxPases - minPases)

      // más pases → mayor opacidad / menos pases → opacidad 0
      const opacidad = t * opacidadMax

      const cx = -ancho / 2 + col * anchoZona + anchoZona / 2
      const cz = -alto  / 2 + fila * altoZona  + altoZona  / 2

      // ── Plano de zona — linear gradient esquina sup-der → inf-izq ──
      const canvasZona = document.createElement('canvas')
      canvasZona.width  = 128
      canvasZona.height = 128
      const ctxZ = canvasZona.getContext('2d')
      // de esquina superior derecha (128,0) a inferior izquierda (0,128)
      const radGrad = ctxZ.createLinearGradient(128, 0, 0, 128)
      radGrad.addColorStop(0,   `rgba(78, 211, 255, ${opacidad})`)        // sup-der — 100%
      radGrad.addColorStop(1,   `rgba(78, 211, 255, ${opacidad * 0.7})`)  // inf-izq — 70%
      ctxZ.fillStyle = radGrad
      ctxZ.fillRect(0, 0, 128, 128)

      const texZona = new THREE.CanvasTexture(canvasZona)
      const geo = new THREE.PlaneGeometry(anchoZona, altoZona)
      const mat = new THREE.MeshBasicMaterial({
        map:         texZona,
        transparent: true,
        depthWrite:  false,
        depthTest:   false,
        side:        THREE.DoubleSide,
      })
      const mesh = new THREE.Mesh(geo, mat)
      mesh.rotation.x = -Math.PI / 2
      mesh.position.set(cx, offsetY, cz)
      mesh.renderOrder = 8
      mesh.userData = { fila, col, numPases }
      grupo.add(mesh)
      meshes.push(mesh)

      // ── Contenedor numérico — dos capas ──────────────────────────────────
      const altoMundo  = alturaSprite
      const anchoMundo = altoMundo * (56 / 65)

      // Capa 1: plano físico con efecto vidrio esmerilado
      const geoVidrio = new THREE.PlaneGeometry(anchoMundo * 0.85, altoMundo * 0.75)
      const matVidrio = new THREE.MeshPhysicalMaterial({
        color:        0x88BBFF,
        roughness:    0.18,
        metalness:    0.0,
        transparent:  true,
        opacity:      0.12,
        side:         THREE.DoubleSide,
        depthWrite:   false,
      })
      const meshVidrio = new THREE.Mesh(geoVidrio, matVidrio)
      meshVidrio.position.set(cx, offsetY + alturaSprite * 0.55, cz)
      meshVidrio.renderOrder = 19
      meshVidrio.userData = { esContenedor: true }
      grupo.add(meshVidrio)

      // Capa 2: sprite canvas con borde y número encima del vidrio
      const tex    = crearSpritePases(numPases)
      const matSpr = new THREE.SpriteMaterial({
        map:         tex,
        transparent: true,
        depthWrite:  false,
      })
      const sprite  = new THREE.Sprite(matSpr)
      sprite.scale.set(anchoMundo, altoMundo, 1)
      sprite.position.set(cx, offsetY + alturaSprite * 0.6, cz)
      sprite.renderOrder = 20
      sprite.userData = { fila, col, numPases }
      grupo.add(sprite)
      sprites.push(sprite)
    }
  }

  // ── Líneas divisoras brillantes ───────────────────────────────────────────
  function crearLinea(p1, p2) {
    const geo = new THREE.BufferGeometry().setFromPoints([p1, p2])
    const mat = new THREE.LineBasicMaterial({
      color:       0x00DDFF,
      transparent: true,
      opacity:     0.7,
      depthWrite:  false,
      depthTest:   false,
    })
    const line = new THREE.Line(geo, mat)
    line.renderOrder = 9
    grupo.add(line)

    const matGlow = new THREE.LineBasicMaterial({
      color:       0x44EEFF,
      transparent: true,
      opacity:     0.2,
      depthWrite:  false,
      depthTest:   false,
    })
    const lineGlow = new THREE.Line(geo, matGlow)
    lineGlow.renderOrder = 9
    grupo.add(lineGlow)
  }

  for (let col = 1; col < columnas; col++) {
    const x = -ancho / 2 + col * anchoZona
    crearLinea(
      new THREE.Vector3(x, offsetY + 0.02, -alto / 2),
      new THREE.Vector3(x, offsetY + 0.02,  alto / 2),
    )
  }

  for (let fila = 1; fila < filas; fila++) {
    const z = -alto / 2 + fila * altoZona
    crearLinea(
      new THREE.Vector3(-ancho / 2, offsetY + 0.02, z),
      new THREE.Vector3( ancho / 2, offsetY + 0.02, z),
    )
  }

  // ── Botón ─────────────────────────────────────────────────────────────────
  const btn = document.createElement('button')
  btn.textContent = 'Zonas pases'
  btn.className   = 'btn'
  btn.addEventListener('click', function () {
    grupo.visible = !grupo.visible
    this.classList.toggle('active', grupo.visible)
  })
  document.getElementById('cc-controls').appendChild(btn)

  // ── Tick ──────────────────────────────────────────────────────────────────
  function tickZonasPases(camera) {
    if (!grupo.visible) return
    sprites.forEach(sprite => sprite.lookAt(camera.position))
    grupo.children.forEach(child => {
      if (child.userData.esContenedor) child.lookAt(camera.position)
    })
  }

  // ── Actualizar datos ──────────────────────────────────────────────────────
  function updatePases(nuevosPases) {
    const planos = nuevosPases.flat()
    const minP   = Math.min(...planos)
    const maxP   = Math.max(...planos)

    meshes.forEach(mesh => {
      const { fila, col } = mesh.userData
      const num      = nuevosPases[fila]?.[col] ?? 0
      const t        = maxP === minP ? 0 : (num - minP) / (maxP - minP)
      const op       = t * opacidadMax
      const cv       = document.createElement('canvas')
      cv.width = cv.height = 128
      const cx3 = cv.getContext('2d')
      const rg  = cx3.createLinearGradient(128, 0, 0, 128)
      rg.addColorStop(0, `rgba(78,211,255,${op})`)
      rg.addColorStop(1, `rgba(78,211,255,${op * 0.7})`)
      cx3.fillStyle = rg
      cx3.fillRect(0, 0, 128, 128)
      mesh.material.map.dispose()
      mesh.material.map         = new THREE.CanvasTexture(cv)
      mesh.material.needsUpdate = true
      mesh.userData.numPases    = num
    })

    sprites.forEach(sprite => {
      const { fila, col } = sprite.userData
      const num = nuevosPases[fila]?.[col] ?? 0
      sprite.material.map.dispose()
      sprite.material.map          = crearSpritePases(num)
      sprite.material.needsUpdate  = true
      sprite.userData.numPases     = num
    })
  }

  return { grupo, meshes, sprites, tickZonasPases, updatePases }
}
