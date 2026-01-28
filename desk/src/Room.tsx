import * as THREE from 'three'
import React, { useEffect, useState, useRef } from 'react'
import { useGraph, useFrame } from '@react-three/fiber'
import { useGLTF, useAnimations } from '@react-three/drei'
import { SkeletonUtils } from 'three-stdlib'
import type { GLTF } from 'three-stdlib'

import { PROJECTS } from './projects'

// --- HELPER TYPES ---
type ActionName = 'Armature|mixamo.com|Layer0' | 'Plane.010Action' | 'Plane.011Action'

interface GLTFAction extends THREE.AnimationClip {
  name: ActionName
}

type GLTFResult = GLTF & {
  nodes: {
    Ch35: THREE.SkinnedMesh
    Plane: THREE.Mesh
    mixamorigHips: THREE.Bone
    [key: string]: any
  }
  materials: {
    Ch35_body: THREE.MeshStandardMaterial
    Bliink: THREE.MeshStandardMaterial
    [key: string]: any
  }
  animations: GLTFAction[]
}

// Updated Props: Now accepts interactables loader
type ModelProps = React.ComponentProps<'group'> & {
  animationName?: ActionName
  targetName?: string | null
  onFocus?: (position: THREE.Vector3, name: string) => void
  onLoadInteractables?: (objects: { name: string; position: THREE.Vector3 }[]) => void
}

// --- HELPER FUNCTION: 2-Bone IK ---
function solveTwoBoneIK(
  root: THREE.Bone,       // Shoulder
  middle: THREE.Bone,     // Elbow
  effector: THREE.Bone,   // Hand
  targetPos: THREE.Vector3 // Target World Position
) {
  const p1 = new THREE.Vector3();
  const p2 = new THREE.Vector3();
  const p3 = new THREE.Vector3();

  root.getWorldPosition(p1);
  middle.getWorldPosition(p2);
  effector.getWorldPosition(p3);

  // Measure bone lengths
  const l1 = p1.distanceTo(p2); // Shoulder -> Elbow
  const l2 = p2.distanceTo(p3); // Elbow -> Hand
  const dist = p1.distanceTo(targetPos); // Shoulder -> Target

  // If target is too far, just point at it (straight arm)
  if (dist > l1 + l2) {
    root.lookAt(targetPos);
    root.rotateX(Math.PI / 2); // Correction for bone axis
    middle.lookAt(targetPos);
    middle.rotateX(Math.PI / 2);
    return;
  }

  // Law of Cosines to find the elbow angle
  const cosAngle = (dist * dist - l1 * l1 - l2 * l2) / (-2 * l1 * l2);
  const angle = Math.acos(Math.max(-1, Math.min(1, cosAngle)));

  // 1. Rotate Shoulder to look at target
  root.lookAt(targetPos);
  root.rotateX(Math.PI / 2);

  // 2. Bend Elbow
  middle.rotation.set(angle, 0, 0);
}

