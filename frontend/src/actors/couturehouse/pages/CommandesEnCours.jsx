import React, { useState, useEffect } from 'react';
import { 
    Loader2, Layers, Clock, Package, CheckCircle2, ChevronRight, Truck
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import CoutureTrackingBar from '../../../shared/components/Logistics/CoutureTrackingBar';
import CoutureLayout from '../components/CoutureLayout';
import './CoutureDashboard.css';

const CommandesEnCours = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [fabricOrders, setFabricOrders] = useState([]);

    const token = localStorage.getItem('token');

    const fetchFabricOrders = async (silent = false) => {
        try {
            if (!silent) setLoading(true);
            const response = await fetch('http://localhost:8000/api/couturehouse/orders/fabric-purchases/', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                setFabricOrders(data.orders || []);
            }
        } catch (err) {
            console.error("Failed to fetch fabric orders", err);
        } finally {
            if (!silent) setLoading(false);
        }
    };

    const confirmReceipt = async (orderId) => {
        try {
            const response = await fetch(`http://localhost:8000/api/couturehouse/orders/${orderId}/confirm-receipt/`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                fetchFabricOrders();
            }
        } catch (err) {
            console.error("Confirmation failed", err);
        }
    };

    useEffect(() => {
        if (!token) {
            navigate('/');
            return;
        }
        fetchFabricOrders();

        // Real-time synchronization (polling every 5 seconds)
        const syncInterval = setInterval(() => {
            fetchFabricOrders(true);
        }, 5000);

        return () => clearInterval(syncInterval);
    }, [token]);

    return (
        <CoutureLayout>
            <div className="flex justify-between items-end mb-12">
                <div>
                    <span className="text-gold" style={{ display: 'block', marginBottom: '1rem', textTransform: 'uppercase', fontSize: '10px', letterSpacing: '0.3em' }}>Logistique & Suivi</span>
                    <h1 className="text-ivory" style={{ fontSize: '3rem', fontFamily: 'Outfit, sans-serif' }}>Matières Premium</h1>
                    <p className="text-zinc-500" style={{ marginTop: '1rem', maxWidth: '40rem' }}>Visualisez l'acheminement de vos matières précieuses et confirmez leur réception à l'atelier.</p>
                </div>
            </div>

            {loading ? (
                <div style={{ padding: '80px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    <Loader2 className="animate-spin text-gold" size={40} style={{ marginBottom: '1rem' }} />
                    <p className="text-zinc-500" style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.2em' }}>Suivi des arrivages...</p>
                </div>
            ) : (
                <div style={{ display: 'grid', gap: '1.5rem' }}>
                    {fabricOrders.length === 0 ? (
                        <div style={{ padding: '80px 0', textAlign: 'center', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: '24px', background: 'rgba(255,255,255,0.02)' }}>
                            <Truck size={48} style={{ margin: '0 auto 1.5rem', color: '#18181b' }} />
                            <h3 className="text-ivory" style={{ fontSize: '1.25rem', marginBottom: '0.5rem', opacity: 0.4 }}>Aucun arrivage prévu</h3>
                            <p className="text-zinc-500" style={{ fontSize: '14px', maxWidth: '20rem', margin: '0 auto' }}>Vos commandes de tissus auprès des fournisseurs apparaîtront ici.</p>
                        </div>
                    ) : fabricOrders.map(fOrder => (
                        <div key={fOrder.id} style={{ padding: '2rem', background: 'rgba(9,9,11,0.4)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '2rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '2rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                    <div style={{ width: '2.5rem', height: '2.5rem', background: 'rgba(212,175,55,0.1)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#d4af37', border: '1px solid rgba(212,175,55,0.2)' }}>
                                        <Layers size={18} />
                                    </div>
                                    <div>
                                        <h3 className="text-ivory" style={{ fontSize: '1.5rem', fontFamily: 'Outfit, sans-serif' }}>{fOrder.fabric_name}</h3>
                                        <p style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#52525b', fontWeight: 800, marginTop: '4px' }}>Fournisseur Premium</p>
                                    </div>
                                </div>
                                
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#3f3f46', fontWeight: 800, marginBottom: '4px' }}>Métrage</div>
                                        <span className="text-ivory" style={{ fontSize: '1.125rem', fontFamily: 'Outfit, sans-serif' }}>{fOrder.quantity}m</span>
                                    </div>
                                    <div style={{ height: '2rem', width: '1px', background: 'rgba(255,255,255,0.05)' }} />
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#3f3f46', fontWeight: 800, marginBottom: '4px' }}>Transport</div>
                                        <span style={{ fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', color: 'rgba(212,175,55,0.6)' }}>{fOrder.delivery_type}</span>
                                    </div>
                                </div>
                            </div>

                            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '1rem', padding: '2rem', marginBottom: '1.5rem' }}>
                                <CoutureTrackingBar 
                                    status={fOrder.status} 
                                    onConfirm={() => confirmReceipt(fOrder.id)}
                                />
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </CoutureLayout>
    );
};

export default CommandesEnCours;
