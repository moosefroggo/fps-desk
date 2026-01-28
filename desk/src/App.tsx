import { Suspense, useState, useEffect, useRef } from 'react'
import { Canvas, useThree, useFrame } from '@react-three/fiber'
import { PointerLockControls, Environment } from '@react-three/drei'
import * as THREE from 'three'
import gsap from 'gsap'
import { Model } from './Room'
import { PROJECTS } from './projects'

// --- Component: Ghost-based FPS Controls ---
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

  // Interaction State
  const [interactables, setInteractables] = useState<{ name: string; position: THREE.Vector3 }[]>([])
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null)
  const ghostRef = useRef(new THREE.Object3D())

  // --- ACTIONS ---

  // 1. Move Camera to a specific object
  const focusOnObject = (index: number) => {
    // 1. Set State
    setFocusedIndex(index)
    document.exitPointerLock() // Force unlock if caught off guard

    const targetObj = interactables[index]
    if (!targetObj) return

    // 2. Calculate Stand Position
    // Dynamic Approach: Calculate vector from current camera to target
    // This ensures we stand on the "same side" we are currently viewing from, preventing 180-flips.
    const currentCamPos = ghostRef.current.position.clone()
    const targetPos = targetObj.position.clone()

    // Direction FROM target TO camera (vector pointing away from object towards us)
    const direction = new THREE.Vector3().subVectors(currentCamPos, targetPos).normalize()

    // If we are too close or right on top, default to Z axis offset to avoid NaN/Zero vector issues
    if (direction.lengthSq() < 0.01) {
      direction.set(0, 0, 1)
    }

    // Stand 2 units away along that vector
    const standPosition = targetPos.clone().add(direction.multiplyScalar(2))

    // Adjust Height (optional, maybe keep it relative or fixed)
    // Let's force a comfortable viewing height relative to the object
    standPosition.y = Math.max(targetPos.y + 0.5, 1.6) // At least 1.6m high, or 0.5m above object

    // 3. Animate Ghost (and thus Camera)
    gsap.killTweensOf(ghostRef.current.position)
    gsap.to(ghostRef.current.position, {
      x: standPosition.x,
      y: standPosition.y,
      z: standPosition.z,
      duration: 1.5,
      ease: "power2.out"
    })

    // Look at Logic
    const dummy = new THREE.Object3D()
    dummy.position.copy(standPosition)
    dummy.lookAt(targetObj.position)

    gsap.to(ghostRef.current.quaternion, {
      x: dummy.quaternion.x,
      y: dummy.quaternion.y,
      z: dummy.quaternion.z,
      w: dummy.quaternion.w,
      duration: 1.5,
      ease: "power2.out"
    })
  }

  // 2. Exit Focus
  const exitFocus = () => {
    setFocusedIndex(null)
    // Optional: Pull camera back slightly or just leave it there
    // User immediately regains Mouse Look via SmoothFPSControls rendering again
  }

  // --- LISTENERS ---

  // Keyboard Navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (interactables.length === 0) return

      if (focusedIndex !== null) {
        // Navigation Mode
        if (e.key === 'ArrowRight') {
          const next = (focusedIndex + 1) % interactables.length
          focusOnObject(next)
        } else if (e.key === 'ArrowLeft') {
          const prev = (focusedIndex - 1 + interactables.length) % interactables.length
          focusOnObject(prev)
        } else if (e.key === 'Backspace' || e.key === 'Escape') {
          exitFocus()
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [focusedIndex, interactables])

  // Get current project data
  const currentProject = focusedIndex !== null
    ? PROJECTS.find(p => p.id === interactables[focusedIndex].name)
    : null

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#202020', position: 'relative' }}>

      {/* --- UI OVERLAY --- */}
      {focusedIndex !== null && currentProject && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          zIndex: 10,
          display: 'flex',
          pointerEvents: 'none' // Allow clicks to pass through if needed (though we mostly want to catch them)
        }}>
          {/* LEFT PANEL */}
          <div style={{
            width: '35%',
            height: '100%',
            background: 'rgba(0,0,0,0.85)',
            backdropFilter: 'blur(10px)',
            padding: '40px',
            color: 'white',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            boxSizing: 'border-box',
            pointerEvents: 'auto'
          }}>
            <h1 style={{ margin: '0 0 20px 0', fontFamily: 'Inter, sans-serif' }}>
              {currentProject.title}
            </h1>
            <p style={{ lineHeight: '1.6', color: '#ccc' }}>
              {currentProject.description}
            </p>

            <div style={{ marginTop: '40px', fontSize: '0.9em', color: '#888' }}>
              Press <kbd style={{ border: '1px solid #555', padding: '2px 6px', borderRadius: '4px' }}>Backspace</kbd> to return
            </div>
          </div>

          {/* RIGHT PANEL (Invisible, just for spacing if needed) */}
          <div style={{ flex: 1 }}></div>
        </div>
      )}

      {/* Intro Text */}
      {focusedIndex === null && (
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', color: 'white', pointerEvents: 'none', zIndex: 999 }}>
          <p>Click object to focus • WASD to Move</p>
        </div>
      )}


      <Canvas
        shadows
        // Rotate camera 180 deg (Math.PI) around Y to face "backwards" towards Z+ where items are
        camera={{ position: [0, 1.6, 5], rotation: [0, 45, 0], fov: 50 }}
        onPointerMissed={() => console.log("Clicked empty space")}
      >
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 5]} intensity={1} castShadow />
        <Environment preset="city" />

        <Suspense fallback={null}>
          <Model
            animationName={currentAction as any}
            // Reach for the CURRENT focused object, or null?
            targetName={focusedIndex !== null ? interactables[focusedIndex].name : null}

            onLoadInteractables={setInteractables}

            onFocus={(pos, name) => {
              // Find index
              const idx = interactables.findIndex(i => i.name === name)
              if (idx !== -1) focusOnObject(idx)
            }}
          />
        </Suspense>

        {/* CONTROLS: Only active when NOT focused */}
        {focusedIndex === null && (
          <SmoothFPSControls ghost={ghostRef} />
        )}

        {/* Even when focused, we want the camera to technically 'exist' and follow ghost logic? 
            Actually, if we unmount SmoothFPSControls, we lose the 'useFrame' lerp logic unless we extract it.
            
            Let's extract the "CameraFollower" logic so it ALWAYS runs, 
            but the "InputHandler" logic is conditional.
        */}
        <CameraFollower ghost={ghostRef} />

      </Canvas>

      <div style={{ position: 'absolute', top: 20, left: 20, display: 'flex', gap: '10px', zIndex: 10, pointerEvents: 'none' }}>
        <button style={{ pointerEvents: 'auto', padding: '10px' }} onClick={() => setCurrentAction("Armature|mixamo.com|Layer0")}>
          Reset Character
        </button>
      </div>
    </div>
  )
}

// Extracted to separate visual camera smoothing from Input logic
const CameraFollower = ({ ghost }: { ghost: React.MutableRefObject<THREE.Object3D> }) => {
  const { camera } = useThree()
  useFrame(() => {
    if (ghost.current) {
      camera.position.lerp(ghost.current.position, 0.1)
      camera.quaternion.slerp(ghost.current.quaternion, 0.1)
    }
  })
  return null
}