// --- MAIN COMPONENT ---
export function Model({ animationName, targetName, onFocus, onLoadInteractables, ...props }: ModelProps) {
  const group = useRef<THREE.Group>(null)
  const armatureRef = useRef<THREE.Group>(null)

  const { scene, animations } = useGLTF('/room.glb')
  const clone = React.useMemo(() => SkeletonUtils.clone(scene), [scene])
  const { nodes, materials } = useGraph(clone) as unknown as GLTFResult
  const { actions, names } = useAnimations(animations, group)

  // State for visual hover effects
  const [hoveredName, setHoveredName] = useState<string | null>(null)
  const originalY = useRef<Record<string, number>>({})

  useEffect(() => {
    document.body.style.cursor = hoveredName ? 'pointer' : 'auto'
  }, [hoveredName])

  // Extract Interactables on Mount
  useEffect(() => {
    if (!group.current || !onLoadInteractables) return

    const sceneGroup = group.current.getObjectByName('Scene')
    if (!sceneGroup) return

    const interactables: { name: string; position: THREE.Vector3 }[] = []

    sceneGroup.children.forEach((child) => {
      if (PROJECTS.some(p => p.id === child.name)) {
        const worldPos = new THREE.Vector3()
        child.getWorldPosition(worldPos)
        interactables.push({ name: child.name, position: worldPos })
      }
    })

    // Sort by name (or X position) for consistent cycling order
    interactables.sort((a, b) => a.name.localeCompare(b.name))

    onLoadInteractables(interactables)
  }, []) // Run once

  // Animation Player
  useEffect(() => {
    if (!animationName) return
    const action = actions[animationName]
    if (action) action.reset().fadeIn(0.5).play()
    return () => { action?.fadeOut(0.5) }
  }, [animationName, actions])

  // --- LOOP 1: Inverse Kinematics (Arm Reaching) ---
  useFrame(() => {
    if (!targetName) return;

    // Get Bones safely
    const shoulder = nodes.mixamorigHips.getObjectByName('mixamorigRightArm') as THREE.Bone
    const elbow = nodes.mixamorigHips.getObjectByName('mixamorigRightForeArm') as THREE.Bone
    const hand = nodes.mixamorigHips.getObjectByName('mixamorigRightHand') as THREE.Bone

    const targetObj = group.current?.getObjectByName(targetName)

    if (shoulder && elbow && hand && targetObj) {
      const targetPos = new THREE.Vector3()
      targetObj.getWorldPosition(targetPos)
      solveTwoBoneIK(shoulder, elbow, hand, targetPos)
    }
  })

  // --- LOOP 2: Hover Animation (Floating Items) ---
  useFrame((state, delta) => {
    const sceneGroup = group.current?.getObjectByName('Scene')
    if (!sceneGroup) return

    sceneGroup.children.forEach((child) => {
      if (PROJECTS.some(p => p.id === child.name)) {
        const mesh = child as THREE.Mesh
        // Init original position
        if (originalY.current[mesh.name] === undefined) {
          originalY.current[mesh.name] = mesh.position.y
        }

        const BaseY = originalY.current[mesh.name]
        const targetY = (hoveredName === mesh.name) ? BaseY + 0.5 : BaseY

        // Smooth Lerp
        mesh.position.y = THREE.MathUtils.lerp(mesh.position.y, targetY, 0.1)
      }
    })
  })

  return (
    <group
      ref={group}
      {...props}
      dispose={null}
      // Hover Handlers
      onPointerEnter={(e) => {
        e.stopPropagation()
        if (PROJECTS.some(p => p.id === e.object.name)) setHoveredName(e.object.name)
      }}
      onPointerLeave={(e) => {
        e.stopPropagation()
        setHoveredName(null)
      }}
      // Click Handler -> Triggers Focus in App.tsx
      onClick={(e) => {
        e.stopPropagation()
        // console.log('Clicked:', e.object.name)

        if (PROJECTS.some(p => p.id === e.object.name) && onFocus) {
          const targetPos = new THREE.Vector3()
          e.object.getWorldPosition(targetPos)
          onFocus(targetPos, e.object.name) // Pass name now too
        }
      }}
    >
      <group name="Scene">
        {/* FPS Hands (Attached to Camera Ghost in App logic implicitly via ref, 
            but visualized here) */}
        <group
          ref={armatureRef}
          name="Armature"
          position={[0, -1.2, -1.0]}
          rotation={[0, Math.PI, 0]}
          scale={0.033}
        >
          <primitive object={nodes.mixamorigHips} />
          <skinnedMesh name="Ch35" geometry={nodes.Ch35.geometry} material={materials.Ch35_body} skeleton={nodes.Ch35.skeleton} frustumCulled={false} />
        </group>

        {/* Room Objects */}
        <mesh name="Plane" geometry={nodes.Plane.geometry} material={nodes.Plane.material} scale={[6, 3, 3]} />
        <mesh name="Plane001" geometry={nodes.Plane001.geometry} material={nodes.Plane001.material} position={[4.274, 0.072, 0]} />
        <mesh name="Plane002" geometry={nodes.Plane002.geometry} material={nodes.Plane002.material} position={[-4.811, 0.072, -1.656]} />
        <mesh name="Plane003" geometry={nodes.Plane003.geometry} material={nodes.Plane003.material} position={[-0.822, 0.072, 0]} />
        <mesh name="Plane004" geometry={nodes.Plane004.geometry} material={nodes.Plane004.material} position={[0, 6.459, -3.236]} rotation={[Math.PI / 2, 0, 0]} scale={[6, 3, 3]} />
        <mesh name="Plane005" geometry={nodes.Plane005.geometry} material={nodes.Plane005.material} position={[-4.76, 3.328, -3.225]} rotation={[Math.PI / 2, 0, 0]} scale={[0.494, 0.35, 0.253]} />
        <mesh name="Plane006" geometry={nodes.Plane006.geometry} material={nodes.Plane006.material} position={[-2.749, 2.429, -3.225]} rotation={[Math.PI / 2, 0, 0]} scale={[0.494, 0.35, 0.253]} />
        <mesh name="Plane007" geometry={nodes.Plane007.geometry} material={nodes.Plane007.material} position={[-0.885, 3.786, -3.225]} rotation={[Math.PI / 2, 0, 0]} scale={[0.494, 0.35, 0.253]} />
        <mesh name="Plane008" geometry={nodes.Plane008.geometry} material={nodes.Plane008.material} position={[1.002, 3.216, -3.225]} rotation={[Math.PI / 2, 0, 0]} scale={[0.494, 0.35, 0.253]} />
        <mesh name="Plane009" geometry={nodes.Plane009.geometry} material={nodes.Plane009.material} position={[2.962, 3.965, -3.225]} rotation={[Math.PI / 2, 0, 0]} scale={[0.229, 0.35, 0.237]} />
        <mesh name="Plane010" geometry={nodes.Plane010.geometry} material={materials.Bliink} position={[-0.037, 6.511, 14.936]} rotation={[1.62, -0.004, 0]} scale={[1.25, 2.238, 0.682]} />
        <mesh name="Plane011" geometry={nodes.Plane011.geometry} material={materials.Bliink} position={[-0.042, 3.682, 14.696]} rotation={[-1.361, 0.004, 0]} scale={[1.47, 2.611, 0.628]} />
      </group>
    </group>
  )
}

useGLTF.preload('/room.glb')