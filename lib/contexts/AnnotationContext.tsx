"use client";

import React, { createContext, useContext, useMemo, useCallback } from "react";
import type mapboxgl from "mapbox-gl";
import { useAnnotationStore, annotationSelectors } from "@/lib/store";
import {
  useAnnotations,
  useFireworkAnnotations,
  useCustomAnnotations,
  useAudienceAreas,
  useMeasurements,
  useRestrictedAreas,
  useAnnotationTextRefresh,
} from "@/lib/hooks";
import type {
  AnnotationRecord,
  AudienceRecord,
  MeasurementRecord,
  RestrictedRecord,
  AnnotationType,
} from "@/lib/types";

// Annotation context interface
interface AnnotationContextValue {
  // Annotation state
  annotations: Record<string, AnnotationRecord>;
  audienceAreas: Record<string, AudienceRecord>;
  measurements: Record<string, MeasurementRecord>;
  restrictedAreas: Record<string, RestrictedRecord>;
  annotationMarkers: mapboxgl.Marker[];

  // Counters
  fireworkCounter: number;
  audienceCounter: number;
  measurementCounter: number;
  restrictedCounter: number;

  // Computed values
  annotationCount: number;
  audienceCount: number;
  measurementCount: number;
  restrictedCount: number;
  totalAnnotations: number;

  // Firework annotation actions
  addFireworkAnnotation: (
    annotation: Omit<AnnotationRecord, "id" | "number">
  ) => void;
  removeFireworkAnnotation: (id: string) => void;

  // Custom annotation actions
  addCustomAnnotation: (
    annotation: Omit<AnnotationRecord, "id" | "number">
  ) => void;
  removeCustomAnnotation: (id: string) => void;

  // Audience area actions
  addAudienceArea: (area: Omit<AudienceRecord, "id" | "number">) => void;
  updateAudienceArea: (id: string, updates: Partial<AudienceRecord>) => void;
  removeAudienceArea: (id: string) => void;
  clearAllAudienceAreas: () => void;

  // Measurement actions
  addMeasurement: (
    measurement: Omit<MeasurementRecord, "id" | "number">
  ) => void;
  updateMeasurement: (id: string, updates: Partial<MeasurementRecord>) => void;
  removeMeasurement: (id: string) => void;
  clearAllMeasurements: () => void;

  // Restricted area actions
  addRestrictedArea: (area: Omit<RestrictedRecord, "id" | "number">) => void;
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

  // Utility actions
  renumberAnnotations: () => void;
  getNextAnnotationNumber: () => number;
  clearAll: () => void;
  refreshAllAnnotationTexts: () => void;

  // Find functions
  findAnnotationById: (id: string) => AnnotationRecord | undefined;
  findAudienceAreaById: (id: string) => AudienceRecord | undefined;
  findMeasurementById: (id: string) => MeasurementRecord | undefined;
  findRestrictedAreaById: (id: string) => RestrictedRecord | undefined;
}

// Create the context
const AnnotationContext = createContext<AnnotationContextValue | undefined>(
  undefined
);

