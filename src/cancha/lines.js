import * as THREE from 'three'

export function createLines(scene, offsetY = 0.35) {
  const allLines = []
  const T = 0.1 // grosor de línea en metros

  // ── Helpers ──

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

  function addLine(w, d, x, z) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), makeMat())
    m.rotation.x = -Math.PI / 2
    m.position.set(x, 0.02, z)
    scene.add(m)
    allLines.push(m)
  }

  function addRing(inner, outer, x, z) {
    const m = new THREE.Mesh(new THREE.RingGeometry(inner, outer, 80), makeMat())
    m.rotation.x = -Math.PI / 2
    m.position.set(x, 0.02, z)
    scene.add(m)
    allLines.push(m)
  }

  function addArc(radius, x, z, rotY = 0, angle = Math.PI, startAngle = 0) {
    const pts = []
    for (let i = 0; i <= 60; i++) {
      const a = startAngle + (i / 60) * angle
      pts.push(new THREE.Vector3(
        Math.cos(a) * radius,
        0,
        Math.sin(a) * radius
      ))
    }
    const m = new THREE.Mesh(
      new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 80, 0.06, 6, false),
      makeMat()
    )
    m.position.set(x, 0.02, z)
    m.rotation.y = rotY
    scene.add(m)
    allLines.push(m)
  }

  // ── Bordes exteriores ──
  addLine(105, T,      0, -34)
  addLine(105, T,      0,  34)
  addLine(T,   68, -52.5,   0)
  addLine(T,   68,  52.5,   0)

  // ── Línea de medio campo ──
  addLine(T, 68, 0, 0)

  // ── Círculo central y punto ──
  addRing(9.10, 9.22, 0, 0)
  addRing(0, 0.28, 0, 0)

  // ── Áreas grandes (40.32 × 16.5 m) ──
  addLine(T,    40.32, -36,     0)
  addLine(16.5, T,     -44.25, -20.16)
  addLine(16.5, T,     -44.25,  20.16)

  addLine(T,    40.32,  36,     0)
  addLine(16.5, T,      44.25, -20.16)
  addLine(16.5, T,      44.25,  20.16)

  // ── Áreas chicas (18.32 × 5.5 m) ──
  addLine(T,   18.32, -47,     0)
  addLine(5.5, T,     -49.75, -9.16)
  addLine(5.5, T,     -49.75,  9.16)

  addLine(T,   18.32,  47,     0)
  addLine(5.5, T,      49.75, -9.16)
  addLine(5.5, T,      49.75,  9.16)

  // ── Puntos de penalti ──
  addRing(0, 0.28, -41, 0)
  addRing(0, 0.28,  41, 0)

  // ── Medias lunas ──
  const r   = 9.15
  const cut = Math.acos(5 / r)

  addArc(r, -41, 0, 0, cut * 2, -cut)
  addArc(r,  41, 0, 0, cut * 2, Math.PI - cut)

  // ── Arcos de esquina (radio 1m, cuarto de círculo) ──
  addArc(1.0, -52.5, -34,  0,                Math.PI / 2)
  addArc(1.0,  52.5, -34,  Math.PI / 2 * 3,  Math.PI / 2)
  addArc(1.0, -52.5,  34,  Math.PI / 2,      Math.PI / 2)
  addArc(1.0,  52.5,  34,  Math.PI,           Math.PI / 2)

  addArc(1.0, -52.5, -34,  0,                Math.PI / 2)
  addArc(1.0,  52.5, -34,  Math.PI / 2 * 3,  Math.PI / 2)
  addArc(1.0, -52.5,  34,  Math.PI / 2,      Math.PI / 2)
  addArc(1.0,  52.5,  34,  Math.PI,           Math.PI / 2)

  // ── Función pública para cambiar color ──
  function setLinesColor(colorHex, emissiveHex) {
    allLines.forEach(m => {
      m.material.color.setHex(colorHex)
      m.material.emissive.setHex(emissiveHex)
    })
  }

  return { allLines, setLinesColor }
}
