/**
 * Viewer3D.jsx
 * Renders the body mesh using React Three Fiber.
 * Auto-rotates and allows orbit controls.
 */
import React, { useLayoutEffect, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, useGLTF, Stage } from '@react-three/drei';
import * as THREE from 'three';

function Model({ url }) {
    console.log("Model Render:", url);
    const { scene } = useGLTF(url);

    useLayoutEffect(() => {
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

    return <primitive object={scene} />;
}

// Error Boundary for 3D Viewer
class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false };
    }
    static getDerivedStateFromError() { return { hasError: true }; }
    componentDidCatch(error, errorInfo) { console.error("Viewer3D error:", error, errorInfo); }
    render() {
        if (this.state.hasError) return this.props.fallback;
        return this.props.children;
    }
}

export default function Viewer3D({ url }) {
    // Backend mesh is built in meters from y=0 (feet) to y=1.75 (head)
    // Center the model vertically so it sits in the middle of the camera's view using a group wrapper
    return (
        <div className="h-[500px] w-full bg-gray-50 rounded-xl overflow-hidden border border-gray-200">
            {url ? (
                <ErrorBoundary fallback={
                    <div className="flex flex-col items-center justify-center h-full text-red-400 p-6 text-center">
                        <p className="mb-2 font-medium">Erreur de chargement du modèle 3D</p>
                        <p className="text-sm">Le fichier est introuvable ou corrompu.</p>
                    </div>
                }>
                    <Canvas shadows dpr={[1, 2]} camera={{ position: [0, 0, 4], fov: 50 }}>
                        <Suspense fallback={null}>
                            <Stage environment={{ files: "/studio_small_03_1k.hdr" }} intensity={1.2}>
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
            ) : (
                <div className="flex flex-col items-center justify-center h-full text-gray-400 p-6 text-center">
                    <p>Aucun modèle 3D disponible</p>
                </div>
            )}
        </div>
    );
}