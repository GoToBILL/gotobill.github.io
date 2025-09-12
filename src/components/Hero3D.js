import React, { useRef, Suspense } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Box, OrbitControls, Sphere, MeshDistortMaterial } from '@react-three/drei'
import styled from 'styled-components'

const CanvasContainer = styled.div`
  width: 100%;
  height: 400px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: var(--radius);
  margin-bottom: 3rem;
  position: relative;
  overflow: hidden;
  
  @media (max-width: 768px) {
    height: 300px;
  }
`;

const AnimatedSphere = () => {
  const meshRef = useRef()
  
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.x += 0.01
      meshRef.current.rotation.y += 0.01
      meshRef.current.position.y = Math.sin(state.clock.elapsedTime) * 0.2
    }
  })
  
  return (
    <Sphere ref={meshRef} args={[1, 100, 200]} scale={2}>
      <MeshDistortMaterial
        color="#ffffff"
        attach="material"
        distort={0.3}
        speed={1.5}
        roughness={0}
      />
    </Sphere>
  )
}

const Hero3D = () => {
  return (
    <CanvasContainer>
      <Canvas camera={{ position: [0, 0, 5] }}>
        <Suspense fallback={null}>
          <ambientLight intensity={0.5} />
          <directionalLight position={[10, 10, 5]} intensity={1} />
          <AnimatedSphere />
          <OrbitControls enableZoom={false} />
        </Suspense>
      </Canvas>
    </CanvasContainer>
  )
}

export default Hero3D