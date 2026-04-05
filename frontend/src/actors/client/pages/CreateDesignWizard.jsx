import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import {
    ChevronRight, ChevronLeft, Check, Ruler, Sparkles,
    Upload, Loader2, RefreshCw, ShoppingBag, Star,
    Palette, Layers, UploadCloud, Activity, AlertCircle
} from 'lucide-react';
import { useAuth } from '../../../shared/context/AuthContext';
import Viewer3D from '../components/Viewer3D';
import './CreateDesignWizard.css';

const STEPS = [
    { id: 1, label: 'MESURES 3D', icon: Ruler, title: 'Analyse Corporelle 3D' },
    { id: 2, label: 'PEAU', icon: Sparkles, title: 'Analyse de Teinte' },
    { id: 3, label: 'DESIGNS', icon: Palette, title: 'Choisissez vos Designs' },
    { id: 4, label: 'TISSUS', icon: Layers, title: 'Choisissez vos Tissus' },
];

const getScoreColor = (s) => s >= 80 ? 'text-emerald-400' : s >= 60 ? 'text-amber-400' : 'text-zinc-400';
const getScoreBg = (s) => s >= 80
    ? 'bg-emerald-500/10 border-emerald-500/20'
    : s >= 60
        ? 'bg-amber-500/10 border-amber-500/20'
        : 'bg-zinc-500/10 border-zinc-500/20';

/** Référence morphotypes (alignée API / morphology_analyzer MORPHOLOGY_CATEGORIES) */
const MORPHOLOGY_LABELS = {
    H: { name: 'Rectangle', desc: 'Épaules et hanches similaires.' },
    A: { name: 'Poire', desc: 'Hanches plus larges.' },
    V: { name: 'Triangle Inv.', desc: 'Épaules plus larges.' },
    X: { name: 'Sablier', desc: 'Taille marquée et équilibrée.' },
    '8': { name: 'Huit', desc: 'Sablier prononcé.' },
    O: { name: 'Ronde', desc: 'Silhouette arrondie.' },
};

const MORPHOLOGY_REFERENCE_ORDER = ['H', 'A', 'V', 'X', '8', 'O'];

