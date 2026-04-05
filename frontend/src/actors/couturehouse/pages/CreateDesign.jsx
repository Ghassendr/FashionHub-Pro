import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
    ArrowLeft, Upload, FileText, Check, Loader2, 
    Palette, LayoutGrid, Plus, TrendingUp, Settings, 
    LogOut, Menu, Layers, Users 
} from 'lucide-react';
import designService from '../services/designService';
import CoutureLayout from '../components/CoutureLayout';
import './CoutureDashboard.css';

const CreateDesign = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const editId = searchParams.get('edit');
    const isEditing = !!editId;

    const [loading, setLoading] = useState(false);
    const [initialFetchLoading, setInitialFetchLoading] = useState(isEditing);
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        category: 'dress',
        fabric_suggestions: '',
        morphologies: []
    });
    const morphologiesList = [
        { id: 'H', label: 'Rectangle', desc: 'Épaules et hanches similaires.' },
        { id: 'A', label: 'Poire', desc: 'Hanches plus larges.' },
        { id: 'V', label: 'Triangle Inv.', desc: 'Épaules plus larges.' },
        { id: 'X', label: 'Sablier', desc: 'Taille marquée et équilibrée.' },
        { id: '8', label: 'Huit', desc: 'Sablier prononcé.' },
        { id: 'O', label: 'Ronde', desc: 'Silhouette arrondie.' }
    ];
    const [files, setFiles] = useState([]);

    React.useEffect(() => {
        if (!isEditing) return;
        const fetchDesign = async () => {
            try {
                const design = await designService.getDesign(editId);
                setFormData({
                    title: design.title || '',
                    description: design.description || '',
                    category: design.category || 'dress',
                    fabric_suggestions: design.fabric_suggestions || '',
                    morphologies: design.morphologies || []
                });
            } catch (err) {
                console.error("Failed to fetch design for editing", err);
                alert("Could not load design data.");
                navigate('/couturehouse/designs');
            } finally {
                setInitialFetchLoading(false);
            }
        };
        fetchDesign();
    }, [editId, isEditing, navigate]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const toggleMorphology = (id) => {
        setFormData(prev => {
            const isSelected = prev.morphologies.includes(id);
            return {
                ...prev,
                morphologies: isSelected 
                    ? prev.morphologies.filter(m => m !== id)
                    : [...prev.morphologies, id]
            };
        });
    };

    const handleFileChange = (e) => {
        setFiles(Array.from(e.target.files));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const token = localStorage.getItem('token');
        if (!token) {
            navigate('/');
            return;
        }

        try {
            setLoading(true);
            let designId = editId;
            
            if (isEditing) {
                await designService.updateDesign(editId, formData);
            } else {
                const newDesign = await designService.createDesign(formData);
                designId = newDesign.id || newDesign._id || newDesign.design?.id || newDesign.design?._id;
            }
            
            if (!designId) throw new Error("Could not retrieve design ID.");
            
            if (files.length > 0) {
                for (let i = 0; i < files.length; i++) {
                    const file = files[i];
                    const mediaForm = new FormData();
                    mediaForm.append('file', file);
                    mediaForm.append('media_type', file.type.includes('pdf') ? 'schema' : 'photo');
                    // Mark the first image as cover by default
                    if (i === 0) {
                        mediaForm.append('is_cover', 'true');
                    }
                    await designService.uploadMedia(designId, mediaForm);
                }
            }

            alert(isEditing ? "Design updated successfully!" : "Design created successfully!");
            navigate('/couturehouse/designs'); // Updated to go back to designs list
        } catch (err) {
            if (err.response?.status === 401) {
                localStorage.removeItem('token');
                navigate('/');
            } else {
                console.error(err);
                alert("Error creating design.");
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <CoutureLayout>
            <div className="animate-in mb-20">
                <button 
                    onClick={() => navigate('/couturehouse/designs')}
                    className="flex items-center gap-2 text-zinc-500 hover:text-ivory mb-12 transition-colors text-xs uppercase tracking-widest font-bold"
                >
                    <ArrowLeft size={14} /> Back to My Designs
                </button>

                <div className="mb-12">
                    <span className="text-label text-gold block mb-4 uppercase text-[10px] tracking-[0.3em]">Design Asset</span>
                    <h1 className="text-5xl font-display text-ivory">{isEditing ? 'Edit Creation' : 'New Creation'}</h1>
                </div>

                {initialFetchLoading ? (
                    <div className="flex justify-center items-center py-20">
                        <Loader2 className="animate-spin text-amber-500" size={32} />
                    </div>
                ) : (
                <form onSubmit={handleSubmit} className="max-w-4xl space-y-10">
                    {/* Basic Info */}
                    <div className="bg-white/5 border border-white/10 rounded-3xl p-10 space-y-8">
                        <div className="grid md:grid-cols-2 gap-10">
                            <div>
                                <label className="block text-[10px] uppercase tracking-[0.2em] font-bold text-zinc-500 mb-4">Design Title</label>
                                <input 
                                    required
                                    name="title"
                                    value={formData.title}
                                    onChange={handleInputChange}
                                    type="text" 
                                    placeholder="Midnight Gala Dress"
                                    className="w-full bg-zinc-900/50 border border-white/10 rounded-xl py-3.5 px-5 text-ivory focus:border-amber-500/50 focus:outline-none transition-all placeholder:text-zinc-700"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] uppercase tracking-[0.2em] font-bold text-zinc-500 mb-4">Category</label>
                                <select 
                                    name="category"
                                    value={formData.category}
                                    onChange={handleInputChange}
                                    className="w-full bg-zinc-900/50 border border-white/10 rounded-xl py-3.5 px-5 text-ivory focus:border-amber-500/50 focus:outline-none transition-all cursor-pointer"
                                >
                                    <option value="dress">Dress</option>
                                    <option value="suit">Suit</option>
                                    <option value="pants">Pants</option>
                                    <option value="jacket">Jacket / Blazer</option>
                                    <option value="shirt">Shirt / Blouse</option>
                                    <option value="other">Other Asset</option>
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="block text-[10px] uppercase tracking-[0.2em] font-bold text-zinc-500 mb-4">Aesthetic Description</label>
                            <textarea 
                                name="description"
                                value={formData.description}
                                onChange={handleInputChange}
                                rows="5"
                                placeholder="Describe the silhouette, inspiration, and mood..."
                                className="w-full bg-zinc-900/50 border border-white/10 rounded-xl py-4 px-5 text-ivory focus:border-amber-500/50 focus:outline-none transition-all resize-none placeholder:text-zinc-700 leading-relaxed"
                            ></textarea>
                        </div>
                        
                        <div>
                            <label className="block text-[10px] uppercase tracking-[0.2em] font-bold text-zinc-500 mb-4">Recommended Morphology</label>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                {morphologiesList.map(morph => {
                                    const isSelected = formData.morphologies.includes(morph.id);
                                    return (
                                        <button
                                            key={morph.id}
                                            type="button"
                                            onClick={() => toggleMorphology(morph.id)}
                                            className={`flex flex-col items-center justify-center p-4 rounded-xl border transition-all text-center ${
                                                isSelected 
                                                    ? 'bg-amber-500/10 border-amber-500 text-amber-500' 
                                                    : 'bg-zinc-900/50 border-white/10 text-zinc-400 hover:border-amber-500/30 hover:text-ivory'
                                            }`}
                                        >
                                            <span className="text-[10px] uppercase tracking-[0.2em] font-black text-ivory mb-1">{morph.label}</span>
                                            <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center mb-2">
                                                <span className="font-display text-xs text-gold/60">{morph.id}</span>
                                            </div>
                                            <span className="text-[9px] text-zinc-500 leading-relaxed font-light">{morph.desc}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* Fabrics */}
                    <div className="bg-white/5 border border-white/10 rounded-3xl p-10">
                        <label className="block text-[10px] uppercase tracking-[0.2em] font-bold text-zinc-500 mb-4">Material Integration</label>
                        <input 
                            name="fabric_suggestions"
                            value={formData.fabric_suggestions}
                            onChange={handleInputChange}
                            type="text" 
                            placeholder="e.g. Italian Silk, Velvet Accents, Gold Embroidery..."
                            className="w-full bg-zinc-900/50 border border-white/10 rounded-xl py-3.5 px-4 text-ivory focus:border-amber-500/50 focus:outline-none transition-all placeholder:text-zinc-700"
                        />
                    </div>

                    {/* Media Upload */}
                    <div className="bg-white/5 border border-white/10 rounded-3xl p-10">
                        <label className="block text-[10px] uppercase tracking-[0.2em] font-bold text-zinc-500 mb-4">Visual Documentation (Photos & Schemas)</label>
                        <div className="mt-2 flex justify-center px-10 pt-10 pb-12 border-2 border-white/5 border-dashed rounded-2xl hover:border-amber-500/20 transition-all group cursor-pointer relative bg-zinc-900/20">
                            <div className="space-y-4 text-center">
                                <Upload className="mx-auto h-16 w-16 text-zinc-700 group-hover:text-amber-500 group-hover:scale-110 transition-all duration-500" />
                                <div className="text-zinc-400">
                                    <p className="text-base font-medium mb-1">Scale your masterpieces</p>
                                    <p className="text-xs text-zinc-600 uppercase tracking-widest font-bold">PDF, JPEG, or PNG up to 15MB</p>
                                </div>
                                <input 
                                    type="file" 
                                    multiple 
                                    onChange={handleFileChange}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
                                />
                            </div>
                        </div>

                        {files.length > 0 && (
                            <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {files.map((file, idx) => (
                                    <div key={idx} className="flex items-center justify-between p-4 bg-white/[0.02] rounded-xl border border-white/5 animate-in">
                                        <div className="flex items-center gap-4 overflow-hidden">
                                            <div className="w-10 h-10 rounded-lg bg-zinc-900 flex items-center justify-center shrink-0">
                                                {file.type.includes('pdf') ? <FileText size={18} className="text-amber-500" /> : <Palette size={18} className="text-amber-500/60" />}
                                            </div>
                                            <div className="truncate">
                                                <p className="text-xs text-ivory font-bold truncate">{file.name}</p>
                                                <p className="text-[9px] text-zinc-600 uppercase font-black">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                                            </div>
                                        </div>
                                        <Check size={16} className="text-emerald-500/40 shrink-0" />
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Submit */}
                    <div className="pt-6">
                        <button 
                            disabled={loading}
                            type="submit" 
                            className="w-full btn btn-primary py-5 flex items-center justify-center gap-4 text-xl group shadow-glow-gold/10"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="animate-spin" size={24} />
                                    Crafting Asset...
                                </>
                            ) : (
                                <>
                                    {isEditing ? 'Update Masterpiece' : 'Initialize Masterpiece'}
                                    <Check size={24} className="group-hover:scale-125 transition-transform" />
                                </>
                            )}
                        </button>
                    </div>
                </form>
                )}
            </div>
        </CoutureLayout>
    );
};

export default CreateDesign;
