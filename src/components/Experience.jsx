import { CameraControls, Environment } from "@react-three/drei"
import { useControls } from "leva"
import { Physics } from "@react-three/rapier"

import { Scene } from "./Scene"
import { Audio } from "./Audio"
import { Cubes, useCubesStore } from "./Cubes"

export const Experience = () => {
  // Interactive color parameters
  const { BACKGROUND } = useControls("Sky", {
    BACKGROUND: { value: "#fcffdc", label: "Background" }
  })

  const dragging = useCubesStore((s) => s.dragging)

  return (
    <>
      <Environment preset="forest" environmentIntensity={0.5} />
      <ambientLight intensity={1.0} />

      <directionalLight
        position={[13, 5, 5]}
        castShadow
        intensity={2.5}
        shadow-mapSize={[1024, 1024]}
      >
        <orthographicCamera
          attach="shadow-camera"
          left={-30}
          right={30}
          top={30}
          bottom={-30}
        />
      </directionalLight>

      <Audio />

      <CameraControls
        enabled={!dragging}
        maxPolarAngle={Math.PI / 2.2}
        maxDistance={80}
        minDistance={15}
      />

      <color attach="background" args={[BACKGROUND]} />
      <fog attach="fog" args={[BACKGROUND, 120, 150]} />

      <Scene />

      <Physics gravity={[0, -9.81, 0]}>
        <Cubes />
      </Physics>
    </>
  )
}