const CreateDesignWizard = () => {
    const { token } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const atelierId = location.state?.atelierId;
    const [step, setStep] = useState(1);

    /* Lock body scroll while wizard is open */
    useEffect(() => {
        const prev = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = prev; };
    }, []);

    /* Step 1 */
    const [bodyForm, setBodyForm] = useState({ height: 170, weight: 70, age: '', gender: 'women', cut: '', quality: 'balanced' });
    const [videoFile, setVideoFile] = useState(null);
    const [scanResult, setScanResult] = useState(null);
    const [scanLoading, setScanLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('viewer');
    const fileInputRef = useRef(null);

    /* Step 2 */
    const [skinFile, setSkinFile] = useState(null);
    const [skinPreview, setSkinPreview] = useState(null);
    const [skinLoading, setSkinLoading] = useState(false);
    const [skinResult, setSkinResult] = useState(null);
    const [skinError, setSkinError] = useState(null);
    const skinInputRef = useRef(null);

    /* Step 3 — designs + selection */
    const [designsSectioned, setDesignsSectioned] = useState({ atelier: [], liked: [], morph: [], other: [] });
    const [designsLoading, setDesignsLoading] = useState(false);
    const [selectedDesigns, setSelectedDesigns] = useState([]);

    /* Step 4 — fabrics + selection */
    const [fabricsSectioned, setFabricsSectioned] = useState({ skin: [], design: [] });
    const [fabricsLoading, setFabricsLoading] = useState(false);
    const [selectedFabrics, setSelectedFabrics] = useState([]);

    /* Fetch designs — robes (category=dress) pour femme, costumes (suit) pour homme */
    useEffect(() => {
        if (step !== 3) return;
        const load = async () => {
            setDesignsLoading(true);
            try {
                const isValidToken = token && token !== 'null' && token !== 'undefined';
                let res = await fetch('http://localhost:8000/api/couturehouse/public/designs/', {
                    headers: isValidToken ? { 'Authorization': `Bearer ${token}` } : {}
                });

                // If 401, retry without token (it's a public endpoint)
                if (res.status === 401 && token) {
                    console.warn("Public designs fetch failed with auth. Retrying as guest...");
                    res = await fetch('http://localhost:8000/api/couturehouse/public/designs/');
                }

                if (!res.ok) throw new Error("Failed to load designs");

                const data = await res.json();
                let all = Array.isArray(data) ? data : [];
                const g = bodyForm.gender;
                all = all.filter((d) => {
                    const cat = (d.category || '').toLowerCase();
                    if (g === 'men') return cat === 'suit';
                    if (g === 'women') return cat === 'dress';
                    return true;
                });
                const morph = scanResult?.morphology_type || null;

                const liked = all.filter(d => d.is_liked_by_user === true);
                
                // If we started from a specific atelier, prioritize their designs
                const atelierDesigns = atelierId ? all.filter(d => d.fashion_house_id === atelierId) : [];
                
                const notLikedOrAtelier = all.filter(d => !d.is_liked_by_user && d.fashion_house_id !== atelierId);
                const morphMatches = morph ? notLikedOrAtelier.filter(d => d.morphologies?.includes(morph)) : [];
                const others = notLikedOrAtelier.filter(d => !morphMatches.includes(d));

                setDesignsSectioned({
                    atelier: atelierDesigns,
                    liked: liked.filter(d => d.fashion_house_id !== atelierId),
                    morph: morphMatches.slice(0, 8),
                    other: others.slice(0, 8)
                });
            } catch (err) { 
                console.error("Error loading designs:", err);
                setDesignsSectioned({ liked: [], morph: [], other: [] }); 
            }
            finally { setDesignsLoading(false); }
        };
        load();
    }, [step, scanResult, token, bodyForm.gender]);

    /* Fetch fabrics */
    useEffect(() => {
        if (step !== 4) return;
        
        const load = async () => {
            setFabricsLoading(true);
            try {
                // Get skin matched fabrics if available
                const skinFabrics = skinResult?.fabric_recommendations || [];
                
                // Fetch trending fabrics to use as "design matched" fallback
                const res = await fetch('http://localhost:8000/api/fournisseur/public/fabrics/trending');
                const data = await res.json();
                let trending = Array.isArray(data?.fabrics) ? data.fabrics : [];
                
                // Exclude those already in skinFabrics
                const skinIds = new Set(skinFabrics.map(f => f.id));
                const designFabrics = trending.filter(f => !skinIds.has(f.id)).slice(0, 6);

                setFabricsSectioned({
                    skin: skinFabrics.slice(0, 6),
                    design: designFabrics
                });
            } catch { setFabricsSectioned({ skin: [], design: [] }); }
            finally { setFabricsLoading(false); }
        };
        load();
    }, [step, skinResult]);

    /* Step 1 handlers */
    const handleBodyChange = (e) => {
        const { id, value } = e.target;
        const key = { heightInput: 'height', weightInput: 'weight', ageInput: 'age', genderInput: 'gender', cutInput: 'cut', qualityInput: 'quality' }[id] || id;
        setBodyForm(prev => ({ ...prev, [key]: value }));
    };
    const handleVideoFile = (e) => { if (e.target.files.length) setVideoFile(e.target.files[0]); };
    const handleScan = async () => {
        if (!videoFile) return;
        setScanLoading(true);
        const data = new FormData();
        data.append('video', videoFile);
        data.append('height', bodyForm.height);
        data.append('weight', bodyForm.weight);
        data.append('age', bodyForm.age);
        data.append('gender', bodyForm.gender);
        data.append('cut_preference', bodyForm.cut);
        data.append('quality', bodyForm.quality);
        const API = import.meta.env.VITE_API_URL || 'http://localhost:8000';
        try {
            const isValidToken = token && token !== 'null' && token !== 'undefined';
            const resp = await axios.post(`${API}/api/client/videos/process`, data, { 
                timeout: 300000,
                headers: isValidToken ? { 'Authorization': `Bearer ${token}` } : {}
            });
            const result = resp.data;
            if (result?.status === 'error') { alert('Erreur: ' + (result.error || 'Inconnue')); return; }
            if (result?.mesh_url) {
                const cleanedPath = result.mesh_url.trim().replace(/^https?:\/\/[^\/]+/, '');
                const baseUrl = API.replace(/\/$/, '');
                const meshPath = cleanedPath.startsWith('/') ? cleanedPath : `/${cleanedPath}`;
                result.mesh_url = `${baseUrl}${meshPath}?t=${Date.now()}`;
            }
            setScanResult(result); setActiveTab('viewer');
        } catch (err) { 
            if (err.response?.status === 401) {
                alert("Votre session a expiré pendant le scan. Veuillez vous reconnecter.");
            } else {
                alert('Erreur: ' + (err.response?.data?.error || err.message)); 
            }
        }
        finally { setScanLoading(false); }
    };

    const renderMeasurementItem = (m) => (
        <div className="flex items-center justify-between py-2.5 border-b border-gold/5" key={m.key || m.name}>
            <span className="text-[10px] uppercase tracking-[0.15em] text-ivory/40 font-light">{m.name}</span>
            <div className="flex items-center gap-3">
                <span className="text-sm font-serif text-gold">{m.value_cm} <span className="text-[9px] opacity-40">cm</span></span>
                <div className="w-10 h-[1px] bg-gold/10 relative">
                    <div className={`absolute inset-y-0 left-0 ${m.confidence > 0.8 ? 'bg-gold' : 'bg-gold/40'}`} style={{ width: `${(m.confidence || 0.8) * 100}%` }} />
                </div>
            </div>
        </div>
    );

    /* Step 2 handlers */
    const handleSkinFile = (e) => {
        const f = e.target.files[0]; if (!f) return;
        setSkinFile(f);
        const reader = new FileReader();
        reader.onloadend = () => setSkinPreview(reader.result);
        reader.readAsDataURL(f);
        setSkinResult(null); setSkinError(null);
    };
    const handleSkinAnalyze = async () => {
        if (!skinFile) return;
        setSkinLoading(true); setSkinError(null);
        const fd = new FormData(); fd.append('photo', skinFile);
        try {
            const isValidToken = token && token !== 'null' && token !== 'undefined';
            const res = await fetch('http://localhost:8000/api/client/skin-analysis/', {
                method: 'POST', 
                headers: isValidToken ? { 
                    'Authorization': `Bearer ${token}` 
                } : {}, 
                body: fd
            });
            
            if (res.status === 401) {
                setSkinError("Session expirée. Veuillez vous reconnecter.");
                return;
            }

            const data = await res.json();
            if (res.ok) setSkinResult(data);
            else setSkinError(data.error || 'Analyse échouée.');
        } catch { setSkinError('Erreur de connexion.'); }
        finally { setSkinLoading(false); }
    };

    /* Step 3 — un seul design (robe ou costume) */
    const toggleDesign = (id) => setSelectedDesigns((prev) =>
        prev.includes(id) ? [] : [id]
    );
    /* Step 4 selection */
    const toggleFabric = (id) => setSelectedFabrics(prev =>
        prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );

    /* Navigation */
    const canNext = () => {
        if (step === 1) return !!scanResult;
        if (step === 3) return selectedDesigns.length > 0;
        if (step === 4) return selectedFabrics.length > 0;
        return true;
    };
    const goNext = () => step < 4 && setStep(s => s + 1);
    const goBack = () => (step > 1 ? setStep((s) => s - 1) : navigate('/profile'));

    const morph = scanResult?.morphology_type || scanResult?.morphology?.silhouette?.shape_letter || null;
    const silScan = scanResult?.morphology?.silhouette;
    const morphName = silScan?.shape_name_fr || (morph ? MORPHOLOGY_LABELS[morph]?.name : null);
    const morphDesc = silScan?.shape_description_fr || (morph ? MORPHOLOGY_LABELS[morph]?.desc : null);

    /* Handle Project Save */
    const [isSaving, setIsSaving] = useState(false);
    const handleFinish = async () => {
        setIsSaving(true);
        try {
            const payload = {
                scan_result: scanResult || {},
                skin_result: skinResult || {},
                selected_designs: selectedDesigns,
                selected_fabrics: selectedFabrics,
                couture_house_id: atelierId,
                status: 'saved'
            };

            const response = await fetch('http://localhost:8000/api/client/projects/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                const projectData = await response.json();
                const projectId = projectData.id;

                // Step 2: Auto-submit to Atelier
                try {
                    const submitRes = await fetch(`http://localhost:8000/api/client/projects/${projectId}/submit/`, {
                        method: 'POST',
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    if (submitRes.ok) {
                        console.log("Project submitted to Atelier successfully");
                    }
                } catch (submitErr) {
                    console.error("Auto-submission failed:", submitErr);
                    // We don't block the user since the project is already saved
                }

                navigate('/profile');
            } else {
                console.error("Failed to save project");
                alert("Erreur lors de la sauvegarde du projet.");
                setIsSaving(false);
            }
        } catch (error) {
            console.error("Error saving project:", error);
            alert("Erreur réseau lors de la sauvegarde.");
            setIsSaving(false);
        }
    };

    return (
        <div className="wizard-page">

            {/* ── Top Bar ── */}
            <div className="wizard-topbar">
                <div className="wizard-topbar-inner">
                    <div className="flex items-center gap-4 shrink-0">
                        <button onClick={() => navigate('/profile')} className="wizard-back-link">
                            <ChevronLeft size={14} /> Profil
                        </button>
                        <div className="wizard-topbar-sep" />
                        <p className="wizard-topbar-title">CRÉER MON DESIGN</p>
                    </div>

                    <div className="text-[9px] uppercase tracking-widest text-ivory/20 shrink-0">
                        ÉTAPE {step} / {STEPS.length}
                    </div>
                </div>
            </div>

            {/* ── Main ── */}
            <div className="wizard-body-wrap">

                {/* ══ STEP 1 ══ */}
                {step === 1 && (
                    <div className="wizard-step1-layout">
                        {/* Header strip */}
                        <div className="wizard-step-header">
                            <p className="text-label text-gold">
                                <span className="text-gold/90">Mesures 3D</span>
                                <span className="text-ivory/25 mx-2">·</span>
                                ÉTAPE 1 — ANALYSE CORPORELLE
                            </p>
                        </div>

                        <div className="wizard-step1-panels">
                            {/* Left sidebar */}
                            <aside className="wizard-scan-sidebar">
                                <div className="space-y-2">
                                    <p className="label-v2">Capture Vidéo 360° <span className="text-red-400">*</span></p>
                                    <div
                                        onClick={() => !scanLoading && fileInputRef.current?.click()}
                                        className={`upload-zone-v2 cursor-pointer group ${videoFile ? 'border-gold/50' : ''}`}
                                    >
                                        <input type="file" ref={fileInputRef} className="hidden" onChange={handleVideoFile} accept="video/*" />
                                        <UploadCloud size={18} strokeWidth={1} className={`mb-1.5 mx-auto transition-colors ${videoFile ? 'text-gold' : 'text-gold/40 group-hover:text-gold'}`} />
                                        <span className={`text-[9px] tracking-[0.15em] uppercase font-light block text-center transition-colors ${videoFile ? 'text-gold' : 'text-ivory/30 group-hover:text-gold/70'}`}>
                                            {videoFile ? videoFile.name : 'Importer la capture'}
                                        </span>
                                    </div>
                                    {!videoFile && <p className="text-[9px] text-red-400/60 flex items-center gap-1"><AlertCircle size={9} /> Vidéo requise</p>}
                                </div>

                                <div className="divider-luxury-v2" />

                                <div className="space-y-3">
                                    <h3 className="couture-group-title !text-gold/40 !text-[9px]">Biométrie</h3>
                                    {[
                                        { id: 'heightInput', label: 'Taille (cm)', val: bodyForm.height },
                                        { id: 'weightInput', label: 'Poids (kg)', val: bodyForm.weight },
                                        { id: 'ageInput', label: 'Âge', val: bodyForm.age },
                                    ].map(f => (
                                        <div key={f.id} className="space-y-0.5">
                                            <label className="label-v2">{f.label}</label>
                                            <input type="number" id={f.id} value={f.val} onChange={handleBodyChange} placeholder="—" className="input-underline-v2" />
                                        </div>
                                    ))}
                                    <div className="space-y-0.5">
                                        <label className="label-v2">Sexe</label>
                                        <select id="genderInput" value={bodyForm.gender} onChange={handleBodyChange} className="input-underline-v2 appearance-none">
                                            <option value="women" className="bg-[#0d0d0b]">Femme</option>
                                            <option value="men" className="bg-[#0d0d0b]">Homme</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="divider-luxury-v2" />

                                <div className="space-y-3">
                                    <h3 className="couture-group-title !text-gold/40 !text-[9px]">Analyse IA</h3>
                                    <div className="space-y-0.5">
                                        <label className="label-v2">Mode</label>
                                        <select id="cutInput" value={bodyForm.cut} onChange={handleBodyChange} className="input-underline-v2 appearance-none">
                                            <option value="" className="bg-[#0d0d0b]">Automatique</option>
                                            <option value="ajusté" className="bg-[#0d0d0b]">Slim Fit</option>
                                            <option value="normal" className="bg-[#0d0d0b]">Regular Fit</option>
                                        </select>
                                    </div>
                                    <div className="space-y-0.5">
                                        <label className="label-v2">Précision</label>
                                        <select id="qualityInput" value={bodyForm.quality} onChange={handleBodyChange} className="input-underline-v2 appearance-none">
                                            <option value="balanced" className="bg-[#0d0d0b]">Standard</option>
                                            <option value="high" className="bg-[#0d0d0b]">HD</option>
                                        </select>
                                    </div>
                                </div>

                                <button onClick={handleScan} disabled={!videoFile || scanLoading} className="btn-luxury-cta mt-2">
                                    <div className="flex items-center gap-1.5 opacity-60">
                                        {scanLoading
                                            ? <div className="w-3 h-3 border-t border-gold rounded-full animate-spin" />
                                            : <div className="flex items-center gap-1"><div className="w-2 h-[1px] bg-gold" /><div className="w-1 h-1 rounded-full bg-gold animate-pulse" /></div>
                                        }
                                    </div>
                                    <span className="pt-0.5">{scanLoading ? 'ANALYSE…' : 'LANCER L\'ANALYSE 3D'}</span>
                                </button>
                            </aside>

                            {/* Right panel */}
                            <main className="wizard-scan-main">
                                {scanResult ? (
                                    <div className="flex flex-col h-full">
                                        <div className="flex justify-center border-b border-gold/10 bg-noir/40 shrink-0">
                                            {[{ id: 'viewer', label: 'Modèle 3D' }, { id: 'measurements', label: 'Métriques' }, { id: 'morphology', label: 'Morphologie' }].map(tab => (
                                                <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                                                    className={`px-8 py-4 text-[10px] tracking-luxury uppercase font-medium transition-all relative ${activeTab === tab.id ? 'text-gold bg-gold/5' : 'text-ivory/30 hover:text-ivory/60'}`}>
                                                    {tab.label}
                                                    {activeTab === tab.id && <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gold" />}
                                                </button>
                                            ))}
                                        </div>
                                        <div className="flex-1 relative overflow-hidden">
                                            {activeTab === 'viewer' && <div className="absolute inset-0"><Viewer3D url={scanResult.mesh_url} /></div>}
                                            {activeTab === 'measurements' && (
                                                <div className="p-8 h-full overflow-y-auto">
                                                    <div className="max-w-3xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-10">
                                                        {['basics', 'heights'].map(cat => (
                                                            <div key={cat}>
                                                                <h3 className="text-label text-gold border-b border-gold/10 pb-3 mb-3 tracking-[0.3em]">{cat === 'basics' ? 'CIRCONFÉRENCES' : 'LONGUEURS'}</h3>
                                                                {(scanResult?.measurements?.[cat] || []).map(renderMeasurementItem)}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                            {activeTab === 'morphology' && (
                                                <div className="p-6 h-full overflow-y-auto flex flex-col items-center max-w-lg mx-auto w-full">
                                                    {morph ? (
                                                        <>
                                                            <div className="text-center space-y-3 mb-8 w-full">
                                                                <div className="w-20 h-20 rounded-2xl bg-gold/10 border border-gold/20 flex items-center justify-center mx-auto">
                                                                    <span className="font-display text-3xl font-bold text-gold">{morph}</span>
                                                                </div>
                                                                <div>
                                                                    <h3 className="font-display text-xl text-ivory mb-2">{morphName || morph}</h3>
                                                                    <p className="text-ivory/40 text-sm">{morphDesc}</p>
                                                                </div>
                                                            </div>
                                                            <p className="text-[9px] uppercase tracking-widest text-ivory/25 mb-3 w-full text-left">Morphotypes de référence</p>
                                                            <ul className="w-full space-y-2 text-left">
                                                                {MORPHOLOGY_REFERENCE_ORDER.map((key) => {
                                                                    const row = MORPHOLOGY_LABELS[key];
                                                                    const active = morph === key;
                                                                    return (
                                                                        <li
                                                                            key={key}
                                                                            className={`flex gap-3 items-start rounded-lg border px-3 py-2 text-sm transition-colors ${active ? 'border-gold/40 bg-gold/5' : 'border-white/5 bg-white/[0.02]'}`}
                                                                        >
                                                                            <span className={`font-display font-bold tabular-nums shrink-0 w-6 ${active ? 'text-gold' : 'text-ivory/35'}`}>{key}</span>
                                                                            <span className="text-ivory/80"><span className="font-medium text-ivory">{row.name}</span> — {row.desc}</span>
                                                                        </li>
                                                                    );
                                                                })}
                                                            </ul>
                                                        </>
                                                    ) : (
                                                        <p className="text-ivory/20 text-sm">Morphologie non détectée</p>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center h-full text-center p-12 relative">
                                        <div className="absolute inset-0 flex items-center justify-center opacity-[0.04] pointer-events-none">
                                            <svg width="200" height="400" viewBox="0 0 400 800" fill="none">
                                                <path d="M200 40C200 40 180 40 170 60C160 80 160 100 160 100L170 140H230L240 100C240 100 240 80 230 60C220 40 200 40 200 40Z" stroke="#C9A96E" strokeWidth="0.5" />
                                                <path d="M170 140L140 180L120 280L140 400L160 550L170 800" stroke="#C9A96E" strokeWidth="0.5" />
                                                <path d="M230 140L260 180L280 280L260 400L240 550L230 800" stroke="#C9A96E" strokeWidth="0.5" />
                                                <circle cx="200" cy="80" r="30" stroke="#C9A96E" strokeWidth="0.2" />
                                                <line x1="140" y1="180" x2="260" y2="180" stroke="#C9A96E" strokeWidth="0.2" />
                                                <line x1="120" y1="280" x2="280" y2="280" stroke="#C9A96E" strokeWidth="0.2" />
                                            </svg>
                                        </div>
                                        <div className="relative z-10 space-y-6 max-w-sm">
                                            <div className="relative w-20 h-20 mx-auto">
                                                <div className="absolute inset-0 border border-gold/10 rounded-full" />
                                                <div className="absolute inset-0 border-t border-gold/30 rounded-full animate-spin" style={{ animationDuration: '4s' }} />
                                                <div className="absolute inset-0 flex items-center justify-center"><Activity size={24} strokeWidth={1} className="text-gold/40" /></div>
                                            </div>
                                            <div>
                                                <h3 className="font-display text-xl font-light text-ivory/70 mb-2">En Attente d'Analyse</h3>
                                                <p className="text-[11px] text-ivory/25 leading-relaxed uppercase tracking-widest">Importez votre capture 360° et lancez l'analyse.</p>
                                            </div>
                                            <div className="relative flex justify-between items-center pt-2">
                                                <div className="absolute top-1/2 left-0 right-0 h-[0.5px] bg-gold/10 -translate-y-1/2" />
                                                {['SOURCING', 'PROCESSING', 'ANALYTICS'].map((label, i) => (
                                                    <div key={i} className="flex flex-col items-center gap-1.5 z-10">
                                                        <div className={`w-2 h-2 rounded-full border bg-noir ${i === 0 ? 'border-gold/60' : 'border-gold/15'}`} />
                                                        <span className={`text-[8px] tracking-luxury uppercase ${i === 0 ? 'text-gold/50' : 'text-ivory/10'}`}>{label}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </main>
                        </div>
                    </div>
                )}

                {/* ══ STEP 2 ══ */}
                {step === 2 && (
                    <div className="wizard-step2-layout">
                        <div className="wizard-step-header">
                            <p className="text-label text-gold">ÉTAPE 2 — TEINTE DE PEAU</p>
                        </div>

                        <div className="wizard-step2-panels">
                            {/* Upload col */}
                            <div className="wizard-skin-upload-col">
                                <div className={`wizard-upload-area cursor-pointer ${skinPreview ? 'has-preview' : ''}`} onClick={() => !skinLoading && skinInputRef.current?.click()}>
                                    {skinPreview ? <img src={skinPreview} alt="preview" className="wizard-upload-img" /> : (
                                        <div className="text-center p-6">
                                            <div className="wizard-upload-icon-circle"><Upload size={22} className="text-gold/50" /></div>
                                            <p className="text-ivory/50 font-medium mt-3 mb-1 text-sm">Photo du visage</p>
                                            <p className="text-[10px] text-ivory/20">Lumière naturelle · De face</p>
                                        </div>
                                    )}
                                    {skinLoading && (
                                        <div className="wizard-upload-overlay">
                                            <Loader2 className="animate-spin text-gold" size={28} />
                                            <p className="text-gold text-[9px] uppercase tracking-[0.2em] font-bold animate-pulse mt-2">Analyse…</p>
                                        </div>
                                    )}
                                    <input type="file" className="hidden" ref={skinInputRef} onChange={handleSkinFile} accept="image/*" />
                                </div>
                                {skinError && <div className="wizard-error-box">{skinError}</div>}
                                <div className="flex gap-2">
                                    <button onClick={handleSkinAnalyze} disabled={!skinFile || skinLoading}
                                        className="btn btn-primary flex-1 justify-center py-2.5 text-xs disabled:opacity-30 disabled:cursor-not-allowed">
                                        <Sparkles size={14} /> Analyser
                                    </button>
                                    {skinPreview && !skinLoading && (
                                        <button onClick={() => { setSkinFile(null); setSkinPreview(null); setSkinResult(null); }} className="btn btn-secondary px-3">
                                            <RefreshCw size={14} />
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Result col */}
                            <div className={`wizard-skin-result-col ${skinResult ? 'visible' : 'empty'}`}>
                                {skinResult ? (
                                    <>
                                        <div className="wizard-skin-swatch-block">
                                            <div className="wizard-skin-color-box" style={{ backgroundColor: `rgb(${skinResult.detected_rgb?.join(',')})` }} />
                                            <div>
                                                <p className="font-display text-xl text-ivory mb-1">{skinResult.name}</p>
                                                <p className="text-[10px] uppercase tracking-widest font-bold text-gold">{skinResult.undertone} Undertone</p>
                                                {skinResult.accuracy != null && <p className="text-[10px] text-ivory/30 mt-1">{skinResult.accuracy}% précision</p>}
                                            </div>
                                        </div>
                                        <p className="text-[9px] uppercase tracking-widest text-ivory/30 font-bold">Palette idéale</p>
                                        <div className="wizard-palette-grid">
                                            {skinResult.colors?.map((c, i) => (
                                                <div key={i} className="wizard-palette-chip">
                                                    <div className="wizard-palette-dot" style={{ backgroundColor: `rgb(${c.rgb?.join(',')})` }} />
                                                    <div>
                                                        <p className="text-[11px] text-ivory font-bold">{c.name}</p>
                                                        <p className="text-[9px] text-ivory/30 uppercase">{c.usage}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </>
                                ) : (
                                    <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
                                        <Sparkles size={32} className="text-gold/15" />
                                        <p className="text-ivory/20 text-sm">Les résultats apparaîtront ici après l'analyse.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* ══ STEP 3 — SELECT DESIGNS ══ */}
                {step === 3 && (
                    <div className="wizard-select-layout">
                        <div className="wizard-select-header">
                            <div>
                                <p className="text-label text-gold mb-1">ÉTAPE 3 — DESIGNS</p>
                            </div>
                            {selectedDesigns.length > 0 && (
                                <div className="wizard-selection-count">
                                    <Check size={12} className="text-gold" />
                                    <span>1 sélection</span>
                                </div>
                            )}
                        </div>

                        <div className="wizard-select-grid-wrap">
                            {designsLoading ? (
                                <div className="wizard-loading-inline">
                                    <Loader2 className="animate-spin text-gold" size={32} />
                                    <p className="text-ivory/30 text-sm mt-3">Chargement…</p>
                                </div>
                            ) : (designsSectioned.liked.length === 0 && designsSectioned.morph.length === 0 && designsSectioned.other.length === 0) ? (
                                <div className="wizard-loading-inline">
                                    <Palette size={40} className="text-gold/15 mb-3" />
                                    <p className="text-ivory/25 text-sm">Aucun design disponible.</p>
                                </div>
                            ) : (
                                <div className="flex flex-col gap-10">
                                    {[
                                        { key: 'atelier', title: 'Designs de l\'Atelier Sélectionné', list: designsSectioned.atelier },
                                        { key: 'liked', title: 'Vos Favoris', list: designsSectioned.liked },
                                        { key: 'morph', title: `Idéal pour votre morphologie (${morph || '...'})`, list: designsSectioned.morph },
                                        { key: 'other', title: 'Explorer', list: designsSectioned.other }
                                    ].map(section => section.list.length > 0 && (
                                        <div key={section.key}>
                                            <h3 className="text-[10px] tracking-widest uppercase font-bold text-ivory/40 mb-4 flex items-center gap-2">
                                                {section.title}
                                                <div className="h-[1px] flex-1 bg-white/5" />
                                            </h3>
                                            <div className="wizard-designs-grid">
                                                {section.list.map(design => {
                                                    const selected = selectedDesigns.includes(design.id);
                                                    const coverMedia = design.media?.find(m => m.is_cover) || design.media?.[0];
                                                    return (
                                                        <button key={design.id + section.key} onClick={() => toggleDesign(design.id)}
                                                            className={`wizard-design-card ${selected ? 'selected' : ''}`}>
                                                            <div className="wizard-design-img-wrap">
                                                                {coverMedia
                                                                    ? <img src={`http://localhost:8000/api/couturehouse/designs/${design.id}/media/${coverMedia.file.split(/[/\\]/).pop()}`} alt={design.title} className="wizard-design-img" />
                                                    : <div className="wizard-design-no-img"><Palette size={24} className="text-gold/15" /></div>
                                                                }
                                                                {selected && (
                                                                    <div className="wizard-selected-overlay">
                                                                        <div className="wizard-check-ring"><Check size={14} /></div>
                                                                    </div>
                                                                )}
                                                                {design.morphologies?.length > 0 && (
                                                                    <div className="wizard-morph-tags">
                                                                        {design.morphologies.includes(morph) && (
                                                                            <span className="wizard-morph-tag-recommended">
                                                                                <Star size={8} fill="currentColor" /> Recommandé
                                                                            </span>
                                                                        )}
                                                                        {design.morphologies.slice(0, 2).map(m => (
                                                                            <span key={m} className={`wizard-morph-tag ${m === morph ? 'active' : ''}`}>{m}</span>
                                                                        ))}
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <div className="wizard-design-meta">
                                                                <p className="wizard-design-name">{design.title}</p>
                                                                <p className="wizard-design-cat">{design.category}</p>
                                                            </div>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* ══ STEP 4 — SELECT FABRICS ══ */}
                {step === 4 && (
                    <div className="wizard-select-layout">
                        <div className="wizard-select-header">
                            <div>
                                <p className="text-label text-gold mb-1">ÉTAPE 4 — TISSUS</p>
                            </div>
                            {selectedFabrics.length > 0 && (
                                <div className="wizard-selection-count">
                                    <Check size={12} className="text-gold" />
                                    <span>{selectedFabrics.length} sélectionné{selectedFabrics.length > 1 ? 's' : ''}</span>
                                </div>
                            )}
                        </div>

                        <div className="wizard-select-grid-wrap">
                            {fabricsLoading ? (
                                <div className="wizard-loading-inline">
                                    <Loader2 className="animate-spin text-gold" size={32} />
                                    <p className="text-ivory/30 text-sm mt-3">Chargement…</p>
                                </div>
                            ) : (fabricsSectioned.skin.length === 0 && fabricsSectioned.design.length === 0) ? (
                                <div className="wizard-loading-inline">
                                    <ShoppingBag size={40} className="text-gold/15 mb-3" />
                                    <p className="text-ivory/25 text-sm">Aucun tissu disponible.</p>
                                </div>
                            ) : (
                                <div className="flex flex-col gap-10">
                                    {[
                                        { key: 'skin', title: skinResult ? `Idéal pour votre teint (${skinResult.name})` : null, list: fabricsSectioned.skin },
                                        { key: 'design', title: `Idéal pour la coupe et la nature de vos designs choisis`, list: fabricsSectioned.design }
                                    ].map(section => section.title && section.list.length > 0 && (
                                        <div key={section.key}>
                                            <h3 className="text-[10px] tracking-widest uppercase font-bold text-ivory/40 mb-4 flex items-center gap-2">
                                                {section.title}
                                                <div className="h-[1px] flex-1 bg-white/5" />
                                            </h3>
                                            <div className="wizard-fabrics-grid">
                                                {section.list.map((fabric, idx) => {
                                                    const id = fabric.id || idx;
                                                    const selected = selectedFabrics.includes(id);
                                                    const score = fabric.similarity_score || (section.key === 'skin' ? 85 : null);
                                                    return (
                                                        <button
                                                            key={id + section.key}
                                                            onClick={() => toggleFabric(id)}
                                                            className={`wizard-fabric-card ${selected ? 'selected' : ''} ${score ? getScoreBg(score) : 'bg-white/[0.03] border-white/5'}`}
                                                        >
                                                            {idx === 0 && score && (
                                                                <div className="wizard-best-badge"><Star size={7} fill="currentColor" /> Best match</div>
                                                            )}
                                                            {selected && (
                                                                <div className="wizard-fabric-selected-overlay">
                                                                    <div className="wizard-check-ring-sm"><Check size={12} /></div>
                                                                </div>
                                                            )}
                                                            <div className="flex gap-2.5 items-start mb-2.5">
                                                                <div className="wizard-fabric-thumb">
                                                                    <img
                                                                        src={`http://localhost:8000${fabric.image_url || fabric.image || ''}`}
                                                                        alt={fabric.materiel || fabric.name}
                                                                        className="w-full h-full object-cover"
                                                                        onError={e => { e.target.style.display = 'none'; e.target.parentElement.style.backgroundColor = `rgb(${fabric.color?.join(',') || '50,50,50'})`; }}
                                                                    />
                                                                </div>
                                                                <div className="flex-1 min-w-0 text-left">
                                                                    <p className="wizard-fabric-name">{fabric.materiel || fabric.name || 'Tissu'}</p>
                                                                    <p className="wizard-fabric-nature">{fabric.nature || fabric.description || 'Matériau noble'}</p>
                                                                    {fabric.matched_recommendation && <p className="wizard-fabric-rec">{fabric.matched_recommendation}</p>}
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center justify-between mb-1.5">
                                                                <span className="wizard-fabric-price">
                                                                    {fabric.prix ? `${parseFloat(fabric.prix).toFixed(2)} DT/m` : 'Prix sur demande'}
                                                                    {fabric.quantite && <span className="wizard-fabric-qty">{parseFloat(fabric.quantite).toFixed(0)}m dispos.</span>}
                                                                </span>
                                                                {score && <span className={`text-[10px] font-black ${getScoreColor(score)}`}>{score}% Match</span>}
                                                            </div>
                                                            {score && (
                                                                <div className="wizard-fabric-bar">
                                                                    <div className={`wizard-fabric-fill ${score >= 80 ? 'bg-emerald-500' : score >= 60 ? 'bg-amber-500' : 'bg-zinc-500'}`} style={{ width: `${score}%` }} />
                                                                </div>
                                                            )}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Final confirmation when step 4 done */}
                        {selectedFabrics.length > 0 && (
                            <div className="wizard-final-strip">
                                <div className="flex items-center gap-2 text-emerald-400">
                                    <Check size={16} /> <span className="text-sm font-semibold">Sélection complète !</span>
                                </div>
                                <p className="text-ivory/30 text-xs mt-0.5">
                                    {selectedDesigns.length} design{selectedDesigns.length !== 1 ? 's' : ''} · {selectedFabrics.length} tissu{selectedFabrics.length !== 1 ? 's' : ''} sélectionnés
                                </p>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* ── Bottom Nav ── */}
            <div className="wizard-bottom-bar">
                <div className="wizard-bottom-inner">
                    <button type="button" onClick={goBack} className="wizard-nav-btn wizard-nav-back">
                        <ChevronLeft size={15} /> Retour
                    </button>
                    <div className="wizard-bottom-steps">
                        {STEPS.map((s, i) => (
                            <React.Fragment key={s.id}>
                                <button
                                    type="button"
                                    className={`wizard-step-pill ${step === s.id ? 'active' : step > s.id ? 'done' : ''}`}
                                    onClick={() => step > s.id && setStep(s.id)}
                                    disabled={step <= s.id}
                                >
                                    <span className="wizard-step-num">
                                        {step > s.id ? <Check size={10} /> : s.id}
                                    </span>
                                    <span className="wizard-step-label">{s.label}</span>
                                </button>
                                {i < STEPS.length - 1 && (
                                    <div className={`wizard-step-connector ${step > s.id ? 'filled' : ''}`} />
                                )}
                            </React.Fragment>
                        ))}
                    </div>
                    {step < 4 ? (
                        <button onClick={goNext} disabled={!canNext()} className="wizard-nav-btn wizard-nav-next">
                            {step === 1 && !scanResult
                                ? <span className="flex items-center gap-1.5 opacity-50"><AlertCircle size={11} /> Scan requis</span>
                                : step === 3 && selectedDesigns.length === 0
                                    ? <span className="flex items-center gap-1.5 opacity-50"><AlertCircle size={11} /> {bodyForm.gender === 'men' ? 'Choisissez un costume' : 'Choisissez une robe'}</span>
                                    : <><span>Suivant</span> <ChevronRight size={15} /></>
                            }
                        </button>
                    ) : (
                        <button onClick={handleFinish} disabled={!canNext() || isSaving} className="wizard-nav-btn wizard-nav-finish group">
                            {isSaving ? (
                                <><Loader2 className="animate-spin" size={15} /> Sauvegarde...</>
                            ) : (
                                <><Check size={15} className="group-hover:scale-125 transition-transform"/> Terminer</>
                            )}
                        </button>
                    )}
                </div>
            </div>

            {/* Loading overlay */}
            {scanLoading && (
                <div className="fixed inset-0 bg-noir/95 backdrop-blur-md z-[300] flex flex-col items-center justify-center animate-fade-in">
                    <div className="relative w-36 h-[1px] bg-gold/10 mb-10 overflow-hidden">
                        <div className="h-full bg-gold w-full -translate-x-full animate-[shimmer_1.5s_infinite]" />
                    </div>
                    <h4 className="text-2xl font-serif italic text-gold/80 mb-2">Digital Twin en cours…</h4>
                    <p className="text-[10px] tracking-[0.4em] uppercase text-ivory/30">Extraction biométrique</p>
                </div>
            )}
        </div>
    );
};

export default CreateDesignWizard;
