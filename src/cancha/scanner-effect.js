/**
 * ScannerEffect v5
 *
 * - Sin partículas
 * - Malla hexagonal fina
 * - Avanza en Z (portería a portería)
 * - start() / stop() con animación de fade in/out
 */

import * as THREE from 'three'

// ─────────────────────────────────────────────────────────────────────────────
// SHADERS
// ─────────────────────────────────────────────────────────────────────────────

const SCANNER_VERT = /* glsl */`
  varying vec3 vWorldPos;
  void main() {
    vec4 wp   = modelMatrix * vec4(position, 1.0);
    vWorldPos = wp.xyz;
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`

const SCANNER_FRAG = /* glsl */`
  uniform float uTime;
  uniform float uProgress;      // 0..1 posición del scanner en Z
  uniform vec3  uColor;
  uniform float uIntensity;     // fade global (0 = invisible, 1 = full)
  uniform float uLeadWidth;
  uniform float uFieldLength;
  uniform float uFieldWidth;
  uniform float uPulse;
  uniform float uHexSize;
  uniform float uTrailLength;

  varying vec3 vWorldPos;

  float hash21(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
  float noise(vec2 p){
    vec2 i=floor(p),f=fract(p); f=f*f*(3.0-2.0*f);
    return mix(mix(hash21(i),hash21(i+vec2(1,0)),f.x),
               mix(hash21(i+vec2(0,1)),hash21(i+vec2(1,1)),f.x),f.y);
  }
  // FBM: 2 octavas en vez de 3 — ahorra ~33% del noise cost, diferencia invisible
  float fbm(vec2 p){
    float v=0.0,a=0.5;
    for(int i=0;i<2;i++){v+=a*noise(p);p*=2.1;a*=0.5;}
    return v;
  }

  // Grid hexagonal analítico — sin loop de 9 iteraciones
  // Usa el método de transformación axial para hex grids, O(1) por fragmento
  vec2 hexCell(vec2 p, float size) {
    // Espacio hex: transformar a coordenadas de cubo axial
    float h = size * 1.7320508; // sqrt(3) * size
    float w = size * 2.0;

    // Convertir a espacio de cuadrícula hex (skewed)
    vec2 q = vec2(p.x / (w * 0.75), (p.y - mod(floor(p.x/(w*0.75)), 2.0) * h * 0.5) / h);

    // Celda base y las 2 candidatas del offset (la única ambigüedad en hex offset grids)
    float col0 = floor(p.x / (w * 0.75));
    float off0  = mod(col0, 2.0) * h * 0.5;
    float row0  = floor((p.y - off0) / h);

    float col1  = col0 + 1.0;
    float off1  = mod(col1, 2.0) * h * 0.5;
    float row1a = floor((p.y - off1) / h);
    float row1b = row1a + 1.0;

    // Centros de las 3 celdas candidatas
    vec2 c0 = vec2(col0 * w * 0.75 + size * 0.5, row0 * h + h * 0.5 + off0);
    vec2 c1 = vec2(col1 * w * 0.75 + size * 0.5, row1a * h + h * 0.5 + off1);
    vec2 c2 = vec2(col1 * w * 0.75 + size * 0.5, row1b * h + h * 0.5 + off1);

    // También col0, row+1 para el borde vertical
    float row0b = row0 + 1.0;
    vec2 c3 = vec2(col0 * w * 0.75 + size * 0.5, row0b * h + h * 0.5 + off0);

    // Seleccionar la más cercana entre las 4 candidatas (cubre todos los casos)
    float d0 = length(p - c0);
    float d1 = length(p - c1);
    float d2 = length(p - c2);
    float d3 = length(p - c3);

    vec2  bestC  = c0; float bestD = d0;
    vec2  bestRC = vec2(col0, row0);
    if(d1 < bestD){ bestD = d1; bestC = c1; bestRC = vec2(col1, row1a); }
    if(d2 < bestD){ bestD = d2; bestC = c2; bestRC = vec2(col1, row1b); }
    if(d3 < bestD){ bestD = d3; bestC = c3; bestRC = vec2(col0, row0b); }

    return vec2(hash21(bestRC * 0.1), bestD / size);
  }

  void main() {
    float scanX      = (uProgress - 0.5) * uFieldLength;
    float distToLead = vWorldPos.x - scanX;  // neg = ya escaneado

    // ── Estela hexagonal ─────────────────────────────────────────────────
    float behindMask = step(distToLead, 0.0);
    float trailFade  = smoothstep(-uFieldLength * uTrailLength, -uLeadWidth * 0.3, distToLead) * behindMask;

    vec2  hx        = hexCell(vec2(vWorldPos.x, vWorldPos.z), uHexSize);
    float hexId     = hx.x;
    float hexDist   = hx.y;

    // Bordes más definidos: rango angosto de smoothstep = hexágonos más nítidos
    float hexBorder = smoothstep(0.84, 0.92, hexDist);   // borde fino y claro
    float hexFill   = smoothstep(0.88, 0.72, hexDist);   // interior bien definido

    // Variación de opacidad por celda — rango más alto para que sean visibles
    float organic   = fbm(vec2(vWorldPos.x * 0.04, vWorldPos.z * 0.04) + uTime * 0.007);
    organic         = pow(organic, 1.2);
    float cellOp    = 0.45 + mix(hexId, organic, 0.5) * 0.55;  // mínimo 0.45, máximo 1.0
    float flicker   = 0.90 + 0.10 * sin(uTime * (1.0 + hexId * 3.5) + hexId * 6.28);

    float edgeBoost = smoothstep(-uLeadWidth * 1.5, -uLeadWidth * 0.1, distToLead) * behindMask;

    // Más opacidad base en fill y borde
    float hexAlpha  = (hexFill * cellOp * 0.88 + hexBorder * 0.60) * flicker * trailFade;
    hexAlpha       += hexFill * edgeBoost * cellOp * 0.70;
    hexAlpha        = clamp(hexAlpha, 0.0, 1.0);

    // ── Franja frontal — solo filo limpio, sin ruido alrededor ───────────
    // Línea dura y brillante en el borde exacto del scanner
    // Línea central muy fina y dura
    float leadCore = smoothstep(0.18, 0.0, abs(distToLead));
    // Glow interior — algo más ancho que el core
    float leadGlow1 = smoothstep(0.9, 0.0, abs(distToLead)) * 0.55;
    // Glow exterior difuso — halo más amplio
    float leadGlow2 = smoothstep(2.2, 0.0, abs(distToLead)) * 0.22;

    float leadAlpha = (leadCore + leadGlow1 + leadGlow2) * uPulse;

    // ── Combinar ─────────────────────────────────────────────────────────
    float total = clamp((hexAlpha + leadAlpha) * uIntensity, 0.0, 1.0);

    vec3 col = uColor;
    // Core blanco-cian muy brillante, glow más frío
    col += vec3(0.6, 0.9, 1.0) * leadCore * 1.8;
    col += vec3(0.0, 0.5, 0.8) * leadGlow1 * 0.6;
    float lr = clamp(leadAlpha / max(total, 0.001), 0.0, 1.0);
    col  = mix(col * 0.65, col, lr);

    gl_FragColor = vec4(col, total);
  }
`

