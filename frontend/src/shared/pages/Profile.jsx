import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { User, Camera, Mail, Info, Heart, Package, Loader2, Save, Layout, Plus } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import FabricCard from '../components/FabricCard';
import DesignCard from '../../actors/couturehouse/components/DesignCard';
import SkinAnalysisModal from '../components/SkinAnalysisModal';

const Profile = () => {
    const { userId } = useParams();
    const { user, token } = useAuth();
    const isOwnProfile = !userId || userId === String(user?.id);
    const [profileData, setProfileData] = useState(null);
    const [likedFabrics, setLikedFabrics] = useState([]);
    const [likedDesigns, setLikedDesigns] = useState([]);
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [info, setInfo] = useState('');
    const [photo, setPhoto] = useState(null);
    const [photoPreview, setPhotoPreview] = useState(null);
    const [isAnalysisModalOpen, setIsAnalysisModalOpen] = useState(false);
    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const url = userId 
                    ? `http://localhost:8000/api/auth/profile/${userId}/` 
                    : 'http://localhost:8000/api/auth/profile/';
                    
                const response = await fetch(url, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
                if (response.ok) {
                    const data = await response.json();
                    setProfileData(data.user);
                    setLikedFabrics(data.liked_fabrics || []);
                    setLikedDesigns(data.liked_designs || []);
                    setInfo(data.user.info || '');
                    if (data.user.photo) {
                        setPhotoPreview(`http://localhost:8000${data.user.photo}`);
                    }
                }
            } catch (err) {
                console.error("Error fetching profile:", err);
            } finally {
                setLoading(false);
            }
        };

        if (token) {
            fetchProfile();
        }
    }, [token]);

    const handlePhotoChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setPhoto(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setPhotoPreview(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleUpdateProfile = async (e) => {
        e.preventDefault();
        setUpdating(true);

        try {
            const formData = new FormData();
            formData.append('info', info);
            if (photo) {
                formData.append('photo', photo);
            }

            const response = await fetch('http://localhost:8000/api/auth/profile/', {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });

            if (response.ok) {
                const updatedUser = await response.json();
                setProfileData(updatedUser);
                setEditMode(false);
            }
        } catch (err) {
            console.error("Error updating profile:", err);
        } finally {
            setUpdating(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-noir flex items-center justify-center">
                <Loader2 className="text-gold animate-spin" size={48} />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-noir pt-20 pb-20">
            <div className="wrapper">
                {/* Profile Header */}
                <div className="relative mb-20">
                    <div className="flex flex-col md:flex-row gap-12 items-center md:items-start text-center md:text-left">
                        {/* Avatar Section */}
                        <div className="relative group">
                            <div className="w-48 h-48 rounded-full overflow-hidden border-2 border-gold/20 bg-muted flex items-center justify-center">
                                {photoPreview ? (
                                    <img src={photoPreview} alt="Profile" className="w-full h-full object-cover" />
                                ) : (
                                    <User size={80} className="text-ivory/20" />
                                )}
                            </div>
                            {editMode && (
                                <label className="absolute inset-0 flex items-center justify-center bg-noir/60 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer rounded-full">
                                    <Camera size={32} className="text-gold" />
                                    <input type="file" className="hidden" onChange={handlePhotoChange} accept="image/*" />
                                </label>
                            )}
                        </div>

                        {/* Info Section */}
                        <div className="flex-1">
                            <div className="flex justify-between items-start mb-6">
                                <div>
                                    <h1 className="font-display text-4xl md:text-5xl font-bold text-ivory mb-2 uppercase tracking-tight">
                                        {profileData?.username || 'Member'}
                                    </h1>
                                    <div className="flex items-center gap-4 text-gold/60 text-sm tracking-widest uppercase">
                                        <span className="flex items-center gap-1"><Mail size={14} /> {profileData?.email}</span>
                                        <span className="h-1 w-1 bg-gold/40 rounded-full"></span>
                                        <span className="flex items-center gap-1"><Package size={14} /> {profileData?.role}</span>
                                    </div>
                                </div>
                                {isOwnProfile && (
                                    <button 
                                        onClick={() => setEditMode(!editMode)}
                                        className="btn-secondary px-6 py-2 text-xs"
                                    >
                                        {editMode ? 'Cancel' : 'Edit Profile'}
                                    </button>
                                )}
                            </div>

                            <div className="divider-gold mx-0 mb-8 w-24"></div>

                            {editMode ? (
                                <form onSubmit={handleUpdateProfile} className="space-y-6 max-w-xl">
                                    <div>
                                        <label className="text-label text-gold/40 mb-2 block">Biography / Professional Info</label>
                                        <textarea
                                            className="input-couture w-full h-32"
                                            value={info}
                                            onChange={(e) => setInfo(e.target.value)}
                                            placeholder="Tell us about yourself..."
                                        />
                                    </div>
                                    <button
                                        type="submit"
                                        disabled={updating}
                                        className="btn btn-primary flex items-center gap-2"
                                    >
                                        {updating ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                                        Save Changes
                                    </button>
                                </form>
                            ) : (
                                <div className="max-w-2xl">
                                    <p className="text-ivory/50 leading-relaxed text-lg font-light italic">
                                        {profileData?.info || "Design your legacy. Add information about your creative journey or business needs here in your profile settings."}
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
                {/* Liked Fabrics Selection */}
                <div className="pt-20 border-t border-subtle/10">
                    <div className="flex items-center gap-4 mb-12">
                        <Heart size={24} className="text-red-500" fill="currentColor" />
                        <div>
                            <h2 className="font-display text-3xl font-bold text-ivory">
                                {isOwnProfile ? 'Your Collection' : `${profileData?.username}'s Selection`}
                            </h2>
                            <p className="text-label text-gold/40">Recently Liked Fabrics</p>
                        </div>
                    </div>

                    {likedFabrics.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                            {likedFabrics.map(fabric => (
                                <FabricCard key={fabric.id} fabric={fabric} showLikes={false} />
                            ))}
                        </div>
                    ) : (
                        <div className="py-20 text-center border border-dashed border-subtle/20 rounded-lg">
                            <div className="text-ivory/10 mb-6 flex justify-center">
                                <Heart size={64} />
                            </div>
                            <h3 className="text-ivory/40 font-display text-xl">Your collection is empty</h3>
                            <p className="text-ivory/20 max-w-xs mx-auto mt-2">Discover our premium fabrics in the portal and heart your favorites to see them here.</p>
                        </div>
                    )}
                </div>

                {/* Liked Designs Selection */}
                <div className="pt-20 mt-20 border-t border-subtle/10">
                    <div className="flex items-center gap-4 mb-12">
                        <Heart size={24} className="text-amber-500" fill="currentColor" />
                        <div>
                            <h2 className="font-display text-3xl font-bold text-ivory">
                                {isOwnProfile ? 'Atelier Favorites' : 'Inspired Ateliers'}
                            </h2>
                            <p className="text-label text-gold/40">Recently Liked Designs</p>
                        </div>
                    </div>

                    {likedDesigns.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                            {likedDesigns.map(design => (
                                <DesignCard key={design.id} design={design} isPublic={true} />
                            ))}
                        </div>
                    ) : (
                        <div className="py-20 text-center border border-dashed border-subtle/20 rounded-lg">
                            <div className="text-ivory/10 mb-6 flex justify-center">
                                <Layout size={64} />
                            </div>
                            <h3 className="text-ivory/40 font-display text-xl">No designs favorited yet</h3>
                            <p className="text-ivory/20 max-w-xs mx-auto mt-2">Explore the Atelier Showcase on the home page and save your favorite inspirations.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* AI Skin Analysis FAB */}
            {isOwnProfile && user?.role === 'client' && (
                <button 
                    onClick={() => setIsAnalysisModalOpen(true)}
                    className="fixed bottom-10 right-10 w-16 h-16 bg-gold text-noir rounded-full shadow-glow-gold flex items-center justify-center hover:scale-110 transition-transform duration-300 z-50 group"
                    title="AI Skin Tone Analysis"
                >
                    <Plus size={24} className="group-hover:rotate-90 transition-transform duration-500" />
                    <div className="absolute right-full mr-4 px-4 py-2 bg-noir/80 backdrop-blur-md border border-gold/20 rounded-lg text-[10px] uppercase tracking-widest text-gold opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                        AI Skin Analysis
                    </div>
                </button>
            )}

            <SkinAnalysisModal 
                isOpen={isAnalysisModalOpen} 
                onClose={() => setIsAnalysisModalOpen(false)} 
                token={token}
            />
        </div>
    );
};

export default Profile;
