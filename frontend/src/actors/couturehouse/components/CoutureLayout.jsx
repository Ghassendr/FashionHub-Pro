import React, { useState } from 'react';
import CoutureTopBar from './CoutureTopBar';
import './FabricOrderWizard.css'; // Sometimes needed for consistent animations

const CoutureLayout = ({ children, headerActions }) => {
    const [sidebarOpen, setSidebarOpen] = useState(true);

    return (
        <div className="atelier-layout">
            <main className="atelier-main expanded">
                <CoutureTopBar sidebarOpen={true} setSidebarOpen={() => {}}>
                    {headerActions}
                </CoutureTopBar>
                <div className="atelier-content animate-in">
                    {children}
                </div>
            </main>
        </div>
    );
};

export default CoutureLayout;
