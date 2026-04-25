// src/cancha/chart-stat-card.js
// Componente overlay con gráfica de línea + barras de estadísticas
// Misma firma que stat-card.js: retorna { wrapper, tickChartStatCard }
//
// USO EN script.js:
//
//   import { createChartStatCard } from './cancha/chart-stat-card.js'
//
//   const { wrapper: chartCardEl, tickChartStatCard } = createChartStatCard(scene, camera, {
//     jugador: { ...porNumero(9), y: 8.0 },
//     datos: {
//       valor:       10.1,
//       titulo:      'centros/partido',
//       puntoActual: 87,
//       serie: [
//         { label: 'Jun', valor: 28 },
//         { label: 'Jul', valor: 55 },
//         { label: 'Aug', valor: 48 },
//         { label: 'Sep', valor: 87 },
//       ],
//       stats: [
//         { label: 'confianza', valor: 0.81 },
//         { label: 'precisión', valor: 0.74 },
//       ],
//     },
//   })
//
//   // En el loop de animación — junto a tickStatCard():
//   tickChartStatCard()
//
//   // Para actualizar datos en caliente:
//   chartCardEl.__update({
//     valor: 12.3,
//     puntoActual: 92,
//     serie: [...],
//     stats: [...],
//   })

import * as THREE from 'three'

const _pos = new THREE.Vector3()

// ── Estilos — inyectados una sola vez ──────────────────────────────────────
function inyectarEstilos() {
  if (document.getElementById('csc-font')) return

  const link = document.createElement('link')
  link.id   = 'csc-font'
  link.rel  = 'stylesheet'
  link.href = 'https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@300;400;600;700&family=Barlow:wght@300;400;500&family=Poppins:wght@400;500&family=JetBrains+Mono:wght@300;400&display=swap'
  document.head.appendChild(link)

  const style = document.createElement('style')
  style.id = 'csc-styles'
  style.textContent = `
    .csc-wrapper {
      position: fixed;
      pointer-events: none;
      user-select: none;
      transition: opacity 0.25s ease;
      z-index: 10;
    }
    .csc-card {
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 24px 24px 40px 24px;
      gap: 24px;
      isolation: isolate;
      width: 341.34px;
      background: rgba(11, 21, 33, 0.5);
      border: 1px solid rgba(100, 200, 255, 0.35);
      box-shadow: 0px 8px 32px rgba(0, 0, 0, 0.37),
                  0 0 0 1px rgba(42, 186, 220, 0.2),
                  0 0 12px rgba(42, 186, 220, 0.25),
                  0 0 30px rgba(37, 159, 235, 0.1),
                  0 0 20px rgba(37, 159, 235, 0.08) inset;
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      border-radius: 20px;
      font-family: 'Barlow', 'Barlow Condensed', sans-serif;
      position: relative;
      overflow: hidden;
    }
    .csc-corner-glow {
      position: absolute;
      width: 128px;
      height: 128px;
      right: -39px;
      top: -39px;
      background: rgba(37, 159, 235, 0.1);
      filter: blur(20px);
      border-radius: 9999px;
      pointer-events: none;
      z-index: 0;
    }
    .csc-hero {
      display: flex;
      align-items: baseline;
      gap: 10px;
      width: 100%;
    }
    .csc-hero-num {
      font-family: 'Poppins', sans-serif;
      font-style: normal;
      font-weight: 300;
      font-size: 57.8599px;
      line-height: 58px;
      letter-spacing: -2.3144px;
      color: #ffffff;
      flex: none;
      order: 0;
      flex-grow: 0;
    }
    .csc-hero-lbl {
      font-family: 'Poppins', sans-serif;
      font-style: normal;
      font-weight: 400;
      font-size: 13px;
      line-height: 20px;
      color: rgba(255, 255, 255, 0.82);
      flex: none;
      order: 1;
      flex-grow: 0;
    }
    .csc-chart-wrap {
      width: 100%;
      position: relative;
    }
    .csc-chart-svg {
      width: 100%;
      display: block;
      overflow: visible;
    }
    .csc-stats {
      display: flex;
      flex-direction: column;
      gap: 14px;
      width: 100%;
    }
    .csc-stat-row {
      display: flex;
      flex-direction: column;
      gap: 6px;
      width: 100%;
    }
    .csc-stat-header {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
    }
    .csc-stat-lbl {
      font-family: 'JetBrains Mono', monospace;
      font-weight: 400;
      font-size: 12px;
      line-height: 15px;
      color: rgba(255,255,255,0.72);
      text-transform: lowercase;
    }
    .csc-stat-val {
      font-family: 'JetBrains Mono', monospace;
      font-weight: 300;
      font-size: 12px;
      line-height: 15px;
      color: #94A3B8;
      letter-spacing: 0.04em;
    }
    .csc-bar-track {
      width: 100%;
      height: 3px;
      background: rgba(255,255,255,0.07);
      border-radius: 2px;
      overflow: hidden;
    }
    .csc-bar-fill {
      height: 100%;
      border-radius: 2px;
      background: linear-gradient(90deg, #1a5adc 0%, #2abadc 100%);
      box-shadow: 0 0 6px rgba(42,186,220,0.6);
      transition: width 0.6s cubic-bezier(0.16,1,0.3,1);
    }
  `
  document.head.appendChild(style)
}

