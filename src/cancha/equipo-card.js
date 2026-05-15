// src/cancha/equipo-card.js
import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { BLOOM_LAYER } from './team.js'
import gsap from 'gsap'

// Plano de corte — nada visible por debajo de Y=0
const clipPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)

const EQUIPO_EJEMPLO = {
  nombre: 'Club Deportivo',
  escudo: '/teams/escudo-01.png',
  x: 0, z: 0,
}

const CW = 400, CH = 400, CX = CW / 2
const ESCUDO_SIZE = 160
const ESCUDO_Y    = (CH - ESCUDO_SIZE) / 2

function crearGradienteEmissive() {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = 256
  const ctx = canvas.getContext('2d')
  const g   = ctx.createLinearGradient(0, 256, 0, 0)
  g.addColorStop(0.5, '#020204')
  g.addColorStop(0.8, '#0d1626')
  g.addColorStop(1.0, '#00aaff')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 256, 256)
  return new THREE.CanvasTexture(canvas)
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x+r, y); ctx.lineTo(x+w-r, y)
  ctx.quadraticCurveTo(x+w, y,   x+w, y+r)
  ctx.lineTo(x+w, y+h-r)
  ctx.quadraticCurveTo(x+w, y+h, x+w-r, y+h)
  ctx.lineTo(x+r, y+h)
  ctx.quadraticCurveTo(x, y+h, x, y+h-r)
  ctx.lineTo(x, y+r)
  ctx.quadraticCurveTo(x, y, x+r, y)
  ctx.closePath()
}

function crearCanvasEscudo(equipo, img) {
  const canvas = document.createElement('canvas')
  canvas.width = CW; canvas.height = CH
  const ctx = canvas.getContext('2d')
  ctx.clearRect(0, 0, CW, CH)
  if (img) {
    const escala = ESCUDO_SIZE / Math.max(img.width, img.height)
    const fw = img.width * escala, fh = img.height * escala
    ctx.drawImage(img, CX - fw/2, ESCUDO_Y + (ESCUDO_SIZE-fh)/2, fw, fh)
  } else {
    ctx.save()
    const phGrad = ctx.createLinearGradient(CX-ESCUDO_SIZE/2, ESCUDO_Y, CX-ESCUDO_SIZE/2, ESCUDO_Y+ESCUDO_SIZE)
    phGrad.addColorStop(0, '#1e3060'); phGrad.addColorStop(1, '#0d1a3a')
    ctx.fillStyle = phGrad
    roundRect(ctx, CX-ESCUDO_SIZE/2, ESCUDO_Y, ESCUDO_SIZE, ESCUDO_SIZE, 20)
    ctx.fill()
    ctx.strokeStyle = 'rgba(50,130,255,0.4)'; ctx.lineWidth = 3; ctx.stroke()
    ctx.font = 'bold 80px sans-serif'; ctx.fillStyle = 'rgba(80,140,255,0.5)'
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.fillText('⬡', CX, ESCUDO_Y + ESCUDO_SIZE/2)
    ctx.restore()
  }
  return canvas
}