// Annotation context provider
export const AnnotationProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  // Get store state and actions
  const {
    annotations,
    audienceAreas,
    measurements,
    restrictedAreas,
    annotationMarkers,
    fireworkCounter,
    audienceCounter,
    measurementCounter,
    restrictedCounter,
    addFireworkAnnotation: storeAddFireworkAnnotation,
    removeFireworkAnnotation: storeRemoveFireworkAnnotation,
    addCustomAnnotation: storeAddCustomAnnotation,
    removeCustomAnnotation: storeRemoveCustomAnnotation,
    addAudienceArea: storeAddAudienceArea,
    updateAudienceArea: storeUpdateAudienceArea,
    removeAudienceArea: storeRemoveAudienceArea,
    clearAllAudienceAreas: storeClearAllAudienceAreas,
    addMeasurement: storeAddMeasurement,
    updateMeasurement: storeUpdateMeasurement,
    removeMeasurement: storeRemoveMeasurement,
    clearAllMeasurements: storeClearAllMeasurements,
    addRestrictedArea: storeAddRestrictedArea,
    updateRestrictedArea: storeUpdateRestrictedArea,
    removeRestrictedArea: storeRemoveRestrictedArea,
    clearAllRestrictedAreas: storeClearAllRestrictedAreas,
    addMarker: storeAddMarker,
    removeMarker: storeRemoveMarker,
    clearAllMarkers: storeClearAllMarkers,
    renumberAnnotations: storeRenumberAnnotations,
    getNextAnnotationNumber: storeGetNextAnnotationNumber,
    clearAll: storeClearAll,
    findAnnotationById: storeFindAnnotationById,
    findAudienceAreaById: storeFindAudienceAreaById,
    findMeasurementById: storeFindMeasurementById,
    findRestrictedAreaById: storeFindRestrictedAreaById,
  } = useAnnotationStore();

  // Get hooks
  const { refreshAllTexts } = useAnnotationTextRefresh();

  // Memoized computed values
  const annotationCount = useMemo(
    () => Object.keys(annotations).length,
    [annotations]
  );
  const audienceCount = useMemo(
    () => Object.keys(audienceAreas).length,
    [audienceAreas]
  );
  const measurementCount = useMemo(
    () => Object.keys(measurements).length,
    [measurements]
  );
  const restrictedCount = useMemo(
    () => Object.keys(restrictedAreas).length,
    [restrictedAreas]
  );
  const totalAnnotations = useMemo(
    () => annotationCount + audienceCount + measurementCount + restrictedCount,
    [annotationCount, audienceCount, measurementCount, restrictedCount]
  );

  // Memoized action handlers
  const addFireworkAnnotation = useCallback(
    (annotation: Omit<AnnotationRecord, "id" | "number">) => {
      storeAddFireworkAnnotation(annotation);
    },
    [storeAddFireworkAnnotation]
  );

  const removeFireworkAnnotation = useCallback(
    (id: string) => {
      storeRemoveFireworkAnnotation(id);
    },
    [storeRemoveFireworkAnnotation]
  );

  const addCustomAnnotation = useCallback(
    (annotation: Omit<AnnotationRecord, "id" | "number">) => {
      storeAddCustomAnnotation(annotation);
    },
    [storeAddCustomAnnotation]
  );

  const removeCustomAnnotation = useCallback(
    (id: string) => {
      storeRemoveCustomAnnotation(id);
    },
    [storeRemoveCustomAnnotation]
  );

  const addAudienceArea = useCallback(
    (area: Omit<AudienceRecord, "id" | "number">) => {
      const id = `aud-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const number = storeGetNextAnnotationNumber();
      const fullArea: AudienceRecord = { ...area, id, number };
      storeAddAudienceArea(fullArea);
    },
    [storeAddAudienceArea, storeGetNextAnnotationNumber]
  );

  const updateAudienceArea = useCallback(
    (id: string, updates: Partial<AudienceRecord>) => {
      storeUpdateAudienceArea(id, updates);
    },
    [storeUpdateAudienceArea]
  );

  const removeAudienceArea = useCallback(
    (id: string) => {
      storeRemoveAudienceArea(id);
    },
    [storeRemoveAudienceArea]
  );

  const clearAllAudienceAreas = useCallback(() => {
    storeClearAllAudienceAreas();
  }, [storeClearAllAudienceAreas]);

  const addMeasurement = useCallback(
    (measurement: Omit<MeasurementRecord, "id" | "number">) => {
      const id = `meas-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const number = storeGetNextAnnotationNumber();
      const fullMeasurement: MeasurementRecord = { ...measurement, id, number };
      storeAddMeasurement(fullMeasurement);
    },
    [storeAddMeasurement, storeGetNextAnnotationNumber]
  );

  const updateMeasurement = useCallback(
    (id: string, updates: Partial<MeasurementRecord>) => {
      storeUpdateMeasurement(id, updates);
    },
    [storeUpdateMeasurement]
  );

  const removeMeasurement = useCallback(
    (id: string) => {
      storeRemoveMeasurement(id);
    },
    [storeRemoveMeasurement]
  );

  const clearAllMeasurements = useCallback(() => {
    storeClearAllMeasurements();
  }, [storeClearAllMeasurements]);

  const addRestrictedArea = useCallback(
    (area: Omit<RestrictedRecord, "id" | "number">) => {
      const id = `rest-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const number = storeGetNextAnnotationNumber();
      const fullArea: RestrictedRecord = { ...area, id, number };
      storeAddRestrictedArea(fullArea);
    },
    [storeAddRestrictedArea, storeGetNextAnnotationNumber]
  );

  const updateRestrictedArea = useCallback(
    (id: string, updates: Partial<RestrictedRecord>) => {
      storeUpdateRestrictedArea(id, updates);
    },
    [storeUpdateRestrictedArea]
  );

  const removeRestrictedArea = useCallback(
    (id: string) => {
      storeRemoveRestrictedArea(id);
    },
    [storeRemoveRestrictedArea]
  );

  const clearAllRestrictedAreas = useCallback(() => {
    storeClearAllRestrictedAreas();
  }, [storeClearAllRestrictedAreas]);

  const addMarker = useCallback(
    (marker: mapboxgl.Marker) => {
      storeAddMarker(marker);
    },
    [storeAddMarker]
  );

  const removeMarker = useCallback(
    (marker: mapboxgl.Marker) => {
      storeRemoveMarker(marker);
    },
    [storeRemoveMarker]
  );

  const clearAllMarkers = useCallback(() => {
    storeClearAllMarkers();
  }, [storeClearAllMarkers]);

  const renumberAnnotations = useCallback(() => {
    storeRenumberAnnotations();
  }, [storeRenumberAnnotations]);

  const getNextAnnotationNumber = useCallback(() => {
    return storeGetNextAnnotationNumber();
  }, [storeGetNextAnnotationNumber]);

  const clearAll = useCallback(() => {
    storeClearAll();
  }, [storeClearAll]);

  const refreshAllAnnotationTextsMemo = useCallback(() => {
    // Note: This would need map, safetyDistance, and measurementUnit from other contexts
    // For now, we'll leave this as a placeholder
    console.log(
      "refreshAllAnnotationTexts called - needs map context integration"
    );
  }, []);

  // Memoized context value
  const contextValue = useMemo(
    () => ({
      // Annotation state
      annotations,
      audienceAreas,
      measurements,
      restrictedAreas,
      annotationMarkers,

      // Counters
      fireworkCounter,
      audienceCounter,
      measurementCounter,
      restrictedCounter,

      // Computed values
      annotationCount,
      audienceCount,
      measurementCount,
      restrictedCount,
      totalAnnotations,

      // Firework annotation actions
      addFireworkAnnotation,
      removeFireworkAnnotation,

      // Custom annotation actions
      addCustomAnnotation,
      removeCustomAnnotation,

      // Audience area actions
      addAudienceArea,
      updateAudienceArea,
      removeAudienceArea,
      clearAllAudienceAreas,

      // Measurement actions
      addMeasurement,
      updateMeasurement,
      removeMeasurement,
      clearAllMeasurements,

      // Restricted area actions
      addRestrictedArea,
      updateRestrictedArea,
      removeRestrictedArea,
      clearAllRestrictedAreas,

      // Marker management
      addMarker,
      removeMarker,
      clearAllMarkers,

      // Utility actions
      renumberAnnotations,
      getNextAnnotationNumber,
      clearAll,
      refreshAllAnnotationTexts: refreshAllAnnotationTextsMemo,

      // Find functions
      findAnnotationById: storeFindAnnotationById,
      findAudienceAreaById: storeFindAudienceAreaById,
      findMeasurementById: storeFindMeasurementById,
      findRestrictedAreaById: storeFindRestrictedAreaById,
    }),
    [
      annotations,
      audienceAreas,
      measurements,
      restrictedAreas,
      annotationMarkers,
      fireworkCounter,
      audienceCounter,
      measurementCounter,
      restrictedCounter,
      annotationCount,
      audienceCount,
      measurementCount,
      restrictedCount,
      totalAnnotations,
      addFireworkAnnotation,
      removeFireworkAnnotation,
      addCustomAnnotation,
      removeCustomAnnotation,
      addAudienceArea,
      updateAudienceArea,
      removeAudienceArea,
      clearAllAudienceAreas,
      addMeasurement,
      updateMeasurement,
      removeMeasurement,
      clearAllMeasurements,
      addRestrictedArea,
      updateRestrictedArea,
      removeRestrictedArea,
      clearAllRestrictedAreas,
      addMarker,
      removeMarker,
      clearAllMarkers,
      renumberAnnotations,
      getNextAnnotationNumber,
      clearAll,
      refreshAllAnnotationTextsMemo,
      storeFindAnnotationById,
      storeFindAudienceAreaById,
      storeFindMeasurementById,
      storeFindRestrictedAreaById,
    ]
  );

  return (
    <AnnotationContext.Provider value={contextValue}>
      {children}
    </AnnotationContext.Provider>
  );
};

// Hook to use annotation context
export const useAnnotationContext = () => {
  const context = useContext(AnnotationContext);
  if (context === undefined) {
    throw new Error(
      "useAnnotationContext must be used within an AnnotationProvider"
    );
  }
  return context;
};

// Selector hooks for specific parts of annotation state
export const useAnnotationState = () => {
  const {
    annotations,
    audienceAreas,
    measurements,
    restrictedAreas,
    annotationMarkers,
  } = useAnnotationContext();
  return {
    annotations,
    audienceAreas,
    measurements,
    restrictedAreas,
    annotationMarkers,
  };
};

export const useAnnotationCounters = () => {
  const {
    fireworkCounter,
    audienceCounter,
    measurementCounter,
    restrictedCounter,
    annotationCount,
    audienceCount,
    measurementCount,
    restrictedCount,
    totalAnnotations,
  } = useAnnotationContext();
  return {
    fireworkCounter,
    audienceCounter,
    measurementCounter,
    restrictedCounter,
    annotationCount,
    audienceCount,
    measurementCount,
    restrictedCount,
    totalAnnotations,
  };
};

export const useAnnotationActions = () => {
  const {
    addFireworkAnnotation,
    removeFireworkAnnotation,
    addCustomAnnotation,
    removeCustomAnnotation,
    addAudienceArea,
    updateAudienceArea,
    removeAudienceArea,
    clearAllAudienceAreas,
    addMeasurement,
    updateMeasurement,
    removeMeasurement,
    clearAllMeasurements,
    addRestrictedArea,
    updateRestrictedArea,
    removeRestrictedArea,
    clearAllRestrictedAreas,
    addMarker,
    removeMarker,
    clearAllMarkers,
    renumberAnnotations,
    getNextAnnotationNumber,
    clearAll,
    refreshAllAnnotationTexts,
  } = useAnnotationContext();
  return {
    addFireworkAnnotation,
    removeFireworkAnnotation,
    addCustomAnnotation,
    removeCustomAnnotation,
    addAudienceArea,
    updateAudienceArea,
    removeAudienceArea,
    clearAllAudienceAreas,
    addMeasurement,
    updateMeasurement,
    removeMeasurement,
    clearAllMeasurements,
    addRestrictedArea,
    updateRestrictedArea,
    removeRestrictedArea,
    clearAllRestrictedAreas,
    addMarker,
    removeMarker,
    clearAllMarkers,
    renumberAnnotations,
    getNextAnnotationNumber,
    clearAll,
    refreshAllAnnotationTexts,
  };
};