// ── Curva SVG suave (bezier) ───────────────────────────────────────────────
function buildCurve(pts) {
  if (pts.length < 2) return ''
  let d = `M ${pts[0].x} ${pts[0].y}`
  for (let i = 1; i < pts.length; i++) {
    const p = pts[i - 1], c = pts[i]
    const dx = (c.x - p.x) * 0.42
    d += ` C ${p.x + dx} ${p.y}, ${c.x - dx} ${c.y}, ${c.x} ${c.y}`
  }
  return d
}

// ── SVG de gráfica ─────────────────────────────────────────────────────────
function buildChartSVG(serie, puntoActual) {
  const W = 264, H = 124
  const pad = { top: 10, right: 6, bottom: 26, left: 2 }
  const iW  = W - pad.left - pad.right
  const iH  = H - pad.top  - pad.bottom

  const vals = serie.map(d => d.valor)
  const minV = Math.min(...vals) * 0.80
  const maxV = Math.max(...vals) * 1.06

  const pts = serie.map((d, i) => ({
    x: pad.left + (i / (serie.length - 1)) * iW,
    y: pad.top  + (1 - (d.valor - minV) / (maxV - minV)) * iH,
    label: d.label,
  }))

  const linePath = buildCurve(pts)
  const lp = pts[pts.length - 1]
  const fp = pts[0]
  const areaPath = linePath + ` L ${lp.x} ${pad.top + iH} L ${fp.x} ${pad.top + iH} Z`

  const refs = [0.33, 0.66].map(t => {
    const y = pad.top + iH * t
    return `<line x1="${pad.left}" y1="${y.toFixed(1)}" x2="${pad.left + iW}" y2="${y.toFixed(1)}"
      stroke="rgba(255,255,255,0.055)" stroke-width="1" stroke-dasharray="4 7"/>`
  }).join('')

  const xLabels = serie.map((d, i) => {
    const x = pad.left + (i / (serie.length - 1)) * iW
    return `<text x="${x.toFixed(1)}" y="${H - 4}" text-anchor="middle"
      fill="rgba(255,255,255,0.28)" font-family="Barlow Condensed,sans-serif"
      font-size="11" letter-spacing="0.04em">${d.label}</text>`
  }).join('')

  const dot  = lp
  const ttX  = Math.min(dot.x + 6, W - 50)

  return `
    <svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" class="csc-chart-svg">
      <defs>
        <linearGradient id="csc-ag" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stop-color="rgba(42,140,255,0.28)"/>
          <stop offset="100%" stop-color="rgba(20,60,180,0)"/>
        </linearGradient>
        <linearGradient id="csc-lg" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%"   stop-color="rgba(20,80,200,0.7)"/>
          <stop offset="55%"  stop-color="rgba(42,140,255,1)"/>
          <stop offset="100%" stop-color="rgba(110,215,255,1)"/>
        </linearGradient>
        <filter id="csc-gf">
          <feGaussianBlur stdDeviation="2" result="b"/>
          <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>
      ${refs}
      <path d="${areaPath}" fill="url(#csc-ag)"/>
      <path d="${linePath}" fill="none" stroke="url(#csc-lg)" stroke-width="2.2"
        stroke-linecap="round" filter="url(#csc-gf)"/>
      <line x1="${dot.x.toFixed(1)}" y1="${(dot.y + 6).toFixed(1)}"
            x2="${dot.x.toFixed(1)}" y2="${(pad.top + iH).toFixed(1)}"
        stroke="rgba(80,160,255,0.28)" stroke-width="1" stroke-dasharray="3 5"/>
      <circle cx="${dot.x.toFixed(1)}" cy="${dot.y.toFixed(1)}" r="4.5"
        fill="rgba(8,16,34,1)" stroke="rgba(110,210,255,1)" stroke-width="2"
        filter="url(#csc-gf)"/>
      <rect x="${ttX.toFixed(1)}" y="${(dot.y - 30).toFixed(1)}" width="44" height="22" rx="6"
        fill="rgba(22,60,130,0.78)" stroke="rgba(80,160,255,0.35)" stroke-width="1"/>
      <text x="${(ttX + 22).toFixed(1)}" y="${(dot.y - 14).toFixed(1)}" text-anchor="middle"
        fill="rgba(140,210,255,1)" font-family="Barlow Condensed,sans-serif"
        font-size="13" font-weight="600">${puntoActual}%</text>
      ${xLabels}
    </svg>`
}

