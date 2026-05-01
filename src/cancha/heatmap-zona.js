// src/cancha/heatmap-zona.js
import * as THREE from 'three'

const ZONAS_EJEMPLO = [
  {
    x:     60,
    z:    -17,
    ancho: 60,
    alto:  14,
    color: 0x1E8CFF,
    label: 'Banda derecha',
  },
]

// ── Estilos del label — inyectados una sola vez ───────────────────────────
function inyectarEstilosLabel() {
  if (document.getElementById('hz-label-styles')) return
  const style = document.createElement('style')
  style.id = 'hz-label-styles'
  style.textContent = `
    .hz-label {
      position: fixed;
      pointer-events: none;
      user-select: none;
      display: flex;
      flex-direction: row;
      align-items: center;
      gap: 10px;
      padding: 10px 18px;
      background: rgba(8, 24, 44, 0.72);
      border: 1.5px solid rgba(0, 221, 255, 0.6);
      border-radius: 10px;
      box-shadow: 0 0 12px rgba(0, 221, 255, 0.2),
                  0 0 32px rgba(0, 221, 255, 0.08);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      transform: translate(-50%, -100%);
      transition: opacity 0.25s ease;
      z-index: 10;
      white-space: nowrap;
    }
    .hz-label-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #00DDFF;
      box-shadow: 0 0 6px rgba(0, 221, 255, 0.9);
      flex-shrink: 0;
      align-self: center;
    }
    .hz-label-text {
      font-family: 'JetBrains Mono', 'Courier New', monospace;
      font-weight: 400;
      font-size: 14px;
      letter-spacing: 0.04em;
      color: #ffffff;
    }
  `
  document.head.appendChild(style)
}

