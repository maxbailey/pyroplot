export type MeasurementUnit = "feet" | "meters";

export type SafetyDistance = 70 | 100;

import type {
  SerializedFirework,
  SerializedCustom,
  SerializedAudience,
  SerializedMeasurement,
  SerializedRestricted,
} from "./annotations";

export interface SerializedState {
  camera: {
    center: [number, number];
    zoom: number;
    pitch: number;
    bearing: number;
  };
  fireworks: SerializedFirework[];
  custom: SerializedCustom[];
  audiences: SerializedAudience[];
  measurements: SerializedMeasurement[];
  restricted: SerializedRestricted[];
  showHeight: boolean;
  measurementUnit?: "feet" | "meters";
  projectName?: string;
  safetyDistance?: 70 | 100;
  v: number;
}
