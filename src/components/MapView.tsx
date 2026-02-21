import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Location, categoryIcons } from '@/types/location';
import { useNavigate } from 'react-router-dom';

// Fix leaflet default icon issue
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const createCategoryIcon = (category: Location['category']) => {
  const emoji = categoryIcons[category];
  return L.divIcon({
    html: `<div style="font-size: 24px; display: flex; align-items: center; justify-content: center; width: 40px; height: 40px; background: white; border-radius: 50%; box-shadow: 0 2px 8px rgba(0,0,0,0.15);">${emoji}</div>`,
    className: 'custom-marker',
    iconSize: [40, 40],
    iconAnchor: [20, 40],
    popupAnchor: [0, -40],
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
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
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
