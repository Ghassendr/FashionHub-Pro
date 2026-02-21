import React from 'react';
import { ArrowRight } from 'lucide-react';

const Onboarding = () => {
    return (
        <div className="min-h-screen flex items-center justify-center pt-20 pb-16">
            <div className="w-full max-w-xl px-6 animate-fade-in">
                {/* Header */}
                <div className="text-center mb-16">
                    <div className="divider-gold mb-8"></div>
                    <p className="text-label text-gold mb-4">Private Access</p>
                    <h1 className="font-display text-4xl md:text-5xl font-bold text-ivory mb-4">
                        Client Registration
                    </h1>
                    <p className="text-ivory/40 text-sm max-w-md mx-auto">
                        Register as a private client to access exclusive collections, bespoke consultations, and white-glove logistics.
                    </p>
                </div>

                {/* Form */}
                <div className="space-y-8">
                    <div>
                        <label className="text-label block mb-2">Full Name</label>
                        <input type="text" className="input-couture" placeholder="Alexandra Dubois" />
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                        <div>
                            <label className="text-label block mb-2">Client Reference</label>
                            <input type="text" className="input-couture" placeholder="MT-001234" />
                        </div>
                        <div>
                            <label className="text-label block mb-2">Fashion House</label>
                            <input type="text" className="input-couture" placeholder="Maison Dubois" />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                        <div>
                            <label className="text-label block mb-2">Preferred Atelier</label>
                            <select className="input-couture cursor-pointer">
                                <option>Paris</option>
                                <option>Milano</option>
                                <option>London</option>
                                <option>New York</option>
                                <option>Tokyo</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-label block mb-2">Service Tier</label>
                            <select className="input-couture cursor-pointer">
                                <option>Haute Couture</option>
                                <option>Prêt-à-Porter</option>
                                <option>Bespoke</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="text-label block mb-2">Primary Route (Origin — Destination)</label>
                        <div className="grid grid-cols-2 gap-6">
                            <input type="text" className="input-couture" placeholder="Paris" />
                            <input type="text" className="input-couture" placeholder="Dubai" />
                        </div>
                    </div>

                    <div>
                        <label className="text-label block mb-2">Special Requests</label>
                        <textarea className="input-couture min-h-[100px] resize-none" placeholder="Fabric preferences, delivery instructions, etc."></textarea>
                    </div>

                    <div className="pt-4">
                        <div className="divider-gold mb-8"></div>
                        <button type="button" className="btn btn-primary w-full justify-center group">
                            Submit Application
                            <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform duration-300" />
                        </button>
                        <p className="text-ivory/20 text-[10px] text-center mt-4 tracking-wider uppercase">
                            Your application will be reviewed by our private client team
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Onboarding;
