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
  .leaflet-control-attribution { display: none !important; }
  /* Force map to take up all space */
  .leaflet-container { height: 100% !important; width: 100% !important; }
`;

const createCustomIcon = (severity, status) => {
  const iconColor = severity === 'High' ? 'red' : severity === 'Medium' ? 'orange' : 'green';
  const pulseColor = status === 'Reported' ? '#ff4b2b' : '#ffcc00';
  return L.divIcon({
    className: 'custom-icon-container',
    html: `
      <div style="position: relative; display: flex; justify-content: center; align-items: center;">
        <div class="pulse-ring" style="width: 20px; height: 20px; background: ${pulseColor};"></div>
        <img src="https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${iconColor}.png" 
             style="width: 25px; height: 41px; position: relative; z-index: 10;" />
      </div>`,
    iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34],
  });
};

function App() {
  const [reports, setReports] = useState([]);
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const style = document.createElement('style');
    style.innerHTML = pulseCSS;
    document.head.appendChild(style);

    // RESET BODY
    document.body.style.margin = "0";
    document.body.style.padding = "0";
    document.body.style.height = "100vh";
    document.body.style.width = "100vw";
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
          const sev = prompt("Severity (Low/Medium/High):", "Medium");
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
    <div style={{ height: '100vh', width: '100vw', display: 'flex', background: '#000' }}>
      
      {/* SIDEBAR */}
      <aside style={{ 
        width: '320px', height: '100%', background: '#1a1a1a', 
        color: 'white', padding: '40px 25px', zIndex: 2000, 
        borderRight: '2px solid #333', boxSizing: 'border-box' 
      }}>
        <h1 style={{ color: '#4CAF50', margin: 0 }}>GarbMap</h1>
        <div style={{ margin: '20px 0 40px' }}>
          <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{time.toLocaleTimeString()}</div>
          <div style={{ color: '#888' }}>{time.toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })}</div>
        </div>
        <StatItem label="Total Tasks" val={stats.total} color="#fff" />
        <StatItem label="Yet to be claimed" val={stats.reported} color="#ff4b2b" />
        <StatItem label="Cleaning In-Progress" val={stats.inProgress} color="#ffcc00" />
        <StatItem label="Cleaned" val={stats.cleaned} color="#4CAF50" />
      </aside>

      {/* THE MAP */}
      <div style={{ position: 'relative', flexGrow: 1, height: '100%' }}>
        <MapContainer 
          center={[12.823, 80.044]} zoom={15} 
          style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0 }}
        >
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <MapEvents />
          {reports.filter(r => r.status !== 'Cleaned').map((r) => (
            <Marker key={r.id} position={[r.lat, r.lng]} icon={createCustomIcon(r.severity, r.status)}>
              <Popup>
                <div style={{ width: "180px", textAlign: 'center' }}>
                  <img src={r.photo_url} style={{ width: '100%', borderRadius: '4px' }} alt="spot" />
                  <strong>Severity: {r.severity}</strong>
                  <p style={{ fontSize: '0.8rem' }}>{r.status === 'Reported' ? 'Yet to be claimed ....' : 'Cleaning in progress ....'}</p>
                  <button 
                    onClick={(e) => handleUpdate(e, r.id, r.status === 'Reported' ? 'In Progress' : 'Cleaned')} 
                    style={btnS(r.status === 'Reported' ? '#ff4b2b' : '#4CAF50')}
                  >
                    {r.status === 'Reported' ? 'Claim Spot' : 'Mark Complete'}
                  </button>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    </div>
  );
}

const StatItem = ({ label, val, color }) => (
  <div style={{ marginBottom: '30px', borderBottom: '1px solid #222' }}>
    <div style={{ fontSize: '0.7rem', color: '#666' }}>{label}</div>
    <div style={{ fontSize: '2rem', fontWeight: 'bold', color }}>{val}</div>
  </div>
);

const btnS = (bg) => ({
  width: '100%', padding: '10px', cursor: 'pointer', background: bg, color: 'white', border: 'none', borderRadius: '4px', fontWeight: 'bold', marginTop: '10px'
});

export default App;