// ─────────────────────────────────────────────────────────────────────────────
// CLASE
// ─────────────────────────────────────────────────────────────────────────────

export class ScannerEffect {
  /**
   * @param {THREE.Scene} scene
   * @param {Object} [options]
   * @param {number} [options.width=68]          Ancho cancha (X)
   * @param {number} [options.height=105]         Largo cancha (Z) — eje de avance
   * @param {number} [options.speed=0.09]         Velocidad (fracción campo/seg)
   * @param {number} [options.color=0x00ccff]     Color hex
   * @param {number} [options.direction=1]        1 = Z+→Z-, -1 = invertido
   * @param {number} [options.yOffset=0.05]       Altura sobre el suelo
   * @param {number} [options.leadWidth=5]        Ancho de la franja (metros)
   * @param {number} [options.hexSize=0.55]       Radio del hexágono — pequeño
   * @param {number} [options.trailLength=0.6]    Longitud estela (0..1)
   * @param {number} [options.fadeDuration=1.2]   Duración del fade in/out (seg)
   * @param {string} [options.buttonId]           ID del botón HTML que controla el efecto
   */
  constructor(scene, options = {}) {
    this.scene  = scene
    this.params = {
      width:        options.width        ?? 68,
      height:       options.height       ?? 105,
      speed:        options.speed        ?? 0.16,
      color:        options.color        ?? 0x00ccff,
      direction:    options.direction    ?? 1,
      yOffset:      options.yOffset      ?? 0.05,
      leadWidth:    options.leadWidth    ?? 5,
      hexSize:      options.hexSize      ?? 0.32,
      trailLength:  options.trailLength  ?? 0.6,
      fadeDuration: options.fadeDuration ?? 1.2,
      buttonId:     options.buttonId     ?? null,
    }

    this._progress    = -0.08
    this._time        = 0
    this._pulse       = 1.0
    this._pulseDir    = 1
    this._running     = false   // si el scanner avanza
    this._active      = false   // estado lógico (visible)
    this._intensity   = 0       // valor actual del fade (0..1)
    this._fadeTarget  = 0       // hacia dónde va el fade
    this._fadeSpeed   = 1 / this.params.fadeDuration

    this._group = new THREE.Group()
    this.scene.add(this._group)

    this._buildBand()
    this._buildButton()
  }

