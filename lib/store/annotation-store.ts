import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import type mapboxgl from "mapbox-gl";
import type {
  AnnotationRecord,
  AudienceRecord,
  MeasurementRecord,
  RestrictedRecord,
  AnnotationType,
} from "../types";

// Annotation state interface
interface AnnotationState {
  // Annotation records
  annotations: Record<string, AnnotationRecord>;
  audienceAreas: Record<string, AudienceRecord>;
  measurements: Record<string, MeasurementRecord>;
  restrictedAreas: Record<string, RestrictedRecord>;

  // Markers and refs
  annotationMarkers: mapboxgl.Marker[];

  // Counters
  fireworkCounter: number;
  audienceCounter: number;
  measurementCounter: number;
  restrictedCounter: number;

  // UI state
  showHeight: boolean;
  editingCustomAnnotation: string | null;
}

// Annotation actions interface
interface AnnotationActions {
  // CRUD operations for annotations
  addAnnotation: (annotation: AnnotationRecord) => void;
  updateAnnotation: (id: string, updates: Partial<AnnotationRecord>) => void;
  removeAnnotation: (id: string) => void;
  clearAllAnnotations: () => void;

  // Specific annotation type operations
  addFireworkAnnotation: (
    annotation: Omit<AnnotationRecord, "id" | "type" | "number">
  ) => void;
  addCustomAnnotation: (
    annotation: Omit<AnnotationRecord, "id" | "type" | "number">
  ) => void;
  removeFireworkAnnotation: (id: string) => void;
  removeCustomAnnotation: (id: string) => void;

  // CRUD operations for audience areas
  addAudienceArea: (area: AudienceRecord) => void;
  updateAudienceArea: (id: string, updates: Partial<AudienceRecord>) => void;
  removeAudienceArea: (id: string) => void;
  clearAllAudienceAreas: () => void;

  // CRUD operations for measurements
  addMeasurement: (measurement: MeasurementRecord) => void;
  updateMeasurement: (id: string, updates: Partial<MeasurementRecord>) => void;
  removeMeasurement: (id: string) => void;
  clearAllMeasurements: () => void;

  // CRUD operations for restricted areas
  addRestrictedArea: (area: RestrictedRecord) => void;
  updateRestrictedArea: (
    id: string,
    updates: Partial<RestrictedRecord>
  ) => void;
  removeRestrictedArea: (id: string) => void;
  clearAllRestrictedAreas: () => void;

  // Marker management
  addMarker: (marker: mapboxgl.Marker) => void;
  removeMarker: (marker: mapboxgl.Marker) => void;
  clearAllMarkers: () => void;

  // Counter management
  incrementCounter: (type: AnnotationType) => void;
  resetCounters: () => void;
  getNextAnnotationNumber: () => number;

  // UI state management
  setShowHeight: (show: boolean) => void;
  setEditingCustomAnnotation: (id: string | null) => void;

  // Bulk operations
  clearAll: () => void;
  renumberAnnotations: () => void;

  // Utility actions
  findAnnotationById: (id: string) => AnnotationRecord | undefined;
  findAudienceAreaById: (id: string) => AudienceRecord | undefined;
  findMeasurementById: (id: string) => MeasurementRecord | undefined;
  findRestrictedAreaById: (id: string) => RestrictedRecord | undefined;
}

// Combined store type
export type AnnotationStore = AnnotationState & AnnotationActions;

// Initial state
const initialState: AnnotationState = {
  annotations: {},
  audienceAreas: {},
  measurements: {},
  restrictedAreas: {},
  annotationMarkers: [],
  fireworkCounter: 0,
  audienceCounter: 0,
  measurementCounter: 0,
  restrictedCounter: 0,
  showHeight: false,
  editingCustomAnnotation: null,
};

