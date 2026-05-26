// src/cancha/frosted-glass-blur.js
// ════════════════════════════════════════════════════════════════════════════
// Blur real "tipo backdrop-filter" con WebGLRenderTarget + shaders.
//
// COMO FUNCIONA:
//   1. Renderizamos la escena (sin el panel) a un render target de baja
//      resolución.
//   2. Aplicamos un blur gaussiano horizontal sobre esa textura.
//   3. Aplicamos un blur gaussiano vertical encima → textura final borrosa.
//   4. El material del plano del panel muestra esa textura con UVs en
//      screen-space → el plano muestra lo que está detrás suyo, pero borroso.
//
// USO TIPICO (en script.js):
//
//   import { createFrostedGlassBlur } from './cancha/frosted-glass-blur.js'
//
//   const frostedGlass = createFrostedGlassBlur(renderer, {
//     downsample: 4,      // 1/4 de resolución (más rápido)
//     blurRadius: 8.0,    // intensidad del blur en píxeles
//     tint:       new THREE.Color(0x0a1422),
//     tintAmount: 0.35,   // 0=sin tinte, 1=totalmente del color del tinte
//   })
//
//   // Pasarle el material al plano del panel:
//   const meshVidrio = new THREE.Mesh(geometry, frostedGlass.material)
//
//   // En el animate loop, ANTES de renderear la escena final:
//   function animate() {
//     // Ocultar el grupo del panel para que NO se incluya en el blur
//     grupoSpider3D.visible = false
//     frostedGlass.updateBackdrop(scene, camera)
//     grupoSpider3D.visible = true
//
//     // ... ahora sí, render normal de la escena
//     finalComposer.render()
//   }
//
// IMPORTANTE: el material expuesto se aplica al MESH DEL VIDRIO únicamente.
// El resto del panel (header, radar, lista) sigue usando MeshBasicMaterial.
// ════════════════════════════════════════════════════════════════════════════

import * as THREE from 'three'

// ── Vertex shader compartido — pasa UV en clip-space (NDC) ──────────────────
// Para que el plano "vea lo que tiene detrás", calculamos las UVs a partir
// de la posición CLIP del vértice (gl_Position) y se las pasamos al fragment.
// Eso convierte el plano en un "lente" que muestrea la textura del backdrop
// según dónde cae cada píxel en pantalla.
const PANEL_VERTEX_SHADER = `
  varying vec2 vScreenUv;

  void main() {
    vec4 clipPos = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    // Convertir de NDC [-1,1] a UV [0,1] dividiendo por w (perspective-correct)
    vScreenUv = (clipPos.xy / clipPos.w) * 0.5 + 0.5;
    gl_Position = clipPos;
  }
`

// ── Fragment shader del panel — muestrea el backdrop borroso + tinte ────────
const PANEL_FRAGMENT_SHADER = `
  uniform sampler2D uBackdrop;
  uniform vec3      uTint;
  uniform float     uTintAmount;
  uniform float     uOpacity;

  varying vec2 vScreenUv;

  void main() {
    // Muestrear la textura borrosa del backdrop en la posición screen-space
    vec3 backdropColor = texture2D(uBackdrop, vScreenUv).rgb;

    // Mezclar con el tinte (oscurece/colorea)
    vec3 finalColor = mix(backdropColor, uTint, uTintAmount);

    gl_FragColor = vec4(finalColor, uOpacity);
  }
`

// ── Shader gaussiano de blur (1D, configurable horizontal/vertical) ─────────
// Pesos de un kernel gaussiano de 9 taps. Es un compromiso entre calidad y
// performance — para blurs muy intensos se hacen varias pasadas.
const BLUR_VERTEX_SHADER = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position, 1.0);
  }
