import type { Feature, Polygon } from "geojson";
import { feetToMeters, metersToFeet } from "@/components/pdf-generator/utils";
import { GEO_CONSTANTS } from "@/lib/constants";
import type { MeasurementUnit } from "@/lib/types";

/**
 * Creates a circular polygon feature for map display
 * @param lng - Longitude of the circle center
 * @param lat - Latitude of the circle center
 * @param radiusMeters - Radius of the circle in meters
 * @param points - Number of points to approximate the circle (default: 64)
 * @returns GeoJSON Feature<Polygon> representing the circle
 */
export function createCircleFeature(
  lng: number,
  lat: number,
  radiusMeters: number,
  points = 64
): Feature<Polygon> {
  const coords: [number, number][] = [];
  const center = [lng, lat] as [number, number];
  const earthRadius = 6378137; // meters

  for (let i = 0; i < points; i++) {
    const angle = (i / points) * 2 * Math.PI;
    const x =
      center[0] +
      ((radiusMeters / earthRadius) * (180 / Math.PI) * Math.cos(angle)) /
        Math.cos((center[1] * Math.PI) / 180);
    const y =
      center[1] +
      (radiusMeters / earthRadius) * (180 / Math.PI) * Math.sin(angle);
    coords.push([x, y]);
  }

  return {
    type: "Feature",
    geometry: {
      type: "Polygon",
      coordinates: [coords],
    },
    properties: {},
  } as Feature<Polygon>;
}

/**
 * Creates a rectangular polygon feature for map display
 * @param corners - Array of 4 corner coordinates in [lng, lat] format
 * @returns GeoJSON Feature<Polygon> representing the rectangle
 */
export function createRectangleFeature(
  corners: [number, number][]
): Feature<Polygon> {
  // corners should be in [lng, lat] order and form a rectangle
  const ring = [...corners, corners[0]] as [number, number][];
  return {
    type: "Feature",
    geometry: { type: "Polygon", coordinates: [ring] },
    properties: {},
  } as Feature<Polygon>;
}

/**
 * Normalizes corner coordinates to ensure proper rectangle formation
 * @param input - Array of corner coordinates
 * @returns Normalized corners in [SW, SE, NE, NW] order
 */
export function normalizeCorners(
  input: [number, number][]
): [number, number][] {
  const lngs = input.map((c) => c[0]);
  const lats = input.map((c) => c[1]);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  return [
    [minLng, minLat], // SW
    [maxLng, minLat], // SE
    [maxLng, maxLat], // NE
    [minLng, maxLat], // NW
  ];
}

/**
 * Formats distance with space between value and unit
 * @param meters - Distance in meters
 * @param measurementUnit - Unit to convert to
 * @returns Formatted distance string
 */
export function formatDistanceWithSpace(
  meters: number,
  measurementUnit: MeasurementUnit
): string {
  if (measurementUnit === "feet") {
    return `${Math.round(metersToFeet(meters))} ft`;
  }
  return `${Math.round(meters)} m`;
}

/**
 * Formats distance without space between value and unit
 * @param meters - Distance in meters
 * @param measurementUnit - Unit to convert to
 * @returns Formatted distance string
 */
export function formatLengthNoSpace(
  meters: number,
  measurementUnit: MeasurementUnit
): string {
  if (measurementUnit === "feet") {
    return `${Math.round(metersToFeet(meters))}ft`;
  }
  return `${Math.round(meters)}m`;
}

/**
 * Calculates the distance between two points using the Haversine formula
 * @param lat1 - Latitude of first point
 * @param lng1 - Longitude of first point
 * @param lat2 - Latitude of second point
 * @param lng2 - Longitude of second point
 * @returns Distance in meters
 */
export function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const lat1Rad = (lat1 * Math.PI) / 180;
  const lat2Rad = (lat2 * Math.PI) / 180;
  const deltaLat = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLng = ((lng2 - lng1) * Math.PI) / 180;

  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1Rad) *
      Math.cos(lat2Rad) *
      Math.sin(deltaLng / 2) *
      Math.sin(deltaLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return GEO_CONSTANTS.EARTH_RADIUS * c;
}

/**
 * Converts meters to longitude degrees at a given latitude
 * @param meters - Distance in meters
 * @param latitude - Latitude for the conversion
 * @returns Longitude degrees
 */
export function metersToLongitude(meters: number, latitude: number): number {
  return (
    meters /
    (GEO_CONSTANTS.METERS_PER_DEGREE_LNG * Math.cos((latitude * Math.PI) / 180))
  );
}

/**
 * Converts meters to latitude degrees
 * @param meters - Distance in meters
 * @returns Latitude degrees
 */
export function metersToLatitude(meters: number): number {
  return meters / GEO_CONSTANTS.METERS_PER_DEGREE_LAT;
}

/**
 * Converts longitude degrees to meters at a given latitude
 * @param longitude - Longitude degrees
 * @param latitude - Latitude for the conversion
 * @returns Distance in meters
 */
export function longitudeToMeters(longitude: number, latitude: number): number {
  return (
    longitude *
    GEO_CONSTANTS.METERS_PER_DEGREE_LNG *
    Math.cos((latitude * Math.PI) / 180)
  );
}

/**
 * Converts latitude degrees to meters
 * @param latitude - Latitude degrees
 * @returns Distance in meters
 */
export function latitudeToMeters(latitude: number): number {
  return latitude * GEO_CONSTANTS.METERS_PER_DEGREE_LAT;
}

/**
 * Calculates the center point of a rectangle defined by corners
 * @param corners - Array of corner coordinates
 * @returns Center point as [lng, lat]
 */
export function calculateRectangleCenter(
  corners: [number, number][]
): [number, number] {
  const lngs = corners.map((c) => c[0]);
  const lats = corners.map((c) => c[1]);
  const centerLng = (Math.min(...lngs) + Math.max(...lngs)) / 2;
  const centerLat = (Math.min(...lats) + Math.max(...lats)) / 2;
  return [centerLng, centerLat];
}

/**
 * Calculates the dimensions of a rectangle in meters
 * @param corners - Array of corner coordinates
 * @returns Object with width and height in meters
 */
export function calculateRectangleDimensions(corners: [number, number][]): {
  width: number;
  height: number;
} {
  const [centerLng, centerLat] = calculateRectangleCenter(corners);
  const lngs = corners.map((c) => c[0]);
  const lats = corners.map((c) => c[1]);

  const widthMeters =
    Math.abs(Math.max(...lngs) - Math.min(...lngs)) *
    GEO_CONSTANTS.METERS_PER_DEGREE_LNG *
    Math.cos((centerLat * Math.PI) / 180);
  const heightMeters =
    Math.abs(Math.max(...lats) - Math.min(...lats)) *
    GEO_CONSTANTS.METERS_PER_DEGREE_LAT;

  return { width: widthMeters, height: heightMeters };
}
