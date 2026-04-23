// src/cancha/equipo-card.js
import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { BLOOM_LAYER } from './team.js'

const EQUIPO_EJEMPLO = {
  nombre: 'Club Deportivo',
  escudo: '/teams/escudo-01.png',
  x:      0,
  z:      0,
}

const CW          = 400
const CH          = 400
const CX          = CW / 2
const ESCUDO_SIZE = 160
const ESCUDO_Y    = (CH - ESCUDO_SIZE) / 2

function crearGradienteEmissive() {
  const canvas  = document.createElement('canvas')
  canvas.width  = 256
  canvas.height = 256
  const ctx     = canvas.getContext('2d')
  const gradient = ctx.createLinearGradient(0, 256, 0, 0)
  gradient.addColorStop(0.5, '#020204')
  gradient.addColorStop(0.8, '#0d1626')
  gradient.addColorStop(1.0, '#00aaff')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, 256, 256)
  return new THREE.CanvasTexture(canvas)
}

function crearCanvasEscudo(equipo, img) {
  const canvas = document.createElement('canvas')
  canvas.width  = CW
  canvas.height = CH
  const ctx = canvas.getContext('2d')
  ctx.clearRect(0, 0, CW, CH)

  if (img) {
    const escala = ESCUDO_SIZE / Math.max(img.width, img.height)
    const fw = img.width  * escala
    const fh = img.height * escala
    const fx = CX - fw / 2
    const fy = ESCUDO_Y + (ESCUDO_SIZE - fh) / 2
    ctx.drawImage(img, fx, fy, fw, fh)
  } else {
    ctx.save()
    const phGrad = ctx.createLinearGradient(CX - ESCUDO_SIZE/2, ESCUDO_Y, CX - ESCUDO_SIZE/2, ESCUDO_Y + ESCUDO_SIZE)
    phGrad.addColorStop(0.0, '#1e3060')
    phGrad.addColorStop(1.0, '#0d1a3a')
    ctx.fillStyle = phGrad
    roundRect(ctx, CX - ESCUDO_SIZE/2, ESCUDO_Y, ESCUDO_SIZE, ESCUDO_SIZE, 20)
    ctx.fill()
    ctx.strokeStyle = 'rgba(50, 130, 255, 0.4)'
    ctx.lineWidth   = 3
    ctx.stroke()
    ctx.font         = 'bold 80px sans-serif'
    ctx.fillStyle    = 'rgba(80, 140, 255, 0.5)'
    ctx.textAlign    = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('⬡', CX, ESCUDO_Y + ESCUDO_SIZE / 2)
    ctx.restore()
  }

  return canvas
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.quadraticCurveTo(x + w, y,     x + w, y + r)
  ctx.lineTo(x + w, y + h - r)
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  ctx.lineTo(x + r, y + h)
  ctx.quadraticCurveTo(x,     y + h, x,     y + h - r)
  ctx.lineTo(x, y + r)
  ctx.quadraticCurveTo(x,     y,     x + r, y)
  ctx.closePath()
}

export function createEquipoCard(scene, equipo = EQUIPO_EJEMPLO, opciones = {}) {

  const {
    offsetY   = 12.0,
    escala    = 30,
    glbRuta   = '/team-04.glb',
    glbEscala = 7.0,
  } = opciones

  const px = equipo.x ?? 0
  const pz = equipo.z ?? 0

  const grupo = new THREE.Group()
  grupo.visible = false
  scene.add(grupo)

  // ── GLB — base con material original, contorno con bloom ──
  let glbScene = null

  const matBase = new THREE.MeshPhysicalMaterial({
    color:           0x0C1925,
    transmission:    0.75,
    roughness:       0.05,
    metalness:       0.1,
    thickness:       2.0,
    transparent:     true,
    opacity:         0.52,
    side:            THREE.DoubleSide,
    envMapIntensity: 2.0,
    reflectivity:    0.8,
    ior:             1.5,
  })

  const matContorno = new THREE.MeshPhysicalMaterial({
    color:             0x7ea4c8,
    emissive:          0x7BE6F1,
    emissiveIntensity: 0.5,
    emissiveMap:       crearGradienteEmissive(),
    transmission:      0.75,
    roughness:         0.05,
    metalness:         0.1,
    thickness:         2.0,
    transparent:       true,
    opacity:           0.75,
    side:              THREE.DoubleSide,
    envMapIntensity:   2.0,
    reflectivity:      0.8,
    ior:               1.5,
  })

  const loader = new GLTFLoader()
  loader.load(glbRuta, (gltf) => {
    gltf.scene.traverse(child => {
      if (!child.isMesh) return
      if (child.name === 'base') {
        child.material    = matBase
        child.renderOrder = 1
      }
      if (child.name === 'contorno') {
        child.material    = matContorno
        child.renderOrder = 2
        child.layers.enable(BLOOM_LAYER)
      }
    })
    gltf.scene.scale.setScalar(glbEscala)
    gltf.scene.position.set(px, offsetY, pz)
    glbScene = gltf.scene
    grupo.add(glbScene)
  })

  // ── Sprite del escudo — encima del GLB ──
  let sprite = null

  function crearSprite(img) {
    const canvas  = crearCanvasEscudo(equipo, img)
    const textura = new THREE.CanvasTexture(canvas)
    const mat     = new THREE.SpriteMaterial({
      map:             textura,
      transparent:     true,
      depthWrite:      false,
      depthTest:       false,   // ← ignora z-buffer, siempre encima
      sizeAttenuation: true,
    })
    const sp = new THREE.Sprite(mat)
    sp.scale.set(escala, escala, 1)
    sp.position.set(px, offsetY, pz)
    sp.renderOrder = 10   // ← encima de base(1) y contorno(2)
    sp.layers.set(0)
    grupo.add(sp)
    sprite = sp
  }

  const img = new Image()
  img.crossOrigin = 'anonymous'
  img.onload  = () => crearSprite(img)
  img.onerror = () => crearSprite(null)
  img.src = equipo.escudo

  // ── Botón ──
  const btn = document.createElement('button')
  btn.textContent = 'Equipo'
  btn.className   = 'btn'
  btn.addEventListener('click', function () {
    grupo.visible = !grupo.visible
    this.classList.toggle('active', grupo.visible)
  })
  document.getElementById('cc-controls').appendChild(btn)

  function tickEquipo(camera) {
    if (glbScene && grupo.visible) {
      glbScene.lookAt(camera.position)
    }
  }

  function updateEquipo(datos) {
    Object.assign(equipo, datos)
    if (datos.escudo) {
      const img2 = new Image()
      img2.crossOrigin = 'anonymous'
      img2.onload = () => {
        const canvas = crearCanvasEscudo(equipo, img2)
        if (sprite) {
          sprite.material.map.dispose()
          sprite.material.map = new THREE.CanvasTexture(canvas)
          sprite.material.needsUpdate = true
        }
      }
      img2.src = datos.escudo
    } else {
      const canvas = crearCanvasEscudo(equipo, null)
      if (sprite) {
        sprite.material.map.dispose()
        sprite.material.map = new THREE.CanvasTexture(canvas)
        sprite.material.needsUpdate = true
      }
    }
  }

  return { grupo, tickEquipo, updateEquipo }
}
