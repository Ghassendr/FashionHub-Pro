import React, { useState, useEffect } from 'react';
import { 
  Hexagon, LayoutDashboard, Package, Truck, 
  Map, ScanLine, Thermometer, ShieldCheck, 
  History, Bell, Plus, CarFront, CircleSlash,
  Clock, MapPin, CheckCircle2, ChevronRight, X
} from 'lucide-react';
import './DeliveryDashboard.css';

const pageTitles = {
  overview: <>Good morning, <span style={{fontStyle:'italic', color:'var(--gold)'}}>Marc</span></>,
  orders: <>Order <span style={{fontStyle:'italic', color:'var(--gold)'}}>Handling</span></>,
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
  
  // MongoDB states
  const [vehicles, setVehicles] = useState([]);
  const [kpis, setKpis] = useState(null);
  const [isRegistering, setIsRegistering] = useState(false);
  const [loading, setLoading] = useState(true);

  // New vehicle form state
  const [newVehicle, setNewVehicle] = useState({
    type: 'Standard Van',
    make_model: '',
    registration: '',
    status: 'Available'
  });

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

  // Fetch MongoDB data
  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // Assuming django runs on typical port 8000
      const vehRes = await fetch('http://localhost:8000/api/mongo/delivery/vehicles/');
      const kpiRes = await fetch('http://localhost:8000/api/mongo/delivery/kpis/');
      
      if (vehRes.ok) setVehicles(await vehRes.json());
      if (kpiRes.ok) setKpis(await kpiRes.json());
    } catch (err) {
      console.error("Error connecting to MongoDB backend:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Handle vehicle registration submit
  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('http://localhost:8000/api/mongo/delivery/vehicles/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...newVehicle,
          features: { Climate: "Optional", GPS: "Live" }
        })
      });
      if (res.ok) {
        setIsRegistering(false);
        setNewVehicle({ type: 'Standard Van', make_model: '', registration: '', status: 'Available' });
        // Refresh
        fetchDashboardData();
      }
    } catch (err) {
      console.error("Error creating vehicle:", err);
    }
  };

  return (
    <div className="delivery-board">
      
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
              <div class="driver-role">Paris Hub · Driver</div>
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
            <div className="topbar-notif has-tip">
              <Bell size={16} />
              <div className="notif-dot"></div>
              <span className="tip">3 notifications</span>
            </div>
            <button className="topbar-btn" onClick={() => setActiveTab('trips')}>+ New Trip</button>
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
                    <div className="order-row">
                      <div className="order-indicator ind-live"></div>
                      <div className="order-type-badge badge-garment">Garment</div>
                      <div className="order-info">
                        <div className="order-id">T-0041</div>
                        <div className="order-route">Chanel → Av. Montaigne</div>
                        <div className="order-meta">Marc D. · ETA 14:30</div>
                      </div>
                      <div className="order-progress">
                        <div className="progress-mini"><div className="progress-fill" style={{width:'68%'}}></div></div>
                        <div className="progress-pct">68%</div>
                      </div>
                    </div>
                    <div className="order-row">
                      <div className="order-indicator ind-live"></div>
                      <div className="order-type-badge badge-fabric">Fabric</div>
                      <div className="order-info">
                        <div className="order-id">T-0043</div>
                        <div className="order-route">Holdsworth Silks → Valentino</div>
                        <div className="order-meta">Remy A. · ETA 15:45</div>
                      </div>
                      <div className="order-progress">
                        <div className="progress-mini"><div className="progress-fill" style={{width:'22%'}}></div></div>
                        <div className="progress-pct">22%</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="panel">
                  <div className="panel-header">
                    <div className="panel-title">Pending order requests</div>
                    <button className="panel-action" onClick={() => setActiveTab('orders')}>View all ›</button>
                  </div>
                  <div className="order-list">
                    <div className="pending-row">
                      <div className="priority-tag p-urgent">Urgent</div>
                      <div className="pending-info">
                        <div className="pending-id">ORD-8821</div>
                        <div className="pending-route">Paris → Zurich Private Client</div>
                        <div className="pending-house">Hermès · Garment flow</div>
                      </div>
                      <button className="accept-btn">Accept</button>
                    </div>
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
                  <div className="qaction" onClick={() => setActiveTab('trips')}>
                    <Map className="qa-icon" style={{color: 'var(--gold)'}} />
                    <div className="qa-label">Plan new trip</div>
                    <div className="qa-sub">Add stops, assign vehicle, set time windows</div>
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
                <button className="topbar-btn" style={{width:'100%', padding:'14px', fontSize:'11px', letterSpacing:'0.15em'}}>Initiate NFC Scan</button>
              </div>
            </div>
          </div>

          {/* PAGE: Orders */}
          <div className={`page ${activeTab === 'orders' ? 'active' : ''}`}>
            <div className="panel fade-in d1">
              <div className="panel-header"><div className="panel-title">Order Flow is controlled by the Couture House & Supplier Backend.</div></div>
              <div className="panel-body">This tab integrates with the SQLite Django ORM handling Client orders.</div>
            </div>
          </div>

          {/* OTHER PAGES DUMMY CONTENT TRUNCATED FOR SIMPLICITY */}
          <div className={`page ${activeTab === 'climate' ? 'active' : ''}`}><div className="panel"><div className="panel-body">Climate system placeholder</div></div></div>
          <div className={`page ${activeTab === 'compliance' ? 'active' : ''}`}><div className="panel"><div className="panel-body">Compliance system placeholder</div></div></div>
          <div className={`page ${activeTab === 'history' ? 'active' : ''}`}><div className="panel"><div className="panel-body">History log placeholder</div></div></div>
          <div className={`page ${activeTab === 'trips' ? 'active' : ''}`}><div className="panel"><div className="panel-body">Active Trips module initializing...</div></div></div>

        </div>
      </div>
    </div>
  );
};

export default DeliveryDashboard;
