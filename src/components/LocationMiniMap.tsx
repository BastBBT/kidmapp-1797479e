import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { useTranslation } from 'react-i18next';
import { getMarkerIcon } from '@/components/MapView';
import { CARTO_TILE_URL, CARTO_ATTRIBUTION } from '@/lib/mapTiles';

interface LocationMiniMapProps {
  lat: number;
  lng: number;
  category: string;
}

/**
 * Aperçu statique du lieu sur sa fiche : la grande carte de l'accueil sort de l'écran dès
 * qu'on scrolle. Non manipulable (pour ne pas capter le scroll de la page), avec le même
 * marqueur de catégorie que la grande carte. Un tap lance l'itinéraire Google Maps.
 */
const LocationMiniMap = ({ lat, lng, category }: LocationMiniMapProps) => {
  const { t } = useTranslation();
  const position: [number, number] = [lat, lng];

  return (
    <div
      className="relative overflow-hidden mb-4"
      style={{ height: 130, borderRadius: 18, border: '1px solid var(--border)' }}
    >
      <MapContainer
        center={position}
        zoom={15}
        style={{ height: '100%', width: '100%' }}
        zoomControl={false}
        dragging={false}
        scrollWheelZoom={false}
        doubleClickZoom={false}
        touchZoom={false}
        boxZoom={false}
        keyboard={false}
      >
        <TileLayer attribution={CARTO_ATTRIBUTION} url={CARTO_TILE_URL} />
        <Marker position={position} icon={getMarkerIcon(category, true)} interactive={false} />
      </MapContainer>
      {/* Laisse libre la bande du bas, où Leaflet loge le lien d'attribution. */}
      <a
        href={`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={t('location_page.directions')}
        className="absolute left-0 right-0 top-0"
        style={{ bottom: 18, zIndex: 1000 }}
      />
    </div>
  );
};

export default LocationMiniMap;
