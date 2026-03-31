import React, { useState, useRef } from 'react';
import axios from 'axios';
import Viewer3D from '../components/Viewer3D';
import { UploadCloud, Activity, Ruler, ArrowRight } from 'lucide-react';
import '../../../shared/styles/App.css';

function BodyMeasurements() {
    // State
    const [formData, setFormData] = useState({
        height: 175,
        weight: 75,
        age: '',
        gender: 'men',
        cut: '',
        quality: 'balanced'
    });
    const [file, setFile] = useState(null);
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('viewer');

    const fileInputRef = useRef(null);

    // Handlers
    const handleInputChange = (e) => {
        const { id, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [id === 'heightInput' ? 'height' :
                id === 'weightInput' ? 'weight' :
                    id === 'ageInput' ? 'age' :
                        id === 'genderInput' ? 'gender' :
                            id === 'qualityInput' ? 'quality' : 'cut']: value
        }));
    };

    const handleFileChange = (e) => {
        if (e.target.files.length) {
            setFile(e.target.files[0]);
        }
    };

    const handleSubmit = async () => {
        if (!file) return;

        setLoading(true);
        const data = new FormData();
        data.append('video', file);
        data.append('height', formData.height);
        data.append('weight', formData.weight);
        data.append('age', formData.age);
        data.append('gender', formData.gender);
        data.append('cut_preference', formData.cut);
        data.append('quality', formData.quality);

        const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';
        try {
            const response = await axios.post(`${API_BASE}/api/client/videos/process`, data, { timeout: 300000 });
            const resultData = response.data;
            if (resultData?.status === 'error') {
                alert('Pipeline Error: ' + (resultData.error || 'Unknown error'));
                setLoading(false);
                return;
            }
            if (resultData && resultData.mesh_url && !resultData.mesh_url.startsWith('http')) {
                resultData.mesh_url = `${API_BASE}${resultData.mesh_url}?t=${Date.now()}`;
            }
            setResult(resultData);
            setActiveTab('viewer');
        } catch (error) {
            const msg = error.response?.data?.error || error.message || 'Error occurred during processing.';
            alert('Erreur: ' + msg);
        } finally {
            setLoading(false);
        }
    };

    // Render Helpers
    const renderMeasurementItem = (m) => (
        <div className="flex items-center justify-between py-4 border-b border-gold/5 group hover:bg-gold/[0.01] transition-colors px-1" key={m.key || m.name}>
            <span className="text-[10px] uppercase tracking-[0.2em] text-ivory/50 font-light">{m.name}</span>
            <div className="flex items-center gap-6">
                <span className="text-sm font-serif text-gold tracking-wide">{m.value_cm} <span className="text-[9px] uppercase opacity-40 ml-0.5">cm</span></span>
                <div className="w-16 h-[1px] bg-gold/10 relative">
                    <div 
                        className={`absolute inset-y-0 left-0 ${m.confidence > 0.8 ? 'bg-gold' : 'bg-gold/40'}`}
                        style={{ width: `${(m.confidence || 0.8) * 100}%` }}
                    ></div>
                </div>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-noir text-ivory font-sans pt-28 pb-12 transition-all duration-700">
            <div className="mx-auto w-full max-w-[1920px] px-8">
                {/* Dashboard Stats / Pipeline Info */}
                <div className="flex items-center justify-between mb-8 pb-6 border-b border-gold/10">
                    <div className="flex items-center gap-10">
                        <div className="flex flex-col">
                            <span className="text-[10px] tracking-luxury text-gold font-semibold mb-1 uppercase">Pipeline Status</span>
                            <div className="flex items-center gap-3">
                                <div className="w-2 h-2 rounded-full bg-gold animate-pulse"></div>
                                <span className="text-sm font-light text-ivory/80 uppercase tracking-widest">Active Studio Analysis</span>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="text-right">
                           <span className="text-[10px] tracking-luxury text-ivory/30 block mb-1 uppercase">Dernière mise à jour</span>
                           <span className="text-xs font-serif italic text-ivory/60">Aujourd'hui, 31 Mars 2026</span>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-x-12 items-start">
                    {/* Left Panel: Sidebar - Phase 2 Refined UI */}
                    <aside className="space-y-[18px] animate-fade-up pl-[20px] pr-[16px] bg-[#0d0d0b] border-r border-gold/5 py-12 min-h-screen max-w-[260px] w-full">
                        {/* Section 1: Capture */}
                        <div className="space-y-4">
                            <label className="label-v2">Capture Source</label>
                            <div 
                                onClick={() => fileInputRef.current?.click()}
                                className="upload-zone-v2 group cursor-pointer"
                            >
                                <input 
                                    type="file" 
                                    ref={fileInputRef} 
                                    className="hidden" 
                                    onChange={handleFileChange} 
                                    accept="video/*"
                                />

                                <div className="text-center">
                                    <UploadCloud size={20} strokeWidth={1} className="text-gold/40 group-hover:text-gold transition-colors duration-500 mb-2 mx-auto" />
                                    <span className="text-[9px] tracking-[0.15em] text-ivory/30 uppercase group-hover:text-gold/70 transition-colors duration-500 font-light">
                                        {file ? file.name : "Import Capture"}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="divider-luxury-v2"></div>

                        {/* Section 2: Biométrie */}
                        <div className="space-y-[18px]">
                            <h3 className="couture-group-title !text-gold/40 !text-[9px]">Biométrie</h3>
                            
                            <div className="space-y-4">
                                <div className="space-y-1.5">
                                    <label className="label-v2">Taille (cm)</label>
                                    <input 
                                        type="number" 
                                        id="heightInput"
                                        placeholder="—"
                                        value={formData.height} 
                                        onChange={handleInputChange}
                                        className="input-underline-v2" 
                                    />
                                </div>
                                
                                <div className="space-y-1.5">
                                    <label className="label-v2">Poids (kg)</label>
                                    <input 
                                        type="number" 
                                        id="weightInput"
                                        placeholder="—"
                                        value={formData.weight} 
                                        onChange={handleInputChange}
                                        className="input-underline-v2" 
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <label className="label-v2">Âge</label>
                                    <input 
                                        type="number" 
                                        id="ageInput"
                                        placeholder="—"
                                        value={formData.age} 
                                        onChange={handleInputChange}
                                        className="input-underline-v2" 
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <label className="label-v2">Sexe</label>
                                    <select 
                                        id="genderInput"
                                        value={formData.gender} 
                                        onChange={handleInputChange}
                                        className="input-underline-v2 appearance-none cursor-pointer"
                                    >
                                        <option value="men" className="bg-[#0d0d0b]">Homme</option>
                                        <option value="women" className="bg-[#0d0d0b]">Femme</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div className="divider-luxury-v2"></div>

                        {/* Section 3: Analyse */}
                        <div className="space-y-[18px]">
                            <h3 className="couture-group-title !text-gold/40 !text-[9px]">Analyse</h3>
                            
                            <div className="space-y-4">
                                <div className="space-y-1.5">
                                    <label className="label-v2">Mode IA</label>
                                    <select 
                                        id="cutInput"
                                        value={formData.cut} 
                                        onChange={handleInputChange}
                                        className="input-underline-v2 appearance-none cursor-pointer"
                                    >
                                        <option value="" className="bg-[#0d0d0b]">Automatique</option>
                                        <option value="ajusté" className="bg-[#0d0d0b]">Slim Fit</option>
                                        <option value="normal" className="bg-[#0d0d0b]">Regular Fit</option>
                                    </select>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="label-v2">Précision</label>
                                    <select 
                                        id="qualityInput"
                                        value={formData.quality} 
                                        onChange={handleInputChange}
                                        className="input-underline-v2 appearance-none cursor-pointer"
                                    >
                                        <option value="balanced" className="bg-[#0d0d0b]">Normal</option>
                                        <option value="high" className="bg-[#0d0d0b]">HD Analysis</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        <button 
                            onClick={handleSubmit}
                            disabled={!file || loading}
                            className="btn-luxury-cta mt-8"
                        >
                            <div className="flex items-center gap-1.5 opacity-60">
                                {loading ? (
                                    <div className="w-3 h-3 border-t border-gold rounded-full animate-spin"></div>
                                ) : (
                                    <div className="flex items-center gap-1">
                                        <div className="w-2 h-[1px] bg-gold"></div>
                                        <div className="w-1 h-1 rounded-full bg-gold animate-pulse"></div>
                                    </div>
                                )}
                            </div>
                            <span className="pt-0.5">LANCER L'ANALYSE 3D</span>
                        </button>
                    </aside>

                    {/* Right Panel: Main Workspace */}
                    <main className="min-h-[700px] border border-luxury bg-surface/10 relative flex flex-col overflow-hidden animate-fade-in shadow-2xl">
                        {result ? (
                            <div className="flex flex-col h-full">
                                {/* Tabs */}
                                <div className="flex justify-center border-b border-luxury bg-noir/40">
                                    {[
                                        { id: 'viewer', label: 'Modèle 3D' },
                                        { id: 'measurements', label: 'Ajustements & Métriques' },
                                        { id: 'morphology', label: 'Diagnostic Morpho' }
                                    ].map(tab => (
                                        <button 
                                            key={tab.id}
                                            onClick={() => setActiveTab(tab.id)}
                                            className={`px-10 py-6 text-[10px] tracking-luxury uppercase font-medium transition-all duration-700 relative ${activeTab === tab.id ? 'bg-gold/5 text-gold' : 'text-ivory/30 hover:text-ivory/60'}`}
                                        >
                                            {tab.label}
                                            {activeTab === tab.id && <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gold shadow-glow-gold/20"></div>}
                                        </button>
                                    ))}
                                </div>

                                <div className="flex-grow relative">
                                    {activeTab === 'viewer' && (
                                        <div className="absolute inset-0">
                                            <Viewer3D url={result.mesh_url} />
                                        </div>
                                    )}
                                    {activeTab === 'measurements' && (
                                        <div className="p-16 h-full overflow-y-auto">
                                            <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-16">
                                                {['basics', 'heights'].map(cat => (
                                                    <div key={cat} className="space-y-8">
                                                        <h3 className="text-label text-gold font-medium border-b border-luxury pb-4 tracking-[0.3em]">{cat === 'basics' ? 'CIRCONFÉRENCES' : 'LONGUEURS'}</h3>
                                                        <div className="space-y-1">
                                                            {(result?.measurements?.[cat] || []).map(renderMeasurementItem)}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    {activeTab === 'morphology' && (
                                        <div className="p-16 h-full overflow-y-auto">
                                           {/* Morphology details */}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : (
                            /* Empty State with 3D Wireframe Placeholder */
                            <div className="flex-grow flex flex-col items-center justify-center p-20 text-center relative overflow-hidden">
                                {/* Subtle 3D Wireframe Silhouette SVG */}
                                <div className="absolute inset-0 flex items-center justify-center opacity-[0.08] pointer-events-none scale-125 lg:scale-110 transition-transform duration-[20s] animate-float">
                                    <svg width="400" height="800" viewBox="0 0 400 800" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M200 40C200 40 180 40 170 60C160 80 160 100 160 100L170 140H230L240 100C240 100 240 80 230 60C220 40 200 40 200 40Z" stroke="#C9A96E" strokeWidth="0.5"/>
                                        <path d="M170 140L140 180L120 280L140 400L160 550L170 800" stroke="#C9A96E" strokeWidth="0.5"/>
                                        <path d="M230 140L260 180L280 280L260 400L240 550L230 800" stroke="#C9A96E" strokeWidth="0.5"/>
                                        <path d="M140 180C140 180 170 200 200 200C230 200 260 180 260 180" stroke="#C9A96E" strokeWidth="0.5"/>
                                        <circle cx="200" cy="80" r="30" stroke="#C9A96E" strokeWidth="0.2"/>
                                        <line x1="140" y1="180" x2="260" y2="180" stroke="#C9A96E" strokeWidth="0.2"/>
                                        <line x1="120" y1="280" x2="280" y2="280" stroke="#C9A96E" strokeWidth="0.2"/>
                                        <line x1="140" y1="400" x2="260" y2="400" stroke="#C9A96E" strokeWidth="0.2"/>
                                    </svg>
                                </div>

                                <div className="relative z-10 max-w-lg space-y-10">
                                    <div className="relative w-32 h-32 mx-auto">
                                        <div className="absolute inset-0 border border-gold/10 rounded-full"></div>
                                        <div className="absolute inset-0 border-t border-gold rounded-full animate-spin-slow"></div>
                                        <div className="absolute inset-0 flex items-center justify-center opacity-40">
                                            <Activity size={32} strokeWidth={1} className="text-gold" />
                                        </div>
                                    </div>
                                    
                                    <div className="space-y-6">
                                        <h3 className="text-3xl font-serif font-light text-ivory/90 tracking-[0.1em]">
                                            EN ATTENTE D'ANALYSE
                                        </h3>
                                        <p className="text-[13px] text-ivory/40 leading-relaxed font-light uppercase tracking-widest px-10">
                                            Importez votre capture 360° pour générer votre Digital Twin et accéder aux mesures de haute couture.
                                        </p>
                                    </div>
                                </div>

                                {/* Pipeline Progress Upgrade */}
                                <div className="absolute bottom-20 left-12 right-12 max-w-4xl mx-auto">
                                    <div className="relative flex justify-between items-center">
                                        {/* Background connecting line */}
                                        <div className="absolute top-1/2 left-0 right-0 h-[0.5px] bg-gold/10 -translate-y-1/2 -z-10"></div>
                                        
                                        {[
                                            { step: "01", label: "SOURCING", status: "EN ATTENTE", active: true },
                                            { step: "02", label: "PROCESSING", status: "EN ATTENTE", active: false },
                                            { step: "03", label: "ANALYTICS", status: "EN ATTENTE", active: false }
                                        ].map((node, i) => (
                                            <div key={i} className="flex flex-col items-center group">
                                                <div className={`w-3 h-3 rounded-full border transition-all duration-1000 mb-4 bg-noir ${node.active ? 'border-gold shadow-glow-gold bg-gold scale-125' : 'border-gold/30'}`}></div>
                                                <span className={`text-[9px] tracking-luxury uppercase mb-1 transition-colors duration-700 ${node.active ? 'text-gold' : 'text-ivory/20'}`}>{node.label}</span>
                                                <span className={`text-[8px] tracking-widest uppercase font-light ${node.active ? 'text-ivory/60' : 'text-ivory/10'}`}>{node.status}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                    </main>
                </div>
            </div>

            {/* Global Loading Overlay */}
            {loading && (
                <div className="fixed inset-0 bg-noir/95 backdrop-blur-md z-[100] flex flex-col items-center justify-center animate-fade-in">
                    <div className="relative w-40 h-[1px] bg-gold/10 mb-12 overflow-hidden">
                        <div className="h-full bg-gold w-full -translate-x-full animate-[shimmer_1.5s_infinite]"></div>
                    </div>
                    <div className="text-center space-y-4">
                        <h4 className="text-2xl font-serif italic text-gold/80 tracking-wide">Orchestration Digital Twin</h4>
                        <p className="text-[10px] tracking-[0.4em] uppercase text-ivory/40 font-light">Extraction biométrique en cours</p>
                    </div>
                </div>
            )}
        </div>
    );
}

export default BodyMeasurements;
