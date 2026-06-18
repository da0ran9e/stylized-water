import * as THREE from "three"
import { useEffect, useMemo, useRef, useState } from "react"
import { useFrame } from "@react-three/fiber"

import { useStore } from "../hooks/useStore"

// Khối lập phương ảnh album bồng bềnh trên mặt nước.
// Phần bổ sung này do Vũ Đức An thêm vào (ảnh lấy từ kho Supabase cá nhân).

const SUPABASE_URL = "https://huhzwawyysehjtofkpvb.supabase.co"
const SUPABASE_KEY = "sb_publishable_U0L64ODHeuid599c6oRgvw_5fM-2D8n"
const BUCKET = "album"
const IMG_RE = /\.(jpe?g|png|webp|avif)$/i

const COUNT = 9
const RADIUS = 17

function useAlbumTextures() {
  const [textures, setTextures] = useState([])
  useEffect(() => {
    let alive = true
    ;(async () => {
      let photos = []
      try {
        const r = await fetch(
          `${SUPABASE_URL}/storage/v1/object/list/${BUCKET}`,
          {
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
          }
        )
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
      const loader = new THREE.TextureLoader()
      loader.setCrossOrigin("anonymous")
      const loaded = []
      for (const p of photos) {
        const url = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${encodeURIComponent(
          p.name
        )}`
        try {
          const t = await loader.loadAsync(url)
          if ("colorSpace" in t) t.colorSpace = THREE.SRGBColorSpace
          loaded.push(t)
        } catch (e) {
          /* skip */
        }
        if (loaded.length >= 24) break
      }
      if (alive) setTextures(loaded)
    })()
    return () => {
      alive = false
    }
  }, [])
  return textures
}

export const Cubes = () => {
  const textures = useAlbumTextures()
  const waterLevel = useStore((s) => s.waterLevel)
  const waveSpeed = useStore((s) => s.waveSpeed)
  const waveAmplitude = useStore((s) => s.waveAmplitude)
  const refs = useRef([])

  const cubes = useMemo(() => {
    if (!textures.length) return []
    const rnd = (a, b) => a + Math.random() * (b - a)
    const pick = () => textures[Math.floor(Math.random() * textures.length)]
    return new Array(COUNT).fill(0).map((_, i) => {
      const ang = (i / COUNT) * Math.PI * 2 + rnd(-0.35, 0.35)
      const rad = rnd(6, RADIUS)
      const mats = new Array(6).fill(0).map(
        () =>
          new THREE.MeshStandardMaterial({
            map: pick(),
            roughness: 0.45,
            metalness: 0.05,
          })
      )
      return {
        mats,
        x: Math.cos(ang) * rad,
        z: Math.sin(ang) * rad,
        phase: rnd(0, Math.PI * 2),
        spin: rnd(0.1, 0.4) * (Math.random() < 0.5 ? -1 : 1),
        size: rnd(1.8, 3.0),
        bob: rnd(0.7, 1.3),
        drift: rnd(0.25, 0.7),
      }
    })
  }, [textures])

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime()
    for (let i = 0; i < cubes.length; i++) {
      const m = refs.current[i]
      const c = cubes[i]
      if (!m || !c) continue
      const wobble = Math.sin(t * waveSpeed + c.phase)
      m.position.y =
        waterLevel + c.size * 0.28 + wobble * waveAmplitude * 6 * c.bob
      m.position.x = c.x + Math.sin(t * 0.2 + c.phase) * c.drift
      m.position.z = c.z + Math.cos(t * 0.17 + c.phase) * c.drift
      m.rotation.y = t * c.spin
      m.rotation.x = wobble * 0.13
      m.rotation.z = Math.cos(t * waveSpeed * 0.8 + c.phase) * 0.1
    }
  })

  return (
    <group>
      {cubes.map((c, i) => (
        <mesh
          key={i}
          ref={(el) => (refs.current[i] = el)}
          position={[c.x, waterLevel + c.size * 0.28, c.z]}
          material={c.mats}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[c.size, c.size, c.size]} />
        </mesh>
      ))}
    </group>
  )
}
