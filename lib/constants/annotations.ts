import type { AnnotationItem } from "../types";

export const ANNOTATION_PALETTE: AnnotationItem[] = [
  { key: "bore-1", label: '1" Bore', inches: 1, color: "#FF5126" },
  { key: "bore-1-2", label: '1.2" Bore', inches: 1.2, color: "#FF5126" },
  { key: "bore-1-5", label: '1.5" Bore', inches: 1.5, color: "#FF5126" },
  {
    key: "shell-1-75",
    label: '1.75" Shells',
    inches: 1.75,
    color: "#FF5126",
  },
  { key: "shell-2", label: '2" Shells', inches: 2, color: "#FF5126" },
  { key: "shell-2-5", label: '2.5" Shells', inches: 2.5, color: "#FF5126" },
  { key: "shell-3", label: '3" Shells', inches: 3, color: "#FF5126" },
  { key: "shell-4", label: '4" Shells', inches: 4, color: "#FF5126" },
  { key: "shell-5", label: '5" Shells', inches: 5, color: "#FF5126" },
  { key: "shell-6", label: '6" Shells', inches: 6, color: "#FF5126" },
  { key: "shell-7", label: '7" Shells', inches: 7, color: "#FF5126" },
  { key: "shell-8", label: '8" Shells', inches: 8, color: "#FF5126" },
  { key: "shell-10", label: '10" Shells', inches: 10, color: "#FF5126" },
  { key: "shell-12", label: '12" Shells', inches: 12, color: "#FF5126" },
  { key: "shell-16", label: '16" Shells', inches: 16, color: "#FF5126" },
  { key: "audience", label: "Audience", inches: 0, color: "#3B82F6" },
  { key: "measurement", label: "Measurement", inches: 0, color: "#22C55E" },
  { key: "restricted", label: "Restricted", inches: 0, color: "#EF4444" },
  { key: "custom", label: "Custom", inches: 0, color: "#8B5CF6" },
];

// Default colors
export const DEFAULT_FIREWORK_COLOR = "#FF5126";
export const DEFAULT_AUDIENCE_COLOR = "#3B82F6";
export const DEFAULT_MEASUREMENT_COLOR = "#22C55E";
export const DEFAULT_RESTRICTED_COLOR = "#EF4444";
export const DEFAULT_CUSTOM_COLOR = "#8B5CF6";

// Annotation type keys
export const ANNOTATION_KEYS = {
  FIREWORK: "firework",
  AUDIENCE: "audience",
  MEASUREMENT: "measurement",
  RESTRICTED: "restricted",
  CUSTOM: "custom",
} as const;
