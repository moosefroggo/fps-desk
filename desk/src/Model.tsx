// src/Model.tsx
import { useGLTF } from '@react-three/drei'

export function Model() {
  // Path is relative to the public folder
  const gltf = useGLTF('/room.glb') 
  
  // Return the primitive object
  return <primitive object={gltf.scene} scale={1} />
}

// Optional: Preload the model so it loads instantly
useGLTF.preload('/room.glb')