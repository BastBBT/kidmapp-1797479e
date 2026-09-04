import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { EventItem, eventCategoryHex, eventCategoryEmoji } from '@/types/event';
import { CARTO_TILE_URL, CARTO_ATTRIBUTION } from '@/lib/mapTiles';

const NANTES_CENTER: [number, number] = [47.1984, -1.5536];
const DEFAULT_ZOOM = 12;

const getPinIcon = (category: string) => {
  const color = eventCategoryHex(category);
  const emoji = eventCategoryEmoji(category);
  return L.divIcon({
    className: '',
    iconSize: [40, 40],
    iconAnchor: [20, 20],
    popupAnchor: [0, -20],
    html: `
      <div style="
        width:40px;height:40px;border-radius:50%;
        background:#fff;border:2.5px solid ${color};
        display:flex;align-items:center;justify-content:center;
        box-shadow:0 3px 10px ${color}55;
        font-size:20px;
      ">${emoji}</div>
    `,
  });
};

const createClusterIcon = (cluster: any) => {
  const count = cluster.getChildCount();
  const size = count < 5 ? 40 : count < 10 ? 48 : 56;
  return L.divIcon({
    className: '',
    iconSize: [size, size],
    html: `
      <div style="
        width:${size}px;height:${size}px;border-radius:50%;
        background:#EF9F27;border:3px solid white;
        display:flex;align-items:center;justify-content:center;
        box-shadow:0 3px 12px rgba(239,159,39,0.35);
        font-family:'DM Sans',sans-serif;
        font-size:${count > 9 ? 12 : 14}px;font-weight:700;color:white;
      ">${count}</div>
    `,
  });
};

function ResizeOnMount() {
  const map = useMap();
  useEffect(() => {
    const t = setTimeout(() => map.invalidateSize(), 150);
    return () => clearTimeout(t);
  }, [map]);
  return null;
}

interface Props {
  events: EventItem[];
  initialCenter?: [number, number];
  initialZoom?: number;
}

const EventsMap = ({ events, initialCenter, initialZoom }: Props) => {
  const navigate = useNavigate();
  const center = initialCenter ?? NANTES_CENTER;
  const zoom = initialZoom ?? DEFAULT_ZOOM;
  const withCoords = events.filter((e) => e.lat != null && e.lng != null);

  return (
    <div className="w-full h-full rounded-2xl overflow-hidden" style={{ minHeight: 200 }}>
      <MapContainer center={center} zoom={zoom} style={{ height: '100%', width: '100%' }} zoomControl={false}>
        <TileLayer
          attribution={CARTO_ATTRIBUTION}
          url={CARTO_TILE_URL}
        />
        <ResizeOnMount />
        <MarkerClusterGroup chunkedLoading iconCreateFunction={createClusterIcon} maxClusterRadius={50}>
          {withCoords.map((ev) => (
            <Marker
              key={ev.id}
              position={[ev.lat!, ev.lng!]}
              icon={getPinIcon(ev.category)}
              eventHandlers={{ click: () => navigate(`/event/${ev.id}`) }}
            >
              <Popup>
                <div style={{ fontFamily: "'DM Sans', sans-serif", width: 200, margin: '-12px -20px' }}>
                  <div style={{ padding: '10px 14px 12px' }}>
                    <div
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: 0.5,
                        color: eventCategoryHex(ev.category),
                        marginBottom: 4,
                      }}
                    >
                      {ev.category}
                    </div>
                    <div style={{ fontFamily: 'Fraunces', fontSize: 14, fontWeight: 600, color: '#1C1917' }}>
                      {ev.name}
                    </div>
                    {ev.address && (
                      <div style={{ fontSize: 11, color: '#78716C', marginTop: 4 }}>{ev.address}</div>
                    )}
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}
        </MarkerClusterGroup>
      </MapContainer>
    </div>
  );
};

export default EventsMap;
