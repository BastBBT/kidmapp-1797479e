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

const categorySvgIcons: Record<string, string> = {
  restaurant: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M7 6c0 0-1 4 1.5 6.5V19a1 1 0 002 0v-6.5C13 10 12 6 12 6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M9.5 6v4" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>
    <path d="M16 6v5.5c0 1.5-1 2-2 2v6.5a1 1 0 002 0" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`,
  cafe: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M5 10h11v5.5a4.5 4.5 0 01-4.5 4.5h-2A4.5 4.5 0 015 15.5V10z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M16 11.5h1.5a2 2 0 010 4H16" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
    <path d="M8.5 6c0-1.5 1.5-1.5 1.5-3" stroke="currentColor" stroke-width="1" stroke-linecap="round" opacity="0.5"/>
    <path d="M11.5 6.5c0-1.5 1.5-1.5 1.5-3" stroke="currentColor" stroke-width="1" stroke-linecap="round" opacity="0.5"/>
  </svg>`,
  shop: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M5 11v9h14v-9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M3.5 7l2 4h13l2-4H3.5z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
    <rect x="9.5" y="15" width="5" height="5" rx="0.5" stroke="currentColor" stroke-width="1.2"/>
  </svg>`,
  public: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 4c-2 3-6 4.5-6 10a6 6 0 0012 0c0-5.5-4-7-6-10z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M12 20V11" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>
    <path d="M9.5 14c1.5-1.5 2.5-0.5 2.5-3" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" opacity="0.5"/>
    <path d="M14.5 15.5c-1.5-1.5-2.5-0.5-2.5-3.5" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" opacity="0.5"/>
  </svg>`,
};

const categoryColors: Record<string, { bg: string; stroke: string; ring: string }> = {
  restaurant: { bg: '#FFF0ED', stroke: '#E8735A', ring: '#FADBD3' },
  cafe: { bg: '#EDF7F5', stroke: '#5BA89D', ring: '#C8E6E0' },
  shop: { bg: '#FFF8EB', stroke: '#D4A24E', ring: '#F5E6C8' },
  public: { bg: '#EFF6EE', stroke: '#6BA368', ring: '#D1E8CF' },
};

const createCategoryIcon = (category: Location['category']) => {
  const svg = categorySvgIcons[category] || categorySvgIcons.public;
  const colors = categoryColors[category] || categoryColors.public;
  return L.divIcon({
    html: `<div class="kidmap-marker" style="
      width: 42px; height: 42px;
      background: ${colors.bg};
      border-radius: 50%;
      box-shadow: 0 2px 8px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.06);
      display: flex; align-items: center; justify-content: center;
      border: 2.5px solid ${colors.ring};
      color: ${colors.stroke};
      transition: transform 0.2s ease, box-shadow 0.2s ease;
    ">${svg}</div>`,
    className: 'custom-marker',
    iconSize: [42, 42],
    iconAnchor: [21, 21],
    popupAnchor: [0, -24],
  });
};

const createClusterIcon = (cluster: any) => {
  const count = cluster.getChildCount();
  const size = count < 10 ? 40 : count < 30 ? 48 : 56;
  return L.divIcon({
    html: `<div class="kidmap-cluster" style="
      width: ${size}px; height: ${size}px;
      background: linear-gradient(135deg, hsl(8 85% 92%), hsl(172 35% 88%));
      border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      box-shadow: 0 3px 12px rgba(0,0,0,0.1);
      border: 2.5px solid white;
      font-family: 'Nunito', sans-serif;
      font-weight: 700;
      font-size: ${count < 10 ? 14 : 13}px;
      color: hsl(20 25% 25%);
    ">${count}</div>`,
    className: 'custom-cluster',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
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
    const timer = setTimeout(() => map.invalidateSize(), 100);
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
          attribution='&copy; <a href="https://carto.com/">CARTO</a> &copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        />
        <InvalidateSize />
        <FlyToSelected location={selectedLocation} />
        <MarkerClusterGroup
          chunkedLoading
          iconCreateFunction={createClusterIcon}
          maxClusterRadius={50}
          spiderfyOnMaxZoom
          animate
          animateAddingMarkers
        >
          {locations.map((loc) => {
            const colors = categoryColors[loc.category] || categoryColors.public;
            return (
              <Marker
                key={loc.id}
                position={[loc.lat, loc.lng]}
                icon={createCategoryIcon(loc.category)}
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
