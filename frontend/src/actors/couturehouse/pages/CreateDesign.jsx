import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Upload, FileText, Check, Loader2 } from 'lucide-react';
import designService from '../services/designService';

const CreateDesign = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        category: 'dress',
        fabric_suggestions: ''
    });
    const [files, setFiles] = useState([]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
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
            // 1. Create Design (Draft)
            const newDesign = await designService.createDesign(formData);
            console.log("DEBUG: Created design response:", newDesign);
            
            const designId = newDesign.id || newDesign._id || newDesign.design?.id || newDesign.design?._id;
            
            if (!designId) {
                throw new Error("Could not retrieve design ID from server response.");
            }
            
            // 2. Upload Files if any
            if (files.length > 0) {
                for (const file of files) {
                    const mediaForm = new FormData();
                    mediaForm.append('file', file);
                    mediaForm.append('media_type', file.type.includes('pdf') ? 'schema' : 'photo');
                    await designService.uploadMedia(designId, mediaForm);
                }
            }

            alert("Design created successfully!");
            navigate('/couturehouse');
        } catch (err) {
            if (err.response?.status === 401) {
                localStorage.removeItem('token');
                navigate('/');
            } else {
                console.error(err);
                alert("Error creating design. Check console for details.");
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-zinc-950 pt-32 pb-20 px-6">
            <div className="max-w-3xl mx-auto">
                {/* Header */}
                <button 
                    onClick={() => navigate('/couturehouse')}
                    className="flex items-center gap-2 text-zinc-500 hover:text-ivory mb-8 transition-colors text-sm uppercase tracking-widest font-bold"
                >
                    <ArrowLeft size={16} /> Back to Atelier
                </button>

                <div className="mb-12">
                    <div className="badge mb-4">New Asset</div>
                    <h1 className="text-4xl font-display text-ivory">Create Design</h1>
                </div>

                <form onSubmit={handleSubmit} className="space-y-8">
                    {/* Basic Info */}
                    <div className="bg-white/5 border border-white/10 rounded-3xl p-8 space-y-6">
                        <div>
                            <label className="block text-[10px] uppercase tracking-[0.2em] font-bold text-zinc-500 mb-3">Design Title</label>
                            <input 
                                required
                                name="title"
                                value={formData.title}
                                onChange={handleInputChange}
                                type="text" 
                                placeholder="e.g. Midnight Silk Gala Dress"
                                className="w-full bg-zinc-900/50 border border-white/10 rounded-xl py-3 px-4 text-ivory focus:border-amber-500/50 focus:outline-none transition-all"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-6">
                            <div>
                                <label className="block text-[10px] uppercase tracking-[0.2em] font-bold text-zinc-500 mb-3">Category</label>
                                <select 
                                    name="category"
                                    value={formData.category}
                                    onChange={handleInputChange}
                                    className="w-full bg-zinc-900/50 border border-white/10 rounded-xl py-3 px-4 text-ivory focus:border-amber-500/50 focus:outline-none transition-all"
                                >
                                    <option value="dress">Dress</option>
                                    <option value="suit">Suit</option>
                                    <option value="accessory">Accessory</option>
                                    <option value="other">Other</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-[10px] uppercase tracking-[0.2em] font-bold text-zinc-500 mb-3">Initial Status</label>
                                <div className="py-3 px-4 text-zinc-500 italic text-sm">Draft (Auto)</div>
                            </div>
                        </div>

                        <div>
                            <label className="block text-[10px] uppercase tracking-[0.2em] font-bold text-zinc-500 mb-3">Creative Description</label>
                            <textarea 
                                name="description"
                                value={formData.description}
                                onChange={handleInputChange}
                                rows="4"
                                placeholder="Describe the silhouette, inspiration, and mood..."
                                className="w-full bg-zinc-900/50 border border-white/10 rounded-xl py-3 px-4 text-ivory focus:border-amber-500/50 focus:outline-none transition-all resize-none"
                            ></textarea>
                        </div>
                    </div>

                    {/* Fabrics */}
                    <div className="bg-white/5 border border-white/10 rounded-3xl p-8">
                        <label className="block text-[10px] uppercase tracking-[0.2em] font-bold text-zinc-500 mb-3">Fabric Suggestions</label>
                        <div className="relative">
                            <input 
                                name="fabric_suggestions"
                                value={formData.fabric_suggestions}
                                onChange={handleInputChange}
                                type="text" 
                                placeholder="Silk, Satin, Velvet..."
                                className="w-full bg-zinc-900/50 border border-white/10 rounded-xl py-3 px-4 text-ivory focus:border-amber-500/50 focus:outline-none transition-all"
                            />
                        </div>
                    </div>

                    {/* Media Upload */}
                    <div className="bg-white/5 border border-white/10 rounded-3xl p-8">
                        <label className="block text-[10px] uppercase tracking-[0.2em] font-bold text-zinc-500 mb-3">Design Media (Photos & Schemas)</label>
                        <div className="mt-2 flex justify-center px-6 pt-5 pb-6 border-2 border-white/10 border-dashed rounded-2xl hover:border-amber-500/30 transition-colors group cursor-pointer relative">
                            <div className="space-y-2 text-center">
                                <Upload className="mx-auto h-12 w-12 text-zinc-600 group-hover:text-amber-500 transition-colors" />
                                <div className="flex text-sm text-zinc-400">
                                    <span className="relative cursor-pointer rounded-md font-medium text-amber-500 hover:text-amber-400 transition-colors">
                                        Upload files
                                        <input 
                                            type="file" 
                                            multiple 
                                            onChange={handleFileChange}
                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
                                        />
                                    </span>
                                    <p className="pl-1">or drag and drop</p>
                                </div>
                                <p className="text-xs text-zinc-600 uppercase tracking-widest font-bold">PNG, JPG, PDF up to 10MB</p>
                            </div>
                        </div>

                        {files.length > 0 && (
                            <div className="mt-4 space-y-2">
                                {files.map((file, idx) => (
                                    <div key={idx} className="flex items-center justify-between py-2 px-3 bg-white/5 rounded-lg border border-white/5">
                                        <div className="flex items-center gap-3">
                                            {file.type.includes('pdf') ? <FileText size={16} className="text-amber-500" /> : <Check size={16} className="text-emerald-500" />}
                                            <span className="text-xs text-zinc-400 truncate max-w-[200px]">{file.name}</span>
                                        </div>
                                        <span className="text-[10px] text-zinc-600 font-bold uppercase">{(file.size / 1024 / 1024).toFixed(2)} MB</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Submit */}
                    <button 
                        disabled={loading}
                        type="submit" 
                        className="w-full btn btn-primary py-4 flex items-center justify-center gap-3 text-lg group"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="animate-spin" size={24} />
                                Creating Masterpiece...
                            </>
                        ) : (
                            <>
                                Initialize Design Asset
                                <Check size={20} className="group-hover:scale-125 transition-transform" />
                            </>
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default CreateDesign;
