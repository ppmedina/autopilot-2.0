import * as THREE from 'three'

export function createParticles(scene) {
  const COUNT     = 300
  const positions = new Float32Array(COUNT * 3)

  for (let i = 0; i < COUNT; i++) {
    positions[i * 3]     = (Math.random() - 0.5) * 120
    positions[i * 3 + 1] =  Math.random() * 30
    positions[i * 3 + 2] = (Math.random() - 0.5) * 80
  }

  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))

  scene.add(new THREE.Points(
    geo,
    new THREE.PointsMaterial({
      color: 0x88aaff, size: 0.15, transparent: true, opacity: 0.5,
    })
  ))
}
