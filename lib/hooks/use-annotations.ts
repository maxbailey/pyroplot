import { useCallback, useRef } from "react";
import mapboxgl from "mapbox-gl";
import { useAnnotationStore, annotationSelectors } from "@/lib/store";
import {
  createAnnotationId,
  validateAnnotation,
  validateAudienceArea,
  validateMeasurement,
  validateRestrictedArea,
  refreshAllAnnotationTexts,
} from "../utils/annotation-utils";
import type {
  AnnotationRecord,
  AudienceRecord,
  MeasurementRecord,
  RestrictedRecord,
  AnnotationType,
  MeasurementUnit,
  SafetyDistance,
} from "@/lib/types";
import {
  DEFAULT_FIREWORK_COLOR,
  DEFAULT_CUSTOM_COLOR,
  DEFAULT_AUDIENCE_COLOR,
  DEFAULT_MEASUREMENT_COLOR,
  DEFAULT_RESTRICTED_COLOR,
} from "@/lib/constants";

// Main annotation management hook
export const useAnnotations = () => {
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
    showHeight,
    editingCustomAnnotation,
    addAnnotation,
    updateAnnotation,
    removeAnnotation,
    clearAllAnnotations,
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
    incrementCounter,
    resetCounters,
    getNextAnnotationNumber,
    setShowHeight,
    setEditingCustomAnnotation,
    clearAll,
    renumberAnnotations,
    findAnnotationById,
    findAudienceAreaById,
    findMeasurementById,
    findRestrictedAreaById,
  } = useAnnotationStore();

  // Get counts
  const counts = {
    firework: fireworkCounter,
    audience: audienceCounter,
    measurement: measurementCounter,
    restricted: restrictedCounter,
    total:
      fireworkCounter +
      audienceCounter +
      measurementCounter +
      restrictedCounter,
  };

  // Get all annotations as arrays
  const allAnnotations = Object.values(annotations);
  const allAudienceAreas = Object.values(audienceAreas);
  const allMeasurements = Object.values(measurements);
  const allRestrictedAreas = Object.values(restrictedAreas);

  return {
    // Data
    annotations,
    audienceAreas,
    measurements,
    restrictedAreas,
    annotationMarkers,
    allAnnotations,
    allAudienceAreas,
    allMeasurements,
    allRestrictedAreas,
    counts,
    showHeight,
    editingCustomAnnotation,

    // Actions
    addAnnotation,
    updateAnnotation,
    removeAnnotation,
    clearAllAnnotations,
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
    incrementCounter,
    resetCounters,
    getNextAnnotationNumber,
    setShowHeight,
    setEditingCustomAnnotation,
    clearAll,
    renumberAnnotations,

    // Finders
    findAnnotationById,
    findAudienceAreaById,
    findMeasurementById,
    findRestrictedAreaById,
  };
};

// Firework annotation hook
export const useFireworkAnnotations = () => {
  const {
    addAnnotation,
    removeAnnotation,
    incrementCounter,
    getNextAnnotationNumber,
  } = useAnnotations();

  const createFireworkAnnotation = useCallback(
    (
      position: [number, number],
      inches: number,
      label: string,
      color: string = DEFAULT_FIREWORK_COLOR
    ): AnnotationRecord => {
      const id = createAnnotationId("firework");
      const number = getNextAnnotationNumber();

      const annotation: AnnotationRecord = {
        id,
        type: "firework",
        number,
        inches,
        label,
        color,
        marker: new mapboxgl.Marker(),
        sourceId: `firework-${id}`,
        fillLayerId: `firework-fill-${id}`,
        lineLayerId: `firework-line-${id}`,
        extrusionLayerId: `firework-extrude-${id}`,
      };

      incrementCounter("firework");
      return annotation;
    },
    [addAnnotation, getNextAnnotationNumber, incrementCounter]
  );

  const addFireworkAnnotation = useCallback(
    (annotation: AnnotationRecord) => {
      if (validateAnnotation(annotation)) {
        addAnnotation(annotation);
      }
    },
    [addAnnotation]
  );

  const removeFireworkAnnotation = useCallback(
    (id: string) => {
      removeAnnotation(id);
    },
    [removeAnnotation]
  );

  return {
    createFireworkAnnotation,
    addFireworkAnnotation,
    removeFireworkAnnotation,
  };
};

// Custom annotation hook
export const useCustomAnnotations = () => {
  const {
    addAnnotation,
    removeAnnotation,
    incrementCounter,
    getNextAnnotationNumber,
  } = useAnnotations();

  const createCustomAnnotation = useCallback(
    (
      position: [number, number],
      label: string,
      color: string = DEFAULT_CUSTOM_COLOR,
      emoji?: string,
      description?: string
    ): AnnotationRecord => {
      const id = createAnnotationId("custom");
      const number = getNextAnnotationNumber();

      const annotation: AnnotationRecord = {
        id,
        type: "custom",
        number,
        inches: 0,
        label,
        color,
        marker: new mapboxgl.Marker(),
        sourceId: `custom-${id}`,
        fillLayerId: `custom-fill-${id}`,
        lineLayerId: `custom-line-${id}`,
        emoji,
        description,
      };

      incrementCounter("custom");
      return annotation;
    },
    [addAnnotation, getNextAnnotationNumber, incrementCounter]
  );

  const addCustomAnnotation = useCallback(
    (annotation: AnnotationRecord) => {
      if (validateAnnotation(annotation)) {
        addAnnotation(annotation);
      }
    },
    [addAnnotation]
  );

  const removeCustomAnnotation = useCallback(
    (id: string) => {
      removeAnnotation(id);
    },
    [removeAnnotation]
  );

  return {
    createCustomAnnotation,
    addCustomAnnotation,
    removeCustomAnnotation,
  };
};

