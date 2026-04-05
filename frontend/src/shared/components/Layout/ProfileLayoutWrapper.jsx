import React from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import GlobalSidebar from './GlobalSidebar';

const ProfileLayoutWrapper = () => {
    return (
        <div className="flex flex-col min-h-screen bg-noir text-ivory selection:bg-gold/30 selection:text-ivory">
            <Navbar />
            <div className="flex flex-1 pt-[60px]">
                <GlobalSidebar />
                <main className="flex-1 overflow-x-hidden p-8">
                    <Outlet />
                </main>
            </div>
        </div>
    );
};

export default ProfileLayoutWrapper;
