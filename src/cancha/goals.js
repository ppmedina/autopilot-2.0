import * as THREE from 'three'

export function createGoals(scene) {
  const mat = new THREE.MeshStandardMaterial({
    color:            0xffffff,
    emissive:         0x8888ff,
    emissiveIntensity: 0.4,
    metalness:        0.7,
    roughness:        0.2,
  })

  const R = 0.08   // radio del poste
  const H = 2.44   // altura
  const W = 7.32   // ancho

  function buildGoal(x) {
    const parts = [
      { geo: new THREE.CylinderGeometry(R, R, H, 8), pos: [x, H / 2, -W / 2], rot: null },
      { geo: new THREE.CylinderGeometry(R, R, H, 8), pos: [x, H / 2,  W / 2], rot: null },
      {
        geo: new THREE.CylinderGeometry(R, R, W, 8),
        pos: [x, H, 0],
        rot: new THREE.Euler(Math.PI / 2, 0, 0),
      },
    ]

    parts.forEach(({ geo, pos, rot }) => {
      const m = new THREE.Mesh(geo, mat)
      m.position.set(...pos)
      if (rot) m.rotation.copy(rot)
      m.castShadow = true
      scene.add(m)
    })
  }

  buildGoal(-52.5)
  buildGoal( 52.5)
}