export function createHeatmapZona(scene, zonas = ZONAS_EJEMPLO, opciones = {}) {

  const { offsetY = 1.0 } = opciones

  const grupo = new THREE.Group()
  grupo.visible = false
  scene.add(grupo)

  zonas.forEach(zona => {
    const { x = 0, z = 0, ancho = 30, alto = 20, color = 0x1E8CFF, alpha = 0.25, label } = zona

    const hw = ancho / 2
    const hh = alto  / 2

    // ── 1. Gradiente lineal ──
    const tamCanvas = 512
    const canvas    = document.createElement('canvas')
    canvas.width    = tamCanvas
    canvas.height   = tamCanvas
    const ctx       = canvas.getContext('2d')
    const grad      = ctx.createLinearGradient(0, 0, 0, tamCanvas)
    grad.addColorStop(0.0, 'rgba(110, 224, 255, 0.32)')
    grad.addColorStop(1.0, 'rgba(110, 224, 255, 0.05)')
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

    // ── 2. Borde punteado ──
    const dashLen = 0.5
    const gapLen  = 0.3
    const grosor  = 0.12

    const matBorde = new THREE.MeshBasicMaterial({
      color:       0x00DDFF,
      transparent: true,
      opacity:     0.9,
      depthWrite:  false,
      depthTest:   false,
      side:        THREE.DoubleSide,
    })

    function agregarLadoPunteado(x0, z0, x1, z1) {
      const dx  = x1 - x0, dz = z1 - z0
      const len = Math.sqrt(dx * dx + dz * dz)
      const ux  = dx / len, uz = dz / len
      const esHorizontal = Math.abs(dx) > Math.abs(dz)
      let t = 0, dibujando = true
      while (t < len) {
        const segLen = dibujando ? dashLen : gapLen
        const t2     = Math.min(t + segLen, len)
        if (dibujando) {
          const mid   = (t + t2) / 2
          const cx    = x + x0 + ux * mid
          const cz    = z + z0 + uz * mid
          const largo = t2 - t
          const geo   = esHorizontal
            ? new THREE.PlaneGeometry(largo, grosor)
            : new THREE.PlaneGeometry(grosor, largo)
          const mesh  = new THREE.Mesh(geo, matBorde)
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
    const tamNodo = 0.7
    ;[[-hw,-hh],[hw,-hh],[hw,hh],[-hw,hh]].forEach(([ex, ez]) => {
      const matNodo = new THREE.MeshBasicMaterial({
        color:       0x00DDFF,
        transparent: true,
        opacity:     1.0,
        depthWrite:  false,
        depthTest:   false,
        side:        THREE.DoubleSide,
      })
      const nodo = new THREE.Mesh(new THREE.PlaneGeometry(tamNodo, tamNodo), matNodo)
      nodo.rotation.x = -Math.PI / 2
      nodo.position.set(x + ex, offsetY + 0.02, z + ez)
      nodo.renderOrder = 12
      grupo.add(nodo)
    })

    // ── 4. Label como Sprite canvas ──────────────────────────────────────
    if (label) {
      const ESC      = 4
      const padX     = Math.round(18  * ESC)
      const dotR     = Math.round(2.5 * ESC)
      const gap      = Math.round(10  * ESC)
      const fontSize = Math.round(16  * ESC)   // font-size: 16px
      const r        = Math.round(8   * ESC)   // border-radius: 8px

      // Alto fijo: 54px. Ancho dinámico según texto
      const tmpCanvas = document.createElement('canvas')
      const tmpCtx    = tmpCanvas.getContext('2d')
      tmpCtx.font     = `500 ${fontSize}px "JetBrains Mono", monospace`
      const txtW = Math.ceil(tmpCtx.measureText(label).width)

      const CW = padX + dotR * 2 + gap + txtW + padX
      const CH = Math.round(54 * ESC)

      const canvas = document.createElement('canvas')
      canvas.width  = CW
      canvas.height = CH
      const ctx = canvas.getContext('2d')

      // ── Fondo: rgba(98, 182, 255, 0.2) con blur simulado ──
      // ── Fondo frosted glass simulado ──

      // Capa 1 — color base oscuro semitransparente
      ctx.beginPath(); ctx.roundRect(0, 0, CW, CH, r)
      ctx.fillStyle = 'rgba(8, 18, 38, 0.72)'
      ctx.fill()

      // Capa 2 — tinte azul sutil
      ctx.beginPath(); ctx.roundRect(0, 0, CW, CH, r)
      ctx.fillStyle = 'rgba(98, 182, 255, 0.14)'
      ctx.fill()

      // Capa 3 — ruido para textura esmerilada
      ctx.save()
      ctx.beginPath(); ctx.roundRect(0, 0, CW, CH, r); ctx.clip()
      for (let i = 0; i < CW * CH * 0.25; i++) {
        const nx = Math.random() * CW
        const ny = Math.random() * CH
        const a  = Math.random() * 0.035
        ctx.fillStyle = `rgba(255,255,255,${a})`
        ctx.fillRect(nx, ny, 1, 1)
      }
      ctx.restore()

      // Capa 4 — highlight sutil en el borde superior (efecto luz)
      ctx.save()
      ctx.beginPath(); ctx.roundRect(0, 0, CW, CH, r); ctx.clip()
      const hlGrad = ctx.createLinearGradient(0, 0, 0, CH * 0.5)
      hlGrad.addColorStop(0,   'rgba(140, 210, 255, 0.08)')
      hlGrad.addColorStop(1,   'rgba(140, 210, 255, 0)')
      ctx.fillStyle = hlGrad
      ctx.fillRect(0, 0, CW, CH)
      ctx.restore()

      // ── Borde: 1.56px solid rgba(0, 221, 255, 0.5) ──
      ctx.beginPath(); ctx.roundRect(0, 0, CW, CH, r)
      ctx.strokeStyle = 'rgba(0, 221, 255, 0.5)'
      ctx.lineWidth   = Math.round(3 * ESC)
      ctx.stroke()

      // ── Dot con glow: box-shadow 0 0 6px 2px rgba(0,221,255,0.8) ──
      const dotX = padX + dotR
      const dotY = CH / 2
      // Glow exterior
      ctx.save()
      ctx.shadowColor = 'rgba(0, 221, 255, 0.8)'
      ctx.shadowBlur  = 6 * ESC
      ctx.fillStyle   = '#00DDFF'
      ctx.beginPath(); ctx.arc(dotX, dotY, dotR + 2 * ESC, 0, Math.PI * 2); ctx.fill()
      ctx.restore()
      // Dot sólido encima
      ctx.fillStyle = '#00DDFF'
      ctx.beginPath(); ctx.arc(dotX, dotY, dotR, 0, Math.PI * 2); ctx.fill()

      // ── Texto: JetBrains Mono 500 16px, color #fff, letter-spacing 0.02em ──
      ctx.font         = `500 ${fontSize}px "JetBrains Mono", monospace`
      ctx.fillStyle    = '#ffffff'
      ctx.textAlign    = 'left'
      ctx.textBaseline = 'middle'
      // letter-spacing 0.02em aplicado manualmente
      const spacing = fontSize * 0.02
      let tx = dotX + dotR + gap
      for (const ch of label) {
        ctx.fillText(ch, tx, dotY)
        tx += ctx.measureText(ch).width + spacing
      }

      const tex    = new THREE.CanvasTexture(canvas)
      const mat    = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false })
      const sprite = new THREE.Sprite(mat)

      const altMundo   = 3.5
      const anchoMundo = altMundo * (CW / CH)
      sprite.scale.set(anchoMundo, altMundo, 1)
      sprite.position.set(x, offsetY + 0.5, z - hh)
      sprite.renderOrder = 15
      grupo.add(sprite)
    }
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

  // ── Actualizar zonas en caliente ──
  function updateZonas(nuevasZonas) {
    while (grupo.children.length > 0) {
      const child = grupo.children[0]
      if (child.geometry) child.geometry.dispose()
      if (child.material) {
        if (Array.isArray(child.material)) child.material.forEach(m => m.dispose())
        else child.material.dispose()
      }
      grupo.remove(child)
    }
    grupo.position.set(0, 0, 0)

    nuevasZonas.forEach(zona => {
      const { x = 0, z = 0, ancho = 30, alto = 20, color = 0x1E8CFF, alpha = 0.25, label } = zona
      const hw = ancho / 2
      const hh = alto  / 2

      const tamCanvas = 512
      const canvas = document.createElement('canvas')
      canvas.width = tamCanvas; canvas.height = tamCanvas
      const ctx  = canvas.getContext('2d')
      const grad = ctx.createLinearGradient(0, 0, 0, tamCanvas)
      grad.addColorStop(0.0, 'rgba(110, 224, 255, 0.32)')
      grad.addColorStop(1.0, 'rgba(110, 224, 255, 0.05)')
      ctx.fillStyle = grad
      ctx.fillRect(0, 0, tamCanvas, tamCanvas)

      const texGrad = new THREE.CanvasTexture(canvas)
      const meshGrad = new THREE.Mesh(
        new THREE.PlaneGeometry(ancho, alto),
        new THREE.MeshBasicMaterial({ map: texGrad, transparent: true, depthWrite: false, depthTest: false, side: THREE.DoubleSide })
      )
      meshGrad.rotation.x = -Math.PI / 2
      meshGrad.position.set(x, offsetY, z)
      meshGrad.renderOrder = 10
      grupo.add(meshGrad)

      const dashLen = 0.5, gapLen = 0.3, grosor = 0.12
      const matBorde = new THREE.MeshBasicMaterial({ color: 0x00DDFF, transparent: true, opacity: 0.9, depthWrite: false, depthTest: false, side: THREE.DoubleSide })

      function agregarLado(x0, z0, x1, z1) {
        const dx = x1-x0, dz = z1-z0
        const len = Math.sqrt(dx*dx+dz*dz)
        const ux = dx/len, uz = dz/len
        const esH = Math.abs(dx) > Math.abs(dz)
        let t = 0, d = true
        while (t < len) {
          const sL = d ? dashLen : gapLen
          const t2 = Math.min(t+sL, len)
          if (d) {
            const mid = (t+t2)/2
            const geo = esH ? new THREE.PlaneGeometry(t2-t, grosor) : new THREE.PlaneGeometry(grosor, t2-t)
            const mesh = new THREE.Mesh(geo, matBorde)
            mesh.rotation.x = -Math.PI/2
            mesh.position.set(x+x0+ux*mid, offsetY+0.01, z+z0+uz*mid)
            mesh.renderOrder = 11
            grupo.add(mesh)
          }
          t += sL; d = !d
        }
      }

      agregarLado(-hw,-hh, hw,-hh); agregarLado(hw,-hh, hw,hh)
      agregarLado(hw,hh, -hw,hh);   agregarLado(-hw,hh, -hw,-hh)

      ;[[-hw,-hh],[hw,-hh],[hw,hh],[-hw,hh]].forEach(([ex,ez]) => {
        const nodo = new THREE.Mesh(
          new THREE.PlaneGeometry(0.7, 0.7),
          new THREE.MeshBasicMaterial({ color: 0x00DDFF, transparent: true, opacity: 1.0, depthWrite: false, depthTest: false, side: THREE.DoubleSide })
        )
        nodo.rotation.x = -Math.PI/2
        nodo.position.set(x+ex, offsetY+0.02, z+ez)
        nodo.renderOrder = 12
        grupo.add(nodo)
      })

      if (label) {
        const ESC = 4, padX = Math.round(18*ESC)
        const dotR = Math.round(2.5*ESC), gap = Math.round(10*ESC)
        const fontSize = Math.round(16*ESC), r = Math.round(8*ESC)
        const tmpCtx = document.createElement('canvas').getContext('2d')
        tmpCtx.font = `500 ${fontSize}px "JetBrains Mono", monospace`
        const txtW = Math.ceil(tmpCtx.measureText(label).width)
        const CW = padX + dotR*2 + gap + txtW + padX
        const CH = Math.round(54 * ESC)
        const canvas = document.createElement('canvas')
        canvas.width = CW; canvas.height = CH
        const ctx = canvas.getContext('2d')
        ctx.filter = 'none'
        ctx.beginPath(); ctx.roundRect(0,0,CW,CH,r)
        ctx.fillStyle = 'rgba(8,18,38,0.72)'; ctx.fill()
        ctx.beginPath(); ctx.roundRect(0,0,CW,CH,r)
        ctx.fillStyle = 'rgba(98,182,255,0.14)'; ctx.fill()
        ctx.save(); ctx.beginPath(); ctx.roundRect(0,0,CW,CH,r); ctx.clip()
        for (let i = 0; i < CW*CH*0.25; i++) {
          ctx.fillStyle = `rgba(255,255,255,${Math.random()*0.035})`
          ctx.fillRect(Math.random()*CW, Math.random()*CH, 1, 1)
        }
        ctx.restore()
        ctx.save(); ctx.beginPath(); ctx.roundRect(0,0,CW,CH,r); ctx.clip()
        const hlGrad = ctx.createLinearGradient(0,0,0,CH*0.5)
        hlGrad.addColorStop(0,'rgba(140,210,255,0.08)')
        hlGrad.addColorStop(1,'rgba(140,210,255,0)')
        ctx.fillStyle = hlGrad; ctx.fillRect(0,0,CW,CH)
        ctx.restore()
        ctx.beginPath(); ctx.roundRect(0,0,CW,CH,r)
        ctx.strokeStyle = 'rgba(0,221,255,0.5)'; ctx.lineWidth = Math.round(3*ESC); ctx.stroke()
        const dotX = padX + dotR, dotY = CH / 2
        ctx.save()
        ctx.shadowColor = 'rgba(0,221,255,0.8)'; ctx.shadowBlur = 6*ESC
        ctx.fillStyle = '#00DDFF'
        ctx.beginPath(); ctx.arc(dotX, dotY, dotR+2*ESC, 0, Math.PI*2); ctx.fill()
        ctx.restore()
        ctx.fillStyle = '#00DDFF'
        ctx.beginPath(); ctx.arc(dotX, dotY, dotR, 0, Math.PI*2); ctx.fill()
        ctx.font = `500 ${fontSize}px "JetBrains Mono", monospace`
        ctx.fillStyle = '#ffffff'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'
        const spacing = fontSize * 0.02
        let tx = dotX + dotR + gap
        for (const ch of label) { ctx.fillText(ch, tx, dotY); tx += ctx.measureText(ch).width + spacing }
        const tex = new THREE.CanvasTexture(canvas)
        const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false })
        const sprite = new THREE.Sprite(mat)
        const altMundo = 3.5, anchoMundo = altMundo * (CW / CH)
        sprite.scale.set(anchoMundo, altMundo, 1)
        sprite.position.set(x, offsetY + 0.5, z - hh)
        sprite.renderOrder = 15
        grupo.add(sprite)
      }
    })
  }

  return { grupo, updateZonas }
}