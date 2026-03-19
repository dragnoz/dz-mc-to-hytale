import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

/**
 * Renders a Minecraft Java block model or Hytale .blockymodel in Three.js.
 * MC: reads elements[].from/to as box geometry.
 * Hytale: reads nodes recursively, shape.type === 'box' → box geometry.
 */
export default function ModelViewer({ model, modelType }) {
  const mountRef = useRef(null)

  useEffect(() => {
    const el = mountRef.current
    if (!el) return

    // Scene setup
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x111827)

    const camera = new THREE.PerspectiveCamera(45, el.clientWidth / el.clientHeight, 0.1, 1000)
    camera.position.set(30, 30, 30)
    camera.lookAt(8, 8, 8)

    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setSize(el.clientWidth, el.clientHeight)
    el.appendChild(renderer.domElement)

    const controls = new OrbitControls(camera, renderer.domElement)
    controls.target.set(8, 8, 8)
    controls.update()

    // Grid
    const grid = new THREE.GridHelper(32, 32, 0x374151, 0x1f2937)
    scene.add(grid)

    // Lights
    scene.add(new THREE.AmbientLight(0xffffff, 0.6))
    const dir = new THREE.DirectionalLight(0xffffff, 0.8)
    dir.position.set(20, 40, 20)
    scene.add(dir)

    // Build geometry
    const mat = new THREE.MeshLambertMaterial({ color: 0x60a5fa, wireframe: false })
    const wireMat = new THREE.MeshBasicMaterial({ color: 0x93c5fd, wireframe: true })

    if (modelType === 'mc') {
      addMcElements(scene, model.elements ?? [], mat, wireMat)
    } else {
      addHytaleNodes(scene, model.nodes ?? [], mat, wireMat, { x: 0, y: 0, z: 0 })
    }

    // Animate
    let frameId
    const animate = () => {
      frameId = requestAnimationFrame(animate)
      controls.update()
      renderer.render(scene, camera)
    }
    animate()

    // Resize
    const onResize = () => {
      camera.aspect = el.clientWidth / el.clientHeight
      camera.updateProjectionMatrix()
      renderer.setSize(el.clientWidth, el.clientHeight)
    }
    window.addEventListener('resize', onResize)

    return () => {
      cancelAnimationFrame(frameId)
      window.removeEventListener('resize', onResize)
      renderer.dispose()
      el.removeChild(renderer.domElement)
    }
  }, [model, modelType])

  return <div ref={mountRef} className="w-full h-full" />
}

// ── MC element renderer ───────────────────────────────────────────────────────

function addMcElements(scene, elements, mat, wireMat) {
  for (const el of elements) {
    const { from, to } = el
    const w = to[0] - from[0]
    const h = to[1] - from[1]
    const d = to[2] - from[2]
    const geo = new THREE.BoxGeometry(w, h, d)
    const mesh = new THREE.Mesh(geo, mat)
    mesh.position.set(
      (from[0] + to[0]) / 2,
      (from[1] + to[1]) / 2,
      (from[2] + to[2]) / 2,
    )
    scene.add(mesh)
    scene.add(new THREE.Mesh(geo, wireMat).position.copy(mesh.position) && mesh.clone().copy(
      Object.assign(new THREE.Mesh(geo, wireMat), { position: mesh.position.clone() })
    ))
  }
}

// ── Hytale node renderer ──────────────────────────────────────────────────────

function addHytaleNodes(scene, nodes, mat, wireMat, parentPos) {
  for (const node of nodes) {
    const worldPos = {
      x: parentPos.x + (node.position?.x ?? 0),
      y: parentPos.y + (node.position?.y ?? 0),
      z: parentPos.z + (node.position?.z ?? 0),
    }

    if (node.shape?.type === 'box') {
      const s = node.shape.settings?.size ?? { x: 1, y: 1, z: 1 }
      const o = node.shape.offset ?? { x: 0, y: 0, z: 0 }
      const geo = new THREE.BoxGeometry(s.x, s.y, s.z)
      const mesh = new THREE.Mesh(geo, mat)
      mesh.position.set(worldPos.x + o.x, worldPos.y + o.y, worldPos.z + o.z)
      scene.add(mesh)
    }

    if (node.children?.length) {
      addHytaleNodes(scene, node.children, mat, wireMat, worldPos)
    }
  }
}
