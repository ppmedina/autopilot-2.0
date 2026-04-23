// src/cancha/grid.js
import * as THREE from 'three'
import GUI from 'lil-gui'

export function createGrid(scene, offsetY = 0.35, offsetZ = 0) {

  const configs = {
    '10 x 6': { divX: 10, divZ: 6 },
    '6 x 5':  { divX: 6,  divZ: 5 },
    '4 x 4':  { divX: 4,  divZ: 4 },
  }

  const params = { grid: '10 x 6' }

  function crearGeometria(divX, divZ, anchoCancha = 105, altoCancha = 68) {
    const points = []
    const stepX  = anchoCancha / divX
    const stepZ  = altoCancha  / divZ
    const hx     = anchoCancha / 2
    const hz     = altoCancha  / 2

    for (let i = 0; i <= divX; i++) {
      const x = -hx + i * stepX
      points.push(new THREE.Vector3(x, 0, -hz))
      points.push(new THREE.Vector3(x, 0,  hz))
    }

    for (let j = 0; j <= divZ; j++) {
      const z = -hz + j * stepZ
      points.push(new THREE.Vector3(-hx, 0, z))
      points.push(new THREE.Vector3( hx, 0, z))
    }

    return new THREE.BufferGeometry().setFromPoints(points)
  }

  const mat = new THREE.LineBasicMaterial({
    color:       0x97c6f2,
    transparent: true,
    opacity:     0.07,
  })

  const { divX, divZ } = configs[params.grid]
  const gridMesh = new THREE.LineSegments(crearGeometria(divX, divZ), mat)
  gridMesh.position.y = offsetY
  gridMesh.position.z = offsetZ
  scene.add(gridMesh)

  // ── GUI propio del grid ──
  const gui = new GUI({ title: 'Grid controls' })
  gui.domElement.style.position   = 'fixed'
  gui.domElement.style.top        = 'auto'
  gui.domElement.style.bottom     = '10px'
  gui.domElement.style.right      = '10px'

  gui.add(params, 'grid', Object.keys(configs)).name('Zonas').onChange(v => {
    const { divX, divZ } = configs[v]
    gridMesh.geometry.dispose()
    gridMesh.geometry = crearGeometria(divX, divZ)
  })
  gui.addColor({ color: '#ffffff' }, 'color').name('Color').onChange(v => {
    mat.color.set(v)
  })
  gui.add(mat, 'opacity', 0, 1, 0.01).name('Opacidad')
  gui.add(gridMesh, 'visible').name('Visible')

  return gridMesh
}
