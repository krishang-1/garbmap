import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { initializeApp } from "firebase/app";
import { getDatabase, ref, onValue, push, set, update } from "firebase/database";
import L from 'leaflet';

// --- FIREBASE CONFIG ---
const firebaseConfig = {
  databaseURL: "https://garbmap-fbc0b-default-rtdb.firebaseio.com",
  projectId: "garbmap-fbc0b",
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// 1. CSS for the Radiating Pulse (Sonar Effect)
const pulseCSS = `
  @keyframes sonar {
    0% { transform: scale(0.5); opacity: 1; }
    100% { transform: scale(2.5); opacity: 0; }
  }
  .pulse-ring {
    position: absolute;
    border-radius: 50%;
    animation: sonar 2s infinite;
    pointer-events: none;
  }
`;

// 2. Custom Marker Generator (Severity Icon + Status Pulse)
const createCustomIcon = (severity, status) => {
  const iconColor = severity === 'High' ? 'red' : severity === 'Medium' ? 'orange' : 'green';
  const pulseColor = status === 'Reported' ? '#ff4b2b' : '#ffcc00'; // Red for pending, Yellow for progress

  return L.divIcon({
    className: 'custom-icon-container',
    html: `
      <div style="position: relative; display: flex; justify-content: center; align-items: center;">
        <div class="pulse-ring" style="width: 20px; height: 20px; background: ${pulseColor};"></div>
        <img src="https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${iconColor}.png" 
             style="width: 25px; height: 41px; position: relative; z-index: 10;" />
      </div>
    `,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
  });
};

function App() {
  const [reports, setReports] = useState([]);
  const [time, setTime] = useState(new Date());
  const center = [12.823, 80.044];

  useEffect(() => {
    // Inject CSS
    const style = document.createElement('style');
    style.innerHTML = pulseCSS;
    document.head.appendChild(style);

    // Global Reset
    document.body.style.margin = "0";
    document.body.style.overflow = "hidden";

    const timer = setInterval(() => setTime(new Date()), 1000);
    onValue(ref(db, 'reports'), (snap) => {
      const val = snap.val();
      if (val) setReports(Object.keys(val).map(k => ({ id: k, ...val[k] })));
    });
    return () => clearInterval(timer);
  }, []);

  const stats = {
    total: reports.length,
    reported: reports.filter(r => r.status === 'Reported').length,
    inProgress: reports.filter(r => r.status === 'In Progress').length,
    cleaned: reports.filter(r => r.status === 'Cleaned').length,
  };

  function MapEvents() {
    useMapEvents({
      click: (e) => {
        if (e.originalEvent.target.classList.contains('leaflet-container')) {
          const sev = prompt("Severity (Low, Medium, High):", "Medium");
          if (sev) {
            push(ref(db, 'reports'), {
              lat: e.latlng.lat, lng: e.latlng.lng,
              severity: sev, status: 'Reported',
              photo_url: `https://picsum.photos/seed/${Date.now()}/400/300`,
            });
          }
        }
      },
    });
    return null;
  }

  const handleUpdate = (e, id, next) => {
    e.stopPropagation();
    update(ref(db, `reports/${id}`), { status: next });
  };

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw', background: '#121212' }}>
      
      {/* 📊 SIDEBAR */}
      <aside style={{ width: '320px', background: '#1a1a1a', color: 'white', padding: '40px 25px', borderRight: '1px solid #333', zIndex: 2000 }}>
        <h1 style={{ color: '#4CAF50', margin: 0, fontSize: '2.2rem' }}>GarbMap</h1>
        <div style={{ margin: '20px 0 40px' }}>
          <div style={{ fontSize: '1.2rem' }}>{time.toLocaleTimeString()}</div>
          <div style={{ fontSize: '0.8rem', color: '#666' }}>{time.toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })}</div>
        </div>
        
        <StatItem label="Total Tasks" val={stats.total} color="#fff" />
        <StatItem label="Yet to be claimed" val={stats.reported} color="#ff4b2b" />
        <StatItem label="Cleaning In-Progress" val={stats.inProgress} color="#ffcc00" />
        <StatItem label="Cleaned" val={stats.cleaned} color="#4CAF50" />
      </aside>

      {/* 🗺️ MAP */}
      <main style={{ flex: 1, position: 'relative' }}>
        <MapContainer center={center} zoom={15} style={{ height: "100%", width: "100%" }}>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <MapEvents />
          
          {reports.filter(r => r.status !== 'Cleaned').map((r) => (
            <Marker key={r.id} position={[r.lat, r.lng]} icon={createCustomIcon(r.severity, r.status)}>
              <Popup>
                <div style={{ width: "200px" }}>
                  <img src={r.photo_url} style={{ width: '100%', borderRadius: '4px' }} alt="waste" />
                  <p><strong>Severity: {r.severity}</strong></p>
                  
                  {r.status === 'Reported' ? (
                    <div style={{ textAlign: 'center' }}>
                      <p style={{ color: '#ff4b2b', fontSize: '0.8rem' }}>Yet to be claimed ....</p>
                      <button onClick={(e) => handleUpdate(e, r.id, 'In Progress')} style={btnS('#ff4b2b')}>Claim Spot</button>
                    </div>
                  ) : (
                    <div style={{ textAlign: 'center' }}>
                      <p style={{ color: '#ffcc00', fontSize: '0.8rem' }}>Cleaning in progress ....</p>
                      <button onClick={(e) => handleUpdate(e, r.id, 'Cleaned')} style={btnS('#4CAF50')}>Mark as Complete</button>
                    </div>
                  )}
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </main>
    </div>
  );
}

const StatItem = ({ label, val, color }) => (
  <div style={{ marginBottom: '20px' }}>
    <div style={{ fontSize: '0.7rem', color: '#666', textTransform: 'uppercase' }}>{label}</div>
    <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color }}>{val}</div>
  </div>
);

const btnS = (bg) => ({
  width: '100%', padding: '10px', cursor: 'pointer', background: bg, color: 'white', border: 'none', borderRadius: '4px', fontWeight: 'bold'
});

export default App;