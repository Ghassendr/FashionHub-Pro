import React, { useState, useEffect, useCallback } from 'react';
import { 
  Hexagon, LayoutDashboard, Package, Truck, 
  Map, ScanLine, Thermometer, ShieldCheck, 
  History, Bell, Plus, CarFront, CircleSlash,
  Clock, MapPin, CheckCircle2, ChevronRight, X
} from 'lucide-react';
import TripMapPicker from './TripMapPicker';
import './DeliveryDashboard.css';

const pageTitles = {
  overview: <>Good morning, <span style={{fontStyle:'italic', color:'var(--gold)'}}>Marc</span></>,
  orders: <>Transport <span style={{fontStyle:'italic', color:'var(--gold)'}}>Missions</span></>,
  trips: <>Active <span style={{fontStyle:'italic', color:'var(--gold)'}}>Trips</span></>,
  fleet: <>Fleet <span style={{fontStyle:'italic', color:'var(--gold)'}}>Management</span></>,
  scan: <>Scan & <span style={{fontStyle:'italic', color:'var(--gold)'}}>Authenticate</span></>,
  climate: <>Climate <span style={{fontStyle:'italic', color:'var(--gold)'}}>Logs</span></>,
  compliance: <>Compliance <span style={{fontStyle:'italic', color:'var(--gold)'}}>Docs</span></>,
  history: <>Delivery <span style={{fontStyle:'italic', color:'var(--gold)'}}>History</span></>,
};

