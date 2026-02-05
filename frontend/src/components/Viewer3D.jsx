/**
 * Viewer3D.jsx
 * Renders the body mesh using React Three Fiber.
 * Auto-rotates and allows orbit controls.
 */
import React from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, useGLTF, Stage, ContactShadows } from '@react-three/drei';

function Model({ url }) {
    const { scene } = useGLTF(url);
    return <primitive object={scene} />;
}

export default function Viewer3D({ url }) {
    return (
        <div className="h-[500px] w-full bg-gray-50 rounded-xl overflow-hidden border border-gray-200">
            <Canvas shadows dpr={[1, 2]} camera={{ position: [0, 0, 4], fov: 50 }}>
                <Stage environment="city" intensity={0.6}>
                    <Model url={url} />
                </Stage>
                <OrbitControls autoRotate />
            </Canvas>
        </div>
    );
}
