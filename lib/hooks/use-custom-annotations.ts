import { useCallback } from "react";
import mapboxgl from "mapbox-gl";
import { useAnnotationContext, useUIContext } from "@/lib/contexts";

export const useCustomAnnotations = () => {
  const { annotations, findAnnotationById, removeCustomAnnotation } =
    useAnnotationContext();
  const { handleCustomAnnotationClick } = useUIContext();

  const updateCustomAnnotation = useCallback(
    (
      id: string,
      updates: { label: string; color: string },
      mapRef: React.RefObject<mapboxgl.Map | null>,
      annotationsRef: React.RefObject<Record<string, any>>
    ) => {
      if (!annotationsRef.current?.[id] || !mapRef.current) return;

      const annotation = annotationsRef.current[id];
      const map = mapRef.current;

      // Update the annotation with new values
      annotation.label = updates.label;
      annotation.color = updates.color;

      // Update the marker color
      const oldMarker = annotation.marker;
      const position = oldMarker.getLngLat();

      // Remove old marker
      oldMarker.remove();

      // Create new marker with updated color
      const newMarker = new mapboxgl.Marker({
        color: updates.color,
        draggable: true,
        clickTolerance: 5,
      })
        .setLngLat(position)
        .addTo(map);

      // Track if the marker was dragged to prevent dialog opening on drag-end
      let wasDragged = false;
      let dragStartTime = 0;

      // Add drag start handler
      const handleDragStart = () => {
        wasDragged = true;
        dragStartTime = Date.now();
      };

      // Add click handler - only open dialog if it wasn't dragged
      const handleClick = (evt: MouseEvent) => {
        evt.preventDefault();
        evt.stopPropagation();

        // Only open dialog if it wasn't dragged or was a very quick drag (click)
        const dragDuration = Date.now() - dragStartTime;
        if (!wasDragged || dragDuration < 200) {
          handleCustomAnnotationClick(id, {
            label: updates.label,
            color: updates.color,
          });
        }

        // Reset drag state
        wasDragged = false;
      };

      newMarker.getElement().addEventListener("click", handleClick);
      newMarker.on("dragstart", handleDragStart);

      newMarker.getElement().addEventListener("contextmenu", (evt) => {
        evt.preventDefault();
        // Remove annotation
        removeCustomAnnotation(id);
      });

      // Add drag handlers to update text position
      const updateCustomText = () => {
        const pos = newMarker.getLngLat();

        // Update text position
        const textSrc = map.getSource(
          annotation.textSourceId!
        ) as mapboxgl.GeoJSONSource;
        if (textSrc) {
          textSrc.setData({
            type: "FeatureCollection",
            features: [
              {
                type: "Feature" as const,
                geometry: {
                  type: "Point" as const,
                  coordinates: [pos.lng, pos.lat],
                },
                properties: {
                  text: updates.label,
                },
              },
            ],
          });
        }
      };

      // Add drag handlers - only update text, don't open dialog
      newMarker.on("drag", updateCustomText);
      newMarker.on("dragend", updateCustomText);

      // Update the annotation record
      annotation.marker = newMarker;

      // Update text content if it exists
      if (annotation.textSourceId) {
        const textSrc = map.getSource(
          annotation.textSourceId
        ) as mapboxgl.GeoJSONSource;
        if (textSrc) {
          const pos = newMarker.getLngLat();
          textSrc.setData({
            type: "FeatureCollection",
            features: [
              {
                type: "Feature" as const,
                geometry: {
                  type: "Point" as const,
                  coordinates: [pos.lng, pos.lat],
                },
                properties: {
                  text: updates.label,
                },
              },
            ],
          });
        }
      }
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