export function createEquipoCard(scene, equipo, opciones) {
  equipo   = equipo   || EQUIPO_EJEMPLO
  opciones = opciones || {}

  const offsetY   = opciones.offsetY   !== undefined ? opciones.offsetY   : 12.0
  const escala    = opciones.escala    !== undefined ? opciones.escala    : 30
  const glbRuta   = opciones.glbRuta   !== undefined ? opciones.glbRuta   : '/team-04.glb'
  const glbEscala = opciones.glbEscala !== undefined ? opciones.glbEscala : 7.0

  const px = equipo.x !== undefined ? equipo.x : 0
  const pz = equipo.z !== undefined ? equipo.z : 0

  const grupo = new THREE.Group()
  grupo.visible = false
  scene.add(grupo)

  let glbScene = null
  let sprite   = null

  const matBase = new THREE.MeshPhysicalMaterial({
    color: 0x0C1925, transmission: 0.75, roughness: 0.05, metalness: 0.1,
    thickness: 2.0, transparent: true, opacity: 0.52, side: THREE.DoubleSide,
    envMapIntensity: 2.0, reflectivity: 0.8, ior: 1.5,
    clippingPlanes: [clipPlane],
  })

  const matContorno = new THREE.MeshPhysicalMaterial({
    color: 0x7ea4c8, emissive: 0x7BE6F1, emissiveIntensity: 0.5,
    emissiveMap: crearGradienteEmissive(),
    transmission: 0.75, roughness: 0.05, metalness: 0.1,
    thickness: 2.0, transparent: true, opacity: 0.75, side: THREE.DoubleSide,
    envMapIntensity: 2.0, reflectivity: 0.8, ior: 1.5,
    clippingPlanes: [clipPlane],
  })

  const loader = new GLTFLoader()
  loader.load(glbRuta, function(gltf) {
    gltf.scene.traverse(function(child) {
      if (!child.isMesh) return
      if (child.name === 'base') {
        child.material = matBase; child.renderOrder = 1
      }
      if (child.name === 'contorno') {
        child.material = matContorno; child.renderOrder = 2
        child.layers.enable(BLOOM_LAYER)
      }
    })
    gltf.scene.scale.setScalar(glbEscala)
    gltf.scene.position.set(px, 0, pz)
    glbScene = gltf.scene
    grupo.add(glbScene)
  })

  function crearSprite(img) {
    const canvas  = crearCanvasEscudo(equipo, img)
    const textura = new THREE.CanvasTexture(canvas)
    const mat     = new THREE.SpriteMaterial({
      map: textura, transparent: true, depthWrite: false, depthTest: false,
      sizeAttenuation: true, clippingPlanes: [clipPlane],
    })
    const sp = new THREE.Sprite(mat)
    sp.scale.set(escala, escala, 1)
    sp.position.set(px, 0, pz)
    sp.renderOrder = 10
    sp.layers.set(0)
    grupo.add(sp)
    sprite = sp
  }

  const img = new Image()
  img.crossOrigin = 'anonymous'
  img.onload  = function() { crearSprite(img) }
  img.onerror = function() { crearSprite(null) }
  img.src = equipo.escudo

  // ── Animación de entrada — sube del piso ─────────────────────────────────
  function animarEntrada(onComplete) {
    grupo.visible = true
    matBase.opacity     = 0.52
    matContorno.opacity = 0.75

    var yInicio = -8

    if (glbScene) {
      glbScene.position.y = yInicio
      gsap.to(glbScene.position, { y: offsetY, duration: 0.9, ease: 'power3.out' })
    }
    if (sprite) {
      sprite.position.y       = yInicio
      sprite.material.opacity = 1
      gsap.to(sprite.position, {
        y: offsetY, duration: 0.9, ease: 'power3.out',
        onComplete: function() { if (onComplete) onComplete() }
      })
    } else {
      gsap.delayedCall(0.1, function() { animarEntrada(onComplete) })
    }
  }

  // ── Animación de salida — baja al piso ───────────────────────────────────
  // El clipPlane en Y=0 recorta visualmente la card cuando baja.
  // Solo se oculta el grupo cuando AMBOS (glb y sprite) llegan a -8.
  // No se hace visible=false antes — el clipPlane hace ese trabajo suavemente.
  function animarSalida(onComplete) {
    var dur = 0.55
    var completados = 0
    var total = (glbScene ? 1 : 0) + (sprite ? 1 : 0)
    if (total === 0) { grupo.visible = false; if (onComplete) onComplete(); return }

    function check() {
      completados++
      if (completados >= total) {
        grupo.visible = false
        if (onComplete) onComplete()
      }
    }

    if (glbScene) {
      gsap.to(glbScene.position, {
        y: -8, duration: dur, ease: 'power2.in',
        onComplete: check
      })
    }
    if (sprite) {
      gsap.to(sprite.position, {
        y: -8, duration: dur, ease: 'power2.in',
        onComplete: check
      })
    }
  }

  // ── Botón ──
  const btn = document.createElement('button')
  btn.textContent = 'Equipo'
  btn.className   = 'btn'
  btn.addEventListener('click', function() {
    if (!grupo.visible) {
      animarEntrada()
      btn.classList.add('active')
    } else {
      animarSalida(function() { btn.classList.remove('active') })
    }
  })
  document.getElementById('cc-controls').appendChild(btn)

  function tickEquipo(camera) {
    if (glbScene && grupo.visible) glbScene.lookAt(camera.position)
  }

  function updateEquipo(datos) {
    Object.assign(equipo, datos)
    if (datos.escudo) {
      const img2 = new Image()
      img2.crossOrigin = 'anonymous'
      img2.onload = function() {
        const canvas = crearCanvasEscudo(equipo, img2)
        if (sprite) { sprite.material.map.dispose(); sprite.material.map = new THREE.CanvasTexture(canvas); sprite.material.needsUpdate = true }
      }
      img2.src = datos.escudo
    } else {
      const canvas = crearCanvasEscudo(equipo, null)
      if (sprite) { sprite.material.map.dispose(); sprite.material.map = new THREE.CanvasTexture(canvas); sprite.material.needsUpdate = true }
    }
  }

  return { grupo, tickEquipo, updateEquipo, animarEntrada, animarSalida }
}
