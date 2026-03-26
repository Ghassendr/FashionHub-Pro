import React, { useState, useRef } from 'react';
import axios from 'axios';
import Viewer3D from '../components/Viewer3D';
import Plot from 'react-plotly.js';
import { UploadCloud, CheckCircle, AlertCircle, Maximize, Activity, Navigation, BarChart3, Ruler, ArrowRight } from 'lucide-react';
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
            console.log("Full Upload Response:", resultData);

            // Check if backend returned an error status
            if (resultData?.status === 'error') {
                console.error('Pipeline Error:', resultData.error);
                alert('Pipeline Error: ' + (resultData.error || 'Unknown error'));
                setLoading(false);
                return;
            }

            if (resultData && resultData.mesh_url && !resultData.mesh_url.startsWith('http')) {
                resultData.mesh_url = `${API_BASE}${resultData.mesh_url}?t=${Date.now()}`;
            }
            console.log("Setting BodyMeasurements Result State:", resultData);
            setResult(resultData);
            setActiveTab('viewer');
        } catch (error) {
            console.error('API Error:', error);
            const msg = error.response?.data?.error || error.message || 'Backend inaccessible. Vérifiez que le serveur tourne sur le port 8000.';
            alert('Erreur: ' + msg);
        } finally {
            setLoading(false);
        }
    };

    // Render Helpers
    const renderMeasurementItem = (m) => (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between py-3 border-b border-subtle/30 last:border-0" key={m.key || m.name}>
            <span className="text-sm text-ivory/70">{m.name}</span>
            <div className="flex items-center gap-4 mt-2 sm:mt-0">
                <span className="font-display font-bold text-gold truncate w-16 text-right cursor-default" title={`${m.value_cm} cm`}>{m.value_cm} cm</span>
                <div className="w-20 h-1 bg-subtle overflow-hidden shrink-0" title={`Confidence: ${Math.round((m.confidence || 0.8) * 100)}%`}>
                    <div
                        className={`h-full ${m.confidence > 0.8 ? 'bg-emerald' : m.confidence > 0.5 ? 'bg-gold' : 'bg-blush'}`}
                        style={{ width: `${(m.confidence || 0.8) * 100}%` }}
                    ></div>
                </div>
            </div>
        </div>
    );

    return (
        <div className="min-h-[calc(100vh-5rem)] bg-noir pt-24 pb-8 relative">
            {/* Background Effects */}
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gold/3 rounded-full blur-[120px] pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-gold/2 rounded-full blur-[150px] pointer-events-none"></div>

            <main className="wrapper relative z-10 animate-fade-in flex flex-col lg:flex-row gap-8">
                {/* Sidebar */}
                <aside className="w-full lg:w-[380px] shrink-0 space-y-6">
                    {/* Header Card */}
                    <div className="bg-muted border border-subtle/50 p-8 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-gold/10 rounded-full blur-2xl -mr-10 -mt-10 group-hover:scale-150 transition-transform duration-700"></div>
                        <h1 className="text-2xl font-display font-bold mb-2 tracking-tight relative z-10 flex items-center gap-3 text-ivory">
                            <Activity className="text-gold" size={24} /> 3D Body Scan
                        </h1>
                        <p className="text-ivory/40 font-light relative z-10 text-sm">Create your AI-powered 3D measurement profile for a perfect fit.</p>
                    </div>

                    {/* Upload Card */}
                    <div className="bg-muted border border-subtle/50 p-6">
                        <h2 className="text-label text-gold mb-4 flex items-center gap-2">
                            <UploadCloud size={14} /> Video Upload
                        </h2>

                        <div
                            className={`border border-dashed p-8 text-center cursor-pointer transition-all duration-500 ${file ? 'border-gold/50 bg-gold/5' : 'border-subtle hover:border-gold/30 hover:bg-subtle/50'}`}
                            onClick={() => fileInputRef.current.click()}
                            onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('border-gold/50', 'bg-gold/5'); }}
                            onDragLeave={(e) => e.currentTarget.classList.remove('border-gold/50', 'bg-gold/5')}
                            onDrop={(e) => {
                                e.preventDefault();
                                e.currentTarget.classList.remove('border-gold/50', 'bg-gold/5');
                                if (e.dataTransfer.files.length) setFile(e.dataTransfer.files[0]);
                            }}
                        >
                            {file ? (
                                <div className="flex flex-col items-center animate-fade-in">
                                    <CheckCircle className="text-gold mb-3" size={24} />
                                    <p className="text-sm text-ivory truncate w-full px-4">{file.name}</p>
                                    <p className="text-[10px] tracking-luxury uppercase text-gold/60 mt-2">Ready — Click "Analyze Body Measurements" below</p>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center">
                                    <UploadCloud size={24} className="text-ivory/20 mb-3" />
                                    <p className="text-sm text-ivory/50">Drag & drop your file here</p>
                                    <p className="text-xs text-ivory/25 mt-1">or click to browse</p>
                                </div>
                            )}
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleFileChange}
                                accept="video/*"
                                hidden
                            />
                        </div>
                    </div>

                    {/* Config Card */}
                    <div className="bg-muted border border-subtle/50 p-6">
                        <h2 className="text-label text-gold mb-5 flex items-center gap-2">
                            <BarChart3 size={14} /> Processing Config
                        </h2>

                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-label block mb-2">Height (cm)</label>
                                    <input type="number" className="input-couture" id="heightInput"
                                        value={formData.height} onChange={handleInputChange} min="100" max="250" step="0.1" />
                                </div>
                                <div>
                                    <label className="text-label block mb-2">Weight (kg)</label>
                                    <input type="number" className="input-couture" id="weightInput"
                                        value={formData.weight} onChange={handleInputChange} min="30" max="200" step="0.1" />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-label block mb-2">Age</label>
                                    <input type="number" className="input-couture" id="ageInput"
                                        value={formData.age} onChange={handleInputChange} placeholder="Ex: 35" min="10" max="100" />
                                </div>
                                <div>
                                    <label className="text-label block mb-2">Gender</label>
                                    <select className="input-couture cursor-pointer" id="genderInput"
                                        value={formData.gender} onChange={handleInputChange}>
                                        <option value="men">Men</option>
                                        <option value="women">Women</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="text-label block mb-2">AI Preference Mode</label>
                                <select className="input-couture cursor-pointer" id="cutInput"
                                    value={formData.cut} onChange={handleInputChange}>
                                    <option value="">Automatic (Recommended)</option>
                                    <option value="ajusté">Slim Fit</option>
                                    <option value="normal">Regular Fit</option>
                                    <option value="large">Loose Fit</option>
                                </select>
                            </div>

                            <div>
                                <label className="text-label block mb-2">Analysis Precision</label>
                                <select className="input-couture cursor-pointer" id="qualityInput"
                                    value={formData.quality} onChange={handleInputChange}>
                                    <option value="fast">Fast (36 points)</option>
                                    <option value="balanced">Balanced (72 points)</option>
                                    <option value="high">High Detail (120 points)</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <button
                        className={`w-full py-4 font-sans text-sm font-medium tracking-luxury uppercase transition-all duration-500 flex items-center justify-center gap-3 border ${(!file || loading) ? 'bg-subtle/50 text-ivory/20 border-subtle cursor-not-allowed' : 'bg-gold text-noir border-gold hover:bg-gold-light hover:shadow-glow-gold'}`}
                        onClick={handleSubmit}
                        disabled={!file || loading}
                    >
                        {loading ? (
                            <><span className="w-4 h-4 border-2 border-noir/30 border-t-noir rounded-full animate-spin"></span> Processing...</>
                        ) : (
                            <><Activity size={16} /> Analyze Body Measurements</>
                        )}
                    </button>

                    {/* Quality Score */}
                    {result && (
                        <div className="bg-muted border border-subtle/50 p-6 mt-6">
                            <h2 className="text-label text-gold mb-4 border-b border-subtle/30 pb-3">Analysis Quality</h2>
                            <div className="flex justify-center -mt-2">
                                <Plot
                                    data={[{
                                        type: "indicator",
                                        mode: "gauge+number",
                                        value: (result.quality_score || 0) * 100,
                                        gauge: {
                                            axis: { range: [0, 100], tickwidth: 1, tickcolor: "transparent" },
                                            bar: { color: "#C6A75E" },
                                            bgcolor: "#1A1A1A",
                                            borderwidth: 0,
                                            bordercolor: "transparent",
                                            steps: [
                                                { range: [0, 50], color: "#2A1A1A" },
                                                { range: [50, 75], color: "#2A2A1A" },
                                                { range: [75, 100], color: "#1A2A1A" }
                                            ]
                                        }
                                    }]}
                                    layout={{
                                        width: 260,
                                        height: 180,
                                        margin: { t: 35, b: 0, l: 25, r: 25 },
                                        paper_bgcolor: "rgba(0,0,0,0)",
                                        font: { color: '#F5F5F0', family: "Inter, sans-serif" }
                                    }}
                                    config={{ responsive: true, displayModeBar: false }}
                                />
                            </div>
                        </div>
                    )}
                </aside>

                {/* Results Area */}
                <section className="flex-grow flex flex-col h-full overflow-hidden">
                    {result ? (
                        <div className="flex flex-col h-full animate-fade-in">
                            {/* Tabs Navigation */}
                            <div className="flex overflow-x-auto gap-0 mb-6 border-b border-subtle/30 shrink-0">
                                {[
                                    { id: 'viewer', label: '3D Match' },
                                    { id: 'measurements', label: 'Raw Data' },
                                    { id: 'morphology', label: 'Morphology' },
                                    { id: 'recommendations', label: 'AI Recs' },
                                    { id: 'charts', label: 'Analytics' }
                                ].map(tab => (
                                    <button
                                        key={tab.id}
                                        className={`px-6 py-3 text-[11px] tracking-luxury uppercase font-medium transition-all duration-500 whitespace-nowrap border-b-2 ${activeTab === tab.id ? 'text-gold border-gold' : 'text-ivory/30 border-transparent hover:text-ivory/60'}`}
                                        onClick={() => setActiveTab(tab.id)}
                                    >
                                        {tab.label}
                                    </button>
                                ))}
                            </div>

                            {/* Tab Content Container */}
                            <div className="flex-grow bg-muted border border-subtle/30 overflow-hidden relative min-h-[700px]">

                                <div className={`absolute inset-0 transition-opacity duration-500 ${activeTab === 'viewer' ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`}>
                                    <div className="w-full h-full bg-noir">
                                        <Viewer3D url={result.mesh_url} />
                                    </div>
                                </div>

                                <div className={`absolute inset-0 p-8 overflow-y-auto transition-opacity duration-500 ${activeTab === 'measurements' ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`}>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        {['basics', 'heights', 'widths', 'functional'].map(cat => (
                                            <div className="bg-noir/50 p-6 border border-subtle/20" key={cat}>
                                                <h2 className="text-label text-gold mb-6 flex items-center gap-2 border-b border-subtle/20 pb-3">
                                                    <Ruler size={14} />
                                                    {cat === 'basics' ? 'Perimeters' : cat === 'heights' ? 'Lengths' : cat === 'widths' ? 'Widths' : 'Functional'}
                                                </h2>
                                                <div className="space-y-1">
                                                    {(result?.measurements?.[cat] || []).map(renderMeasurementItem)}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className={`absolute inset-0 p-8 overflow-y-auto transition-opacity duration-500 ${activeTab === 'morphology' ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`}>
                                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-px bg-subtle/30 mb-8">
                                        <div className="bg-noir p-5 hover:border-gold/20 border border-transparent transition-all duration-500">
                                            <h4 className="text-label mb-2">Silhouette</h4>
                                            <div className="font-display text-lg font-bold text-gold">{result.morphology?.silhouette?.type_fr || 'Normal'}</div>
                                        </div>
                                        <div className="bg-noir p-5 hover:border-gold/20 border border-transparent transition-all duration-500">
                                            <h4 className="text-label mb-2">BMI Factor</h4>
                                            <div className="font-display text-lg font-bold text-gold">{result.morphology?.silhouette?.bmi || '22'}</div>
                                        </div>
                                        <div className="bg-noir p-5 hover:border-gold/20 border border-transparent transition-all duration-500">
                                            <h4 className="text-label mb-2">Proportions</h4>
                                            <div className="font-display text-lg font-bold text-gold">{result.morphology?.proportions?.proportion_type?.fr || 'Balanced'}</div>
                                        </div>
                                        <div className="bg-noir p-5 hover:border-gold/20 border border-transparent transition-all duration-500">
                                            <h4 className="text-label mb-2">Posture</h4>
                                            <div className="font-display text-lg font-bold text-gold">{result.morphology?.posture?.type_fr || 'Straight'}</div>
                                        </div>
                                        <div className="bg-noir p-5 hover:border-gold/20 border border-transparent transition-all duration-500">
                                            <h4 className="text-label mb-2">Torso/Leg Ratio</h4>
                                            <div className="font-display text-lg font-bold text-gold">{(result.morphology?.proportions?.torso_to_legs_ratio || 0.65).toFixed(2)}</div>
                                        </div>
                                    </div>

                                    <div className="bg-noir/50 border border-subtle/20 p-6">
                                        <h2 className="text-label text-gold mb-6 border-b border-subtle/20 pb-3">Morphological Radar</h2>
                                        <div className="w-full flex justify-center">
                                            {(result?.measurements?.basics?.length > 0) ? (
                                                <Plot
                                                    data={[{
                                                        type: 'scatterpolar',
                                                        r: (result?.measurements?.basics || []).slice(0, 6).map(m => m.value_cm || 0),
                                                        theta: (result?.measurements?.basics || []).slice(0, 6).map(m => m.name || m.key || ''),
                                                        fill: 'toself',
                                                        fillcolor: 'rgba(198, 167, 94, 0.15)',
                                                        line: { color: '#C6A75E', width: 2 }
                                                    }]}
                                                    layout={{
                                                        autosize: true,
                                                        paper_bgcolor: 'rgba(0,0,0,0)',
                                                        polar: { radialaxis: { visible: true, range: [0, 120], tickcolor: '#2A2A2A', gridcolor: '#2A2A2A' }, angularaxis: { tickfont: { family: 'Inter', color: '#666' }, gridcolor: '#2A2A2A' }, bgcolor: 'rgba(0,0,0,0)' },
                                                        font: { color: '#F5F5F0', family: 'Inter' },
                                                        margin: { t: 30, b: 30, l: 30, r: 30 }
                                                    }}
                                                    style={{ width: '100%', height: '400px', maxWidth: '600px' }}
                                                    config={{ displayModeBar: false }}
                                                />
                                            ) : (
                                                <p className="text-ivory/40 py-12">Aucune donnée de mesure disponible pour le radar.</p>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className={`absolute inset-0 p-8 overflow-y-auto transition-opacity duration-500 ${activeTab === 'recommendations' ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`}>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        <div className="bg-noir/50 border border-subtle/20 p-6 h-fit">
                                            <h2 className="text-label text-gold mb-6 border-b border-subtle/20 pb-3 flex items-center gap-2">
                                                <Navigation size={14} /> Routing Sizes
                                            </h2>
                                            <div className="space-y-3">
                                                {Object.entries(result.fashion_recommendations?.size_recommendations || {}).map(([sys, data]) => (
                                                    <div className="bg-muted/50 p-4 border border-subtle/20 flex items-center justify-between group hover:border-gold/20 transition-all duration-500" key={sys}>
                                                        <div>
                                                            <h4 className="text-sm text-ivory/70">System {sys}</h4>
                                                            <div className="text-[10px] tracking-wider text-ivory/30 mt-1">Confidence: <span className="text-gold">{Math.round((data.confidence || 0.8) * 100)}%</span></div>
                                                        </div>
                                                        <div className="px-4 py-2 border border-gold/30 font-display font-bold text-gold group-hover:bg-gold/10 transition-all duration-300">
                                                            {data.recommended_size}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="bg-noir/50 border border-subtle/20 p-6 h-fit">
                                            <h2 className="text-label text-gold mb-6 border-b border-subtle/20 pb-3">Optimum Cut Logic</h2>
                                            {result.fashion_recommendations?.cut_recommendations?.primary_recommendation ? (
                                                <div className="bg-gold/5 p-6 border border-gold/20 relative overflow-hidden">
                                                    <div className="absolute top-0 right-0 w-24 h-24 bg-gold/10 rounded-full blur-2xl -mr-12 -mt-12"></div>
                                                    <h4 className="text-lg font-display font-bold text-gold mb-2 relative z-10">{result.fashion_recommendations.cut_recommendations.primary_recommendation.name_fr}</h4>
                                                    <p className="text-ivory/50 leading-relaxed text-sm relative z-10">{result.fashion_recommendations.cut_recommendations.primary_recommendation.description}</p>
                                                </div>
                                            ) : (
                                                <div className="p-6 text-center text-ivory/20">No specific cut recommendations generated.</div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className={`absolute inset-0 p-8 overflow-y-auto transition-opacity duration-500 ${activeTab === 'charts' ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`}>
                                    <div className="bg-noir/50 border border-subtle/20 p-6 h-full flex flex-col">
                                        <h2 className="text-label text-gold mb-6 shrink-0">Volumetric Data</h2>
                                        <div className="flex-grow min-h-[400px]">
                                            <Plot
                                                data={[{
                                                    x: (result?.measurements?.basics || []).map(m => m.name),
                                                    y: (result?.measurements?.basics || []).map(m => m.value_cm),
                                                    type: 'bar',
                                                    marker: { color: '#C6A75E', border: { color: 'transparent' } }
                                                }]}
                                                layout={{
                                                    paper_bgcolor: 'rgba(0,0,0,0)',
                                                    plot_bgcolor: 'rgba(0,0,0,0)',
                                                    font: { color: '#666', family: 'Inter' },
                                                    margin: { t: 20, l: 40, r: 20, b: 80 },
                                                    xaxis: { tickangle: -45, gridcolor: '#2A2A2A' },
                                                    yaxis: { gridcolor: '#2A2A2A' }
                                                }}
                                                style={{ width: '100%', height: '100%' }}
                                                config={{ displayModeBar: false, responsive: true }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="h-full flex items-center justify-center border-2 border-dashed border-gold/30 m-4 lg:m-0 bg-muted/30">
                            <div className="text-center max-w-md px-8 py-16">
                                <div className="w-24 h-24 border-2 border-gold/40 flex items-center justify-center mx-auto mb-8 rounded-full">
                                    <Activity className="text-gold" size={40} />
                                </div>
                                <h3 className="text-2xl font-display font-bold text-ivory mb-3">En attente des résultats</h3>
                                <p className="text-ivory/70 leading-relaxed text-sm mb-6">
                                    {file
                                        ? "Cliquez sur le bouton doré « Launch AI Analysis » en bas à gauche pour lancer l'analyse."
                                        : "Glissez-déposez une vidéo 360° à gauche (ou cliquez pour sélectionner), puis cliquez sur « Launch AI Analysis »."}
                                </p>
                                {file && (
                                    <p className="text-gold text-sm font-medium">→ Fichier sélectionné : {file.name}</p>
                                )}
                            </div>
                        </div>
                    )}
                </section>
            </main>

            {/* Loading Overlay */}
            {loading && (
                <div className="fixed inset-0 bg-noir/80 backdrop-blur-sm z-[100] flex items-center justify-center animate-fade-in">
                    <div className="bg-muted border border-subtle p-10 max-w-sm w-full text-center">
                        <div className="w-12 h-12 border-2 border-subtle border-t-gold rounded-full animate-spin mx-auto mb-6"></div>
                        <h3 className="font-display text-xl font-bold text-ivory mb-2">Analyzing...</h3>
                        <p className="text-ivory/30 text-sm mb-6">Extracting frames and building point cloud</p>
                        <div className="w-full h-px bg-subtle overflow-hidden">
                            <div className="h-full bg-gold w-1/2 animate-[pulse_1.5s_ease-in-out_infinite]"></div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default BodyMeasurements;
