// src/cancha/heatmap-zona.js
import * as THREE from 'three'
import gsap from 'gsap'

const ZONAS_EJEMPLO = [
  { x: 60, z: -17, ancho: 60, alto: 14, color: 0x1E8CFF, label: 'Banda derecha' },
]

export function createHeatmapZona(scene, zonas, opciones) {
  zonas    = zonas    || ZONAS_EJEMPLO
  opciones = opciones || {}
  const offsetY = opciones.offsetY !== undefined ? opciones.offsetY : 1.0

  const grupo = new THREE.Group()
  grupo.visible = false
  scene.add(grupo)

  // Datos de animación por zona
  const datosAnimacion = []

  zonas.forEach(function(zona) {
    const x     = zona.x     || 0
    const z     = zona.z     || 0
    const ancho = zona.ancho || 30
    const alto  = zona.alto  || 20
    const label = zona.label
    const hw    = ancho / 2
    const hh    = alto  / 2

    // ── Gradiente — empieza con scale 0 ──────────────────────────────────
    const tamCanvas = 512
    const cvs = document.createElement('canvas')
    cvs.width = tamCanvas; cvs.height = tamCanvas
    const ctx = cvs.getContext('2d')
    const grad = ctx.createLinearGradient(0, 0, 0, tamCanvas)
    grad.addColorStop(0.0, 'rgba(110, 224, 255, 0.32)')
    grad.addColorStop(1.0, 'rgba(110, 224, 255, 0.05)')
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, tamCanvas, tamCanvas)
    const meshGrad = new THREE.Mesh(
      new THREE.PlaneGeometry(ancho, alto),
      new THREE.MeshBasicMaterial({
        map: new THREE.CanvasTexture(cvs),
        transparent: true, depthWrite: false, depthTest: false, side: THREE.DoubleSide,
      })
    )
    meshGrad.rotation.x = -Math.PI / 2
    meshGrad.position.set(x, offsetY, z)
    meshGrad.renderOrder = 10
    meshGrad.scale.set(0, 1, 0)   // empieza invisible
    grupo.add(meshGrad)

    // ── Borde punteado — en subgrupo para escalar al parejo ──────────────
    const grupoBorde = new THREE.Group()
    grupoBorde.position.set(x, 0, z)
    grupoBorde.scale.set(0.001, 1, 0.001)
    grupo.add(grupoBorde)

    const dashLen = 0.5, gapLen = 0.3, grosor = 0.12
    const matBorde = new THREE.MeshBasicMaterial({
      color: 0x00DDFF, transparent: true, opacity: 0.9,
      depthWrite: false, depthTest: false, side: THREE.DoubleSide,
    })
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
          const geo = esH
            ? new THREE.PlaneGeometry(t2-t, grosor)
            : new THREE.PlaneGeometry(grosor, t2-t)
          const m = new THREE.Mesh(geo, matBorde)
          m.rotation.x = -Math.PI/2
          // Posición relativa al centro de la zona
          m.position.set(x0+ux*mid, offsetY+0.01, z0+uz*mid)
          m.renderOrder = 11
          grupoBorde.add(m)
        }
        t += sL; d = !d
      }
    }
    agregarLado(-hw,-hh,  hw,-hh)
    agregarLado( hw,-hh,  hw, hh)
    agregarLado( hw, hh, -hw, hh)
    agregarLado(-hw, hh, -hw,-hh)

    // ── 4 nodos de esquina — todos empiezan en el centro ──────────────────
    const tamNodo = 0.7
    const esquinas = [
      { signoX: -1, signoZ: -1 },
      { signoX:  1, signoZ: -1 },
      { signoX:  1, signoZ:  1 },
      { signoX: -1, signoZ:  1 },
    ]
    const nodos = []
    esquinas.forEach(function(e) {
      const matNodo = new THREE.MeshBasicMaterial({
        color: 0x00DDFF, transparent: true, opacity: 1.0,
        depthWrite: false, depthTest: false, side: THREE.DoubleSide,
      })
      const nodo = new THREE.Mesh(new THREE.PlaneGeometry(tamNodo, tamNodo), matNodo)
      nodo.rotation.x = -Math.PI / 2
      // Empieza en el centro de la zona
      nodo.position.set(x, offsetY + 0.02, z)
      nodo.renderOrder = 12
      grupo.add(nodo)
      nodos.push({
        nodo,
        finalX: x + e.signoX * hw,
        finalZ: z + e.signoZ * hh,
        signoX: e.signoX,
        signoZ: e.signoZ,
        cx: x, cz: z,
      })
    })

    // ── Label — oculto al inicio ──────────────────────────────────────────
    var labelSprite = null
    if (label) {
      const ESC = 4
      const padX = Math.round(18*ESC), dotR = Math.round(2.5*ESC)
      const gap = Math.round(10*ESC), fontSize = Math.round(16*ESC)
      const r = Math.round(8*ESC)
      const tmpCtx = document.createElement('canvas').getContext('2d')
      tmpCtx.font = '500 '+fontSize+'px "JetBrains Mono", monospace'
      const txtW = Math.ceil(tmpCtx.measureText(label).width)
      const CW = padX + dotR*2 + gap + txtW + padX
      const CH = Math.round(54 * ESC)
      const lc = document.createElement('canvas')
      lc.width = CW; lc.height = CH
      const lctx = lc.getContext('2d')
      lctx.beginPath(); lctx.roundRect(0,0,CW,CH,r)
      lctx.fillStyle = 'rgba(8,18,38,0.72)'; lctx.fill()
      lctx.beginPath(); lctx.roundRect(0,0,CW,CH,r)
      lctx.fillStyle = 'rgba(98,182,255,0.14)'; lctx.fill()
      lctx.beginPath(); lctx.roundRect(0,0,CW,CH,r)
      lctx.strokeStyle = 'rgba(0,221,255,0.5)'; lctx.lineWidth = Math.round(3*ESC); lctx.stroke()
      const dotX = padX + dotR, dotY = CH/2
      lctx.save(); lctx.shadowColor='rgba(0,221,255,0.8)'; lctx.shadowBlur=6*ESC
      lctx.fillStyle='#00DDFF'; lctx.beginPath(); lctx.arc(dotX,dotY,dotR+2*ESC,0,Math.PI*2); lctx.fill()
      lctx.restore()
      lctx.fillStyle='#00DDFF'; lctx.beginPath(); lctx.arc(dotX,dotY,dotR,0,Math.PI*2); lctx.fill()
      lctx.font='500 '+fontSize+'px "JetBrains Mono", monospace'
      lctx.fillStyle='#ffffff'; lctx.textAlign='left'; lctx.textBaseline='middle'
      var spacing = fontSize*0.02, tx = dotX+dotR+gap
      for (var ci=0; ci<label.length; ci++) {
        var ch = label[ci]; lctx.fillText(ch,tx,dotY); tx += lctx.measureText(ch).width+spacing
      }
      const matL = new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(lc), transparent: true, depthWrite: false, opacity: 0 })
      labelSprite = new THREE.Sprite(matL)
      const altM = 3.5, anchoM = altM*(CW/CH)
      labelSprite.scale.set(anchoM, altM, 1)
      labelSprite.position.set(x, offsetY+0.5, z-hh)
      labelSprite.renderOrder = 15
      grupo.add(labelSprite)
    }

    datosAnimacion.push({ nodos, meshGrad, grupoBorde, matBorde, labelSprite, x, z, hw, hh })
  })

  // ── Animación de entrada ──────────────────────────────────────────────────
  function animarEntrada(onComplete) {
    grupo.visible = true

    datosAnimacion.forEach(function(datos) {
      const { nodos, meshGrad, grupoBorde, matBorde, labelSprite, x, z, hw, hh } = datos

      // Reset
      nodos.forEach(function(n) { n.nodo.position.x = n.cx; n.nodo.position.z = n.cz })
      meshGrad.scale.set(0.001, 1, 0.001)
      grupoBorde.scale.set(0.001, 1, 0.001)
      if (labelSprite) labelSprite.material.opacity = 0

      // Fase 1→2: expandir en Z
      var proxyZ = { v: 0 }
      gsap.to(proxyZ, {
        v: 1, duration: 0.35, ease: 'power2.out',
        onUpdate: function() {
          nodos.forEach(function(n) { n.nodo.position.z = n.cz + n.signoZ * hh * proxyZ.v })
          meshGrad.scale.z   = Math.max(proxyZ.v, 0.001)
          meshGrad.scale.x   = 0.001
          grupoBorde.scale.z = Math.max(proxyZ.v, 0.001)
          grupoBorde.scale.x = 0.001
        },
        onComplete: function() {
          // Fase 2→3: expandir en X
          var proxyX = { v: 0 }
          gsap.to(proxyX, {
            v: 1, duration: 0.45, ease: 'back.out(1.4)',
            onUpdate: function() {
              nodos.forEach(function(n) { n.nodo.position.x = n.cx + n.signoX * hw * proxyX.v })
              meshGrad.scale.x   = Math.max(proxyX.v, 0.001)
              grupoBorde.scale.x = Math.max(proxyX.v, 0.001)
            },
            onComplete: function() {
              nodos.forEach(function(n) { n.nodo.position.x = n.finalX; n.nodo.position.z = n.finalZ })
              meshGrad.scale.set(1, 1, 1)
              grupoBorde.scale.set(1, 1, 1)
              if (labelSprite) {
                gsap.to(labelSprite.material, { opacity: 1, duration: 0.4, ease: 'power2.out' })
              }
              if (onComplete) onComplete()
            }
          })
        }
      })
    })
  }

  // ── Animación de salida ───────────────────────────────────────────────────
  function animarSalida(onComplete) {
    datosAnimacion.forEach(function(datos) {
      const { nodos, meshGrad, grupoBorde, labelSprite, x, z, hw, hh } = datos

      if (labelSprite) {
        gsap.to(labelSprite.material, { opacity: 0, duration: 0.2, ease: 'power2.in' })
      }
      var proxyX = { v: 1 }
      gsap.to(proxyX, {
        v: 0, duration: 0.3, ease: 'power2.in',
        onUpdate: function() {
          nodos.forEach(function(n) { n.nodo.position.x = n.cx + n.signoX * hw * proxyX.v })
          meshGrad.scale.x   = Math.max(proxyX.v, 0.001)
          grupoBorde.scale.x = Math.max(proxyX.v, 0.001)
        },
        onComplete: function() {
          var proxyZ = { v: 1 }
          gsap.to(proxyZ, {
            v: 0, duration: 0.25, ease: 'power2.in',
            onUpdate: function() {
              nodos.forEach(function(n) { n.nodo.position.z = n.cz + n.signoZ * hh * proxyZ.v })
              meshGrad.scale.z   = Math.max(proxyZ.v, 0.001)
              grupoBorde.scale.z = Math.max(proxyZ.v, 0.001)
            },
            onComplete: function() {
              grupo.visible = false
              nodos.forEach(function(n) { n.nodo.position.set(n.cx, n.nodo.position.y, n.cz) })
              meshGrad.scale.set(0.001, 1, 0.001)
              grupoBorde.scale.set(0.001, 1, 0.001)
              if (onComplete) onComplete()
            }
          })
        }
      })
    })
  }

  // ── Botón ──
  const btn = document.createElement('button')
  btn.textContent = 'Zona'
  btn.className   = 'btn'
  btn.addEventListener('click', function() {
    if (!grupo.visible) { animarEntrada(); btn.classList.add('active') }
    else { animarSalida(function() { btn.classList.remove('active') }) }
  })
  document.getElementById('cc-controls').appendChild(btn)

  return { grupo, animarEntrada, animarSalida }
}
