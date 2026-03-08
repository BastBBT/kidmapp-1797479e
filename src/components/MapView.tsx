import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Location } from '@/types/location';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';

// Fix leaflet default icon issue
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const getMarkerIcon = (category: string, isSelected: boolean) => {
  const configs: Record<string, { bg: string; border: string; stroke: string; icon: string }> = {
    restaurant: { bg: '#FAF0EC', border: '#F0C4B4', stroke: '#D95F3B', icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#D95F3B" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 002-2V2"/><path d="M7 2v20"/><path d="M21 15V2a5 5 0 00-5 5v6c0 1.1.9 2 2 2h3zm0 0v7"/></svg>` },
    cafe:       { bg: '#EBF4F2', border: '#C8E0DC', stroke: '#3B7D6E', icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3B7D6E" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8h1a4 4 0 010 8h-1"/><path d="M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8z"/></svg>` },
    shop:       { bg: '#FEF9E7', border: '#F5E6C8', stroke: '#C49A35', icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#C49A35" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>` },
    public:     { bg: '#EEF6EC', border: '#D1E8CF', stroke: '#5A9A56', icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#5A9A56" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="7" r="5"/><path d="M12 12v8"/><path d="M9 18h6"/></svg>` },
  };
  const c = configs[category] ?? configs.restaurant;
  const size = isSelected ? 48 : 40;
  return L.divIcon({
    className: '',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -(size / 2)],
    html: `
      <div style="
        width:${size}px;height:${size}px;
        border-radius:50%;
        background:${c.bg};
        border:2.5px solid ${isSelected ? c.stroke : c.border};
        display:flex;align-items:center;justify-content:center;
        box-shadow:${isSelected ? `0 4px 16px ${c.stroke}55` : '0 2px 8px rgba(0,0,0,0.14)'};
        transition:all 0.2s ease;
        ${isSelected ? 'transform:scale(1.1);' : ''}
      ">${c.icon}</div>
    `
  });
};

const createClusterCustomIcon = (cluster: any) => {
  const count = cluster.getChildCount();
  const size = count < 5 ? 40 : count < 10 ? 48 : 56;
  return L.divIcon({
    className: '',
    iconSize: [size, size],
    html: `
      <div style="
        width:${size}px;height:${size}px;
        border-radius:50%;
        background:linear-gradient(135deg, #D95F3B 0%, #3B7D6E 100%);
        border:3px solid white;
        display:flex;align-items:center;justify-content:center;
        box-shadow:0 3px 12px rgba(217,95,59,0.35);
        font-family:'DM Sans',sans-serif;
        font-size:${count > 9 ? 12 : 14}px;
        font-weight:700;
        color:white;
      ">${count}</div>
    `
  });
};

const categoryLabels: Record<string, string> = {
  restaurant: 'Restaurant',
  cafe: 'Café',
  shop: 'Boutique',
  public: 'Lieu public',
};

interface MapViewProps {
  locations: Location[];
  selectedId?: string;
}

const NANTES_CENTER: [number, number] = [47.2184, -1.5536];

function InvalidateSize() {
  const map = useMap();
  useEffect(() => {
    const timer = setTimeout(() => map.invalidateSize(), 150);
    return () => clearTimeout(timer);
  }, [map]);
  return null;
}

function FlyToSelected({ location }: { location?: Location }) {
  const map = useMap();
  if (location) {
    map.flyTo([location.lat, location.lng], 15, { duration: 0.5 });
  }
  return null;
}

const CriterionDot = ({ active, label, icon }: { active: boolean; label: string; icon: string }) => (
  <div style={{
    display: 'flex', alignItems: 'center', gap: '4px',
    padding: '3px 8px', borderRadius: '20px', fontSize: '11px',
    fontWeight: 600, fontFamily: "'Nunito', sans-serif",
    background: active ? 'hsl(142 60% 95%)' : 'hsl(30 25% 95%)',
    color: active ? 'hsl(142 60% 35%)' : 'hsl(20 10% 55%)',
  }}>
    <span style={{ fontSize: '12px' }}>{icon}</span>
    {label}
  </div>
);

const MapView = ({ locations, selectedId }: MapViewProps) => {
  const navigate = useNavigate();
  const selectedLocation = locations.find(l => l.id === selectedId);

  return (
    <div className="w-full h-full rounded-2xl overflow-hidden" style={{ minHeight: '400px' }}>
      <MapContainer
        center={NANTES_CENTER}
        zoom={13}
        style={{ height: '100%', width: '100%' }}
        zoomControl={false}
        preferCanvas={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://carto.com/">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        />
        <InvalidateSize />
        <FlyToSelected location={selectedLocation} />
        <MarkerClusterGroup
          chunkedLoading
          iconCreateFunction={createClusterCustomIcon}
          maxClusterRadius={50}
          spiderfyOnMaxZoom
          animate
          animateAddingMarkers
        >
          {locations.map((loc) => {
            const markerColors: Record<string, { stroke: string }> = {
              restaurant: { stroke: '#D95F3B' },
              cafe: { stroke: '#3B7D6E' },
              shop: { stroke: '#C49A35' },
              public: { stroke: '#5A9A56' },
            };
            const colors = markerColors[loc.category] || markerColors.restaurant;
            return (
              <Marker
                key={loc.id}
                position={[loc.lat, loc.lng]}
                icon={getMarkerIcon(loc.category, loc.id === selectedId)}
                eventHandlers={{
                  click: () => navigate(`/location/${loc.id}`),
                }}
              >
                <Popup>
                  <div style={{
                    fontFamily: "'Nunito', sans-serif",
                    width: '220px',
                    margin: '-12px -20px',
                  }}>
                    {loc.photo && (
                      <img
                        src={loc.photo}
                        alt={loc.name}
                        style={{
                          width: '100%', height: '110px',
                          objectFit: 'cover',
                          borderRadius: '12px 12px 0 0',
                        }}
                      />
                    )}
                    <div style={{ padding: '10px 14px 12px' }}>
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: '6px',
                        marginBottom: '4px',
                      }}>
                        <span style={{
                          fontSize: '10px', fontWeight: 700,
                          textTransform: 'uppercase', letterSpacing: '0.5px',
                          color: colors.stroke,
                        }}>
                          {categoryLabels[loc.category] || loc.category}
                        </span>
                      </div>
                      <div style={{
                        fontSize: '14px', fontWeight: 800,
                        color: 'hsl(20 25% 15%)', lineHeight: 1.3,
                        marginBottom: '2px',
                      }}>
                        {loc.name}
                      </div>
                      {loc.address && (
                        <div style={{
                          fontSize: '11px', color: 'hsl(20 10% 50%)',
                          marginBottom: '8px',
                        }}>
                          {loc.address}
                        </div>
                      )}
                      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                        <CriterionDot active={loc.high_chair} label="Chaise" icon="🪑" />
                        <CriterionDot active={loc.changing_table} label="Change" icon="👶" />
                        <CriterionDot active={loc.kids_area} label="Jeux" icon="🎨" />
                      </div>
                    </div>
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MarkerClusterGroup>
      </MapContainer>
    </div>
  );
};

export default MapView;
