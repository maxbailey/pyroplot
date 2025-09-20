import type mapboxgl from "mapbox-gl";
import type {
  AnnotationRecord,
  AudienceRecord,
  MeasurementRecord,
  RestrictedRecord,
  AnnotationType,
  MeasurementUnit,
  SafetyDistance,
} from "@/lib/types";
import { GEO_CONSTANTS, MAP_INTERACTION } from "@/lib/constants";
import { feetToMeters, metersToFeet } from "@/components/pdf-generator/utils";
import {
  createCircleFeature,
  createRectangleFeature,
  normalizeCorners,
  formatDistanceWithSpace,
  formatLengthNoSpace,
} from "./map-utils";

/**
 * Refreshes all measurement text displays on the map
 * @param map - Mapbox map instance
 * @param measurements - Record of measurement data
 * @param measurementUnit - Current measurement unit
 */
export function refreshAllMeasurementTexts(
  map: mapboxgl.Map,
  measurements: Record<string, MeasurementRecord>,
  measurementUnit: MeasurementUnit
): void {
  // Measurements
  for (const key of Object.keys(measurements)) {
    const rec = measurements[key]!;
    const pts = rec.points;
    const distanceMeters = calculateDistance(
      pts[0][1],
      pts[0][0],
      pts[1][1],
      pts[1][0]
    );
    const el = rec.labelMarker.getElement();
    let distanceDiv = el.querySelector(
      '[data-role="distance"]'
    ) as HTMLDivElement | null;
    if (!distanceDiv) {
      distanceDiv = document.createElement("div");
      distanceDiv.setAttribute("data-role", "distance");
      el.appendChild(distanceDiv);
    }
    distanceDiv.textContent = formatDistanceWithSpace(
      distanceMeters,
      measurementUnit
    );
  }
}

/**
 * Refreshes all audience area dimension displays on the map
 * @param map - Mapbox map instance
 * @param audienceAreas - Record of audience area data
 * @param measurementUnit - Current measurement unit
 */
export function refreshAllAudienceAreaTexts(
  map: mapboxgl.Map,
  audienceAreas: Record<string, AudienceRecord>,
  measurementUnit: MeasurementUnit
): void {
  for (const key of Object.keys(audienceAreas)) {
    const rec = audienceAreas[key]!;
    const c = rec.corners;
    const centerLat = (c[0][1] + c[2][1]) / 2;
    const metersW =
      Math.abs(c[1][0] - c[0][0]) *
      GEO_CONSTANTS.METERS_PER_DEGREE_LNG *
      Math.cos((centerLat * Math.PI) / 180);
    const metersH =
      Math.abs(c[3][1] - c[0][1]) * GEO_CONSTANTS.METERS_PER_DEGREE_LAT;
    const root = rec.labelMarker.getElement();
    let div = root.querySelector('[data-role="dims"]') as HTMLDivElement | null;
    if (!div) {
      div = document.createElement("div");
      div.setAttribute("data-role", "dims");
      root.appendChild(div);
    }
    div.textContent = `${formatLengthNoSpace(
      metersW,
      measurementUnit
    )} × ${formatLengthNoSpace(metersH, measurementUnit)}`;
  }
}

/**
 * Refreshes all restricted area dimension displays on the map
 * @param map - Mapbox map instance
 * @param restrictedAreas - Record of restricted area data
 * @param measurementUnit - Current measurement unit
 */
export function refreshAllRestrictedAreaTexts(
  map: mapboxgl.Map,
  restrictedAreas: Record<string, RestrictedRecord>,
  measurementUnit: MeasurementUnit
): void {
  for (const key of Object.keys(restrictedAreas)) {
    const rec = restrictedAreas[key]!;
    const c = rec.corners;
    const centerLat = (c[0][1] + c[2][1]) / 2;
    const metersW =
      Math.abs(c[1][0] - c[0][0]) *
      GEO_CONSTANTS.METERS_PER_DEGREE_LNG *
      Math.cos((centerLat * Math.PI) / 180);
    const metersH =
      Math.abs(c[3][1] - c[0][1]) * GEO_CONSTANTS.METERS_PER_DEGREE_LAT;
    const root = rec.labelMarker.getElement();
    let div = root.querySelector('[data-role="dims"]') as HTMLDivElement | null;
    if (!div) {
      div = document.createElement("div");
      div.setAttribute("data-role", "dims");
      root.appendChild(div);
    }
    div.textContent = `${formatLengthNoSpace(
      metersW,
      measurementUnit
    )} × ${formatLengthNoSpace(metersH, measurementUnit)}`;
  }
}

/**
 * Refreshes all firework annotation radius displays on the map
 * @param map - Mapbox map instance
 * @param annotations - Record of annotation data
 * @param safetyDistance - Current safety distance multiplier
 * @param measurementUnit - Current measurement unit
 */
