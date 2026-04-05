import React, { useEffect, useState } from 'react';
import { 
    Layers, Search, Loader2, Palette, 
    Menu, LogOut, Package, TrendingUp, Sparkles, LayoutGrid, Plus, Settings, Users,
    X, CheckCircle2, AlertCircle, ChevronRight,
    Edit3, Trash2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../../../services/authService';
import CoutureLayout from '../components/CoutureLayout';
import './CoutureDashboard.css';

const CoutureHouseFabricsInventory = () => {
    const [fabrics, setFabrics] = useState([]);
    const [fabricImages, setFabricImages] = useState({});
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        total: 0,
        available: 0
    });
    const [userProfile, setUserProfile] = useState(null);
    const [showOrderModal, setShowOrderModal] = useState(false);
    const [selectedFabric, setSelectedFabric] = useState(null);
    const [orderQuantity, setOrderQuantity] = useState(1);
    const [isOrdering, setIsOrdering] = useState(false);
    const [orderError, setOrderError] = useState(null);
    const [orderSuccess, setOrderSuccess] = useState(false);
    const [activeTab, setActiveTab] = useState('marketplace'); // 'marketplace' or 'matietheque'
    const [localStock, setLocalStock] = useState([]);
    const [localLoading, setLocalLoading] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [editQuantity, setEditQuantity] = useState(0);
    const [isUpdating, setIsUpdating] = useState(false);
    
    const navigate = useNavigate();
    const token = authService.getToken();

    const fetchImage = async (fabricId) => {
        try {
            const response = await fetch(`http://localhost:8000/api/images/${fabricId}`, {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${token}`,
                    Accept: "application/json",
                },
            });
            if (response.ok) {
                const data = await response.json();
                return data.image;
            }
        } catch (err) {
            console.error(`Error fetching image for fabric ${fabricId}:`, err);
        }
        return null;
    };

    const fetchUserProfile = async () => {
        try {
            const response = await fetch("http://localhost:8000/api/auth/profile/", {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                setUserProfile(data.user);
            }
        } catch (err) {
            console.error("Error fetching user profile:", err);
        }
    };

    const fetchFabrics = async () => {
        if (!token) {
            navigate('/');
            return;
        }

        try {
            setLoading(true);
            const response = await fetch("http://localhost:8000/api/fabrics", {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
            });

            if (response.ok) {
                const data = await response.json();
                const fabricsList = data.fabrics || [];
                setFabrics(fabricsList);

                const total = fabricsList.length;
                const available = fabricsList.filter(f => f.quantite > 0).length;
                
                setStats({ total, available });

                const images = {};
                for (const fabric of fabricsList) {
                    const imageData = await fetchImage(fabric._id);
                    if (imageData) {
                        images[fabric._id] = imageData;
                    }
                }
                setFabricImages(images);

            } else if (response.status === 401) {
                authService.logout();
                navigate("/login");
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const fetchLocalStock = async () => {
        try {
            setLocalLoading(true);
            const response = await fetch("http://localhost:8000/api/couturehouse/atelier/stock/", {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                setLocalStock(data);
            }
        } catch (err) {
            console.error("Error fetching local stock:", err);
        } finally {
            setLocalLoading(false);
        }
    };

    const deleteLocalStock = async (itemId) => {
        if (!window.confirm("Voulez-vous vraiment retirer cette matière de votre stock local ?")) return;
        
        try {
            const response = await fetch(`http://localhost:8000/api/couturehouse/atelier/stock/${itemId}/`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` }
            });
            if (response.ok) {
                fetchLocalStock();
            } else {
                alert("Erreur lors de la suppression.");
            }
        } catch (err) {
            console.error("Delete failed:", err);
        }
    };

    const openEditModal = (item) => {
        setEditingItem(item);
        setEditQuantity(item.quantity);
        setShowEditModal(true);
    };

    const submitUpdateStock = async () => {
        if (!editingItem) return;
        setIsUpdating(true);
        try {
            const response = await fetch(`http://localhost:8000/api/couturehouse/atelier/stock/${editingItem.id}/`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ quantity: editQuantity })
            });
            if (response.ok) {
                setShowEditModal(false);
                fetchLocalStock();
            } else {
                alert("Erreur lors de la mise à jour.");
            }
        } catch (err) {
            console.error("Update failed:", err);
        } finally {
            setIsUpdating(false);
        }
    };

    const handlePlaceOrder = (fabric) => {
        setSelectedFabric(fabric);
        setOrderQuantity(1);
        setOrderError(null);
        setOrderSuccess(false);
        setShowOrderModal(true);
    };

    const submitOrder = async () => {
        if (!selectedFabric || !userProfile || !userProfile.profile) {
            setOrderError("Unable to identify your couture house. Please refresh.");
            return;
        }
        
        setIsOrdering(true);
        setOrderError(null);
        
        try {
            const response = await fetch("http://localhost:8000/api/fournisseur/orders/create", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    fabric_id: selectedFabric.id,
                    quantity: orderQuantity,
                    couture_house_id: userProfile.profile.id,
                    couture_house_name: userProfile.profile.house_name
                })
            });
            
            if (response.ok) {
                setOrderSuccess(true);
                setTimeout(() => {
                    setShowOrderModal(false);
                    fetchFabrics(); 
                }, 2000);
            } else {
                const data = await response.json();
                setOrderError(data.error || "Failed to place order");
            }
        } catch (err) {
            setOrderError("An error occurred. Please try again.");
        } finally {
            setIsOrdering(false);
        }
    };

    useEffect(() => {
        fetchFabrics();
        fetchLocalStock();
        fetchUserProfile();
    }, []);

    const handleLogout = () => {
        authService.logout();
        navigate('/');
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-zinc-950 text-ivory">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="animate-spin text-amber-500" size={48} />
                    <p className="text-sm uppercase tracking-widest font-bold opacity-50">Loading Fabrics...</p>
                </div>
            </div>
        );
    }

    return (
        <CoutureLayout>
            <div className="mb-12">
                <span className="text-label text-gold block mb-4 uppercase text-[10px] tracking-[0.3em]">Marketplace</span>
                <h1 className="text-5xl font-display text-ivory">Supplier Fabrics</h1>
                <p className="text-zinc-500 mt-4 max-w-2xl">Browse the finest materials curated from our global network of top-tier weavers and suppliers.</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
                <div className="atelier-stat-card group">
                    <div className="stat-icon purple">
                        <Package size={22} />
                    </div>
                    <div>
                        <div className="text-2xl font-display text-ivory mb-1">{stats.total}</div>
                        <div className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold group-hover:text-ivory/40 transition-colors">Total Supplier Fabrics</div>
                    </div>
                </div>
                <div className="atelier-stat-card group">
                    <div className="stat-icon blue">
                        <Sparkles size={22} />
                    </div>
                    <div>
                        <div className="text-2xl font-display text-ivory mb-1">{stats.available}</div>
                        <div className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold group-hover:text-ivory/40 transition-colors">In Stock</div>
                    </div>
                </div>
            </div>

            {/* Content Header with Tabs */}
            <div className="flex justify-between items-end mb-8 border-b border-white/5 pb-2">
                <div className="flex gap-8">
                    <button 
                        onClick={() => setActiveTab('marketplace')}
                        className={`pb-4 text-sm uppercase tracking-widest font-black transition-all relative ${
                            activeTab === 'marketplace' ? 'text-gold' : 'text-zinc-600 hover:text-ivory/60'
                        }`}
                    >
                        Marketplace Suppliers
                        {activeTab === 'marketplace' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-gold" />}
                    </button>
                    <button 
                        onClick={() => setActiveTab('matietheque')}
                        className={`pb-4 text-sm uppercase tracking-widest font-black transition-all relative ${
                            activeTab === 'matietheque' ? 'text-gold' : 'text-zinc-600 hover:text-ivory/60'
                        }`}
                    >
                        Ma Matiéthèque (Local)
                        {activeTab === 'matietheque' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-gold" />}
                    </button>
                </div>
            </div>

            {activeTab === 'marketplace' ? (
                /* Marketplace Grid */
                fabrics.length === 0 ? (
                    <div className="py-32 text-center border border-dashed border-white/10 rounded-3xl bg-white/[0.02]">
                        <Layers size={48} className="mx-auto text-zinc-800 mb-6" />
                        <h3 className="text-ivory/40 font-display text-xl mb-2">No Fabrics Found</h3>
                        <p className="text-zinc-600 text-sm max-w-xs mx-auto">There are currently no fabrics listed by suppliers.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {fabrics.map(fabric => (
                            <div key={fabric._id} className="design-card group bg-noir/40 border border-white/5 rounded-2xl overflow-hidden hover:bg-noir/60 transition-colors">
                                <div className="aspect-[4/5] overflow-hidden relative bg-zinc-900 flex items-center justify-center">
                                    {fabricImages[fabric._id] ? (
                                        <img 
                                            src={fabricImages[fabric._id]} 
                                            alt={fabric.materiel} 
                                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 opacity-80 group-hover:opacity-100"
                                        />
                                    ) : (
                                        <div className="text-xs text-zinc-600 uppercase tracking-widest">No Image</div>
                                    )}
                                    <div className="absolute top-4 right-4 bg-noir/90 backdrop-blur-md px-3 py-1 rounded-full border border-white/10 flex items-center gap-1.5">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                        <span className="text-[9px] uppercase tracking-widest text-ivory/70">{fabric.quantite}m Available</span>
                                    </div>
                                </div>
                                <div className="p-6">
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <h3 className="text-lg font-display text-ivory group-hover:text-gold transition-colors">{fabric.materiel || "Unknown Material"}</h3>
                                            <p className="text-xs text-zinc-500 mt-1 line-clamp-2">{fabric.description || "No description provided."}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between pt-4 border-t border-white/5">
                                        {fabric.color && Array.isArray(fabric.color) && fabric.color.length === 3 ? (
                                            <div className="flex items-center gap-2">
                                                <div className="w-4 h-4 rounded-full border border-white/20" style={{ backgroundColor: `rgb(${fabric.color[0]}, ${fabric.color[1]}, ${fabric.color[2]})` }}></div>
                                                <span className="text-[10px] text-zinc-500 font-mono tracking-wider">RGB({fabric.color.join(',')})</span>
                                            </div>
                                        ) : (
                                            <span className="text-[10px] text-zinc-500 uppercase">Multi-color</span>
                                        )}
                                        <span className="text-sm font-display text-gold">${parseFloat(fabric.prix).toFixed(2)}/m</span>
                                    </div>
                                    <button 
                                        onClick={() => handlePlaceOrder(fabric)}
                                        className="w-full mt-6 py-3 bg-gold text-noir font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-ivory hover:scale-[1.02] active:scale-[0.98] transition-all duration-300"
                                    >
                                        <Package size={18} />
                                        <span>Commander</span>
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )
            ) : (
                /* Matiéthèque Grid */
                localLoading ? (
                    <div className="py-20 flex justify-center">
                        <Loader2 className="animate-spin text-gold" size={32} />
                    </div>
                ) : localStock.length === 0 ? (
                    <div className="py-32 text-center border border-dashed border-white/10 rounded-3xl bg-white/[0.02]">
                        <Package size={48} className="mx-auto text-zinc-800 mb-6" />
                        <h3 className="text-ivory/40 font-display text-xl mb-2">Votre Matiéthèque est vide</h3>
                        <p className="text-zinc-600 text-sm max-w-xs mx-auto">Confirmez la réception de vos commandes fournisseurs pour voir vos stocks ici.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {localStock.map(item => (
                            <div key={item.id} className="design-card group bg-noir/40 border border-white/5 rounded-2xl overflow-hidden hover:bg-noir/60 transition-colors">
                                <div className="aspect-[4/5] overflow-hidden relative bg-zinc-900/50 flex items-center justify-center p-8">
                                    <div className="w-full h-full rounded-2xl border-4 border-dashed border-white/5 flex flex-col items-center justify-center gap-4">
                                        <Palette size={48} className="text-gold/20" />
                                        <div className="text-center">
                                            <div className="text-3xl font-display text-ivory">{item.quantity} {item.unit === 'meters' ? 'm' : item.unit}</div>
                                            <div className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">Stock Actuel</div>
                                        </div>
                                    </div>
                                </div>
                                <div className="p-6">
                                    <h3 className="text-xl font-display text-ivory group-hover:text-gold transition-colors">{item.fabric_name}</h3>
                                    <div className="flex items-center gap-2 mt-2">
                                        <div className={`w-2 h-2 rounded-full ${item.quantity > 5 ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`} />
                                        <span className="text-[10px] uppercase tracking-widest text-zinc-500 font-black">
                                            {item.quantity > 5 ? 'Disponible' : 'Stock Faible'}
                                        </span>
                                    </div>
                                    <div className="mt-6 pt-6 border-t border-white/5 flex justify-between items-center">
                                        <div className="flex gap-2">
                                            <button 
                                                onClick={() => openEditModal(item)}
                                                className="p-2 rounded-lg bg-white/5 hover:bg-gold/10 hover:text-gold transition-colors"
                                                title="Modifier le stock"
                                            >
                                                <Edit3 size={14} />
                                            </button>
                                            <button 
                                                onClick={() => deleteLocalStock(item.id)}
                                                className="p-2 rounded-lg bg-white/5 hover:bg-red-500/10 hover:text-red-500 transition-colors"
                                                title="Supprimer du stock"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                        <div className="text-[9px] uppercase tracking-widest font-bold text-zinc-600">
                                            <span className="text-ivory">{new Date(item.updated_at).toLocaleDateString()}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )
            )}

            {/* Edit Stock Modal */}
            {showEditModal && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-noir/90 backdrop-blur-xl">
                    <div className="w-full max-w-md bg-zinc-900 border border-white/10 rounded-3xl overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-300">
                        <div className="p-8">
                            <div className="flex justify-between items-center mb-8">
                                <h2 className="font-display text-2xl text-ivory">Mise à jour du Stock</h2>
                                <button 
                                    onClick={() => setShowEditModal(false)}
                                    className="p-2 text-zinc-500 hover:text-ivory hover:bg-white/5 rounded-full transition-colors"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="mb-6">
                                <label className="text-[10px] uppercase tracking-widest font-black text-gold mb-2 block">Matière</label>
                                <div className="text-xl font-display text-ivory">{editingItem?.fabric_name}</div>
                            </div>

                            <div className="mb-8">
                                <label className="text-[10px] uppercase tracking-widest font-black text-zinc-500 mb-4 block">Quantité en Stock (mètres)</label>
                                <div className="flex items-center gap-6">
                                    <input 
                                        type="number" 
                                        value={editQuantity}
                                        onChange={(e) => setEditQuantity(e.target.value)}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-ivory focus:border-gold outline-none transition-colors"
                                    />
                                </div>
                            </div>

                            <div className="flex gap-4">
                                <button 
                                    onClick={() => setShowEditModal(false)}
                                    className="flex-1 py-4 border border-white/10 rounded-2xl text-zinc-400 font-bold hover:bg-white/5 transition-all"
                                >
                                    Annuler
                                </button>
                                <button 
                                    onClick={submitUpdateStock}
                                    disabled={isUpdating}
                                    className="flex-1 py-4 bg-gold text-noir font-bold rounded-2xl hover:bg-ivory hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
                                >
                                    {isUpdating ? <Loader2 className="animate-spin mx-auto" size={20} /> : "Enregistrer"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Order Modal */}
            {showOrderModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-noir/80 backdrop-blur-md">
                    <div className="w-full max-w-lg bg-zinc-900 border border-white/10 rounded-3xl overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-300">
                        <div className="p-8">
                            <div className="flex justify-between items-center mb-8">
                                <h2 className="font-display text-2xl text-ivory">Place Material Order</h2>
                                <button 
                                    onClick={() => setShowOrderModal(false)}
                                    className="p-2 text-zinc-500 hover:text-ivory hover:bg-white/5 rounded-full transition-colors"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            {orderSuccess ? (
                                <div className="py-12 text-center">
                                    <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                                        <CheckCircle2 className="text-emerald-500" size={40} />
                                    </div>
                                    <h3 className="text-2xl font-display text-ivory mb-2">Order Confirmed</h3>
                                    <p className="text-zinc-500">Your request has been sent to the supplier.</p>
                                </div>
                            ) : (
                                <>
                                    <div className="flex gap-6 mb-8 p-4 bg-white/[0.02] border border-white/5 rounded-2xl">
                                        <div className="w-24 h-24 rounded-xl overflow-hidden bg-zinc-800">
                                            {fabricImages[selectedFabric._id] ? (
                                                <img 
                                                    src={fabricImages[selectedFabric._id]} 
                                                    alt={selectedFabric.materiel} 
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-[10px] uppercase text-zinc-600">No Image</div>
                                            )}
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-display text-ivory mb-1">{selectedFabric.materiel}</h3>
                                            <div className="flex items-center gap-2 mb-2">
                                                <span className="text-xs text-gold font-bold">${parseFloat(selectedFabric.prix).toFixed(2)}/m</span>
                                                <span className="text-zinc-600">|</span>
                                                <span className="text-[10px] text-zinc-400 uppercase tracking-widest">{selectedFabric.quantite}m In Stock</span>
                                            </div>
                                            {selectedFabric.color && (
                                                <div className="flex items-center gap-2">
                                                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: `rgb(${selectedFabric.color.join(',')})` }}></div>
                                                    <span className="text-[10px] text-zinc-500 font-mono">RGB({selectedFabric.color.join(',')})</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="mb-8">
                                        <div className="flex justify-between items-center mb-3">
                                            <label className="text-[10px] uppercase tracking-widest font-bold text-zinc-500">How many meters needed?</label>
                                            <span className="text-xs text-zinc-400 font-mono">{orderQuantity}m</span>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <input 
                                                type="range" 
                                                min="1" 
                                                max={parseFloat(selectedFabric.quantite)} 
                                                step="0.5"
                                                value={orderQuantity}
                                                onChange={(e) => setOrderQuantity(parseFloat(e.target.value))}
                                                className="flex-1 accent-gold"
                                            />
                                        </div>
                                    </div>

                                    {orderError && (
                                        <div className="p-4 mb-8 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3 text-red-500 text-sm">
                                            <AlertCircle size={18} />
                                            <span>{orderError}</span>
                                        </div>
                                    )}

                                    <div className="pt-6 border-t border-white/5 flex justify-between items-center">
                                        <div>
                                            <div className="text-[10px] uppercase text-zinc-500 font-bold mb-1 tracking-widest">Estimated Total</div>
                                            <div className="text-2xl font-display text-gold">${(orderQuantity * parseFloat(selectedFabric.prix)).toFixed(2)}</div>
                                        </div>
                                        <button 
                                            onClick={submitOrder}
                                            disabled={isOrdering}
                                            className="px-8 py-4 bg-white text-noir font-bold rounded-2xl flex items-center gap-3 hover:bg-gold hover:scale-105 active:scale-95 transition-all duration-300 disabled:opacity-50 disabled:scale-100"
                                        >
                                            {isOrdering ? (
                                                <Loader2 className="animate-spin" size={20} />
                                            ) : (
                                                <>
                                                    <span>Place Order</span>
                                                    <ChevronRight size={18} />
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </CoutureLayout>
    );
};

export default CoutureHouseFabricsInventory;
