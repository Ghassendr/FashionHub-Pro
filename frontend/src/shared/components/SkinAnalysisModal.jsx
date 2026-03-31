import React, { useState, useRef } from 'react';
import { X, Upload, Sparkles, Loader2, Check, RefreshCw, ShoppingBag, Star, ChevronRight } from 'lucide-react';

const SkinAnalysisModal = ({ isOpen, onClose, token }) => {
    const [file, setFile] = useState(null);
    const [preview, setPreview] = useState(null);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);
    const fileInputRef = useRef(null);

    if (!isOpen) return null;

    const handleFileChange = (e) => {
        const selectedFile = e.target.files[0];
        if (selectedFile) {
            setFile(selectedFile);
            const reader = new FileReader();
            reader.onloadend = () => setPreview(reader.result);
            reader.readAsDataURL(selectedFile);
            setResult(null);
            setError(null);
        }
    };

    const handleAnalyze = async () => {
        if (!file) return;
        setLoading(true);
        setError(null);

        const formData = new FormData();
        formData.append('photo', file);

        try {
            const response = await fetch('http://localhost:8000/api/client/skin-analysis/', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            });
            const data = await response.json();
            if (response.ok) {
                setResult(data);
            } else {
                setError(data.error || "Failed to analyze. Please try a clearer photo.");
            }
        } catch (err) {
            setError("Connection error. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const reset = () => { setFile(null); setPreview(null); setResult(null); setError(null); };

    const getScoreColor = (score) => {
        if (score >= 80) return 'text-emerald-400';
        if (score >= 60) return 'text-amber-400';
        return 'text-zinc-400';
    };

    const getScoreBg = (score) => {
        if (score >= 80) return 'bg-emerald-500/10 border-emerald-500/20';
        if (score >= 60) return 'bg-amber-500/10 border-amber-500/20';
        return 'bg-zinc-500/10 border-zinc-500/20';
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-noir/90 backdrop-blur-md" onClick={onClose}></div>
            
            <div className="relative w-full max-w-4xl bg-zinc-900 border border-white/10 rounded-3xl overflow-hidden shadow-2xl animate-in slide-in-from-bottom-8 duration-500 max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="p-6 border-b border-white/5 flex justify-between items-center bg-zinc-800/30 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gold/10 flex items-center justify-center">
                            <Sparkles className="text-gold" size={20} />
                        </div>
                        <div>
                            <h2 className="text-xl font-display text-ivory">AI Skin Tone Analysis</h2>
                            <p className="text-[10px] text-gold/40 uppercase tracking-widest font-black">
                                {result ? `${result.name} · ${result.undertone} Undertone` : 'Personalized Color Science'}
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors p-2">
                        <X size={20} />
                    </button>
                </div>

                <div className="overflow-y-auto flex-1 p-8">
                    {!result ? (
                        /* --- Upload Step --- */
                        <div className="space-y-8">
                            <div 
                                onClick={() => !loading && fileInputRef.current.click()}
                                className={`relative aspect-video rounded-2xl border-2 border-dashed transition-all duration-500 flex flex-col items-center justify-center cursor-pointer overflow-hidden
                                    ${preview ? 'border-gold/50' : 'border-white/5 hover:border-gold/20'}`}
                            >
                                {preview ? (
                                    <img src={preview} alt="Preview" className="w-full h-full object-cover opacity-60" />
                                ) : (
                                    <div className="text-center p-10">
                                        <div className="w-16 h-16 rounded-full bg-zinc-800 flex items-center justify-center mx-auto mb-4">
                                            <Upload className="text-gold/40" size={24} />
                                        </div>
                                        <p className="text-ivory font-medium mb-1">Upload a clear face photo</p>
                                        <p className="text-xs text-zinc-500">Well-lit · Front-facing · No glasses</p>
                                    </div>
                                )}
                                {loading && (
                                    <div className="absolute inset-0 bg-noir/70 backdrop-blur-sm flex flex-col items-center justify-center z-10">
                                        <Loader2 className="text-gold animate-spin mb-4" size={40} />
                                        <p className="text-gold text-xs uppercase tracking-[0.2em] font-black animate-pulse">Analyzing Pigmentation...</p>
                                        <p className="text-zinc-500 text-[10px] mt-2">Matching with fabric inventory...</p>
                                    </div>
                                )}
                                <input type="file" className="hidden" ref={fileInputRef} onChange={handleFileChange} accept="image/*" />
                            </div>

                            {error && (
                                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">{error}</div>
                            )}

                            <div className="flex gap-4">
                                <button onClick={handleAnalyze} disabled={!file || loading}
                                    className="flex-1 btn btn-primary py-4 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                                    <Sparkles size={18} />
                                    Analyze My Skin Tone
                                </button>
                                {preview && !loading && (
                                    <button onClick={reset} className="btn btn-secondary px-6">
                                        <RefreshCw size={18} />
                                    </button>
                                )}
                            </div>

                            {/* Tips */}
                            <div className="grid grid-cols-3 gap-4">
                                {[
                                    { icon: '💡', tip: 'Good lighting', desc: 'Natural daylight works best' },
                                    { icon: '😶', tip: 'Clear face', desc: 'Remove glasses & makeup if possible' },
                                    { icon: '📸', tip: 'Front facing', desc: 'Look directly at the camera' },
                                ].map((t) => (
                                    <div key={t.tip} className="p-4 bg-white/[0.02] rounded-xl border border-white/5 text-center">
                                        <div className="text-2xl mb-2">{t.icon}</div>
                                        <p className="text-xs text-ivory font-bold">{t.tip}</p>
                                        <p className="text-[10px] text-zinc-500 mt-1">{t.desc}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        /* --- Results Step --- */
                        <div className="space-y-10 animate-in fade-in duration-700">
                            {/* Skin Tone Summary */}
                            <div className="flex flex-col md:flex-row gap-8 items-start">
                                <div className="text-center md:w-48 shrink-0">
                                    <div className="relative inline-block">
                                        <div 
                                            className="w-28 h-28 rounded-3xl shadow-2xl border border-white/10 mx-auto mb-4"
                                            style={{ backgroundColor: `rgb(${result.detected_rgb?.join(',')})` }}
                                        ></div>
                                        <div className="absolute -bottom-2 -right-2 w-9 h-9 bg-emerald-500 rounded-full flex items-center justify-center border-4 border-zinc-900 shadow-xl">
                                            <Check size={16} className="text-white" />
                                        </div>
                                    </div>
                                    <h3 className="text-xl font-display text-ivory mb-1">{result.name}</h3>
                                    <p className="text-[10px] text-gold uppercase tracking-[0.2em] font-black">{result.undertone} Undertone</p>
                                    {result.accuracy != null && (
                                        <p className="text-[10px] text-zinc-500 mt-2">{result.accuracy}% match accuracy</p>
                                    )}
                                </div>

                                {/* Recommended Color Palette */}
                                <div className="flex-1">
                                    <h4 className="text-xs uppercase tracking-widest text-zinc-500 font-bold mb-4">Ideal Color Palette</h4>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                        {result.colors?.map((color, idx) => (
                                            <div key={idx} className="bg-white/[0.03] border border-white/5 rounded-xl p-3 flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-lg shadow-inner shrink-0 border border-white/10"
                                                    style={{ backgroundColor: `rgb(${color.rgb?.join(',')})` }}></div>
                                                <div className="overflow-hidden min-w-0">
                                                    <p className="text-xs text-ivory font-bold truncate">{color.name}</p>
                                                    <p className="text-[9px] text-zinc-500 uppercase truncate">{color.usage}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Fabric Recommendations */}
                            {result.fabric_recommendations && result.fabric_recommendations.length > 0 && (
                                <div>
                                    <div className="flex items-center justify-between mb-6">
                                        <div>
                                            <h4 className="text-xs uppercase tracking-widest text-zinc-500 font-bold">Available Fabric Matches</h4>
                                            <p className="text-[10px] text-zinc-600 mt-1">From our current inventory · {result.total_fabrics_checked} fabrics analyzed</p>
                                        </div>
                                        <div className="flex items-center gap-2 text-[10px] text-gold/60 uppercase tracking-widest">
                                            <ShoppingBag size={12} />
                                            <span>In Stock</span>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {result.fabric_recommendations.map((fabric, idx) => (
                                            <div key={fabric.id}
                                                className={`relative rounded-2xl border p-4 transition-all duration-300 hover:border-gold/30 ${getScoreBg(fabric.similarity_score)}`}>
                                                
                                                {idx === 0 && (
                                                    <div className="absolute -top-2 -right-2 bg-gold text-noir text-[9px] font-black uppercase tracking-widest rounded-full px-2 py-1 flex items-center gap-1">
                                                        <Star size={8} fill="currentColor" /> Best Match
                                                    </div>
                                                )}

                                                <div className="flex items-center gap-4 mb-4">
                                                    {/* Colour swatch from image */}
                                                    <div className="relative w-16 h-16 rounded-xl overflow-hidden shrink-0 border border-white/10">
                                                        <img 
                                                            src={`http://localhost:8000${fabric.image_url}`}
                                                            alt={fabric.materiel}
                                                            className="w-full h-full object-cover"
                                                            onError={(e) => {
                                                                e.target.style.display = 'none';
                                                                e.target.parentElement.style.backgroundColor = `rgb(${fabric.color?.join(',')})`;
                                                            }}
                                                        />
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <p className="text-sm text-ivory font-bold truncate capitalize">{fabric.materiel}</p>
                                                        <p className="text-[10px] text-zinc-500 truncate mt-0.5">{fabric.description}</p>
                                                        <p className="text-[10px] text-gold font-black mt-1">
                                                            {fabric.matched_recommendation && `Matches: ${fabric.matched_recommendation}`}
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <span className="text-xs text-ivory font-display font-bold">${parseFloat(fabric.prix).toFixed(2)}/m</span>
                                                        <span className="text-[9px] text-zinc-600 ml-2">{parseFloat(fabric.quantite).toFixed(0)}m left</span>
                                                    </div>
                                                    <div className={`text-xs font-black ${getScoreColor(fabric.similarity_score)}`}>
                                                        {fabric.similarity_score}% match
                                                    </div>
                                                </div>

                                                {/* Match bar */}
                                                <div className="mt-3 h-1 rounded-full bg-white/5 overflow-hidden">
                                                    <div 
                                                        className={`h-full rounded-full transition-all duration-1000 ${fabric.similarity_score >= 80 ? 'bg-emerald-500' : fabric.similarity_score >= 60 ? 'bg-amber-500' : 'bg-zinc-500'}`}
                                                        style={{ width: `${fabric.similarity_score}%` }}
                                                    ></div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {result.fabric_recommendations?.length === 0 && (
                                <div className="py-10 text-center border border-dashed border-white/5 rounded-2xl">
                                    <ShoppingBag size={32} className="text-zinc-700 mx-auto mb-3" />
                                    <p className="text-zinc-500 text-sm">No in-stock fabrics matched your palette yet.</p>
                                    <p className="text-zinc-600 text-xs mt-1">Check back soon as new fabrics are added daily.</p>
                                </div>
                            )}

                            <div className="pt-6 border-t border-white/5 flex gap-4">
                                <button onClick={reset} className="flex-1 btn btn-secondary py-4 flex items-center justify-center gap-2">
                                    <RefreshCw size={16} /> New Analysis
                                </button>
                                <button onClick={onClose} className="flex-1 btn btn-primary py-4">
                                    Done
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SkinAnalysisModal;