export function refreshAllFireworkTexts(
  map: mapboxgl.Map,
  annotations: Record<string, AnnotationRecord>,
  safetyDistance: SafetyDistance,
  measurementUnit: MeasurementUnit
): void {
  for (const key of Object.keys(annotations)) {
    const rec = annotations[key]!;
    if (rec.type !== "firework") continue;
    const el = rec.marker.getElement();
    const second = el.querySelector(
      "div:nth-child(2)"
    ) as HTMLDivElement | null;
    if (!second) continue;
    const radiusFeet = Math.round(rec.inches * safetyDistance);
    const text =
      measurementUnit === "feet"
        ? `${radiusFeet} ft radius`
        : `${Math.round(feetToMeters(radiusFeet))} m radius`;
    second.textContent = text;

    // Update circle geometry with new safety distance
    const pos = rec.marker.getLngLat();
    const radiusMeters = feetToMeters(rec.inches * safetyDistance);
    const updatedCircle = createCircleFeature(pos.lng, pos.lat, radiusMeters);
    const source = map.getSource(rec.sourceId) as mapboxgl.GeoJSONSource;
    if (source) {
      source.setData({
        type: "FeatureCollection",
        features: [updatedCircle],
      });
    }
  }
}

/**
 * Refreshes all annotation text displays
 * @param map - Mapbox map instance
 * @param annotations - Record of annotation data
 * @param audienceAreas - Record of audience area data
 * @param measurements - Record of measurement data
 * @param restrictedAreas - Record of restricted area data
 * @param safetyDistance - Current safety distance multiplier
 * @param measurementUnit - Current measurement unit
 */
export function refreshAllAnnotationTexts(
  map: mapboxgl.Map,
  annotations: Record<string, AnnotationRecord>,
  audienceAreas: Record<string, AudienceRecord>,
  measurements: Record<string, MeasurementRecord>,
  restrictedAreas: Record<string, RestrictedRecord>,
  safetyDistance: SafetyDistance,
  measurementUnit: MeasurementUnit
): void {
  refreshAllFireworkTexts(map, annotations, safetyDistance, measurementUnit);
  refreshAllAudienceAreaTexts(map, audienceAreas, measurementUnit);
  refreshAllMeasurementTexts(map, measurements, measurementUnit);
  refreshAllRestrictedAreaTexts(map, restrictedAreas, measurementUnit);
}

/**
 * Gets the next available annotation number
 * @param annotations - Record of existing annotations
 * @returns Next available number
 */
export function getNextAnnotationNumber(
  annotations: Record<string, AnnotationRecord>
): number {
  const allAnnotations = Object.values(annotations);
  const allNumbers = allAnnotations
    .map((ann) => ann.number)
    .sort((a, b) => a - b);

  let nextNumber = 1;
  for (const num of allNumbers) {
    if (num === nextNumber) {
      nextNumber++;
    } else {
      break;
    }
  }
  return nextNumber;
}

/**
 * Renumbers all annotations sequentially
 * @param annotations - Record of annotations to renumber
 * @returns Updated annotations record
 */
export function renumberAnnotations(
  annotations: Record<string, AnnotationRecord>
): Record<string, AnnotationRecord> {
  const allAnnotations = Object.values(annotations).sort(
    (a, b) => a.number - b.number
  );
  const updatedAnnotations: Record<string, AnnotationRecord> = {};

  allAnnotations.forEach((annotation, index) => {
    const newNumber = index + 1;
    updatedAnnotations[annotation.id] = {
      ...annotation,
      number: newNumber,
    };
  });

  return updatedAnnotations;
}

/**
 * Creates a unique ID for annotations
 * @param type - Type of annotation
 * @param prefix - Optional prefix for the ID
 * @returns Unique ID string
 */
export function createAnnotationId(
  type: AnnotationType,
  prefix?: string
): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).slice(2);
  const typePrefix = prefix || type.slice(0, 3);
  return `${typePrefix}-${timestamp}-${random}`;
}

/**
 * Validates annotation data
 * @param annotation - Annotation to validate
 * @returns True if valid, false otherwise
 */
export function validateAnnotation(
  annotation: Partial<AnnotationRecord>
): boolean {
  return !!(
    annotation.id &&
    annotation.type &&
    annotation.number &&
    annotation.label &&
    annotation.color
  );
}

/**
 * Validates audience area data
 * @param area - Audience area to validate
 * @returns True if valid, false otherwise
 */
export function validateAudienceArea(area: Partial<AudienceRecord>): boolean {
  return !!(
    area.id &&
    area.type &&
    area.number &&
    area.corners &&
    area.corners.length === 4
  );
}

/**
 * Validates measurement data
 * @param measurement - Measurement to validate
 * @returns True if valid, false otherwise
 */
export function validateMeasurement(
  measurement: Partial<MeasurementRecord>
): boolean {
  return !!(
    measurement.id &&
    measurement.type &&
    measurement.number &&
    measurement.points &&
    measurement.points.length === 2
  );
}

/**
 * Validates restricted area data
 * @param area - Restricted area to validate
 * @returns True if valid, false otherwise
 */
export function validateRestrictedArea(
  area: Partial<RestrictedRecord>
): boolean {
  return !!(
    area.id &&
    area.type &&
    area.number &&
    area.corners &&
    area.corners.length === 4
  );
}

/**
 * Calculates the distance between two points using the Haversine formula
 * @param lat1 - Latitude of first point
 * @param lng1 - Longitude of first point
 * @param lat2 - Latitude of second point
 * @param lng2 - Longitude of second point
 * @returns Distance in meters
 */
function calculateDistance(
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