  // ── Construcción de la banda ───────────────────────────────────────────────
  _buildBand() {
    const { width, height, leadWidth, hexSize, trailLength, yOffset } = this.params

    const geo = new THREE.PlaneGeometry(height, width, 1, 1)
    geo.rotateX(-Math.PI / 2)

    this._bandMat = new THREE.ShaderMaterial({
      vertexShader:   SCANNER_VERT,
      fragmentShader: SCANNER_FRAG,
      transparent:    true,
      depthWrite:     false,
      blending:       THREE.AdditiveBlending,
      side:           THREE.DoubleSide,
      uniforms: {
        uTime:        { value: 0 },
        uProgress:    { value: 0 },
        uColor:       { value: new THREE.Color(this.params.color) },
        uIntensity:   { value: 0 },
        uLeadWidth:   { value: leadWidth },
        uFieldLength: { value: height },
        uFieldWidth:  { value: width },
        uPulse:       { value: 1.0 },
        uHexSize:     { value: hexSize },
        uTrailLength: { value: trailLength },
      },
    })

    const mesh = new THREE.Mesh(geo, this._bandMat)
    mesh.position.y = yOffset
    this._group.add(mesh)
  }

  // ── Botón HTML ─────────────────────────────────────────────────────────────
  _buildButton() {
    // Crear botón si no se pasó un buttonId externo
    const existingId = this.params.buttonId
    let btn

    if (existingId) {
      btn = document.getElementById(existingId)
    }

    if (!btn) {
      btn = document.createElement('button')
      btn.id = 'scanner-toggle-btn'

      Object.assign(btn.style, {
        position:        'fixed',
        bottom:          '28px',
        right:           '28px',
        zIndex:          '1000',
        padding:         '10px 22px',
        background:      'rgba(0, 10, 25, 0.82)',
        border:          '1px solid rgba(0, 204, 255, 0.45)',
        borderRadius:    '6px',
        color:           '#00ccff',
        fontFamily:      '"JetBrains Mono", monospace',
        fontSize:        '11px',
        letterSpacing:   '0.12em',
        textTransform:   'uppercase',
        cursor:          'pointer',
        backdropFilter:  'blur(8px)',
        transition:      'border-color 0.25s, box-shadow 0.25s, color 0.25s',
        boxShadow:       '0 0 0px rgba(0,204,255,0)',
        userSelect:      'none',
      })

      btn.textContent = '⬡  SCAN'
      document.body.appendChild(btn)
    }

    this._btn = btn
    this._updateButtonStyle()

    btn.addEventListener('click', () => this.toggle())

    // Hover
    btn.addEventListener('mouseenter', () => {
      btn.style.borderColor = 'rgba(0, 204, 255, 0.9)'
      btn.style.boxShadow   = '0 0 14px rgba(0, 204, 255, 0.35)'
    })
    btn.addEventListener('mouseleave', () => this._updateButtonStyle())
  }