// ── HTML de las barras de stats ────────────────────────────────────────────
function buildStats(stats) {
  return stats.map(s => `
    <div class="csc-stat-row">
      <div class="csc-stat-header">
        <span class="csc-stat-lbl">${s.label}</span>
        <span class="csc-stat-val">${parseFloat(s.valor).toFixed(2)}</span>
      </div>
      <div class="csc-bar-track">
        <div class="csc-bar-fill" style="width:${Math.round(s.valor * 100)}%"></div>
      </div>
    </div>`).join('')
}

// ── Render del card completo ───────────────────────────────────────────────
function renderCard(card, datos) {
  const {
    valor       = 0,
    titulo      = '',
    puntoActual = 0,
    serie       = [],
    stats       = [],
  } = datos

  card.innerHTML = `
    <div class="csc-corner-glow"></div>
    <div class="csc-hero">
      <span class="csc-hero-num">${parseFloat(valor).toFixed(1)}</span>
      <span class="csc-hero-lbl">${titulo}</span>
    </div>
    <div class="csc-chart-wrap">${buildChartSVG(serie, puntoActual)}</div>
    <div class="csc-stats">${buildStats(stats)}</div>`
}

// ── Factory — idéntica firma a createStatCard ──────────────────────────────
export function createChartStatCard(scene, camera, opciones = {}) {
  const {
    jugador = { x: 0, z: 0, y: 8.0 },
    datos   = {},
  } = opciones

  inyectarEstilos()

  // ── Wrapper (mismo patrón que stat-card.js) ────────────────────────────
  const wrapper = document.createElement('div')
  wrapper.className     = 'csc-wrapper'
  wrapper.style.display = 'none'
  wrapper.style.opacity = '0'
  document.body.appendChild(wrapper)

  const card = document.createElement('div')
  card.className = 'csc-card'
  wrapper.appendChild(card)

  // Render inicial
  renderCard(card, datos)

  // API pública para actualizar datos en caliente desde script.js
  wrapper.__update = (nuevosDatos) => {
    Object.assign(datos, nuevosDatos)
    renderCard(card, datos)
  }

  // Posición 3D de anclaje
  const pos3D = new THREE.Vector3(
    jugador.x,
    jugador.y !== undefined ? jugador.y : 8.0,
    jugador.z
  )

  // ── tickChartStatCard — misma lógica de proyección que stat-card.js ────
  function tickChartStatCard() {
    _pos.copy(pos3D)
    _pos.project(camera)

    if (_pos.z > 1) {
      wrapper.style.opacity = '0'
      return
    }
    wrapper.style.opacity = '1'

    const x = ( _pos.x * 0.5 + 0.5) * window.innerWidth
    const y = (-_pos.y * 0.5 + 0.5) * window.innerHeight

    wrapper.style.left      = x + 'px'
    wrapper.style.top       = (y - 70) + 'px'     // mismo offset vertical que stat-card.js
    wrapper.style.transform = 'translate(-50%, -100%)'
  }

  // ── Botón de toggle en #cc-controls (igual que stat-card.js) ──────────
  let visible = false

  const btn = document.createElement('button')
  btn.textContent = datos.titulo || 'Stat'
  btn.className   = 'btn'
  btn.addEventListener('click', function () {
    visible = !visible
    wrapper.style.display = visible ? 'block' : 'none'
    this.classList.toggle('active', visible)
  })

  const menu = document.getElementById('cc-controls')
  if (menu) menu.appendChild(btn)

  return { wrapper, tickChartStatCard }
}