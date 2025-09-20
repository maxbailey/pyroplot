"use client";

import { useRef, useEffect } from "react";
import type mapboxgl from "mapbox-gl";
import { Sidebar, Map } from "@/components/map-shell";
import { useMapInitialization } from "@/lib/hooks";
import { useMapContext, useAnnotationContext } from "@/lib/contexts";

export function MapShell() {
  // Get map initialization hook
  const { mapContainerRef, initializeMap, cleanup } = useMapInitialization();

  // Get map context for map reference
  const { mapRef: mapInstance } = useMapContext();

  // Create a ref object for compatibility
  const mapRef = useRef<mapboxgl.Map | null>(mapInstance);

  // Update ref when map instance changes
  useEffect(() => {
    mapRef.current = mapInstance;
  }, [mapInstance]);

  // Get annotation context for annotation management
  const { annotations, audienceAreas, measurements, restrictedAreas } =
    useAnnotationContext();

  // Create refs for annotation management (these are still needed for some operations)
  const annotationsRef = useRef<Record<string, any>>({});
  const audienceAreasRef = useRef<Record<string, any>>({});
  const measurementsRef = useRef<Record<string, any>>({});
  const restrictedAreasRef = useRef<Record<string, any>>({});

  // Sync refs with context state
  useEffect(() => {
    annotationsRef.current = annotations;
  }, [annotations]);

  useEffect(() => {
    audienceAreasRef.current = audienceAreas;
  }, [audienceAreas]);

  useEffect(() => {
    measurementsRef.current = measurements;
  }, [measurements]);

  useEffect(() => {
    restrictedAreasRef.current = restrictedAreas;
  }, [restrictedAreas]);

  // Map drop handler
  const handleMapDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const data = e.dataTransfer.getData("text/plain");
    if (!data) return;

    try {
      const { key, glyph } = JSON.parse(data);
      if (!key || !glyph) return;

      // Get map bounds and center
      if (!mapInstance) return;
      const bounds = mapInstance.getBounds();
      const center = mapInstance.getCenter();

      // Create annotation based on type
      switch (key) {
        case "firework":
          // Handle firework annotation creation
          console.log("Creating firework annotation at", center);
          break;
        case "audience":
          // Handle audience area creation
          console.log("Creating audience area at", center);
          break;
        case "measurement":
          // Handle measurement creation
          console.log("Creating measurement at", center);
          break;
        case "restricted":
          // Handle restricted area creation
          console.log("Creating restricted area at", center);
          break;
        case "custom":
          // Handle custom annotation creation
          console.log("Creating custom annotation at", center);
          break;
        default:
          console.warn("Unknown annotation type:", key);
      }
    } catch (error) {
      console.error("Error parsing drop data:", error);
    }
  };

  // Map drag over handler
  const handleMapDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  };

  // Extrusion handlers (these are still needed for height display)
  const addExtrusionForAnnotation = (rec: any) => {
    // Implementation for adding extrusion
    console.log("Adding extrusion for annotation:", rec);
  };

  const removeExtrusionForAnnotation = (rec: any) => {
    // Implementation for removing extrusion
    console.log("Removing extrusion for annotation:", rec);
  };

  return (
    <div className="h-screen w-screen flex overflow-hidden">
      <Sidebar
        mapRef={mapRef}
        annotationsRef={annotationsRef}
        addExtrusionForAnnotation={addExtrusionForAnnotation}
        removeExtrusionForAnnotation={removeExtrusionForAnnotation}
      />
      <Map
        handleMapDrop={handleMapDrop}
        handleMapDragOver={handleMapDragOver}
      />
    </div>
  );
}