// Audience area hook
export const useAudienceAreas = () => {
  const {
    addAudienceArea,
    removeAudienceArea,
    incrementCounter,
    getNextAnnotationNumber,
  } = useAnnotations();

  const createAudienceArea = useCallback(
    (
      corners: [number, number][],
      label: string = "Audience"
    ): AudienceRecord => {
      const id = createAnnotationId("audience");
      const number = getNextAnnotationNumber();

      const area: AudienceRecord = {
        id,
        type: "audience",
        number,
        sourceId: `audience-${id}`,
        fillLayerId: `audience-fill-${id}`,
        lineLayerId: `audience-line-${id}`,
        labelMarker: new mapboxgl.Marker(),
        cornerMarkers: [],
        corners,
      };

      incrementCounter("audience");
      return area;
    },
    [addAudienceArea, getNextAnnotationNumber, incrementCounter]
  );

  const addAudienceAreaRecord = useCallback(
    (area: AudienceRecord) => {
      if (validateAudienceArea(area)) {
        addAudienceArea(area);
      }
    },
    [addAudienceArea]
  );

  const removeAudienceAreaRecord = useCallback(
    (id: string) => {
      removeAudienceArea(id);
    },
    [removeAudienceArea]
  );

  return {
    createAudienceArea,
    addAudienceAreaRecord,
    removeAudienceAreaRecord,
  };
};

// Measurement hook
export const useMeasurements = () => {
  const {
    addMeasurement,
    removeMeasurement,
    incrementCounter,
    getNextAnnotationNumber,
  } = useAnnotations();

  const createMeasurement = useCallback(
    (
      points: [number, number][],
      label: string = "Measurement"
    ): MeasurementRecord => {
      const id = createAnnotationId("measurement");
      const number = getNextAnnotationNumber();

      const measurement: MeasurementRecord = {
        id,
        type: "measurement",
        number,
        sourceId: `measurement-${id}`,
        lineLayerId: `measurement-line-${id}`,
        labelMarker: new mapboxgl.Marker(),
        pointMarkers: [],
        points,
      };

      incrementCounter("measurement");
      return measurement;
    },
    [addMeasurement, getNextAnnotationNumber, incrementCounter]
  );

  const addMeasurementRecord = useCallback(
    (measurement: MeasurementRecord) => {
      if (validateMeasurement(measurement)) {
        addMeasurement(measurement);
      }
    },
    [addMeasurement]
  );

  const removeMeasurementRecord = useCallback(
    (id: string) => {
      removeMeasurement(id);
    },
    [removeMeasurement]
  );

  return {
    createMeasurement,
    addMeasurementRecord,
    removeMeasurementRecord,
  };
};

// Restricted area hook
export const useRestrictedAreas = () => {
  const {
    addRestrictedArea,
    removeRestrictedArea,
    incrementCounter,
    getNextAnnotationNumber,
  } = useAnnotations();

  const createRestrictedArea = useCallback(
    (
      corners: [number, number][],
      label: string = "Restricted"
    ): RestrictedRecord => {
      const id = createAnnotationId("restricted");
      const number = getNextAnnotationNumber();

      const area: RestrictedRecord = {
        id,
        type: "restricted",
        number,
        sourceId: `restricted-${id}`,
        fillLayerId: `restricted-fill-${id}`,
        lineLayerId: `restricted-line-${id}`,
        labelMarker: new mapboxgl.Marker(),
        cornerMarkers: [],
        corners,
      };

      incrementCounter("restricted");
      return area;
    },
    [addRestrictedArea, getNextAnnotationNumber, incrementCounter]
  );

  const addRestrictedAreaRecord = useCallback(
    (area: RestrictedRecord) => {
      if (validateRestrictedArea(area)) {
        addRestrictedArea(area);
      }
    },
    [addRestrictedArea]
  );

  const removeRestrictedAreaRecord = useCallback(
    (id: string) => {
      removeRestrictedArea(id);
    },
    [removeRestrictedArea]
  );

  return {
    createRestrictedArea,
    addRestrictedAreaRecord,
    removeRestrictedAreaRecord,
  };
};

// Annotation text refresh hook
export const useAnnotationTextRefresh = () => {
  const { annotations, audienceAreas, measurements, restrictedAreas } =
    useAnnotations();

  const refreshAllTexts = useCallback(
    (
      map: mapboxgl.Map,
      safetyDistance: SafetyDistance,
      measurementUnit: MeasurementUnit
    ) => {
      refreshAllAnnotationTexts(
        map,
        annotations,
        audienceAreas,
        measurements,
        restrictedAreas,
        safetyDistance,
        measurementUnit
      );
    },
    [annotations, audienceAreas, measurements, restrictedAreas]
  );

  return {
    refreshAllTexts,
  };
};
