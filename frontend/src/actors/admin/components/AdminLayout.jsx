import React from 'react';
import { Outlet } from 'react-router-dom';
import AdminSidebar from './AdminSidebar';
import AdminNavbar from './AdminNavbar';

const AdminLayout = () => {
    return (
        <div className="min-h-screen bg-noir flex" style={{ paddingTop: 0 }}>
            <AdminSidebar />
            <div className="flex-1 ml-64 flex flex-col">
                <AdminNavbar />
                <main className="flex-1 p-8 overflow-y-auto animate-fade-in">
                    <Outlet />
                </main>
            </div>
        </div>
    );
};

export default AdminLayout;
