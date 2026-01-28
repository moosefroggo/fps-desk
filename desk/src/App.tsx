import { Suspense, useState, useEffect, useRef } from 'react'
import { Canvas, useThree, useFrame } from '@react-three/fiber'
import { PointerLockControls, Environment } from '@react-three/drei'
import * as THREE from 'three'
import gsap from 'gsap' // <--- Import GSAP here
import { Model } from './Room' 

// Update Props: Now accepts the ghost object from the parent
const SmoothFPSControls = ({ ghost }: { ghost: React.MutableRefObject<THREE.Object3D> }) => {
  const [keys, setKeys] = useState<Record<string, boolean>>({})
  const { camera } = useThree()
  
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => setKeys((k) => ({ ...k, [e.code]: true }))
    const handleKeyUp = (e: KeyboardEvent) => setKeys((k) => ({ ...k, [e.code]: false }))
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [])

  useEffect(() => {
    // Sync ghost to camera on start
    if (ghost.current) {
        ghost.current.position.copy(camera.position)
        ghost.current.rotation.copy(camera.rotation)
    }
  }, [camera, ghost])

  useFrame((_, delta) => {
    const speed = 5 * delta
    const ghostObj = ghost.current

    // Move the Ghost based on keys
    if (keys['KeyW']) ghostObj.translateZ(-speed)
    if (keys['KeyS']) ghostObj.translateZ(speed)
    if (keys['KeyA']) ghostObj.translateX(-speed)
    if (keys['KeyD']) ghostObj.translateX(speed)

    // Smoothly pull the real camera to the Ghost
    camera.position.lerp(ghostObj.position, 0.2) 
    camera.quaternion.slerp(ghostObj.quaternion, 0.2)
  })

  return <PointerLockControls camera={ghost.current as any} />
}

export default function App() {
  const [currentAction, setCurrentAction] = useState<string | undefined>("Armature|mixamo.com|Layer0")
  const [reachTarget, setReachTarget] = useState<string | null>(null)
  
  // 1. Create the Ghost here so we can access it
  const ghostRef = useRef(new THREE.Object3D())

  // 2. The Focus Function (Moves the Ghost)
  const handleFocus = (targetPosition: THREE.Vector3) => {
      // Unlock mouse so we don't fight the animation
      document.exitPointerLock()

      // Calculate where we want to stand (2 units back, 0.5 units up)
      // Note: simple offset. For better logic, we'd use the object's forward vector.
      const standPosition = targetPosition.clone().add(new THREE.Vector3(0, 0.5, 2))

      // Animate the GHOST to that spot
      gsap.to(ghostRef.current.position, {
        x: standPosition.x,
        y: standPosition.y,
        z: standPosition.z,
        duration: 1.5,
        ease: "power2.out"
      })
  }

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#202020' }}>
      
      <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', color: 'white', pointerEvents: 'none', zIndex: 999 }}>
        <p>Click screen to Start</p>
      </div>

      <Canvas 
        shadows 
        camera={{ position: [0, 1.6, 5], fov: 50 }}
        onPointerMissed={() => console.log("Clicked empty space")}
      >
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 5]} intensity={1} castShadow />
        <Environment preset="city" />

        <Suspense fallback={null}>
            <Model 
              animationName={currentAction as any} 
              targetName={reachTarget} 
              // Pass the function down to Room
              onFocus={handleFocus} 
            />
        </Suspense>

        {/* Pass the ghost ref to the controls */}
        <SmoothFPSControls ghost={ghostRef} />
      </Canvas>

      <div style={{ position: 'absolute', top: 20, left: 20, display: 'flex', gap: '10px', zIndex: 10, pointerEvents: 'none' }}>
        <button style={{ pointerEvents: 'auto', padding: '10px' }} onClick={() => setCurrentAction("Armature|mixamo.com|Layer0")}>
          Reset Character
        </button>
      </div>
    </div>
  )
}