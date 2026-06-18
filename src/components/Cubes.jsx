import * as THREE from "three"
import { useEffect, useMemo, useRef, useState } from "react"
import { useFrame, useThree } from "@react-three/fiber"
import { useGLTF } from "@react-three/drei"
import { RigidBody, CuboidCollider } from "@react-three/rapier"
import { create } from "zustand"

import { useStore } from "../hooks/useStore"

// Phần bổ sung của Vũ Đức An: khối lập phương ảnh album, vật lý thật.
// - Trên cạn (đảo): địa hình là vật cản rắn, khối rơi xuống và nằm yên.
// - Trên nước (dưới mực nước): có lực nổi, khối bồng bềnh trên mặt.
// - Kéo chuột để cầm & ném khối.

const SUPABASE_URL = "https://huhzwawyysehjtofkpvb.supabase.co"
const SUPABASE_KEY = "sb_publishable_U0L64ODHeuid599c6oRgvw_5fM-2D8n"
const BUCKET = "album"
const IMG_RE = /\.(jpe?g|png|webp|avif)$/i
const TERRAIN_URL = `${import.meta.env.BASE_URL}models/terrain.glb`

const SIZE = 1.7
const MAX = 30

// store dùng chung giữa nút DOM và scene
export const useCubesStore = create((set) => ({
  spawnSignal: 0,
  spawn: () => set((s) => ({ spawnSignal: s.spawnSignal + 1 })),
  dragging: false,
  setDragging: (v) => set({ dragging: v }),
}))

// vật cản địa hình (rắn) – trùng hình với đảo nhưng vô hình
function TerrainCollider() {
  const { nodes } = useGLTF(TERRAIN_URL)
  return (
    <RigidBody type="fixed" colliders="trimesh">
      <mesh geometry={nodes.plane.geometry} visible={false} />
    </RigidBody>
  )
}

