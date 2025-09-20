import { useCallback } from "react";
import mapboxgl from "mapbox-gl";
import { useAnnotationContext, useUIContext } from "@/lib/contexts";
import type { AnnotationRecord } from "@/lib/types";

export const useCustomAnnotations = () => {
  const { annotations, findAnnotationById, removeCustomAnnotation } =
    useAnnotationContext();
  const { handleCustomAnnotationClick } = useUIContext();

  const updateCustomAnnotation = useCallback(
    (
      id: string,
      updates: { label: string; color: string },
      mapRef: React.RefObject<mapboxgl.Map | null>,
      annotationsRef: React.RefObject<Record<string, AnnotationRecord>>
    ) => {
      if (!annotationsRef.current?.[id] || !mapRef.current) return;

      const annotation = annotationsRef.current[id];
      const map = mapRef.current;

      // Update the annotation with new values
      annotation.label = updates.label;
      annotation.color = updates.color;

      // Update the marker element directly (simplified approach)
      const marker = annotation.marker;
      const element = marker.getElement();

      // Update the label text and color
      element.textContent = updates.label;
      element.style.backgroundColor = updates.color;

      // Update the annotation record
      annotation.label = updates.label;
      annotation.color = updates.color;
    },
    [
      annotations,
      findAnnotationById,
      removeCustomAnnotation,
      handleCustomAnnotationClick,
    ]
  );

  return { updateCustomAnnotation };
};
