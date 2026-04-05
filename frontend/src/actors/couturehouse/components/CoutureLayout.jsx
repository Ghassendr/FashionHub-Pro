import React, { useState } from 'react';
import CoutureSidebar from './CoutureSidebar';
import CoutureTopBar from './CoutureTopBar';
import './FabricOrderWizard.css'; // Sometimes needed for consistent animations

const CoutureLayout = ({ children, headerActions }) => {
    const [sidebarOpen, setSidebarOpen] = useState(true);

    return (
        <div className="atelier-layout">
            <CoutureSidebar isOpen={sidebarOpen} />
            <main className={`atelier-main ${!sidebarOpen ? 'expanded' : ''}`}>
                <CoutureTopBar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen}>
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