  _updateButtonStyle() {
    if (!this._btn) return
    if (this._active) {
      this._btn.style.borderColor = 'rgba(0, 204, 255, 0.85)'
      this._btn.style.boxShadow   = '0 0 18px rgba(0, 204, 255, 0.4), inset 0 0 8px rgba(0,204,255,0.08)'
      this._btn.style.color       = '#7effff'
      this._btn.textContent       = '⬡  SCANNING'
    } else {
      this._btn.style.borderColor = 'rgba(0, 204, 255, 0.35)'
      this._btn.style.boxShadow   = '0 0 0px rgba(0,204,255,0)'
      this._btn.style.color       = '#00ccff'
      this._btn.textContent       = '⬡  SCAN'
    }
  }

  // ── API pública ────────────────────────────────────────────────────────────

  /** Activa el efecto con fade in */
  activate() {
    if (this._active) return
    this._active      = true
    this._running     = true
    this._fadeTarget  = 1
    this._progress    = -0.08
    this._updateButtonStyle()
  }

  /** Desactiva el efecto con fade out */
  deactivate() {
    if (!this._active) return
    this._active     = false
    this._fadeTarget = 0
    this._updateButtonStyle()
    // El avance se detiene cuando el fade llega a 0 (en update)
  }

  /** Alterna entre activo/inactivo */
  toggle() {
    this._active ? this.deactivate() : this.activate()
  }

  dispose() {
    this._group.traverse(obj => {
      obj.geometry?.dispose()
      obj.material?.dispose()
    })
    this.scene.remove(this._group)
    if (this._btn && !this.params.buttonId) this._btn.remove()
  }

  /**
   * Llamar en el animation loop
   * @param {number} delta  clock.getDelta()
   */
  update(delta) {
    this._time += delta

    // Fade in / out
    if (this._intensity !== this._fadeTarget) {
      const dir  = this._fadeTarget > this._intensity ? 1 : -1
      this._intensity = Math.min(1, Math.max(0,
        this._intensity + dir * this._fadeSpeed * delta
      ))
      // Al terminar de desaparecer, detener avance
      if (this._intensity === 0) this._running = false
    }

    // Avance del scanner
    if (this._running) {
      this._progress += delta * this.params.speed * this.params.direction
      // Reinicia solo cuando la estela completa haya salido por el borde
      const loopEnd = 1.0 + this.params.trailLength + 0.05
      if (this._progress > loopEnd) this._progress = -0.08
      if (this._progress < -0.08)   this._progress = loopEnd
    }

    // Pulso
    this._pulse += delta * 0.55 * this._pulseDir
    if (this._pulse > 1.18) this._pulseDir = -1
    if (this._pulse < 0.82) this._pulseDir =  1

    const u = this._bandMat.uniforms
    u.uTime.value      = this._time
    u.uProgress.value  = this._progress
    u.uPulse.value     = this._pulse
    u.uIntensity.value = this._intensity
  }

  // ── Setters ───────────────────────────────────────────────────────────────

  set speed(v)      { this.params.speed = v }
  set direction(v)  { this.params.direction = v }
  set trailLength(v){ this.params.trailLength = v; this._bandMat.uniforms.uTrailLength.value = v }
  set hexSize(v)    { this.params.hexSize = v;     this._bandMat.uniforms.uHexSize.value = v }

  set color(hex) {
    this._bandMat.uniforms.uColor.value = new THREE.Color(hex)
  }

  get active()   { return this._active }
  get progress() { return this._progress }
}
