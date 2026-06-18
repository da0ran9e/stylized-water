import clsx from "clsx"
import { Suspense } from "react"
import { Canvas } from "@react-three/fiber"
import { AdaptiveDpr } from "@react-three/drei"
import { Leva } from "leva"

import { Experience } from "./components/Experience"
import { useCubesStore } from "./components/Cubes"
import { UI } from "./ui"
import { Loading } from "./ui/Loading"

import { useStore } from "./hooks/useStore"

import s from "./ui/ui.module.scss"

const dropBtnStyle = {
  position: "fixed",
  left: "24px",
  bottom: "24px",
  zIndex: 20,
  padding: "13px 22px",
  border: "none",
  borderRadius: "999px",
  background: "#0c0c0c",
  color: "#fff",
  fontWeight: 700,
  fontSize: "13px",
  letterSpacing: "0.04em",
  cursor: "pointer",
  boxShadow: "0 6px 20px rgba(0,0,0,0.25)",
}

const hintStyle = {
  position: "fixed",
  left: "24px",
  bottom: "70px",
  zIndex: 20,
  fontSize: "12px",
  color: "#0c0c0c",
  opacity: 0.6,
  fontFamily: "system-ui, sans-serif",
  pointerEvents: "none",
}

function App() {
  const ready = useStore((state) => state.ready)
  const spawn = useCubesStore((state) => state.spawn)

  return (
    <>
      <Loading />
      <Suspense>
        <div className={clsx(s.transition, { [s.show]: ready })}>
          <Leva collapsed hidden={!ready} />

          <Canvas camera={{ position: [30, 10, -30], fov: 35 }} shadows>
            <Experience />
            <AdaptiveDpr pixelated />
          </Canvas>

          <UI />

          {ready && (
            <>
              <span style={hintStyle}>Kéo ảnh để cầm &amp; ném</span>
              <button style={dropBtnStyle} onClick={() => spawn()}>
                ＋ Thả ảnh
              </button>
            </>
          )}
        </div>
      </Suspense>
    </>
  )
}

export default App