const DeliveryDashboard = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [currentTime, setCurrentTime] = useState('');
  
  const [vehicles, setVehicles] = useState([]);
  const [kpis, setKpis] = useState(null);
  const [trips, setTrips] = useState([]);
  const [orders, setOrders] = useState([]);
  const [shipments, setShipments] = useState([]);
  const [isRegistering, setIsRegistering] = useState(false);
  const [isCreatingLine, setIsCreatingLine] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // Notification and Alting states
  const [showNotifs, setShowNotifs] = useState(false);
  const [successAlert, setSuccessAlert] = useState('');

  // New line form state
  const [newLine, setNewLine] = useState({
    start_location: '',
    end_location: '',
    services: [
      { type: 'Standard', cost: 30, nature: ['Standard'], eta: '5-7 days' }
    ]
  });

  // New vehicle form state
  const [newVehicle, setNewVehicle] = useState({
    type: 'Standard Van',
    make_model: '',
    registration: '',
    status: 'Available'
  });

  // Memoized callback for TripMapPicker to prevent re-render loops and comply with Rules of Hooks
  const handleRouteSelected = useCallback((r) => { 
    if(r) {
      const parts = r.split('→').map(p => p.trim());
      setNewLine(prev => ({
        ...prev,
        start_location: parts[0] || prev.start_location,
        end_location: parts[1] || prev.end_location
      }));
    }
  }, []);

  const NATURE_OPTIONS = ["Standard", "Secured", "Fragile", "Climate Controlled", "Guarantee"];

  // Time ticker
  useEffect(() => {
    const tick = () => {
      const now = new Date();
      const h = String(now.getHours()).padStart(2,'0');
      const m = String(now.getMinutes()).padStart(2,'0');
      const s = String(now.getSeconds()).padStart(2,'0');
      const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
      setCurrentTime(`${days[now.getDay()]} · ${h}:${m}:${s}`);
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, []);

  // Fetch MongoDB Dashboard Data
  const fetchDashboardData = async (silent = false) => {
    const token = localStorage.getItem('token');
    if (!silent) setLoading(true);
    try {
      // Parallel fetches for efficiency
      const [vRes, kRes, tRes, oRes] = await Promise.all([
        fetch('http://localhost:8000/api/mongo/delivery/vehicles/', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('http://localhost:8000/api/mongo/delivery/kpis/', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('http://localhost:8000/api/mongo/delivery/trips/', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('http://localhost:8000/api/mongo/delivery/orders/', { headers: { 'Authorization': `Bearer ${token}` } })
      ]);

      if (vRes.ok) setVehicles(await vRes.json());
      if (kRes.ok) setKpis(await kRes.json());
      if (tRes.ok) setTrips(await tRes.json());
      if (oRes.ok) setOrders(await oRes.json());
    } catch (err) {
      console.error("Error fetching MongoDB dashboard data:", err);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  // Fetch SQL Shipments
  const fetchShipments = async (silent = false) => {
    const token = localStorage.getItem('token');
    try {
      const res = await fetch('http://localhost:8000/api/delivery/shipments/', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setShipments(await res.json());
      }
    } catch (err) {
      console.error("Error fetching SQL shipments:", err);
    }
  };

  const updateShipmentStatus = async (shipmentId, newStatus) => {
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`http://localhost:8000/api/delivery/shipments/${shipmentId}/status/`, {
        method: 'PATCH',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        fetchShipments();
        setSuccessAlert(`✅ Mission updated to ${newStatus.toUpperCase()}`);
        setTimeout(() => setSuccessAlert(''), 3000);
      }
    } catch (err) {
      console.error("Error updating shipment status:", err);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    fetchShipments();
    fetchRoutes();

    // Real-time synchronization (polling every 5 seconds)
    const syncInterval = setInterval(() => {
      fetchDashboardData(true);
      fetchShipments(true);
      fetchRoutes(true);
    }, 5000);

    return () => clearInterval(syncInterval);
  }, []);

  // Handle vehicle registration submit
  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('http://localhost:8000/api/mongo/delivery/vehicles/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newVehicle,
          features: { Climate: "Optional", GPS: "Live" }
        })
      });
      if (res.ok) {
        setIsRegistering(false);
        setNewVehicle({ type: 'Standard Van', make_model: '', registration: '', status: 'Available' });
        fetchDashboardData();
      }
    } catch (err) {
      console.error("Error creating vehicle:", err);
    }
  };

  const [routes, setRoutes] = useState([]);
  
  const fetchRoutes = async (silent = false) => {
    const token = localStorage.getItem('token');
    try {
      const res = await fetch('http://localhost:8000/api/delivery/routes/', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) setRoutes(await res.json());
    } catch (err) {
      console.error("Error fetching routes:", err);
    }
  };

  const handleCreateLineSubmit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    try {
      const res = await fetch('http://localhost:8000/api/delivery/routes/', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(newLine)
      });
      if (res.ok) {
        setIsCreatingLine(false);
        setNewLine({
          start_location: '',
          end_location: '',
          services: [{ type: 'Standard', cost: 30, nature: ['Standard'], eta: '5-7 days' }]
        });
        fetchRoutes();
        setSuccessAlert('✅ New Service Line created successfully!');
        setTimeout(() => setSuccessAlert(''), 5000);
      }
    } catch (err) {
      console.error("Error creating line:", err);
    }
  };

  const addServiceField = () => {
    setNewLine({
      ...newLine,
      services: [...newLine.services, { type: 'Premium', cost: 100, nature: ['Secured'], eta: '2 days' }]
    });
  };

  const updateServiceField = (index, field, value) => {
    const updated = [...newLine.services];
    updated[index][field] = value;
    
    // Auto-adjust ETA based on type if changing type
    if (field === 'type') {
      if (value === 'Standard') updated[index].eta = '7 Days';
      if (value === 'Fast') updated[index].eta = '3 Days';
      if (value === 'Express') updated[index].eta = '48h';
      if (value === 'Urgent') updated[index].eta = '24h';
    }
    
    setNewLine({ ...newLine, services: updated });
  };

  const adjustEtaDays = (index, delta) => {
    const updated = [...newLine.services];
    const current = parseInt(updated[index].eta) || 1;
    const newVal = Math.max(1, current + delta);
    updated[index].eta = `${newVal} Day${newVal > 1 ? 's' : ''}`;
    setNewLine({ ...newLine, services: updated });
  };

  const removeServiceField = (index) => {
    setNewLine({ ...newLine, services: newLine.services.filter((_, i) => i !== index) });
  };

  return (
    <div className="delivery-board">
      
      {/* Success Floating Alert */}
      {successAlert && (
        <div style={{
          position: 'fixed', top: '24px', left: '50%', transform: 'translateX(-50%)',
          background: 'rgba(111,207,151,0.15)', border: '1px solid #6FCF97', color: '#6FCF97',
          padding: '16px 24px', borderRadius: '4px', zIndex: 11000,
          backdropFilter: 'blur(10px)', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '10px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.5)'
        }} className="fade-in">
          {successAlert}
        </div>
      )}

      {/* Service Line Creation Modal Overlay */}
      {isCreatingLine && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 10000,
          display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)'
        }}>
          <div style={{
            background: 'var(--noir-muted)', border: '0.5px solid var(--gold-border)',
            width: '600px', padding: '24px', position: 'relative', maxHeight: '90vh', overflowY: 'auto'
          }} className="fade-in">
            <button 
              onClick={() => setIsCreatingLine(false)}
              style={{position:'absolute', top:'20px', right:'20px', background:'none', border:'none', color:'var(--ivory-60)', cursor:'pointer'}}
            >
              <X size={18} />
            </button>
            <div style={{fontFamily:'Playfair Display, serif', fontSize:'22px', color:'var(--gold)', marginBottom:'24px'}}>
              Define New Service Line
            </div>
            <form onSubmit={handleCreateLineSubmit} style={{display:'flex', flexDirection:'column', gap:'20px'}}>
              <div style={{display:'flex', gap:'12px'}}>
                <div style={{flex:1}}>
                  <label style={{fontSize:'10px', color:'var(--ivory-60)', textTransform:'uppercase', letterSpacing:'0.1em'}}>Source City</label>
                  <input required type="text" placeholder="e.g. Nice" value={newLine.start_location} onChange={e => setNewLine({...newLine, start_location: e.target.value})} style={{width:'100%', background:'var(--noir-subtle)', border:'0.5px solid var(--noir-border)', color:'var(--ivory)', padding:'10px', marginTop:'6px'}} />
                </div>
                <div style={{flex:1}}>
                  <label style={{fontSize:'10px', color:'var(--ivory-60)', textTransform:'uppercase', letterSpacing:'0.1em'}}>Destination City</label>
                  <input required type="text" placeholder="e.g. Sousse" value={newLine.end_location} onChange={e => setNewLine({...newLine, end_location: e.target.value})} style={{width:'100%', background:'var(--noir-subtle)', border:'0.5px solid var(--noir-border)', color:'var(--ivory)', padding:'10px', marginTop:'6px'}} />
                </div>
              </div>
              
              <div style={{height:'300px', width:'100%', overflow:'hidden', border:'0.5px solid var(--noir-border)'}}>
                <TripMapPicker onRouteSelected={handleRouteSelected} />
              </div>

              <div style={{borderTop:'0.5px solid var(--noir-border)', pt:'20px'}}>
                <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'12px'}}>
                  <label style={{fontSize:'10px', color:'var(--gold)', textTransform:'uppercase', letterSpacing:'0.1em'}}>Supported Services</label>
                  <button type="button" onClick={addServiceField} style={{background:'none', border:'0.5px solid var(--gold)', color:'var(--gold)', fontSize:'9px', padding:'4px 8px', cursor:'pointer'}}>+ Add Service</button>
                </div>
                
                <div style={{display:'flex', flexDirection:'column', gap:'10px'}}>
                  {newLine.services.map((s, idx) => (
                    <div key={idx} style={{background:'rgba(255,255,255,0.02)', padding:'16px', border:'0.5px solid rgba(255,255,255,0.05)', position:'relative'}}>
                      {idx > 0 && <button type="button" onClick={() => removeServiceField(idx)} style={{position:'absolute', top:'8px', right:'8px', color:'rgba(255,0,0,0.5)', background:'none', border:'none', cursor:'pointer'}}>✕</button>}
                      <div style={{display:'flex', flexDirection:'column', gap:'16px', marginBottom:'20px'}}>
                        <div>
                          <label style={{fontSize:'9px', color:'var(--ivory-30)', textTransform:'uppercase', letterSpacing:'0.1em', display:'block', marginBottom:'8px'}}>Rapidity (Tiers)</label>
                          <div style={{display:'flex', gap:'8px'}}>
                            {[
                              { id: 'Standard', icon: Truck, label: 'Standard' },
                              { id: 'Fast', icon: Clock, label: 'Fast' },
                              { id: 'Express', icon: CarFront, label: 'Express' },
                              { id: 'Urgent', icon: ShieldCheck, label: 'Urgent' }
                            ].map(tier => (
                              <div 
                                key={tier.id}
                                onClick={() => updateServiceField(idx, 'type', tier.id)}
                                style={{
                                  flex:1, 
                                  padding:'12px', 
                                  background: s.type === tier.id ? 'var(--gold-bg)' : 'rgba(255,255,255,0.02)',
                                  border: s.type === tier.id ? '1px solid var(--gold)' : '0.5px solid var(--noir-border)',
                                  borderRadius: '4px',
                                  textAlign:'center',
                                  cursor:'pointer',
                                  transition: '0.2s'
                                }}
                              >
                                <tier.icon size={16} style={{color: s.type === tier.id ? 'var(--gold)' : 'var(--ivory-30)', marginBottom:'4px'}} />
                                <div style={{fontSize:'10px', color: s.type === tier.id ? 'var(--gold)' : 'var(--ivory-60)', fontWeight:'bold'}}>{tier.label}</div>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div style={{display:'flex', gap:'20px', alignItems:'flex-end'}}>
                          <div style={{flex:1}}>
                            <label style={{fontSize:'9px', color:'var(--ivory-30)', textTransform:'uppercase', letterSpacing:'0.1em'}}>Service Cost (€)</label>
                            <input type="number" value={s.cost} onChange={e => updateServiceField(idx, 'cost', e.target.value)} style={{width:'100%', background:'var(--noir-subtle)', border:'0.5px solid var(--noir-border)', color:'var(--ivory)', padding:'10px', marginTop:'6px'}} />
                          </div>
                          
                          <div style={{flex:1}}>
                            <label style={{fontSize:'9px', color:'var(--ivory-30)', textTransform:'uppercase', letterSpacing:'0.1em', display:'block', marginBottom:'6px'}}>Delivery Window (ETA)</label>
                            <div style={{display:'flex', alignItems:'center', background:'var(--noir-subtle)', border:'0.5px solid var(--noir-border)', padding:'4px'}}>
                              <button type="button" onClick={() => adjustEtaDays(idx, -1)} style={{width:'32px', height:'32px', background:'rgba(255,255,255,0.05)', border:'none', color:'var(--ivory)', cursor:'pointer'}}>–</button>
                              <div style={{flex:1, textAlign:'center', fontSize:'12px', color:'var(--ivory)', fontWeight:'bold'}}>{s.eta}</div>
                              <button type="button" onClick={() => adjustEtaDays(idx, 1)} style={{width:'32px', height:'32px', background:'rgba(255,255,255,0.05)', border:'none', color:'var(--ivory)', cursor:'pointer'}}>+</button>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div>
                        <label style={{fontSize:'9px', color:'var(--ivory-30)', textTransform:'uppercase', letterSpacing:'0.1em', display:'block', marginBottom:'12px'}}>Nature of Delivery (Attributes)</label>
                        <div style={{display:'flex', flexWrap:'wrap', gap:'8px'}}>
                          {NATURE_OPTIONS.map(opt => {
                            const isActive = s.nature.includes(opt);
                            return (
                              <div 
                                key={opt} 
                                onClick={() => {
                                  const currentNature = [...s.nature];
                                  const updatedNature = isActive 
                                    ? currentNature.filter(n => n !== opt)
                                    : [...currentNature, opt];
                                  updateServiceField(idx, 'nature', updatedNature);
                                }}
                                style={{
                                  fontSize:'10px', 
                                  padding:'6px 12px', 
                                  background: isActive ? 'rgba(111,207,151,0.1)' : 'transparent',
                                  border: isActive ? '1px solid #6FCF97' : '0.5px solid var(--noir-border)',
                                  color: isActive ? '#6FCF97' : 'var(--ivory-30)',
                                  borderRadius: '20px',
                                  cursor:'pointer',
                                  transition: '0.2s',
                                  userSelect: 'none'
                                }}
                              >
                                {isActive && <span style={{marginRight:'5px'}}>✓</span>}
                                {opt}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              <button 
                type="submit" 
                className="topbar-btn" 
                style={{marginTop:'12px', padding:'16px', background:'var(--gold)', color:'black', fontWeight:'900'}}
              >
                Register Service Line
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Registration Modal Overlay */}
      {isRegistering && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 10000,
          display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)'
        }}>
          <div style={{
            background: 'var(--noir-muted)', border: '0.5px solid var(--gold-border)',
            width: '400px', padding: '24px', position: 'relative'
          }} className="fade-in">
            <button 
              onClick={() => setIsRegistering(false)}
              style={{position:'absolute', top:'20px', right:'20px', background:'none', border:'none', color:'var(--ivory-60)', cursor:'pointer'}}
            >
              <X size={18} />
            </button>
            <div style={{fontFamily:'Playfair Display, serif', fontSize:'18px', color:'var(--gold)', marginBottom:'18px'}}>
              Register Vehicle
            </div>
            <form onSubmit={handleRegisterSubmit} style={{display:'flex', flexDirection:'column', gap:'12px'}}>
              <div>
                <label style={{fontSize:'10px', color:'var(--ivory-60)', textTransform:'uppercase', letterSpacing:'0.1em'}}>Type</label>
                <select 
                  value={newVehicle.type} onChange={e => setNewVehicle({...newVehicle, type: e.target.value})}
                  style={{width:'100%', background:'var(--noir-subtle)', border:'0.5px solid var(--noir-border)', color:'var(--ivory)', padding:'10px', marginTop:'6px'}}
                >
                  <option>Armored Sprinter</option>
                  <option>Climate Van</option>
                  <option>White-Glove Sedan</option>
                  <option>Express Courier</option>
                  <option>Standard Van</option>
                </select>
              </div>
              <div>
                <label style={{fontSize:'10px', color:'var(--ivory-60)', textTransform:'uppercase', letterSpacing:'0.1em'}}>Make & Model</label>
                <input 
                  required
                  type="text" 
                  placeholder="e.g. Mercedes Sprinter"
                  value={newVehicle.make_model} onChange={e => setNewVehicle({...newVehicle, make_model: e.target.value})}
                  style={{width:'100%', background:'var(--noir-subtle)', border:'0.5px solid var(--noir-border)', color:'var(--ivory)', padding:'10px', marginTop:'6px', outline:'none'}}
                />
              </div>
              <div>
                <label style={{fontSize:'10px', color:'var(--ivory-60)', textTransform:'uppercase', letterSpacing:'0.1em'}}>Registration Plate</label>
                <input 
                  required
                  type="text" 
                  placeholder="e.g. 75-MT-009"
                  value={newVehicle.registration} onChange={e => setNewVehicle({...newVehicle, registration: e.target.value})}
                  style={{width:'100%', background:'var(--noir-subtle)', border:'0.5px solid var(--noir-border)', color:'var(--gold)', padding:'10px', marginTop:'6px', outline:'none', letterSpacing:'0.15em'}}
                />
              </div>
              <button type="submit" className="topbar-btn" style={{marginTop:'12px', padding:'12px'}}>Confirm Registration</button>
            </form>
          </div>
        </div>
      )}

      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="logo-mark">MT</div>
          <div className="logo-text">Maison <span>Tissue</span></div>
        </div>

        <div className="sidebar-section-label">Main</div>
        <div className={`nav-item ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}>
          <LayoutDashboard className="nav-icon" /> Overview
        </div>
        <div className={`nav-item ${activeTab === 'orders' ? 'active' : ''}`} onClick={() => setActiveTab('orders')}>
          <Package className="nav-icon" /> Order Handling
          <span className="nav-badge-count">3</span>
        </div>
        <div className={`nav-item ${activeTab === 'trips' ? 'active' : ''}`} onClick={() => setActiveTab('trips')}>
          <Map className="nav-icon" /> Active Trips
        </div>
        <div className={`nav-item ${activeTab === 'fleet' ? 'active' : ''}`} onClick={() => setActiveTab('fleet')}>
          <Truck className="nav-icon" /> Fleet
        </div>

        <div className="sidebar-section-label">Operations</div>
        <div className={`nav-item ${activeTab === 'scan' ? 'active' : ''}`} onClick={() => setActiveTab('scan')}>
          <ScanLine className="nav-icon" /> Scan & Auth
        </div>
        <div className={`nav-item ${activeTab === 'climate' ? 'active' : ''}`} onClick={() => setActiveTab('climate')}>
          <Thermometer className="nav-icon" /> Climate Logs
        </div>
        <div className={`nav-item ${activeTab === 'compliance' ? 'active' : ''}`} onClick={() => setActiveTab('compliance')}>
          <ShieldCheck className="nav-icon" /> Compliance Docs
        </div>
        <div className={`nav-item ${activeTab === 'history' ? 'active' : ''}`} onClick={() => setActiveTab('history')}>
          <History className="nav-icon" /> History
        </div>

        <div className="sidebar-bottom">
          <div className="driver-card">
            <div className="driver-avatar">MD</div>
            <div>
              <div className="driver-name">Marc Dupont</div>
              <div className="driver-role">Paris Hub · Driver</div>
            </div>
            <div className="duty-dot has-tip">
              <span className="tip">On duty</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="main-area">
        {/* Topbar */}
        <div className="topbar">
          <div className="topbar-title">{pageTitles[activeTab]}</div>
          <div className="topbar-right">
            <div className="topbar-time">{currentTime}</div>
            <div className="topbar-notif has-tip" style={{position:'relative', cursor:'pointer'}} onClick={() => setShowNotifs(!showNotifs)}>
              <Bell size={16} />
              <div className="notif-dot"></div>
              {showNotifs && (
                <div style={{position:'absolute', top:'100%', right:'0', marginTop:'12px', background:'var(--noir-muted)', border:'0.5px solid var(--noir-border)', width:'300px', borderRadius:'4px', zIndex:1000, boxShadow:'0 10px 20px rgba(0,0,0,0.8)'}} className="fade-in">
                  <div style={{padding:'12px', borderBottom:'0.5px solid var(--noir-border)', color:'var(--gold)', fontSize:'12px', letterSpacing:'0.1em'}}>NOTIFICATIONS (3)</div>
                  <div style={{display:'flex', flexDirection:'column'}}>
                    <div style={{padding:'16px', borderBottom:'0.5px solid var(--noir-border)'}}>
                      <div style={{fontSize:'12px', color:'var(--ivory)', marginBottom:'4px'}}>⚠️ Temperature Warning</div>
                      <div style={{fontSize:'10px', color:'var(--ivory-60)'}}>T-0043 (Scented candles) approaching 26.5°C threshold.</div>
                    </div>
                    <div style={{padding:'16px', borderBottom:'0.5px solid var(--noir-border)'}}>
                      <div style={{fontSize:'12px', color:'var(--ivory)', marginBottom:'4px'}}>✅ Delivery Completed</div>
                      <div style={{fontSize:'10px', color:'var(--ivory-60)'}}>Ord. ORD-901 confirmed by recipient (Chanel Hub).</div>
                    </div>
                    <div style={{padding:'16px'}}>
                      <div style={{fontSize:'12px', color:'var(--ivory)', marginBottom:'4px'}}>🚚 Dispatch Ready</div>
                      <div style={{fontSize:'10px', color:'var(--ivory-60)'}}>2 new pending orders require assignment.</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <button className="topbar-btn" onClick={() => setIsCreatingLine(true)}>+ New Line</button>
          </div>
        </div>

        {/* Content area */}
        <div className="content-area">

          {/* PAGE: Overview */}
          <div className={`page ${activeTab === 'overview' ? 'active' : ''}`}>
            {/* KPIs */}
            <div className="kpi-row">
              <div className="kpi-card fade-in d1">
                <div className="kpi-label">Active trips</div>
                <div className="kpi-val">{kpis ? kpis.trips.active : '--'}</div>
                <div className="kpi-sub">2 en route · 1 pending</div>
                <div className="kpi-trend">↑ Live</div>
              </div>
              <div className="kpi-card fade-in d2">
                <div className="kpi-label">Deliveries today</div>
                <div className="kpi-val">{kpis ? kpis.trips.completed + kpis.trips.active : '--'}</div>
                <div className="kpi-sub">5 completed · 2 remaining</div>
              </div>
              <div className="kpi-card fade-in d3">
                <div className="kpi-label">Fleet online</div>
                <div className="kpi-val">{kpis ? `${kpis.fleet.active + kpis.fleet.available}/${kpis.fleet.total}` : '--/--'}</div>
                <div className="kpi-sub">{kpis ? kpis.fleet.idle : '--'} vehicles idle</div>
              </div>
              <div className="kpi-card fade-in d4">
                <div className="kpi-label">On-time rate</div>
                <div className="kpi-val">98%</div>
                <div className="kpi-sub">Last 30 days</div>
                <div className="kpi-trend" style={{color:'#6FCF97'}}>↑ +2%</div>
              </div>
            </div>

            {/* Main grid */}
            <div className="grid-2-3 fade-in d5">
              {/* Left: Active trips + pending orders */}
              <div style={{display:'flex', flexDirection:'column', gap:'16px'}}>

                <div className="panel">
                  <div className="panel-header">
                    <div className="panel-title">Active trips</div>
                    <button className="panel-action" onClick={() => setActiveTab('trips')}>View all ›</button>
                  </div>
                  <div className="order-list">
                    {trips.length === 0 ? <div style={{padding:'20px', color:'var(--ivory-30)', fontSize:'12px'}}>No active trips found.</div> : trips.map(t => (
                      <div className="order-row" key={t._id}>
                        <div className="order-indicator ind-live"></div>
                        <div className={`order-type-badge badge-${t.type?.toLowerCase() || 'garment'}`}>{t.type}</div>
                        <div className="order-info">
                          <div className="order-id">{t.trip_id}</div>
                          <div className="order-route">{t.route}</div>
                          <div className="order-meta">{t.driver} · ETA {t.eta}</div>
                        </div>
                        <div className="order-progress">
                          <div className="progress-mini"><div className="progress-fill" style={{width:`${t.progress}%`}}></div></div>
                          <div className="progress-pct">{t.progress}%</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="panel">
                  <div className="panel-header">
                    <div className="panel-title">Pending order requests</div>
                    <button className="panel-action" onClick={() => setActiveTab('orders')}>View all ›</button>
                  </div>
                  <div className="order-list">
                    {orders.length === 0 ? <div style={{padding:'20px', color:'var(--ivory-30)', fontSize:'12px'}}>No pending orders.</div> : orders.map(o => (
                      <div className="pending-row" key={o._id}>
                        <div className={`priority-tag p-${o.priority?.toLowerCase() || 'normal'}`}>{o.priority}</div>
                        <div className="pending-info">
                          <div className="pending-id">{o.order_id}</div>
                          <div className="pending-route">{o.route}</div>
                          <div className="pending-house">{o.house} · {o.type}</div>
                        </div>
                        <button className="accept-btn">Accept</button>
                      </div>
                    ))}
                  </div>
                </div>

              </div>

              {/* Right column */}
              <div style={{display:'flex', flexDirection:'column', gap:'16px'}}>
                <div className="panel">
                  <div className="panel-header">
                    <div className="panel-title">Live map</div>
                    <span style={{fontSize:'9px', letterSpacing:'0.12em', color:'#6FCF97'}}>● Live Tracking</span>
                  </div>
                  <div className="map-wrap">
                    <div className="map-grid"></div>
                    <div className="map-overlay-label" style={{display:'flex', gap:'6px', alignItems:'center'}}>
                      <MapPin size={10} /> Paris Region
                    </div>
                    <svg width="100%" height="100%" viewBox="0 0 340 220" style={{position:'absolute', inset:0}}>
                      <defs>
                        <marker id="a" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
                          <path d="M2 1L8 5L2 9" fill="none" stroke="context-stroke" strokeWidth="1.5"/>
                        </marker>
                      </defs>
                      <path d="M30 180 Q90 120 170 90 Q220 72 290 40" fill="none" stroke="#C6A75E" strokeWidth="1" strokeDasharray="5 4" opacity="0.55" markerEnd="url(#a)"/>
                      <circle cx="170" cy="90" r="5" fill="#C6A75E" opacity="0.95"/>
                      <circle cx="170" cy="90" r="11" fill="none" stroke="#C6A75E" strokeWidth="0.5" opacity="0.3"/>
                    </svg>
                  </div>
                  <div className="panel-body" style={{padding:'10px 18px'}}>
                    <div style={{display:'flex', gap:'16px'}}>
                      <div>
                        <div style={{fontSize:'9px', color:'var(--ivory-30)', letterSpacing:'0.1em', marginBottom:'2px'}}>Next ETA</div>
                        <div style={{fontSize:'12px', color:'var(--ivory)'}}>T-0041 · 14:30</div>
                      </div>
                      <div style={{width:'0.5px', background:'var(--noir-border)'}}></div>
                      <div>
                        <div style={{fontSize:'9px', color:'var(--ivory-30)', letterSpacing:'0.1em', marginBottom:'2px'}}>Climate</div>
                        <div style={{fontSize:'12px', color:'#6FCF97'}}>Optimal</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Quick Actions */}
            <div className="panel fade-in d6">
              <div className="panel-header">
                <div className="panel-title">Quick actions</div>
              </div>
              <div className="panel-body">
                <div className="qaction-grid">
                  <div className="qaction" onClick={() => setIsCreatingLine(true)}>
                    <Map className="qa-icon" style={{color: 'var(--gold)'}} />
                    <div className="qa-label">Generate Line</div>
                    <div className="qa-sub">Register new service routes</div>
                  </div>
                  <div className="qaction" onClick={() => setActiveTab('scan')}>
                    <ScanLine className="qa-icon" style={{color: 'var(--ivory)'}} />
                    <div className="qa-label">Scan garment tag</div>
                    <div className="qa-sub">NFC / QR — opens chain-of-custody</div>
                  </div>
                  <div className="qaction" onClick={() => setIsRegistering(true)}>
                    <CarFront className="qa-icon" style={{color: '#6FCF97'}} />
                    <div className="qa-label">Register Vehicle</div>
                    <div className="qa-sub">Expand your fleet configuration</div>
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* PAGE: Fleet */}
          <div className={`page ${activeTab === 'fleet' ? 'active' : ''}`}>
             <div className="kpi-row">
              <div className="kpi-card fade-in d1"><div className="kpi-label">Total vehicles (Mongo)</div><div className="kpi-val">{kpis ? kpis.fleet.total : 0}</div><div className="kpi-sub">Registered</div></div>
              <div className="kpi-card fade-in d2"><div className="kpi-label">En route</div><div className="kpi-val">{kpis ? kpis.fleet.active : 0}</div><div className="kpi-sub">Active delivery</div></div>
              <div className="kpi-card fade-in d3"><div className="kpi-label">Available</div><div className="kpi-val">{kpis ? kpis.fleet.available : 0}</div><div className="kpi-sub">Ready to assign</div></div>
              <div className="kpi-card fade-in d4"><div className="kpi-label">Idle / Blocked</div><div className="kpi-val">{kpis ? kpis.fleet.idle + kpis.fleet.maintenance : 0}</div><div className="kpi-sub">Requires attention</div></div>
            </div>
            <div className="panel fade-in d5">
              <div className="panel-header">
                <div className="panel-title">MongoDB Fleet Registry</div>
                <button className="panel-action" onClick={() => setIsRegistering(true)}>
                  <Plus size={10} style={{display:'inline', marginBottom:'-2px'}}/> Register vehicle
                </button>
              </div>
              <div className="panel-body" style={{padding:0}}>
                <div style={{display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'1px', background:'var(--noir-border)'}}>
                  
                  {vehicles.length === 0 && !loading && (
                    <div style={{padding:'40px', gridColumn:'1/-1', textAlign:'center', color:'var(--ivory-30)'}}>
                      <CarFront size={32} style={{margin:'0 auto 12px', opacity:0.3}} />
                      No vehicles found in database.<br/>Register a vehicle to populate your fleet.
                    </div>
                  )}

                  {loading && (
                    <div style={{padding:'40px', gridColumn:'1/-1', textAlign:'center', color:'var(--gold)'}}>
                      Loading fleet from MongoDB...
                    </div>
                  )}

                  {vehicles.map((v, i) => (
                    <div key={v._id || i} style={{background:'var(--noir-muted)', padding:'20px'}}>
                      <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'14px'}}>
                        <div style={{width:'38px', height:'38px', border:'0.5px solid var(--gold-border)', display:'flex', alignItems:'center', justifyContent:'center'}}>
                          {v.type.includes('Van') || v.type.includes('Sprinter') ? <Truck size={18} color="var(--gold)" /> : <CarFront size={18} color="var(--ivory)" />}
                        </div>
                        <span className={`fleet-status-pill ${
                          v.status === 'En route' ? 'st-enroute' : 
                          v.status === 'Available' ? 'st-active' : 'st-idle'
                        }`}>{v.status}</span>
                      </div>
                      <div style={{fontFamily:'"Playfair Display",serif', fontSize:'14px', color:'var(--ivory)', marginBottom:'3px'}}>{v.type}</div>
                      <div style={{fontSize:'10px', color:'var(--ivory-30)', marginBottom:'14px'}}>{v.make_model} · REG: {v.registration}</div>
                      <div style={{height:'0.5px', background:'var(--noir-border)', marginBottom:'12px'}}></div>
                      <div style={{fontSize:'9px', color:'var(--ivory-60)'}}> ID: {v.vehicle_id}</div>
                    </div>
                  ))}

                  <div 
                    style={{background:'var(--noir-muted)', padding:'20px', border:'0.5px dashed rgba(198,167,94,0.15)', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', textAlign:'center', cursor:'pointer', minHeight:'160px'}} 
                    onClick={() => setIsRegistering(true)}
                  >
                    <Plus size={24} style={{color:'rgba(198,167,94,0.3)', marginBottom:'8px'}} />
                    <div style={{fontSize:'9px', letterSpacing:'0.15em', textTransform:'uppercase', color:'rgba(198,167,94,0.35)'}}>Register vehicle</div>
                  </div>

                </div>
              </div>
            </div>
          </div>

          {/* PAGE: Scan */}
          <div className={`page ${activeTab === 'scan' ? 'active' : ''}`}>
             <div className="panel fade-in d1" style={{maxWidth:'520px', margin:'0 auto', width:'100%'}}>
              <div className="panel-header"><div className="panel-title">Scan & Authenticate Garment</div></div>
              <div className="panel-body" style={{textAlign:'center', padding:'36px 24px'}}>
                <div style={{width:'120px', height:'120px', border:'0.5px solid var(--gold-border)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 24px', position:'relative'}}>
                  <div style={{position:'absolute', inset:0, border:'0.5px solid rgba(198,167,94,0.08)', transform:'scale(1.08)'}}></div>
                  <ScanLine size={42} color="var(--gold)" />
                </div>
                <div style={{fontFamily:'"Playfair Display",serif', fontSize:'18px', color:'var(--ivory)', marginBottom:'8px'}}>NFC / QR Scan</div>
                <div style={{fontSize:'12px', color:'var(--ivory-30)', marginBottom:'28px', lineHeight:'1.7'}}>Hold the device near the garment's embedded authentication tag.</div>
                <button 
                  className="topbar-btn" 
                  style={{width:'100%', padding:'14px', fontSize:'11px', letterSpacing:'0.15em', background: isRegistering ? '#6FCF97' : ''}}
                  onClick={() => {
                    const btn = document.activeElement;
                    if(btn) {
                      btn.innerText = "Scanning...";
                      setTimeout(() => { btn.innerText = "Matched: Garment ID T-X902"; btn.style.background = "#6FCF97"; btn.style.color = "#000"; }, 1500);
                    }
                  }}
                >
                  Initiate NFC Scan
                </button>
              </div>
            </div>
          </div>

          {/* PAGE: Orders (Transport Missions) */}
          <div className={`page ${activeTab === 'orders' ? 'active' : ''}`}>
            <div className="panel fade-in d1">
              <div className="panel-header">
                <div className="panel-title">Missions de Transport (Atelier Workflow)</div>
                <button className="panel-action" onClick={fetchShipments}><Clock size={10} style={{display:'inline', marginBottom:'-2px'}}/> Refresh</button>
              </div>
              <div className="panel-body" style={{padding:0}}>
                {shipments.length === 0 ? (
                  <div style={{padding:'40px', textAlign:'center', color:'var(--ivory-30)'}}>
                    <Truck size={32} style={{margin:'0 auto 12px', opacity:0.3}} />
                    Aucune mission de transport en attente.<br/>Les commandes fabric provenant des ateliers s'afficheront ici.
                  </div>
                ) : (
                  <div className="order-list">
                    {shipments.map(s => (
                      <div className="order-row" key={s.id} style={{padding:'20px', borderBottom:'0.5px solid var(--noir-border)'}}>
                        <div className={`order-indicator ${s.status === 'pending' ? 'ind-pending' : 'ind-live'}`}></div>
                        <div className="order-info">
                          <div className="order-id" style={{color:'var(--gold)'}}>MISSION #{s.id}</div>
                          <div className="order-route" style={{color:'var(--ivory)', fontSize:'14px', margin:'4px 0'}}>{s.source_name} → {s.dest_name}</div>
                          <div className="order-meta">Status: <span style={{textTransform:'uppercase', fontWeight:'bold'}}>{s.status.replace('_', ' ')}</span></div>
                        </div>
                        <div style={{marginLeft:'auto', textAlign:'right', display:'flex', alignItems:'center', gap:'20px'}}>
                           <div style={{textAlign:'right'}}>
                              <div style={{fontSize:'8px', color:'var(--ivory-30)', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:'4px'}}>Itinéraire</div>
                              <div style={{color:'var(--gold)', fontSize:'11px', fontWeight:'bold'}}>{s.route_details?.start_location || 'Nice'} → {s.route_details?.end_location || 'Sousse'}</div>
                           </div>

                           <div style={{display:'flex', gap:'8px'}}>
                              {s.status === 'pending' && (
                                <>
                                  <button onClick={() => updateShipmentStatus(s.id, 'accepted')} style={{background:'var(--gold)', color:'black', padding:'8px 16px', borderRadius:'2px', fontSize:'9px', fontWeight:'900', border:'none', cursor:'pointer'}}>ACCEPTER MISSION</button>
                                  <button onClick={() => updateShipmentStatus(s.id, 'cancelled')} style={{background:'rgba(255,0,0,0.1)', color:'#FF4D4D', padding:'8px 16px', borderRadius:'2px', fontSize:'9px', fontWeight:'900', border:'1px solid rgba(255,0,0,0.2)', cursor:'pointer'}}>DÉCLINER</button>
                                </>
                              )}

                              {s.status === 'accepted' && (
                                <button onClick={() => updateShipmentStatus(s.id, 'picked_up')} style={{background:'var(--ivory)', color:'black', padding:'8px 16px', borderRadius:'2px', fontSize:'9px', fontWeight:'900', border:'none', cursor:'pointer'}}>CONFIRMER ENLÈVEMENT</button>
                              )}

                              {s.status === 'picked_up' && (
                                <button onClick={() => updateShipmentStatus(s.id, 'in_transit')} style={{background:'transparent', color:'var(--gold)', padding:'8px 16px', borderRadius:'2px', fontSize:'9px', fontWeight:'900', border:'1px solid var(--gold)', cursor:'pointer'}}>DÉMARRER TRANSIT</button>
                              )}

                              {s.status === 'in_transit' && (
                                <button onClick={() => updateShipmentStatus(s.id, 'delivered')} style={{background:'rgba(111,207,151,0.15)', color:'#6FCF97', padding:'8px 16px', borderRadius:'2px', fontSize:'9px', fontWeight:'900', border:'1px solid #6FCF97', cursor:'pointer', animation:'pulse 2s infinite'}}>S'ANNONCER À L'ATELIER</button>
                              )}

                              {s.status === 'delivered' && (
                                <div style={{background:'rgba(255,255,255,0.05)', color:'var(--ivory-30)', padding:'8px 16px', borderRadius:'2px', fontSize:'9px', fontWeight:'900', textTransform:'uppercase'}}>En attente confirmation client</div>
                              )}

                              {s.status === 'cancelled' && (
                                <div style={{color:'rgba(255,0,0,0.4)', fontSize:'9px', fontWeight:'900', textTransform:'uppercase'}}>Mission Annulée</div>
                              )}
                           </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* PAGE: Climate */}
          <div className={`page ${activeTab === 'climate' ? 'active' : ''}`}>
            <div className="panel fade-in d1">
              <div className="panel-header"><div className="panel-title">Environmental Telemetry Logs</div></div>
              <div className="panel-body" style={{padding:0}}>
                <div style={{padding:'20px', display:'grid', gridTemplateColumns:'1fr 1fr', gap:'20px'}}>
                  
                  {/* Category 1 */}
                  <div style={{background:'var(--noir-muted)', border:'0.5px solid var(--noir-border)', padding:'24px', borderRadius:'4px', gridColumn:'1/-1'}}>
                    <div style={{fontSize:'16px', color:'var(--gold)', fontFamily:'"Playfair Display",serif', marginBottom:'16px'}}>Paper & Tissue-Based Products</div>
                    <div style={{display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'12px'}}>
                      <div style={{background:'rgba(255,255,255,0.03)', border:'1px solid rgba(111,207,151,0.2)', padding:'16px', borderRadius:'4px'}}>
                        <div style={{fontSize:'13px', color:'var(--ivory)'}}>Luxury tissues</div>
                        <div style={{fontSize:'10px', color:'var(--ivory-30)', marginTop:'4px'}}>Req: 15°C – 25°C (&lt; 60% Hum)</div>
                        <div style={{fontSize:'18px', color:'#6FCF97', marginTop:'12px', fontFamily:'"Playfair Display",serif'}}>20.4°C<span style={{fontSize:'12px', paddingLeft:'8px'}}>41% Hum</span></div>
                      </div>
                      <div style={{background:'rgba(255,255,255,0.03)', border:'1px solid rgba(111,207,151,0.2)', padding:'16px', borderRadius:'4px'}}>
                        <div style={{fontSize:'13px', color:'var(--ivory)'}}>Wet wipes & baby wipes</div>
                        <div style={{fontSize:'10px', color:'var(--ivory-30)', marginTop:'4px'}}>Req: 10°C – 30°C (prevent dry/freeze)</div>
                        <div style={{fontSize:'18px', color:'#6FCF97', marginTop:'12px', fontFamily:'"Playfair Display",serif'}}>19.2°C<span style={{fontSize:'12px', paddingLeft:'8px'}}>55% Hum</span></div>
                      </div>
                      <div style={{background:'rgba(255,255,255,0.03)', border:'1px solid rgba(242,153,74,0.4)', padding:'16px', borderRadius:'4px'}}>
                        <div style={{fontSize:'13px', color:'var(--ivory)'}}>Paper towels w/ lotion</div>
                        <div style={{fontSize:'10px', color:'var(--ivory-30)', marginTop:'4px'}}>Req: 15°C – 25°C</div>
                        <div style={{fontSize:'18px', color:'#F2994A', marginTop:'12px', fontFamily:'"Playfair Display",serif'}}>25.1°C<span style={{fontSize:'12px', paddingLeft:'8px'}}>48% Hum</span></div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Category 2 */}
                  <div style={{background:'var(--noir-muted)', border:'0.5px solid var(--noir-border)', padding:'24px', borderRadius:'4px'}}>
                    <div style={{fontSize:'16px', color:'var(--gold)', fontFamily:'"Playfair Display",serif', marginBottom:'16px'}}>Similar Soft Goods</div>
                    <div style={{display:'flex', flexDirection:'column', gap:'12px'}}>
                      <div style={{background:'rgba(255,255,255,0.03)', border:'0.5px solid var(--noir-border)', borderLeft:'3px solid #6FCF97', padding:'12px 16px', display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                        <div><div style={{fontSize:'12px', color:'var(--ivory)'}}>Cotton pads & rounds</div><div style={{fontSize:'10px', color:'var(--ivory-60)', marginTop:'2px'}}>Req: 15°C – 25°C</div></div>
                        <div style={{fontSize:'16px', color:'#6FCF97', fontFamily:'"Playfair Display",serif'}}>19.8°C</div>
                      </div>
                      <div style={{background:'rgba(255,255,255,0.03)', border:'0.5px solid var(--noir-border)', borderLeft:'3px solid #6FCF97', padding:'12px 16px', display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                        <div><div style={{fontSize:'12px', color:'var(--ivory)'}}>Facial masks (sheets)</div><div style={{fontSize:'10px', color:'var(--ivory-60)', marginTop:'2px'}}>Req: 10°C – 25°C</div></div>
                        <div style={{fontSize:'16px', color:'#6FCF97', fontFamily:'"Playfair Display",serif'}}>16.4°C</div>
                      </div>
                      <div style={{background:'rgba(255,255,255,0.03)', border:'0.5px solid var(--noir-border)', borderLeft:'3px solid #6FCF97', padding:'12px 16px', display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                        <div><div style={{fontSize:'12px', color:'var(--ivory)'}}>Disposable gloves</div><div style={{fontSize:'10px', color:'var(--ivory-60)', marginTop:'2px'}}>Req: 10°C – 30°C</div></div>
                        <div style={{fontSize:'16px', color:'#6FCF97', fontFamily:'"Playfair Display",serif'}}>21.0°C</div>
                      </div>
                    </div>
                  </div>

                  {/* Category 3 */}
                  <div style={{background:'var(--noir-muted)', border:'0.5px solid var(--noir-border)', padding:'24px', borderRadius:'4px'}}>
                    <div style={{fontSize:'16px', color:'var(--gold)', fontFamily:'"Playfair Display",serif', marginBottom:'16px'}}>Packaging-Sensitive</div>
                    <div style={{display:'flex', flexDirection:'column', gap:'12px'}}>
                      <div style={{background:'rgba(255,255,255,0.03)', border:'0.5px solid var(--noir-border)', borderLeft:'3px solid #F2994A', padding:'12px 16px', display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                        <div><div style={{fontSize:'12px', color:'var(--ivory)'}}>Scented candles</div><div style={{fontSize:'10px', color:'var(--ivory-60)', marginTop:'2px'}}>Req: &lt; 27°C (Prevent melt)</div></div>
                        <div style={{fontSize:'16px', color:'#F2994A', fontFamily:'"Playfair Display",serif'}}>26.5°C</div>
                      </div>
                      <div style={{background:'rgba(255,255,255,0.03)', border:'0.5px solid var(--noir-border)', borderLeft:'3px solid #6FCF97', padding:'12px 16px', display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                        <div><div style={{fontSize:'12px', color:'var(--ivory)'}}>Luxury soaps</div><div style={{fontSize:'10px', color:'var(--ivory-60)', marginTop:'2px'}}>Req: 10°C – 25°C (no sweat)</div></div>
                        <div style={{fontSize:'16px', color:'#6FCF97', fontFamily:'"Playfair Display",serif'}}>22.1°C</div>
                      </div>
                      <div style={{background:'rgba(255,255,255,0.03)', border:'0.5px solid var(--noir-border)', borderLeft:'3px solid #6FCF97', padding:'12px 16px', display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                        <div><div style={{fontSize:'12px', color:'var(--ivory)'}}>Cosmetic creams</div><div style={{fontSize:'10px', color:'var(--ivory-60)', marginTop:'2px'}}>Req: 15°C – 25°C</div></div>
                        <div style={{fontSize:'16px', color:'#6FCF97', fontFamily:'"Playfair Display",serif'}}>20.9°C</div>
                      </div>
                    </div>
                  </div>

                </div>
              </div>
            </div>
          </div>
          <div className={`page ${activeTab === 'compliance' ? 'active' : ''}`}><div className="panel"><div className="panel-body">Compliance system placeholder</div></div></div>
          <div className={`page ${activeTab === 'history' ? 'active' : ''}`}><div className="panel"><div className="panel-body">History log placeholder</div></div></div>
          
          <div className={`page ${activeTab === 'trips' ? 'active' : ''}`}>
            <div className="panel fade-in d1">
              <div className="panel-header">
                <div className="panel-title">Service Lines Registry (SQL)</div>
                <button className="panel-action" onClick={() => setIsCreatingLine(true)}>
                  <Plus size={10} style={{display:'inline', marginBottom:'-2px'}}/> New Line
                </button>
              </div>
              <div className="panel-body" style={{padding:0}}>
                <div style={{display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:'1px', background:'var(--noir-border)'}}>
                  {routes.length === 0 ? (
                    <div style={{padding:'40px', gridColumn:'1/-1', textAlign:'center', color:'var(--ivory-30)'}}>No service lines defined.</div>
                  ) : routes.map(r => (
                    <div key={r.id} style={{background:'var(--noir-muted)', padding:'24px'}}>
                      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'16px'}}>
                        <div style={{fontFamily:'"Playfair Display",serif', fontSize:'22px', color:'var(--gold)'}}>{r.start_location} → {r.end_location}</div>
                        <div style={{fontSize:'10px', color:'var(--ivory-30)', textTransform:'uppercase', letterSpacing:'0.2em'}}>Active Route</div>
                      </div>
                      
                      <div style={{display:'flex', flexDirection:'column', gap:'12px'}}>
                        {r.services?.map((s, idx) => (
                          <div key={idx} style={{background:'rgba(255,255,255,0.02)', border:'0.5px solid rgba(198,167,94,0.1)', padding:'14px', borderRadius:'2px'}}>
                            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'8px'}}>
                              <span style={{fontSize:'12px', fontWeight:'bold', color:'var(--gold)', letterSpacing:'0.05em'}}>{s.type.toUpperCase()}</span>
                              <span style={{fontSize:'16px', color:'var(--ivory)', fontWeight:'900'}}>{s.cost}€</span>
                            </div>
                            <div style={{fontSize:'10px', color:'var(--ivory-60)', marginBottom:'8px'}}>ETA: {s.eta}</div>
                            <div className="flex flex-wrap gap-2">
                              {s.nature?.map((n, i) => (
                                <span key={i} style={{fontSize:'8px', padding:'2px 6px', background:'rgba(111,207,151,0.05)', color:'#6FCF97', border:'0.5px solid rgba(111,207,151,0.2)', borderRadius:'1px', textTransform:'uppercase'}}>
                                  {n}
                                </span>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeliveryDashboard;
