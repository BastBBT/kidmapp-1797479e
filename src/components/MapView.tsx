import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Location } from '@/types/location';
import { useNavigate } from 'react-router-dom';

// Fix leaflet default icon issue
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const categorySvgIcons: Record<string, string> = {
  restaurant: `<svg viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M10 8c0 0-1 6 2 9v11a1.5 1.5 0 003 0V17c3-3 2-9 2-9" stroke="#E8735A" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
    <path d="M13 8v6" stroke="#E8735A" stroke-width="1.5" stroke-linecap="round"/>
    <path d="M24 8v8c0 2-1.5 3-3 3v9a1.5 1.5 0 003 0" stroke="#E8735A" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
  </svg>`,
  cafe: `<svg viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M8 14h16v8a6 6 0 01-6 6h-4a6 6 0 01-6-6v-8z" stroke="#5BA89D" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
    <path d="M24 16h2a3 3 0 010 6h-2" stroke="#5BA89D" stroke-width="2" stroke-linecap="round"/>
    <path d="M12 8c0-2 2-2 2-4" stroke="#5BA89D" stroke-width="1.5" stroke-linecap="round" opacity="0.6"/>
    <path d="M16 9c0-2 2-2 2-4" stroke="#5BA89D" stroke-width="1.5" stroke-linecap="round" opacity="0.6"/>
  </svg>`,
  shop: `<svg viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M8 16v12h20V16" stroke="#D4A24E" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
    <path d="M6 10l3 6h18l3-6H6z" stroke="#D4A24E" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
    <rect x="14" y="22" width="8" height="6" rx="1" stroke="#D4A24E" stroke-width="1.5" fill="none"/>
  </svg>`,
  public: `<svg viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M18 6c-3 4-8 6-8 14a8 8 0 0016 0c0-8-5-10-8-14z" stroke="#6BA368" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
    <path d="M18 28V16" stroke="#6BA368" stroke-width="1.5" stroke-linecap="round"/>
    <path d="M14 20c2-2 4-1 4-4" stroke="#6BA368" stroke-width="1.5" stroke-linecap="round" opacity="0.6"/>
    <path d="M22 22c-2-2-4-1-4-5" stroke="#6BA368" stroke-width="1.5" stroke-linecap="round" opacity="0.6"/>
  </svg>`,
};

const categoryBgColors: Record<string, string> = {
  restaurant: '#FFF0ED',
  cafe: '#EDF7F5',
  shop: '#FFF8EB',
  public: '#EFF6EE',
};

const createCategoryIcon = (category: Location['category']) => {
  const svg = categorySvgIcons[category] || categorySvgIcons.public;
  const bg = categoryBgColors[category] || '#F5F5F5';
  return L.divIcon({
    html: `<div style="width:44px;height:44px;background:${bg};border-radius:14px;box-shadow:0 3px 12px rgba(0,0,0,0.1);display:flex;align-items:center;justify-content:center;border:2px solid white;transition:transform 0.2s;">${svg}</div>`,
    className: 'custom-marker',
    iconSize: [44, 44],
    iconAnchor: [22, 44],
    popupAnchor: [0, -44],
  });
};

interface MapViewProps {
  locations: Location[];
  selectedId?: string;
}

const NANTES_CENTER: [number, number] = [47.2184, -1.5536];

function FlyToSelected({ location }: { location?: Location }) {
  const map = useMap();
  if (location) {
    map.flyTo([location.lat, location.lng], 15, { duration: 0.5 });
  }
  return null;
}

const MapView = ({ locations, selectedId }: MapViewProps) => {
  const navigate = useNavigate();
  const selectedLocation = locations.find(l => l.id === selectedId);

  return (
    <div className="w-full h-full rounded-2xl overflow-hidden kid-shadow">
      <MapContainer
        center={NANTES_CENTER}
        zoom={13}
        style={{ height: '100%', width: '100%' }}
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://carto.com/">CARTO</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.basemaps.cartocdn.com/voyager/{z}/{x}/{y}{r}.png"
        />
        <FlyToSelected location={selectedLocation} />
        {locations.map((loc) => (
          <Marker
            key={loc.id}
            position={[loc.lat, loc.lng]}
            icon={createCategoryIcon(loc.category)}
            eventHandlers={{
              click: () => navigate(`/location/${loc.id}`),
            }}
          >
            <Popup>
              <div className="text-center">
                <strong className="text-sm">{loc.name}</strong>
                <p className="text-xs opacity-70">{loc.address}</p>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
};

export default MapView;
