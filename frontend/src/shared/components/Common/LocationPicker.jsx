import React, { useState } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const customIcon = L.divIcon({
  className: 'custom-map-icon',
  html: '<div style="background:var(--gold);width:12px;height:12px;border-radius:50%;border:2px solid #1a1a1a;box-shadow:0 0 5px rgba(0,0,0,0.5);"></div>',
  iconSize: [12, 12],
  iconAnchor: [6, 6]
});

const ClickHandler = ({ onPointSelect }) => {
  useMapEvents({
    click(e) {
      onPointSelect(e.latlng);
    },
  });
  return null;
};

const LocationPicker = ({ onLocationSelect, initialAddress = "" }) => {
  const [position, setPosition] = useState(null);
  const [address, setAddress] = useState(initialAddress);
  const [loading, setLoading] = useState(false);

  const fetchPlaceName = async (lat, lon) => {
    try {
      setLoading(true);
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=10`);
      const data = await res.json();
      setLoading(false);
      
      if (data.error || !data.address) return null;
      return data.name || data.address.city || data.address.town || data.address.village || data.address.state || "Unknown Area";
    } catch(e) {
      setLoading(false);
      return null;
    }
  };

  const handlePointSelect = async (latlng) => {
    if (loading) return;
    const placeName = await fetchPlaceName(latlng.lat, latlng.lng);
    if (placeName) {
      setPosition(latlng);
      setAddress(placeName);
      onLocationSelect(placeName);
    }
  };

  return (
    <div style={{ height: '220px', width: '100%', border: '0.5px solid var(--noir-border)', marginTop: '6px', position: 'relative', background: '#1a1a1a' }}>
      <MapContainer 
        center={[33.8869, 9.5375]} 
        zoom={6} 
        style={{ height: '100%', width: '100%', zIndex: 1 }}
      >
        <TileLayer
          attribution='&copy; CARTO'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />
        <ClickHandler onPointSelect={handlePointSelect} />
        {position && <Marker position={position} icon={customIcon} />}
      </MapContainer>
      
      <div style={{ 
        position: 'absolute', bottom: '10px', right: '10px', zIndex: 1000, 
        background: 'rgba(0,0,0,0.8)', padding: '5px 10px', color: 'var(--gold)', 
        fontSize: '10px', borderRadius: '4px', border: '0.5px solid var(--gold-border)', 
        pointerEvents: 'none', letterSpacing: '0.1em', textTransform: 'uppercase'
      }}>
        {loading ? 'Locating...' : position ? `✓ ${address}` : 'Click map to select location'}
      </div>
    </div>
  );
};

export default LocationPicker;
