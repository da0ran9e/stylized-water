import { PositionalAudio } from "@react-three/drei"
import { useStore } from "../hooks/useStore"

const WAVES_URL = `${import.meta.env.BASE_URL}sounds/waves.mp3`
const BIRDS_URL = `${import.meta.env.BASE_URL}sounds/birds.mp3`

export const Audio = () => {
  const audioEnabled = useStore((state) => state.audioEnabled)

  return (
    audioEnabled && (
      <>
        <group position={[0, 0, 0]}>
          <PositionalAudio autoplay loop url={WAVES_URL} distance={50} />
        </group>

        <group position={[-65, 35, -55]}>
          <PositionalAudio autoplay loop url={BIRDS_URL} distance={30} />
        </group>
      </>
    )
  )
}
