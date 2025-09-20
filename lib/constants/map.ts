// Map configuration
export const MAP_CONFIG = {
  DEFAULT_CENTER: [-98.5795, 39.8283] as [number, number],
  DEFAULT_ZOOM: 3,
  DEFAULT_PITCH: 20,
  DEFAULT_BEARING: 0,
  DEFAULT_STYLE: "mapbox://styles/mapbox/satellite-streets-v12",
} as const;

// Mapbox API endpoints
export const MAPBOX_ENDPOINTS = {
  SEARCH_SUGGEST: "https://api.mapbox.com/search/searchbox/v1/suggest",
  GEOCODING: "https://api.mapbox.com/geocoding/v5/mapbox.places",
} as const;

// Geographic constants
export const GEO_CONSTANTS = {
  // Earth radius in meters
  EARTH_RADIUS: 6371000,
  // Meters per degree longitude (at equator)
  METERS_PER_DEGREE_LNG: 111320,
  // Meters per degree latitude
  METERS_PER_DEGREE_LAT: 110540,
} as const;

// Default audience area dimensions (in feet)
export const AUDIENCE_DIMENSIONS = {
  DEFAULT_WIDTH_FT: 200,
  DEFAULT_HEIGHT_FT: 90,
  LABEL_OFFSET_FT: 20,
} as const;

// Map interaction constants
export const MAP_INTERACTION = {
  CLICK_TOLERANCE: 5,
  SEARCH_DEBOUNCE_MS: 200,
  MIN_RECTANGLE_SIZE_FT: 20,
} as const;

// Map styles
export const MAP_STYLES = [
  {
    id: "satellite",
    name: "Satellite",
    url: "mapbox://styles/mapbox/satellite-streets-v12",
  },
  {
    id: "streets",
    name: "Streets",
    url: "mapbox://styles/mapbox/streets-v12",
  },
  {
    id: "outdoors",
    name: "Outdoors",
    url: "mapbox://styles/mapbox/outdoors-v12",
  },
] as const;
