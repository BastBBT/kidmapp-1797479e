import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Location } from '@/types/location';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { EQUIP_ICONS, EquipKey, CATEGORY_ICONS } from '@/assets/icons';

// Fix leaflet default icon issue
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const getMarkerIcon = (category: string, isSelected: boolean) => {
  const configs: Record<string, { bg: string; border: string; stroke: string }> = {
    restaurant: { bg: '#FAF0EC', border: '#F0C4B4', stroke: '#D95F3B' },
    cafe:       { bg: '#EBF4F2', border: '#C8E0DC', stroke: '#3B7D6E' },
    shop:       { bg: '#FEF9E7', border: '#F5E6C8', stroke: '#C49A35' },
    public:     { bg: '#EEF6EC', border: '#D1E8CF', stroke: '#5A9A56' },
    coiffeur:   { bg: '#F3EAF7', border: '#D7BDE2', stroke: '#9B59B6' },
    nature:     { bg: '#EBF4F2', border: '#C8E0DC', stroke: '#3B7D6E' },
    sport:      { bg: '#E8F0FB', border: '#C4D8F0', stroke: '#3B6EB0' },
    creatif:    { bg: '#F3EAF7', border: '#D7BDE2', stroke: '#8E44AD' },
    culture:    { bg: '#FEF9E7', border: '#F5E6C8', stroke: '#B7791F' },
    jeux:       { bg: '#FDECEA', border: '#F5C7C0', stroke: '#D95F3B' },
  };
  const c = configs[category] ?? configs.restaurant;
  const size = isSelected ? 48 : 40;
  const iconSize = isSelected ? 26 : 24;
  const assetUrl = CATEGORY_ICONS[category] ?? CATEGORY_ICONS.restaurant;
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
      "><img src="${assetUrl}" alt="" style="width:${iconSize}px;height:${iconSize}px;object-fit:contain;" /></div>
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
        background:#D95F3B;
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
  coiffeur: 'Coiffeur',
};

interface MapViewProps {
  locations: Location[];
  selectedId?: string;
  initialCenter?: [number, number];
  initialZoom?: number;
  onViewChange?: (center: [number, number], zoom: number) => void;
}

const NANTES_CENTER: [number, number] = [47.1984, -1.5536];
const DEFAULT_ZOOM = 12;

function RecenterMap({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    const timer = setTimeout(() => {
      map.invalidateSize();
      map.setView(center, zoom);
    }, 150);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map]);
  return null;
}

function ViewChangeReporter({ onViewChange }: { onViewChange?: (center: [number, number], zoom: number) => void }) {
  const map = useMap();
  useEffect(() => {
    if (!onViewChange) return;
    const handler = () => {
      const c = map.getCenter();
      onViewChange([c.lat, c.lng], map.getZoom());
    };
    map.on('moveend', handler);
    map.on('zoomend', handler);
    return () => {
      map.off('moveend', handler);
      map.off('zoomend', handler);
    };
  }, [map, onViewChange]);
  return null;
}

function FlyToSelected({ location }: { location?: Location }) {
  const map = useMap();
  if (location) {
    map.flyTo([location.lat, location.lng], 15, { duration: 0.5 });
  }
  return null;
}

const CriterionDot = ({ active, label, equipKey }: { active: boolean; label: string; equipKey: EquipKey }) => {
  if (!active) return null;
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '4px',
      padding: '3px 8px 3px 4px', borderRadius: '20px', fontSize: '11px',
      fontWeight: 600, fontFamily: "'Nunito', sans-serif",
      background: 'hsl(142 60% 95%)', color: 'hsl(142 60% 35%)',
    }}>
      <span style={{
        width: 18, height: 18, borderRadius: 4, padding: 2,
        background: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <img src={EQUIP_ICONS[equipKey]} alt="" style={{ width: 14, height: 14, objectFit: 'contain' }} />
      </span>
      {label}
    </div>
  );
};

const MapView = ({ locations, selectedId, initialCenter, initialZoom, onViewChange }: MapViewProps) => {
  const navigate = useNavigate();
  const selectedLocation = locations.find(l => l.id === selectedId);
  const center = initialCenter ?? NANTES_CENTER;
  const zoom = initialZoom ?? DEFAULT_ZOOM;

  return (
    <div className="w-full h-full rounded-2xl overflow-hidden" style={{ minHeight: '400px' }}>
      <MapContainer
        center={center}
        zoom={zoom}
        style={{ height: '100%', width: '100%' }}
        zoomControl={false}
        preferCanvas={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://carto.com/">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        />
        <RecenterMap center={center} zoom={zoom} />
        <ViewChangeReporter onViewChange={onViewChange} />
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
              coiffeur: { stroke: '#9B59B6' },
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
                        <CriterionDot active={loc.high_chair} label="Chaise" equipKey="high_chair" />
                        <CriterionDot active={loc.changing_table} label="Change" equipKey="changing_table" />
                        <CriterionDot active={loc.kids_area} label="Jeux" equipKey="kids_area" />
                        <CriterionDot active={(loc as any).kids_menu} label="Menu" equipKey="kids_menu" />
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
