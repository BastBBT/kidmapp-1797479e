const CARTO_API_KEY = import.meta.env.VITE_CARTO_API_KEY;

export const CARTO_TILE_URL = `https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png${CARTO_API_KEY ? `?key=${CARTO_API_KEY}` : ''}`;

export const CARTO_ATTRIBUTION = '&copy; <a href="https://carto.com/">CARTO</a>';
