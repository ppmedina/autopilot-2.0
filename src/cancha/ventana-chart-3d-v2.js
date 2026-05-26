// src/cancha/ventana-chart-3d-v2.js
//
// Versión 3D (Three.js) del componente ventana-chart.js (HTML/CSS).
// Replica visualmente y conceptualmente el comportamiento del card HTML
// pero con volumen real, materiales PBR y textura canvas para el contenido.
//
// ESTRUCTURA:
//   - BoxGeometry con MeshPhysicalMaterial (clearcoat, transparente)
//     da el volumen real del card. Reacciona a la iluminación de la escena.
//   - PlaneGeometry frontal con CanvasTexture donde se dibuja TODO el
//     contenido (chart, título, leyenda, badge, etiquetas, números).
//   - Borde luminoso con EdgesGeometry para el toque hologram.
//   - SpotLight propio dedicado al card para resaltar su presencia.
//
// ANIMACIÓN DE ENTRADA (~6s):
//   1. Grupo aparece: scale 0.5→1, rotación X inicial → vertical, fade-in
//   2. Trazado del contorno cyan en el canvas
//   3. Aparición en cascada: header → leyenda → guías → curvas → puntos → relleno
//   4. Rotación a perspectiva final (rotacionY)
//
// USO EN script.js:
//
//   import { createVentanaChart3DV2 } from './cancha/ventana-chart-3d-v2.js'
//
//   const { grupo: ventanaChart3DV2, animarEntrada, animarSalida, tick } =
//     createVentanaChart3DV2(scene, camera, {
//       titulo: 'Centros por partido',
//       subtitulo: 'Resumen mensual',
//       badge: '+18% vs anterior',
//       series: [...], etiquetas: [...],
//       posicion: { x: -30, y: 18, z: -20 },
//       rotacionY: 0.3,
//     })
//   // En el render loop:
//   //   tick()

import * as THREE from 'three'
import gsap from 'gsap'

