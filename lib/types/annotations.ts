import type mapboxgl from "mapbox-gl";

export type AnnotationType =
  | "firework"
  | "audience"
  | "measurement"
  | "restricted"
  | "custom";

export interface AnnotationItem {
  key: string;
  label: string;
  inches: number;
  color: string;
}

export interface AnnotationRecord {
  type: AnnotationType;
  number: number;
  id: string;
  inches: number;
  label: string;
  color: string;
  marker: mapboxgl.Marker;
  sourceId: string;
  fillLayerId: string;
  lineLayerId: string;
  extrusionLayerId?: string;
  // Custom annotation fields
  emoji?: string;
  description?: string;
  textSourceId?: string;
}

export interface AudienceRecord {
  type: AnnotationType;
  number: number;
  id: string;
  sourceId: string;
  fillLayerId: string;
  lineLayerId: string;
  labelMarker: mapboxgl.Marker;
  cornerMarkers: mapboxgl.Marker[];
  corners: [number, number][];
}

export interface MeasurementRecord {
  type: AnnotationType;
  number: number;
  id: string;
  sourceId: string;
  lineLayerId: string;
  labelMarker: mapboxgl.Marker;
  pointMarkers: mapboxgl.Marker[];
  points: [number, number][];
}

export interface RestrictedRecord {
  type: AnnotationType;
  number: number;
  id: string;
  sourceId: string;
  fillLayerId: string;
  lineLayerId: string;
  labelMarker: mapboxgl.Marker;
  cornerMarkers: mapboxgl.Marker[];
  corners: [number, number][];
}

export interface SerializedFirework {
  id: string;
  number: number;
  position: [number, number];
  inches: number;
  label: string;
  color: string;
}

export interface SerializedCustom {
  id: string;
  number: number;
  position: [number, number];
  label: string;
  color: string;
  emoji?: string;
  description?: string;
}

export interface SerializedAudience {
  id: string;
  number: number;
  corners: [number, number][];
}

export interface SerializedMeasurement {
  id: string;
  number: number;
  points: [number, number][];
}

export interface SerializedRestricted {
  id: string;
  number: number;
  corners: [number, number][];
}
