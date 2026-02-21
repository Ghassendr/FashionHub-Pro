/**
 * Viewer3D.jsx
 * Renders the body mesh using React Three Fiber.
 * Auto-rotates and allows orbit controls.
 */
import React, { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, useGLTF, Stage, ContactShadows, Html } from '@react-three/drei';

// Error Boundary for 3D Viewer
class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false };
    }
    static getDerivedStateFromError(error) { return { hasError: true }; }
    componentDidCatch(error, errorInfo) { console.error("Viewer3D error:", error, errorInfo); }
    render() {
        if (this.state.hasError) return this.props.fallback;
        return this.props.children;
    }
}

import * as THREE from 'three';

function Model({ url }) {
    console.log("Model Render:", url);
    const { scene } = useGLTF(url);

    React.useLayoutEffect(() => {
        if (scene) {
            scene.traverse((child) => {
                if (child.isMesh) {
                    // Force a consistent gold material to ignore corrupted GLB vertex colors
                    child.material = new THREE.MeshStandardMaterial({
                        color: new THREE.Color("#C6A75E"),
                        roughness: 0.4,
                        metalness: 0.3,
                        side: THREE.DoubleSide
                    });
                }
            });
        }
    }, [scene]);

    // Backend mesh is built in meters from y=0 (feet) to y=1.75 (head)
    // Center the model vertically so it sits in the middle of the camera's view using a group wrapper
    return (
        <group position={[0, -0.85, 0]}>
            <primitive object={scene} />
        </group>
    );
}

export default function Viewer3D({ url }) {
    console.log("Viewer3D Render Triggered. Received URL prop:", url);

    if (!url) {
        return (
            <div className="w-full h-full min-h-[500px] bg-black rounded-lg overflow-hidden relative shadow-lg flex items-center justify-center">
                <p className="text-ivory/30 text-sm">No 3D model available</p>
            </div>
        );
    }

    return (
        <div className="w-full h-full min-h-[500px] bg-black rounded-lg overflow-hidden relative shadow-lg group">
            <ErrorBoundary fallback={
                <div className="flex flex-col items-center justify-center h-full text-red-400 p-6 text-center">
                    <p className="mb-2 font-medium">Erreur de chargement du modèle 3D</p>
                    <p className="text-sm">Le fichier est introuvable ou corrompu.</p>
                </div>
            }>
                <Canvas shadows dpr={[1, 2]} camera={{ position: [0, 1, 5], fov: 50 }}>
                    <color attach="background" args={['#111111']} />
                    <ambientLight intensity={2} />
                    <directionalLight position={[10, 10, 10]} intensity={2} />

                    <axesHelper args={[5]} />
                    <gridHelper args={[10, 10]} />

                    <Suspense fallback={
                        <Html center>
                            <div className="text-white bg-black/80 px-4 py-2 rounded font-sans tracking-wide border border-gold/30">
                                <span className="text-gold animate-pulse">Loading 3D Engine...</span>
                            </div>
                        </Html>
                    }>
                        <Stage environment="city" intensity={0.6} adjustCamera={true}>
                            <Model url={url} />
                        </Stage>
                        <OrbitControls
                            autoRotate={false}
                            enablePan={true}
                            enableZoom={true}
                            enableRotate={true}
                        />
                    </Suspense>
                </Canvas>
            </ErrorBoundary>
        </div>
    );
}
