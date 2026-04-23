import * as THREE from 'three'

export function createLights(scene) {

  // Luz ambiental base
  scene.add(new THREE.AmbientLight(0x334466, 0.5))

  // Luz hemisférica — ilumina desde arriba con cielo y suelo
  const hemi = new THREE.HemisphereLight(0x4488ff, 0x112244, 1.5)
  scene.add(hemi)

  // Focos en las cuatro esquinas del estadio
  const foci = [
    { pos: [-45, 35, -28], color: 0x6699ff },
    { pos: [ 45, 35, -28], color: 0x6699ff },
    { pos: [-45, 35,  28], color: 0x88aaff },
    { pos: [ 45, 35,  28], color: 0x88aaff },
  ]

  foci.forEach(({ pos, color }) => {
    const light = new THREE.PointLight(color, 4.0, 150)
    light.position.set(...pos)
    light.castShadow = true
    scene.add(light)
  })

  // Foco desde arriba — ilumina el centro de la cancha
  const spotLight = new THREE.SpotLight(0xffffff, 20.0)
  spotLight.position.set(0, 60, 0)
  spotLight.target.position.set(0, 0, 0)
  spotLight.angle      = Math.PI / 15
  spotLight.penumbra   = 0.3
  spotLight.decay      = 1.0
  spotLight.distance   = 120
  spotLight.castShadow = true
  scene.add(spotLight)
  scene.add(spotLight.target)

  // Luz desde abajo — resalta la transparencia del cristal
  const bottomLight = new THREE.PointLight(0x2255aa, 5.0, 100)
  bottomLight.position.set(0, -8, 0)
  scene.add(bottomLight)

  // ── Sombra iluminada debajo de la cancha ──
  const canvas  = document.createElement('canvas')
  canvas.width  = 512
  canvas.height = 512
  const ctx     = canvas.getContext('2d')

  // Gradiente radial — centro brillante, bordes transparentes
  const gradient = ctx.createRadialGradient(256, 256, 0, 256, 256, 256)
  gradient.addColorStop(0.0, 'rgba(80, 160, 255, 0.7)')   // centro azul brillante
  gradient.addColorStop(0.4, 'rgba(40, 100, 220, 0.3)')   // medio
  gradient.addColorStop(1.0, 'rgba(0,  50,  180, 0.0)')   // borde transparente

  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, 512, 512)

  const tex = new THREE.CanvasTexture(canvas)

  const geo = new THREE.PlaneGeometry(140, 90)
  const mat = new THREE.MeshBasicMaterial({
    map:         tex,
    transparent: true,
    depthWrite:  false,
    blending:    THREE.AdditiveBlending,  // suma luz en lugar de oscurecer
  })

  const sombraPlano = new THREE.Mesh(geo, mat)
  sombraPlano.rotation.x = -Math.PI / 2
  sombraPlano.position.y = -9  // debajo de la cancha
  scene.add(sombraPlano)
}