export function createVentanaChart3DV2(scene, camera, opciones = {}) {

  const {
    titulo      = 'Centros por partido',
    subtitulo   = 'Resumen mensual',
    badge       = '+18% vs anterior',
    series      = [
      { label: 'Este año',     color: '#4ED3FF', puntos: [8,  16, 11, 19, 24, 22] },
      { label: 'Año anterior', color: '#7BA4F5', puntos: [14, 12, 18, 13, 16, 15] },
    ],
    etiquetas   = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun'],
    posicion    = { x: -30, y: 18, z: -20 },
    rotacionY   = 0.3,
    // Dimensiones del card en unidades de escena
    ancho       = 60,
    alto        = 28,
    profundidad = 1.5,
  } = opciones

  // ── Grupo padre ──────────────────────────────────────────────────────────
  const grupo = new THREE.Group()
  grupo.position.set(posicion.x, posicion.y, posicion.z)
  grupo.rotation.y = 0   // arranca de frente; rota a rotacionY al final de la animación
  grupo.scale.set(0.5, 0.5, 0.5)   // arranca chico; escala a 1 en la entrada
  grupo.visible = false             // arranca invisible
  scene.add(grupo)

  // ── Card (Box con volumen) ───────────────────────────────────────────────
  // MeshPhysicalMaterial con clearcoat → reacciona a luces, da reflejos
  // sutiles que enriquecen la sensación de "objeto físico".
  const matMarco = new THREE.MeshPhysicalMaterial({
    color:              0x2a3a55,
    roughness:          0.20,
    metalness:          0.40,
    clearcoat:          1.0,
    clearcoatRoughness: 0.10,
    transparent:        true,
    opacity:            0.65,
    side:               THREE.DoubleSide,
  })
  const geoMarco = new THREE.BoxGeometry(ancho, alto, profundidad)
  const meshMarco = new THREE.Mesh(geoMarco, matMarco)
  grupo.add(meshMarco)

  // ── Bordes luminosos del card (cyan tenue) ───────────────────────────────
  // EdgesGeometry detecta las aristas de la BoxGeometry. Las pintamos cyan
  // con opacidad baja para sumar el toque hologram sin saturar.
  const geoBordes = new THREE.EdgesGeometry(geoMarco)
  const matBordes = new THREE.LineBasicMaterial({
    color:       0x4ED3FF,
    transparent: true,
    opacity:     0.35,
  })
  const lineasBordes = new THREE.LineSegments(geoBordes, matBordes)
  grupo.add(lineasBordes)

  // ── Canvas + textura para el contenido del card ──────────────────────────
  // Resolución alta para que se vea nítido a varias distancias.
  // Ratio = ancho/alto del card = 60/28 ≈ 2.14
  const CANVAS_W = 1800
  const CANVAS_H = Math.round(CANVAS_W * (alto / ancho))   // ≈ 840
  const canvas = document.createElement('canvas')
  canvas.width  = CANVAS_W
  canvas.height = CANVAS_H
  const ctx = canvas.getContext('2d')
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'

  const textura = new THREE.CanvasTexture(canvas)
  textura.anisotropy = 16
  textura.colorSpace = THREE.SRGBColorSpace

  // Plano frontal con la textura. Lo posicionamos en z=+profundidad/2 + 0.01
  // para que quede justo sobre la cara frontal del Box sin z-fighting.
  const matPlano = new THREE.MeshBasicMaterial({
    map:         textura,
    transparent: true,
    opacity:     0,   // arranca invisible — fade-in con GSAP en la entrada
    side:        THREE.FrontSide,
    depthWrite:  false,
  })
  const geoPlano = new THREE.PlaneGeometry(ancho, alto)
  const meshPlano = new THREE.Mesh(geoPlano, matPlano)
  meshPlano.position.z = profundidad / 2 + 0.01
  grupo.add(meshPlano)

  // ── SpotLight dedicado al card ───────────────────────────────────────────
  // La luz apunta desde adelante y arriba para resaltar el card.
  // Se agrega a la escena (no al grupo) para que su posición sea absoluta.
  const spotLight = new THREE.SpotLight(0xffffff, 8)
  spotLight.position.set(posicion.x, posicion.y + 15, posicion.z + 20)
  spotLight.target.position.set(posicion.x, posicion.y, posicion.z)
  spotLight.angle      = Math.PI / 6     // 30°
  spotLight.penumbra   = 0.5             // bordes suaves
  spotLight.decay      = 1.5
  spotLight.distance   = 80
  spotLight.intensity  = 0               // arranca apagada — fade-in con GSAP
  scene.add(spotLight)
  scene.add(spotLight.target)

  // ── Geometría del chart (en coordenadas del canvas) ──────────────────────
  // Mismas conventions que ventana-chart.js: padL es el espacio para los
  // números del eje Y, padR el margen derecho, padT arriba, padB abajo.
  // Lo escalamos proporcionalmente al canvas más grande.
  const padL = 90, padR = 35, padT = 130, padB = 95
  const gW   = CANVAS_W - padL - padR
  const gH   = CANVAS_H - padT - padB
  const minV = 0
  const maxV = 30
  const n    = etiquetas.length
  const px = i => padL + (i / (n - 1)) * gW
  const py = v => padT + gH - ((v - minV) / (maxV - minV)) * gH
  const pasos = 6

  function hexToRgb(hex) {
    const r = parseInt(hex.slice(1, 3), 16)
    const g = parseInt(hex.slice(3, 5), 16)
    const b = parseInt(hex.slice(5, 7), 16)
    return `${r},${g},${b}`
  }

  // ── Dibujar TODO el contenido en el canvas progresivamente ──────────────
  // Mismo concepto que en ventana-chart.js pero ajustado al canvas más
  // grande. Recibe el objeto `progresos` con valores 0-1 que controlan
  // qué se ve. Cada llamada redibuja el canvas completo.
  //
  // progresos:
  //   - outlineProg:  trazado del rectángulo del contorno (0→1)
  //   - headerOpac:   opacidad del header (título, subtítulo, badge, leyenda)
  //   - guias:        líneas guía + etiquetas (0→1)
  //   - lineas:       trazado de las curvas (0→1)
  //   - relleno:      área rellena debajo de cada curva (0→1)
  //   - puntos:       aparición de los puntos (sincronizado con lineas)
  //   - outlineOpac:  opacidad del outline cyan al final (1→0 para fade-out)
  function dibujarCanvas(p = {}) {
    const {
      outlineProg = 1,
      headerOpac  = 1,
      guias       = 1,
      lineas      = 1,
      relleno     = 1,
      puntos      = 1,
      outlineOpac = 1,
    } = p

    // Fondo transparente — el material del plano es transparent:true
    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H)

    // ─── 1) OUTLINE (rectángulo cyan que se traza progresivamente) ───
    // Dibujamos un rect con stroke-dasharray simulado con setLineDash.
    // El perímetro es 2*(W+H) aprox (sin contar las esquinas redondeadas
    // que son despreciables al tamaño del canvas).
    if (outlineProg > 0 && outlineOpac > 0) {
      ctx.save()
      const r = 40   // radio de las esquinas redondeadas
      const margen = 20
      const x0 = margen, y0 = margen
      const x1 = CANVAS_W - margen, y1 = CANVAS_H - margen
      // Path del rectángulo redondeado
      ctx.beginPath()
      ctx.moveTo(x0 + r, y0)
      ctx.lineTo(x1 - r, y0)
      ctx.arcTo(x1, y0, x1, y0 + r, r)
      ctx.lineTo(x1, y1 - r)
      ctx.arcTo(x1, y1, x1 - r, y1, r)
      ctx.lineTo(x0 + r, y1)
      ctx.arcTo(x0, y1, x0, y1 - r, r)
      ctx.lineTo(x0, y0 + r)
      ctx.arcTo(x0, y0, x0 + r, y0, r)
      ctx.closePath()
      // Perímetro aprox para el dash
      const perim = 2 * (x1 - x0) + 2 * (y1 - y0) - 8 * r + 2 * Math.PI * r
      ctx.setLineDash([perim, perim])
      ctx.lineDashOffset = perim * (1 - outlineProg)
      ctx.strokeStyle = `rgba(78, 211, 255, ${0.9 * outlineOpac})`
      ctx.lineWidth   = 3
      ctx.shadowColor = '#4ED3FF'
      ctx.shadowBlur  = 16
      ctx.stroke()
      ctx.restore()
    }

    // ─── 2) HEADER (título + subtítulo + badge + leyenda) ───
    if (headerOpac > 0) {
      ctx.save()
      ctx.globalAlpha = headerOpac

      // Título (grande, blanco)
      ctx.font         = '700 42px "Syne", sans-serif'
      ctx.fillStyle    = '#ffffff'
      ctx.textAlign    = 'left'
      ctx.textBaseline = 'top'
      ctx.fillText(titulo, padL, 50)

      // Subtítulo (chico, tenue)
      ctx.font      = '500 22px "JetBrains Mono", monospace'
      ctx.fillStyle = 'rgba(255,255,255,0.45)'
      ctx.fillText(subtitulo, padL, 100)

      // Badge (derecha, con fondo y borde cyan)
      ctx.font = '500 22px "JetBrains Mono", monospace'
      const badgeWidth = ctx.measureText(badge).width + 40
      const badgeHeight = 50
      const badgeX = CANVAS_W - padR - badgeWidth
      const badgeY = 50
      // Background del badge
      ctx.fillStyle = 'rgba(78, 211, 255, 0.1)'
      ctx.beginPath()
      ctx.roundRect(badgeX, badgeY, badgeWidth, badgeHeight, 25)
      ctx.fill()
      ctx.strokeStyle = 'rgba(78, 211, 255, 0.3)'
      ctx.lineWidth   = 2
      ctx.stroke()
      // Texto del badge
      ctx.fillStyle    = '#4ED3FF'
      ctx.textAlign    = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(badge, badgeX + badgeWidth / 2, badgeY + badgeHeight / 2)

      // Leyenda (debajo del título)
      let leyendaX = padL
      const leyendaY = 130
      series.forEach(s => {
        // Círculo de color (vacío con borde)
        ctx.beginPath()
        ctx.arc(leyendaX + 10, leyendaY, 9, 0, Math.PI * 2)
        ctx.strokeStyle = s.color
        ctx.lineWidth   = 3
        ctx.stroke()
        // Label
        ctx.font         = '500 22px "JetBrains Mono", monospace'
        ctx.fillStyle    = 'rgba(255,255,255,0.6)'
        ctx.textAlign    = 'left'
        ctx.textBaseline = 'middle'
        ctx.fillText(s.label, leyendaX + 28, leyendaY)
        leyendaX += ctx.measureText(s.label).width + 60
      })

      ctx.restore()
    }

    // ─── 3) Líneas guía horizontales + etiquetas del eje Y ───
    for (let i = 0; i <= pasos; i++) {
      const v = minV + ((maxV - minV) / pasos) * i
      const y = py(v)
      const visible = i / pasos <= guias
      if (!visible) continue
      const alphaLine = Math.min(1, (guias - i / pasos) * (pasos + 1)) * 0.18

      ctx.beginPath()
      ctx.moveTo(padL, y)
      ctx.lineTo(padL + gW, y)
      ctx.strokeStyle = `rgba(255,255,255,${alphaLine})`
      ctx.lineWidth   = 1.5
      ctx.stroke()

      // Número del eje Y
      ctx.font         = '500 26px "JetBrains Mono", monospace'
      ctx.fillStyle    = `rgba(255,255,255,${0.5 * Math.min(1, alphaLine / 0.18)})`
      ctx.textAlign    = 'left'
      ctx.textBaseline = 'middle'
      ctx.fillText(Math.round(v), 35, y)
    }

    // ─── 4) Etiquetas del eje X (meses) ───
    ctx.font         = '500 26px "JetBrains Mono", monospace'
    ctx.fillStyle    = `rgba(255,255,255,${0.5 * guias})`
    ctx.textBaseline = 'top'
    etiquetas.forEach((lbl, i) => {
      if (i === 0) {
        ctx.textAlign = 'left'
        ctx.fillText(lbl, padL, padT + gH + 25)
      } else if (i === etiquetas.length - 1) {
        ctx.textAlign = 'right'
        ctx.fillText(lbl, padL + gW, padT + gH + 25)
      } else {
        ctx.textAlign = 'center'
        ctx.fillText(lbl, px(i), padT + gH + 25)
      }
    })

    // ─── 5) Series (área rellena + línea trazada + puntos) ───
    series.forEach(serie => {
      const pts = serie.puntos
      const col = serie.color
      const rgb = hexToRgb(col)

      // 5a) Área rellena (debajo de la curva)
      if (relleno > 0) {
        ctx.save()
        ctx.beginPath()
        ctx.moveTo(px(0), py(pts[0]))
        for (let i = 1; i < n; i++) {
          const cpx = (px(i - 1) + px(i)) / 2
          ctx.bezierCurveTo(cpx, py(pts[i-1]), cpx, py(pts[i]), px(i), py(pts[i]))
        }
        ctx.lineTo(px(n - 1), padT + gH)
        ctx.lineTo(px(0),     padT + gH)
        ctx.closePath()
        const grad = ctx.createLinearGradient(0, padT, 0, padT + gH)
        grad.addColorStop(0,   `rgba(${rgb},${0.22 * relleno})`)
        grad.addColorStop(0.6, `rgba(${rgb},${0.06 * relleno})`)
        grad.addColorStop(1,   `rgba(${rgb},0)`)
        ctx.fillStyle = grad
        ctx.fill()
        ctx.restore()
      }

      // 5b) Línea trazada progresivamente con setLineDash.
      //     Doble pase: glow grueso + línea nítida.
      if (lineas > 0) {
        const pathDraw = () => {
          ctx.beginPath()
          ctx.moveTo(px(0), py(pts[0]))
          for (let i = 1; i < n; i++) {
            const cpx = (px(i - 1) + px(i)) / 2
            ctx.bezierCurveTo(cpx, py(pts[i-1]), cpx, py(pts[i]), px(i), py(pts[i]))
          }
        }
        // Largo real del path bezier (samples)
        let totalLen = 0
        const SAMPLES = 20
        for (let i = 1; i < n; i++) {
          const x0 = px(i-1), y0 = py(pts[i-1])
          const x3 = px(i),   y3 = py(pts[i])
          const cpx = (x0 + x3) / 2
          let prevX = x0, prevY = y0
          for (let s = 1; s <= SAMPLES; s++) {
            const t = s / SAMPLES
            const mt = 1 - t
            const sx = mt*mt*mt*x0 + 3*mt*mt*t*cpx + 3*mt*t*t*cpx + t*t*t*x3
            const sy = mt*mt*mt*y0 + 3*mt*mt*t*y0  + 3*mt*t*t*y3  + t*t*t*y3
            const dx = sx - prevX
            const dy = sy - prevY
            totalLen += Math.sqrt(dx*dx + dy*dy)
            prevX = sx
            prevY = sy
          }
        }

        // Pase 1: GLOW (línea gruesa semi-transparente con shadowBlur)
        ctx.save()
        pathDraw()
        ctx.setLineDash([totalLen, totalLen])
        ctx.lineDashOffset = totalLen * (1 - lineas)
        ctx.strokeStyle = `rgba(${rgb},0.18)`
        ctx.lineWidth   = 6
        ctx.shadowColor = col
        ctx.shadowBlur  = 12
        ctx.lineCap     = 'round'
        ctx.lineJoin    = 'round'
        ctx.stroke()
        ctx.restore()

        // Pase 2: LÍNEA NÍTIDA (color sólido, sin shadowBlur)
        ctx.save()
        pathDraw()
        ctx.setLineDash([totalLen, totalLen])
        ctx.lineDashOffset = totalLen * (1 - lineas)
        ctx.strokeStyle = col
        ctx.lineWidth   = 3
        ctx.shadowBlur  = 0
        ctx.lineCap     = 'round'
        ctx.lineJoin    = 'round'
        ctx.stroke()
        ctx.restore()
      }

      // 5c) Puntos sincronizados con la línea
      pts.forEach((v, i) => {
        const tPunto = i / (n - 1)
        const delta = puntos - tPunto
        if (delta < 0) return
        const alphaPunto = Math.min(1, delta * 20)
        if (alphaPunto <= 0) return
        ctx.save()
        ctx.globalAlpha = alphaPunto

        // Glow exterior
        ctx.beginPath()
        ctx.arc(px(i), py(v), 11, 0, Math.PI * 2)
        ctx.fillStyle   = `rgba(${rgb},0.20)`
        ctx.shadowColor = col
        ctx.shadowBlur  = 12
        ctx.fill()

        // Círculo color sólido
        ctx.beginPath()
        ctx.arc(px(i), py(v), 8, 0, Math.PI * 2)
        ctx.fillStyle  = col
        ctx.shadowBlur = 0
        ctx.fill()

        // Punto blanco al centro
        ctx.beginPath()
        ctx.arc(px(i), py(v), 4, 0, Math.PI * 2)
        ctx.fillStyle = '#ffffff'
        ctx.fill()

        ctx.restore()
      })
    })

    // Marcar la textura como dirty para que Three.js la suba a la GPU
    textura.needsUpdate = true
  }

  // Dibujado inicial — todo invisible
  dibujarCanvas({
    outlineProg: 0, headerOpac: 0, guias: 0,
    lineas: 0, relleno: 0, puntos: 0, outlineOpac: 1,
  })

  // ── ANIMACIÓN DE ENTRADA ─────────────────────────────────────────────────
  // Estado animable
  const progresos = {
    outlineProg: 0,
    headerOpac:  0,
    guias:       0,
    lineas:      0,
    relleno:     0,
    puntos:      0,
    outlineOpac: 1,
  }

  function animarEntrada() {
    gsap.killTweensOf([grupo.position, grupo.rotation, grupo.scale, matPlano, spotLight, progresos])

    // Reset al estado inicial
    grupo.visible = true
    grupo.scale.set(0.5, 0.5, 0.5)
    grupo.rotation.set(-0.3, 0, 0)   // empieza "tirado boca arriba" un toque
    matPlano.opacity = 0
    matMarco.opacity = 0
    matBordes.opacity = 0
    spotLight.intensity = 0
    Object.assign(progresos, {
      outlineProg: 0, headerOpac: 0, guias: 0,
      lineas: 0, relleno: 0, puntos: 0, outlineOpac: 1,
    })
    dibujarCanvas(progresos)

    const tl = gsap.timeline()

    // 1. Aparición física del card (scale + rotación + opacidad de materiales)
    tl.to(grupo.scale,    { x: 1, y: 1, z: 1, duration: 0.8, ease: 'back.out(1.2)' }, 0)
    tl.to(grupo.rotation, { x: 0, duration: 0.8, ease: 'power3.out' }, 0)
    tl.to(matMarco,       { opacity: 0.65, duration: 0.5, ease: 'power2.out' }, 0.2)
    tl.to(matBordes,      { opacity: 0.35, duration: 0.5, ease: 'power2.out' }, 0.2)
    tl.to(matPlano,       { opacity: 1,    duration: 0.4, ease: 'power2.out' }, 0.4)
    tl.to(spotLight,      { intensity: 8,  duration: 0.8, ease: 'power2.out' }, 0.2)

    // 2. Trazado del contorno cyan en el canvas
    tl.to(progresos, {
      outlineProg: 1, duration: 1.0, ease: 'power2.inOut',
      onUpdate: () => dibujarCanvas(progresos),
    }, 0.6)

    // 3. Aparición del header (título + leyenda + badge)
    tl.to(progresos, {
      headerOpac: 1, duration: 0.6, ease: 'power2.out',
      onUpdate: () => dibujarCanvas(progresos),
    }, 1.4)

    // 4. Líneas guía + etiquetas
    tl.to(progresos, {
      guias: 1, duration: 1.0, ease: 'power2.out',
      onUpdate: () => dibujarCanvas(progresos),
    }, 1.8)

    // 5. Trazado de las CURVAS + puntos sincronizados
    tl.to(progresos, {
      lineas: 1, duration: 1.5, ease: 'power1.inOut',
      onUpdate: () => {
        progresos.puntos = progresos.lineas
        dibujarCanvas(progresos)
      },
    }, 2.4)

    // 6. Área rellena (gradientes)
    tl.to(progresos, {
      relleno: 1, duration: 0.9, ease: 'power2.out',
      onUpdate: () => dibujarCanvas(progresos),
    }, 3.9)

    // 7. Fade-out del outline cyan
    tl.to(progresos, {
      outlineOpac: 0, duration: 0.5, ease: 'power2.out',
      onUpdate: () => dibujarCanvas(progresos),
    }, 4.6)

    // 8. Rotación a perspectiva final (rotación Y del grupo en escena 3D)
    tl.to(grupo.rotation, {
      y: rotacionY,
      duration: 1.4,
      ease: 'power3.inOut',
    }, 5.2)

    return tl
  }

  // ── ANIMACIÓN DE SALIDA ──────────────────────────────────────────────────
  function animarSalida() {
    gsap.killTweensOf([grupo.position, grupo.rotation, grupo.scale, matPlano, matMarco, matBordes, spotLight])

    const tl = gsap.timeline({
      onComplete: () => {
        grupo.visible = false
      },
    })
    // Volver a plano y achicarse mientras se desvanece
    tl.to(grupo.rotation, { y: 0, duration: 0.5, ease: 'power2.in' }, 0)
    tl.to(grupo.scale,    { x: 0.7, y: 0.7, z: 0.7, duration: 0.6, ease: 'power2.in' }, 0.1)
    tl.to(matPlano,       { opacity: 0, duration: 0.5, ease: 'power2.in' }, 0.2)
    tl.to(matMarco,       { opacity: 0, duration: 0.5, ease: 'power2.in' }, 0.2)
    tl.to(matBordes,      { opacity: 0, duration: 0.5, ease: 'power2.in' }, 0.2)
    tl.to(spotLight,      { intensity: 0, duration: 0.5, ease: 'power2.in' }, 0.2)

    return tl
  }

  // ── Tick (placeholder — por si más adelante querés animaciones por frame)
  function tick() {
    // Vacío por ahora. Si en el futuro querés efecto de flotación o
    // billboard, va acá. Tiene que llamarse desde el render loop.
  }

  // ── Botón "Gráfica 3D" ───────────────────────────────────────────────────
  const btn = document.createElement('button')
  btn.textContent = 'Gráfica 3D'
  btn.className   = 'btn'
  let visible = false
  btn.addEventListener('click', function () {
    visible = !visible
    if (visible) {
      animarEntrada()
    } else {
      animarSalida()
    }
    this.classList.toggle('active', visible)
  })
  const ccControls = document.getElementById('cc-controls')
  if (ccControls) ccControls.appendChild(btn)

  // ── API pública ──────────────────────────────────────────────────────────
  return {
    grupo,
    animarEntrada,
    animarSalida,
    tick,
    // Utilidades por si querés interactuar con el componente desde fuera
    redibujar: () => dibujarCanvas(progresos),
  }
}