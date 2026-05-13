// src/cancha/lines.js
import * as THREE from 'three'

export function createLines(scene, offsetY = 0.35) {
  const allLines = []
  const Y = 0.02
  const T = 0.12

  function makeMat() {
    return new THREE.MeshStandardMaterial({
      color:             0xffffff,
      emissive:          0xEDF3FF,
      emissiveIntensity: 1.0,
      transparent:       true,
      opacity:           0.95,
      side:              THREE.DoubleSide,
    })
  }

  function addSeg(x1, z1, x2, z2) {
    const dx = x2 - x1, dz = z2 - z1
    const len = Math.sqrt(dx * dx + dz * dz)
    const angle = Math.atan2(dz, dx)
    const m = new THREE.Mesh(new THREE.PlaneGeometry(len, T), makeMat())
    m.rotation.x = -Math.PI / 2
    m.rotation.z = -angle
    m.position.set((x1 + x2) / 2, Y, (z1 + z2) / 2)
    scene.add(m); allLines.push(m)
  }

  function addRect(x1, z1, x2, z2) {
    addSeg(x1, z1, x2, z1)
    addSeg(x2, z1, x2, z2)
    addSeg(x2, z2, x1, z2)
    addSeg(x1, z2, x1, z1)
  }

  function addArc(cx, cz, radius, startAngle, endAngle, segments) {
    segments = segments || 120
    const pts = []
    for (let i = 0; i <= segments; i++) {
      const a = startAngle + (i / segments) * (endAngle - startAngle)
      pts.push(new THREE.Vector3(
        cx + Math.cos(a) * radius,
        0,
        cz + Math.sin(a) * radius
      ))
    }
    const curve = new THREE.CatmullRomCurve3(pts)
    const m = new THREE.Mesh(
      new THREE.TubeGeometry(curve, 200, T / 2, 8, false),
      makeMat()
    )
    m.position.y = Y
    scene.add(m); allLines.push(m)
  }

  function addCircle(cx, cz, radius) {
    addArc(cx, cz, radius, 0, Math.PI * 2 - 0.001, 120)
  }

  function addDot(cx, cz, radius) {
    const m = new THREE.Mesh(
      new THREE.CircleGeometry(radius, 32),
      makeMat()
    )
    m.rotation.x = -Math.PI / 2
    m.position.set(cx, Y, cz)
    scene.add(m); allLines.push(m)
  }

  // Bordes exteriores
  addRect(-52.5, -34, 52.5, 34)

  // Línea de medio campo
  addSeg(0, -34, 0, 34)

  // Círculo central
  addCircle(0, 0, 9.15)

  // Punto central
  addDot(0, 0, 0.28)

  // Área grande izquierda
  addRect(-52.5, -20.16, -36, 20.16)

  // Área chica izquierda
  addRect(-52.5, -9.16, -47, 9.16)

  // Punto penalti izquierdo
  addDot(-41, 0, 0.28)

  // Media luna izquierda
  const r   = 9.15
  const cut = Math.acos(5 / r)
  addArc(-41, 0, r, -cut, cut)

  // Área grande derecha
  addRect(36, -20.16, 52.5, 20.16)

  // Área chica derecha
  addRect(47, -9.16, 52.5, 9.16)

  // Punto penalti derecho
  addDot(41, 0, 0.28)

  // Media luna derecha
  addArc(41, 0, r, Math.PI - cut, Math.PI + cut)

  // Arcos de esquina
  addArc(-52.5, -34, 1.0,  0,            Math.PI / 2)
  addArc( 52.5, -34, 1.0,  Math.PI / 2, Math.PI)
  addArc(-52.5,  34, 1.0, -Math.PI / 2, 0)
  addArc( 52.5,  34, 1.0,  Math.PI,     Math.PI * 3 / 2)

  function setLinesColor(colorHex, emissiveHex) {
    allLines.forEach(m => {
      m.material.color.setHex(colorHex)
      if (emissiveHex !== undefined) m.material.emissive.setHex(emissiveHex)
    })
  }

  return { allLines, setLinesColor }
}