// Create the annotation store
export const useAnnotationStore = create<AnnotationStore>()(
  subscribeWithSelector((set, get) => ({
    ...initialState,

    // CRUD operations for annotations
    addAnnotation: (annotation) =>
      set((state) => ({
        annotations: { ...state.annotations, [annotation.id]: annotation },
      })),

    updateAnnotation: (id, updates) =>
      set((state) => ({
        annotations: {
          ...state.annotations,
          [id]: { ...state.annotations[id], ...updates },
        },
      })),

    removeAnnotation: (id) =>
      set((state) => {
        const { [id]: removed, ...rest } = state.annotations;
        return { annotations: rest };
      }),

    clearAllAnnotations: () => set({ annotations: {} }),

    // Specific annotation type operations
    addFireworkAnnotation: (annotationData) => {
      const state = get();
      const id = `firework-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2)}`;
      const number = state.getNextAnnotationNumber();
      const annotation: AnnotationRecord = {
        ...annotationData,
        id,
        type: "firework",
        number,
      };
      set((state) => ({
        annotations: { ...state.annotations, [id]: annotation },
        fireworkCounter: state.fireworkCounter + 1,
      }));
    },

    addCustomAnnotation: (annotationData) => {
      const state = get();
      const id = `custom-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const number = state.getNextAnnotationNumber();
      const annotation: AnnotationRecord = {
        ...annotationData,
        id,
        type: "custom",
        number,
      };
      set((state) => ({
        annotations: { ...state.annotations, [id]: annotation },
      }));
    },

    removeFireworkAnnotation: (id) => {
      const state = get();
      const annotation = state.annotations[id];
      if (annotation && annotation.type === "firework") {
        set((state) => {
          const { [id]: removed, ...rest } = state.annotations;
          return {
            annotations: rest,
            fireworkCounter: Math.max(0, state.fireworkCounter - 1),
          };
        });
        // Renumber remaining annotations
        state.renumberAnnotations();
      }
    },

    removeCustomAnnotation: (id) => {
      const state = get();
      const annotation = state.annotations[id];
      if (annotation && annotation.type === "custom") {
        set((state) => {
          const { [id]: removed, ...rest } = state.annotations;
          return { annotations: rest };
        });
        // Renumber remaining annotations
        state.renumberAnnotations();
      }
    },

    // CRUD operations for audience areas
    addAudienceArea: (area) =>
      set((state) => ({
        audienceAreas: { ...state.audienceAreas, [area.id]: area },
      })),

    updateAudienceArea: (id, updates) =>
      set((state) => ({
        audienceAreas: {
          ...state.audienceAreas,
          [id]: { ...state.audienceAreas[id], ...updates },
        },
      })),

    removeAudienceArea: (id) =>
      set((state) => {
        const { [id]: removed, ...rest } = state.audienceAreas;
        return { audienceAreas: rest };
      }),

    clearAllAudienceAreas: () => set({ audienceAreas: {} }),

    // CRUD operations for measurements
    addMeasurement: (measurement) =>
      set((state) => ({
        measurements: { ...state.measurements, [measurement.id]: measurement },
      })),

    updateMeasurement: (id, updates) =>
      set((state) => ({
        measurements: {
          ...state.measurements,
          [id]: { ...state.measurements[id], ...updates },
        },
      })),

    removeMeasurement: (id) =>
      set((state) => {
        const { [id]: removed, ...rest } = state.measurements;
        return { measurements: rest };
      }),

    clearAllMeasurements: () => set({ measurements: {} }),

    // CRUD operations for restricted areas
    addRestrictedArea: (area) =>
      set((state) => ({
        restrictedAreas: { ...state.restrictedAreas, [area.id]: area },
      })),

    updateRestrictedArea: (id, updates) =>
      set((state) => ({
        restrictedAreas: {
          ...state.restrictedAreas,
          [id]: { ...state.restrictedAreas[id], ...updates },
        },
      })),

    removeRestrictedArea: (id) =>
      set((state) => {
        const { [id]: removed, ...rest } = state.restrictedAreas;
        return { restrictedAreas: rest };
      }),

    clearAllRestrictedAreas: () => set({ restrictedAreas: {} }),

    // Marker management
    addMarker: (marker) =>
      set((state) => ({
        annotationMarkers: [...state.annotationMarkers, marker],
      })),

    removeMarker: (marker) =>
      set((state) => ({
        annotationMarkers: state.annotationMarkers.filter((m) => m !== marker),
      })),

    clearAllMarkers: () => set({ annotationMarkers: [] }),

    // Counter management
    incrementCounter: (type) =>
      set((state) => {
        switch (type) {
          case "firework":
            return { fireworkCounter: state.fireworkCounter + 1 };
          case "audience":
            return { audienceCounter: state.audienceCounter + 1 };
          case "measurement":
            return { measurementCounter: state.measurementCounter + 1 };
          case "restricted":
            return { restrictedCounter: state.restrictedCounter + 1 };
          default:
            return state;
        }
      }),

    resetCounters: () =>
      set({
        fireworkCounter: 0,
        audienceCounter: 0,
        measurementCounter: 0,
        restrictedCounter: 0,
      }),

    getNextAnnotationNumber: () => {
      const state = get();
      const allAnnotations = Object.values(state.annotations);
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
    },

    // UI state management
    setShowHeight: (show) => set({ showHeight: show }),
    setEditingCustomAnnotation: (id) => set({ editingCustomAnnotation: id }),

    // Bulk operations
    clearAll: () =>
      set({
        annotations: {},
        audienceAreas: {},
        measurements: {},
        restrictedAreas: {},
        annotationMarkers: [],
        fireworkCounter: 0,
        audienceCounter: 0,
        measurementCounter: 0,
        restrictedCounter: 0,
      }),

    renumberAnnotations: () => {
      const state = get();
      const allAnnotations = Object.values(state.annotations);
      const sortedAnnotations = allAnnotations.sort(
        (a, b) => a.number - b.number
      );

      const renumberedAnnotations: Record<string, AnnotationRecord> = {};
      sortedAnnotations.forEach((annotation, index) => {
        const updatedAnnotation = { ...annotation, number: index + 1 };
        renumberedAnnotations[annotation.id] = updatedAnnotation;
      });

      set({ annotations: renumberedAnnotations });
    },

    // Utility actions
    findAnnotationById: (id) => get().annotations[id],
    findAudienceAreaById: (id) => get().audienceAreas[id],
    findMeasurementById: (id) => get().measurements[id],
    findRestrictedAreaById: (id) => get().restrictedAreas[id],
  }))
);

// Selector functions for performance optimization
export const annotationSelectors = {
  // Basic selectors
  annotations: (state: AnnotationStore) => state.annotations,
  audienceAreas: (state: AnnotationStore) => state.audienceAreas,
  measurements: (state: AnnotationStore) => state.measurements,
  restrictedAreas: (state: AnnotationStore) => state.restrictedAreas,
  annotationMarkers: (state: AnnotationStore) => state.annotationMarkers,

  // Count selectors
  annotationCount: (state: AnnotationStore) =>
    Object.keys(state.annotations).length,
  audienceAreaCount: (state: AnnotationStore) =>
    Object.keys(state.audienceAreas).length,
  measurementCount: (state: AnnotationStore) =>
    Object.keys(state.measurements).length,
  restrictedAreaCount: (state: AnnotationStore) =>
    Object.keys(state.restrictedAreas).length,
  totalAnnotationCount: (state: AnnotationStore) =>
    Object.keys(state.annotations).length +
    Object.keys(state.audienceAreas).length +
    Object.keys(state.measurements).length +
    Object.keys(state.restrictedAreas).length,

  // UI state selectors
  showHeight: (state: AnnotationStore) => state.showHeight,
  editingCustomAnnotation: (state: AnnotationStore) =>
    state.editingCustomAnnotation,

  // Computed selectors
  hasAnnotations: (state: AnnotationStore) =>
    Object.keys(state.annotations).length > 0,
  hasAnyAnnotations: (state: AnnotationStore) =>
    Object.keys(state.annotations).length > 0 ||
    Object.keys(state.audienceAreas).length > 0 ||
    Object.keys(state.measurements).length > 0 ||
    Object.keys(state.restrictedAreas).length > 0,

  // Individual counter selectors (memoized)
  fireworkCounter: (state: AnnotationStore) => state.fireworkCounter,
  audienceCounter: (state: AnnotationStore) => state.audienceCounter,
  measurementCounter: (state: AnnotationStore) => state.measurementCounter,
  restrictedCounter: (state: AnnotationStore) => state.restrictedCounter,
};
