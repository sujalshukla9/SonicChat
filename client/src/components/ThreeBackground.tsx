import { Canvas } from '@react-three/fiber';
import { Float, Sphere, MeshDistortMaterial, Stars } from '@react-three/drei';

function AnimatedSphere({ color, position, scale, distort = 0.4 }: { color: string, position: [number, number, number], scale: number, distort?: number }) {
    return (
        <Float speed={1.5} rotationIntensity={1.5} floatIntensity={1.5}>
            <Sphere visible args={[1, 100, 200]} scale={scale} position={position}>
                <MeshDistortMaterial
                    color={color}
                    attach="material"
                    distort={distort}
                    speed={2}
                    roughness={0.2}
                    metalness={0.8}
                />
            </Sphere>
        </Float>
    );
}

export default function ThreeBackground() {
    return (
        <div className="absolute inset-0 -z-10 h-full w-full bg-black">
            <Canvas camera={{ position: [0, 0, 5] }}>
                <ambientLight intensity={0.5} />
                <directionalLight position={[10, 10, 5]} intensity={1} color="#ffffff" />
                <pointLight position={[-10, -10, -5]} intensity={1} color="#ec4899" />
                <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />

                {/* Purple Sphere - Main */}
                <AnimatedSphere color="#8b5cf6" position={[2, 0, 0]} scale={1.5} distort={0.5} />

                {/* Cyan Sphere - Secondary */}
                <AnimatedSphere color="#06b6d4" position={[-2, -1, -2]} scale={1.2} distort={0.4} />

                {/* Pink Sphere - Accent */}
                <AnimatedSphere color="#ec4899" position={[0, 2, -5]} scale={1} distort={0.3} />
            </Canvas>
        </div>
    );
}