export const Cubes = () => {
  const camera = useThree((s) => s.camera)
  const waterLevel = useStore((s) => s.waterLevel)
  const waveSpeed = useStore((s) => s.waveSpeed)
  const waveAmplitude = useStore((s) => s.waveAmplitude)

  const spawnSignal = useCubesStore((s) => s.spawnSignal)
  const setDragging = useCubesStore((s) => s.setDragging)

  const texturesRef = useRef([])
  const [cubes, setCubes] = useState([])
  const idRef = useRef(0)
  const bodies = useRef({}) // id -> rapier body

  const grabbed = useRef(null) // { id, rb }
  const dragPlane = useRef(new THREE.Plane())
  const tmp = useRef(new THREE.Vector3())
  const camDir = useRef(new THREE.Vector3())

  // tải ảnh album
  useEffect(() => {
    let alive = true
    ;(async () => {
      let photos = []
      try {
        const r = await fetch(`${SUPABASE_URL}/storage/v1/object/list/${BUCKET}`, {
          method: "POST",
          headers: {
            apikey: SUPABASE_KEY,
            Authorization: "Bearer " + SUPABASE_KEY,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            prefix: "",
            limit: 100,
            offset: 0,
            sortBy: { column: "created_at", order: "desc" },
          }),
        })
        const items = await r.json()
        photos = (Array.isArray(items) ? items : []).filter(
          (it) =>
            it &&
            it.name &&
            IMG_RE.test(it.name) &&
            (!it.metadata || it.metadata.size == null || it.metadata.size > 0)
        )
      } catch (e) {
        /* ignore */
      }
      const tl = new THREE.TextureLoader()
      tl.setCrossOrigin("anonymous")
      const loaded = []
      for (const p of photos) {
        const url = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${encodeURIComponent(
          p.name
        )}`
        try {
          const t = await tl.loadAsync(url)
          if ("colorSpace" in t) t.colorSpace = THREE.SRGBColorSpace
          loaded.push(t)
        } catch (e) {
          /* skip */
        }
        if (loaded.length >= 24) break
      }
      if (!alive) return
      texturesRef.current = loaded
      // gieo vài khối ban đầu (vài cái trên cạn, vài cái trên nước)
      for (let i = 0; i < 6; i++) setTimeout(() => addCube(i < 2 ? 4 : 13), 200 + i * 160)
    })()
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function addCube(radius) {
    const tex = texturesRef.current
    if (!tex.length) return
    const pick = () => tex[Math.floor(Math.random() * tex.length)]
    const mats = new Array(6)
      .fill(0)
      .map(
        () =>
          new THREE.MeshStandardMaterial({ map: pick(), roughness: 0.5, metalness: 0.05 })
      )
    const ang = Math.random() * Math.PI * 2
    const rad = radius != null ? radius : 4 + Math.random() * 14
    const id = idRef.current++
    const cube = {
      id,
      mats,
      pos: [Math.cos(ang) * rad, 16, Math.sin(ang) * rad],
      phase: Math.random() * Math.PI * 2,
    }
    setCubes((c) => {
      const next = [...c, cube]
      if (next.length > MAX) {
        const removed = next.shift()
        delete bodies.current[removed.id]
      }
      return next
    })
  }

  // nút "Thả ảnh"
  useEffect(() => {
    if (spawnSignal > 0) addCube()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spawnSignal])

  // cầm khối
  function grab(e, id) {
    e.stopPropagation()
    const rb = bodies.current[id]
    if (!rb) return
    grabbed.current = { id, rb }
    setDragging(true)
    rb.setGravityScale(0, true)
    camera.getWorldDirection(camDir.current)
    dragPlane.current.setFromNormalAndCoplanarPoint(
      camDir.current,
      new THREE.Vector3(e.point.x, e.point.y, e.point.z)
    )
  }
  useEffect(() => {
    const up = () => {
      const g = grabbed.current
      if (g) {
        g.rb.setGravityScale(1, true) // giữ nguyên vận tốc -> ném
        grabbed.current = null
        setDragging(false)
      }
    }
    window.addEventListener("pointerup", up)
    return () => window.removeEventListener("pointerup", up)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useFrame((state, delta) => {
    const dt = Math.min(delta, 1 / 30)
    const t = state.clock.getElapsedTime()

    // kéo khối đang cầm theo con trỏ
    const g = grabbed.current
    if (g && g.rb) {
      state.raycaster.setFromCamera(state.pointer, state.camera)
      const hit = state.raycaster.ray.intersectPlane(dragPlane.current, tmp.current)
      if (hit) {
        const p = g.rb.translation()
        let vx = (tmp.current.x - p.x) * 14
        let vy = (tmp.current.y - p.y) * 14
        let vz = (tmp.current.z - p.z) * 14
        const sp = Math.hypot(vx, vy, vz)
        if (sp > 45) {
          const k = 45 / sp
          vx *= k
          vy *= k
          vz *= k
        }
        g.rb.setLinvel({ x: vx, y: vy, z: vz }, true)
      }
    }

    // lực nổi cho khối dưới mặt nước (trừ khối đang cầm)
    for (const c of cubes) {
      const rb = bodies.current[c.id]
      if (!rb) continue
      if (g && g.id === c.id) continue
      const p = rb.translation()
      if (p.y < waterLevel + SIZE * 0.5) {
        const v = rb.linvel()
        const m = rb.mass() || 4
        const targetY =
          waterLevel + SIZE * 0.12 + Math.sin(t * waveSpeed + c.phase) * waveAmplitude * 4
        let ay = (targetY - p.y) * 22 - v.y * 5
        ay = Math.max(-45, Math.min(70, ay))
        rb.applyImpulse({ x: 0, y: m * ay * dt, z: 0 }, true)
        // hãm trôi ngang trên mặt nước
        rb.applyImpulse({ x: -v.x * m * 1.2 * dt, y: 0, z: -v.z * m * 1.2 * dt }, true)
      }
    }
  })

  const cubeList = useMemo(() => cubes, [cubes])

  return (
    <>
      <TerrainCollider />
      {/* sàn an toàn dưới đáy để không có khối rơi vô tận */}
      <RigidBody type="fixed">
        <CuboidCollider args={[200, 1, 200]} position={[0, -12, 0]} />
      </RigidBody>

      {cubeList.map((c) => (
        <RigidBody
          key={c.id}
          ref={(r) => {
            if (r) bodies.current[c.id] = r
          }}
          position={c.pos}
          colliders="cuboid"
          linearDamping={0.4}
          angularDamping={0.6}
          restitution={0.2}
          friction={0.9}
        >
          <mesh
            material={c.mats}
            castShadow
            receiveShadow
            onPointerDown={(e) => grab(e, c.id)}
          >
            <boxGeometry args={[SIZE, SIZE, SIZE]} />
          </mesh>
        </RigidBody>
      ))}
    </>
  )
}
