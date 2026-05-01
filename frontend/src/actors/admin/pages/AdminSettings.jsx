import React from 'react';
import { Settings, Shield, Bell, Database, Globe, Lock } from 'lucide-react';

const AdminSettings = () => {
    const sections = [
        { title: 'Platform Access', icon: Shield, desc: 'Manage role-based permissions and verification rules.' },
        { title: 'System Notifications', icon: Bell, desc: 'Configure automated emails and system alerts.' },
        { title: 'API & Integrations', icon: Database, desc: 'Manage connection strings and external service keys.' },
        { title: 'Localization', icon: Globe, desc: 'Manage supported regions and currency settings.' },
        { title: 'Security', icon: Lock, desc: 'Authentication policies and session management.' },
    ];

    return (
        <div className="animate-fade-in max-w-4xl">
            <div className="mb-8">
                <h1 className="font-display text-3xl text-ivory mb-2">System Settings</h1>
                <p className="text-ivory/40 text-sm font-sans">Configure platform-wide parameters and security policies.</p>
            </div>

            <div className="grid gap-4">
                {sections.map((section, i) => (
                    <div key={i} className="bg-[#111113] border border-subtle/20 rounded-sm p-6 hover:border-gold/30 transition-all duration-300 group cursor-pointer">
                        <div className="flex items-center gap-5">
                            <div className="w-12 h-12 rounded-sm bg-gold/5 flex items-center justify-center border border-gold/10 group-hover:bg-gold/10 transition-colors">
                                <section.icon size={20} className="text-gold/60 group-hover:text-gold transition-colors" />
                            </div>
                            <div className="flex-1">
                                <h3 className="text-ivory font-display text-lg tracking-wide group-hover:text-gold transition-colors">{section.title}</h3>
                                <p className="text-ivory/30 text-xs mt-1">{section.desc}</p>
                            </div>
                            <div className="text-ivory/10 group-hover:text-gold/40 transition-colors">
                                <Settings size={18} />
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="mt-12 p-8 border border-dashed border-subtle/20 rounded-sm text-center">
                <p className="text-ivory/20 text-xs uppercase tracking-[0.3em] font-sans">Advanced configuration panel restricted</p>
            </div>
        </div>
    );
};

export default AdminSettings;
