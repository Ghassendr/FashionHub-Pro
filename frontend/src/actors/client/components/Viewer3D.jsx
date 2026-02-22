/**
 * Viewer3D.jsx
 * Renders the body mesh using React Three Fiber.
 * Auto-rotates and allows orbit controls.
 */
import React, { useLayoutEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, useGLTF, Stage, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';

function Model({ url }) {
    const { scene } = useGLTF(url);

    useLayoutEffect(() => {
        scene.traverse((child) => {
            if (child.isMesh) {
                // Apply a natural skin tone material
                child.material = new THREE.MeshStandardMaterial({
                    color: '#e8beac', // Natural fair skin tone (can easily be modified)
                    roughness: 0.45,
                    metalness: 0.05,
                    envMapIntensity: 1.0,
                });
            }
        });
    }, [scene]);

    return <primitive object={scene} />;
}

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

export default function Viewer3D({ url }) {
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
                        <Stage environment="studio" intensity={1.2}>
                            <Model url={url} />
                        </Stage>
                        <OrbitControls autoRotate />
                    </Canvas>
                </ErrorBoundary>
            ) : (
                <div className="flex flex-col items-center justify-center h-full text-gray-400 p-6 text-center">
                    <p className="mb-2 font-medium">Modèle 3D non disponible</p>
                    <p className="text-sm">Le modèle 3D sera généré après une analyse réussie.</p>
                </div>
            )}
        </div>
    );
}