`

const BLUR_FRAGMENT_SHADER = `
  uniform sampler2D uTexture;
  uniform vec2      uDirection;   // (1,0) horizontal, (0,1) vertical
  uniform vec2      uResolution;  // tamaño del render target en píxeles
  uniform float     uRadius;      // intensidad del blur (factor de paso)

  varying vec2 vUv;

  void main() {
    // Pesos de un gaussiano truncado a 9 taps (suma normalizada)
    float weights[5];
    weights[0] = 0.227027;
    weights[1] = 0.1945946;
    weights[2] = 0.1216216;
    weights[3] = 0.054054;
    weights[4] = 0.016216;

    vec2 texelStep = (uDirection * uRadius) / uResolution;

    vec3 result = texture2D(uTexture, vUv).rgb * weights[0];
    for (int i = 1; i < 5; i++) {
      vec2 off = texelStep * float(i);
      result += texture2D(uTexture, vUv + off).rgb * weights[i];
      result += texture2D(uTexture, vUv - off).rgb * weights[i];
    }

    gl_FragColor = vec4(result, 1.0);
  }
`

// ── Factory ─────────────────────────────────────────────────────────────────
export function createFrostedGlassBlur(renderer, opciones = {}) {
  const {
    downsample = 4,             // 1=full res, 4=¼ res (más rápido y más blur visual)
    blurRadius = 8.0,           // intensidad del blur (en píxeles de la textura)
    blurPasses = 2,             // cuántas veces aplicamos H+V (más pasadas = más blur)
    tint       = new THREE.Color(0x0a1422),
    tintAmount = 0.35,          // 0 = solo backdrop, 1 = solo color del tinte
    opacity    = 1.0,
  } = opciones

  // ── Tamaño de los render targets ─────────────────────────────────────────
  const size = renderer.getSize(new THREE.Vector2())
  const dpr  = renderer.getPixelRatio()
  let rtW = Math.max(1, Math.floor((size.x * dpr) / downsample))
  let rtH = Math.max(1, Math.floor((size.y * dpr) / downsample))

  // Tres render targets:
  //   rtScene → la escena cruda renderizada (sin el panel)
  //   rtBlurH → blur horizontal
  //   rtBlurV → blur vertical (este es el final que usa el material)
  const rtParams = {
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    format:    THREE.RGBAFormat,
    type:      THREE.UnsignedByteType,
    depthBuffer: false,    // no necesitamos depth para 2D post-pasadas
    stencilBuffer: false,
  }
  const rtScene = new THREE.WebGLRenderTarget(rtW, rtH, rtParams)
  const rtBlurH = new THREE.WebGLRenderTarget(rtW, rtH, rtParams)
  const rtBlurV = new THREE.WebGLRenderTarget(rtW, rtH, rtParams)

  // ── Quad ortográfico para las pasadas de blur ────────────────────────────
  // Es la forma estándar de hacer post-procesado: un plano que cubre toda
  // la pantalla en una escena/cámara ortográficas dedicadas.
  const blurScene  = new THREE.Scene()
  const blurCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)
  const blurMat    = new THREE.ShaderMaterial({
    uniforms: {
      uTexture:    { value: null },
      uDirection:  { value: new THREE.Vector2(1, 0) },
      uResolution: { value: new THREE.Vector2(rtW, rtH) },
      uRadius:     { value: blurRadius },
    },
    vertexShader:   BLUR_VERTEX_SHADER,
    fragmentShader: BLUR_FRAGMENT_SHADER,
    depthTest:  false,
    depthWrite: false,
  })
  const blurQuad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), blurMat)
  blurScene.add(blurQuad)

  // ── Material del panel del vidrio (lo que se aplica al meshVidrio) ──────
  const panelMaterial = new THREE.ShaderMaterial({
    uniforms: {
      uBackdrop:   { value: rtBlurV.texture },
      uTint:       { value: tint.clone() },
      uTintAmount: { value: tintAmount },
      uOpacity:    { value: opacity },
    },
    vertexShader:   PANEL_VERTEX_SHADER,
    fragmentShader: PANEL_FRAGMENT_SHADER,
    transparent:    true,
    depthWrite:     false,
    side:           THREE.DoubleSide,
  })

  // ── updateBackdrop: corre cada frame antes del render final ─────────────
  // Renderiza la escena (que debe NO contener el panel) a rtScene, luego
  // hace blurH y blurV. El resultado queda en rtBlurV.texture y se ve
  // automáticamente en el panel porque uBackdrop apunta a esa textura.
  function updateBackdrop(scene, camera) {
    const prevRT       = renderer.getRenderTarget()
    const prevAutoClear = renderer.autoClear

    // 1) Render de la escena al rtScene
    renderer.setRenderTarget(rtScene)
    renderer.clear()
    renderer.render(scene, camera)

    // 2) Blur horizontal: leer de rtScene, escribir a rtBlurH
    blurMat.uniforms.uTexture.value   = rtScene.texture
    blurMat.uniforms.uDirection.value.set(1, 0)
    blurMat.uniforms.uResolution.value.set(rtW, rtH)
    blurMat.uniforms.uRadius.value    = blurRadius
    renderer.setRenderTarget(rtBlurH)
    renderer.clear()
    renderer.render(blurScene, blurCamera)

    // 3) Blur vertical: leer de rtBlurH, escribir a rtBlurV
    blurMat.uniforms.uTexture.value = rtBlurH.texture
    blurMat.uniforms.uDirection.value.set(0, 1)
    renderer.setRenderTarget(rtBlurV)
    renderer.clear()
    renderer.render(blurScene, blurCamera)

    // 4) Pasadas extra (opcional, multiplica el efecto)
    for (let p = 1; p < blurPasses; p++) {
      blurMat.uniforms.uTexture.value = rtBlurV.texture
      blurMat.uniforms.uDirection.value.set(1, 0)
      renderer.setRenderTarget(rtBlurH)
      renderer.clear()
      renderer.render(blurScene, blurCamera)

      blurMat.uniforms.uTexture.value = rtBlurH.texture
      blurMat.uniforms.uDirection.value.set(0, 1)
      renderer.setRenderTarget(rtBlurV)
      renderer.clear()
      renderer.render(blurScene, blurCamera)
    }

    // Restaurar estado del renderer
    renderer.setRenderTarget(prevRT)
    renderer.autoClear = prevAutoClear
  }

  // ── Resize: hay que actualizar los render targets si cambia el viewport
  function onResize() {
    const s = renderer.getSize(new THREE.Vector2())
    const d = renderer.getPixelRatio()
    rtW = Math.max(1, Math.floor((s.x * d) / downsample))
    rtH = Math.max(1, Math.floor((s.y * d) / downsample))
    rtScene.setSize(rtW, rtH)
    rtBlurH.setSize(rtW, rtH)
    rtBlurV.setSize(rtW, rtH)
    blurMat.uniforms.uResolution.value.set(rtW, rtH)
  }

  // ── Setters para ajustar parámetros en tiempo real ──────────────────────
  function setBlurRadius(r)   { blurRadius = r;  blurMat.uniforms.uRadius.value = r }
  function setTint(color)     { panelMaterial.uniforms.uTint.value.copy(color) }
  function setTintAmount(a)   { panelMaterial.uniforms.uTintAmount.value = a }
  function setOpacity(o)      { panelMaterial.uniforms.uOpacity.value = o }

  // ── Cleanup ──────────────────────────────────────────────────────────────
  function dispose() {
    rtScene.dispose()
    rtBlurH.dispose()
    rtBlurV.dispose()
    blurMat.dispose()
    panelMaterial.dispose()
    blurQuad.geometry.dispose()
  }

  return {
    material:      panelMaterial,   // pasalo al meshVidrio del panel
    updateBackdrop,                 // llamar cada frame antes del render
    onResize,                       // llamar en el evento resize
    setBlurRadius,
    setTint,
    setTintAmount,
    setOpacity,
    dispose,
  }
}