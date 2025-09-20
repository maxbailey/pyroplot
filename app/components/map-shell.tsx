"use client";

import { useRef, useEffect } from "react";
import mapboxgl from "mapbox-gl";
import { Sidebar, Map } from "@/components/map-shell";
import {
  useMapContext,
  useAnnotationContext,
  useSettingsContext,
} from "@/lib/contexts";
import {
  createCircleFeature,
  createRectangleFeature,
  formatLengthNoSpace,
  formatDistanceWithSpace,
} from "@/lib/utils/map-utils";
import { feetToMeters } from "@/components/pdf-generator/utils";
import {
  ANNOTATION_PALETTE,
  AUDIENCE_DIMENSIONS,
  GEO_CONSTANTS,
} from "@/lib/constants";
import type {
  AnnotationRecord,
  AudienceRecord,
  MeasurementRecord,
  RestrictedRecord,
} from "@/lib/types";

export function MapShell() {
  // Get map context for map reference
  const { mapRef: mapInstance } = useMapContext();

  // Create a ref object for compatibility
  const mapRef = useRef<mapboxgl.Map | null>(mapInstance);

  // Update ref when map instance changes
  useEffect(() => {
    mapRef.current = mapInstance;
  }, [mapInstance]);

  // Get annotation context for annotation management
  const {
    addAudienceArea,
    addFireworkAnnotation,
    addMeasurement,
    addRestrictedArea,
    addCustomAnnotation,
    removeAudienceArea,
    removeFireworkAnnotation,
    removeMeasurement,
    removeRestrictedArea,
    removeCustomAnnotation,
  } = useAnnotationContext();

  // Get settings context for measurement unit
  const { measurementUnit } = useSettingsContext();

  // Create refs for annotation management (these are still needed for some operations)
  const annotationsRef = useRef<Record<string, AnnotationRecord>>({});
  const audienceAreasRef = useRef<Record<string, AudienceRecord>>({});
  const measurementsRef = useRef<Record<string, MeasurementRecord>>({});
  const restrictedAreasRef = useRef<Record<string, RestrictedRecord>>({});

  // Note: We don't sync refs with context state because we manage them locally
  // The refs are used for local operations and contain additional data not in the store

  // Map drop handler
  const handleMapDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!mapInstance) return;

    const data = e.dataTransfer.getData("text/plain");
    if (!data) return;

    try {
      const parsed = JSON.parse(data) as { key: string; glyph: string };
      if (!parsed) return;

      const item = ANNOTATION_PALETTE.find((i) => i.key === parsed.key);
      if (!item) return;

      const rect = (e.target as HTMLDivElement).getBoundingClientRect();
      const point = [e.clientX - rect.left, e.clientY - rect.top] as [
        number,
        number
      ];
      const lngLat = mapInstance.unproject(point);

      if (item.key === "audience") {
        // Create audience rectangle default ~ 100ft x 60ft
        const widthFt = AUDIENCE_DIMENSIONS.DEFAULT_WIDTH_FT;
        const heightFt = AUDIENCE_DIMENSIONS.DEFAULT_HEIGHT_FT;
        const metersW = feetToMeters(widthFt);
        const metersH = feetToMeters(heightFt);

        const metersToLng = (m: number, lat: number) =>
          m /
          (GEO_CONSTANTS.METERS_PER_DEGREE_LNG *
            Math.cos((lat * Math.PI) / 180));
        const metersToLat = (m: number) =>
          m / GEO_CONSTANTS.METERS_PER_DEGREE_LAT;

        const lngW = metersToLng(metersW, lngLat.lat);
        const latH = metersToLat(metersH);

        const corners: [number, number][] = [
          [lngLat.lng - lngW / 2, lngLat.lat - latH / 2],
          [lngLat.lng + lngW / 2, lngLat.lat - latH / 2],
          [lngLat.lng + lngW / 2, lngLat.lat + latH / 2],
          [lngLat.lng - lngW / 2, lngLat.lat + latH / 2],
        ];

        const rectFeature = createRectangleFeature(corners);
        const id = `aud-${Date.now()}-${Math.random().toString(36).slice(2)}`;
        const sourceId = `${id}-src`;

        mapInstance.addSource(sourceId, {
          type: "geojson",
          data: {
            type: "FeatureCollection",
            features: [rectFeature],
          },
        });

        mapInstance.addLayer({
          id: `${id}-fill`,
          type: "fill",
          source: sourceId,
          paint: {
            "fill-color": item.color,
            "fill-opacity": 0.3,
          },
        });

        mapInstance.addLayer({
          id: `${id}-line`,
          type: "line",
          source: sourceId,
          paint: {
            "line-color": item.color,
            "line-width": 2,
          },
        });

        // Create label marker with proper styling
        const label = document.createElement("div");
        label.className =
          "rounded-md px-2 py-1 text-xs shadow bg-background/50 backdrop-blur-sm border border-border text-center";
        label.style.cursor = "move";
        label.style.userSelect = "none";
        label.style.pointerEvents = "auto";

        // Add context menu for removal
        label.addEventListener("contextmenu", (evt) => {
          evt.preventDefault();
          // Remove from store
          removeAudienceArea(id);
          // Remove Mapbox layers and markers
          try {
            if (mapInstance.getLayer(`${id}-fill`))
              mapInstance.removeLayer(`${id}-fill`);
            if (mapInstance.getLayer(`${id}-line`))
              mapInstance.removeLayer(`${id}-line`);
            if (mapInstance.getSource(sourceId))
              mapInstance.removeSource(sourceId);
          } catch {}
          try {
            labelMarker.remove();
            cornerMarkers.forEach((cm) => cm.remove());
          } catch {}
          // Remove from local ref
          delete audienceAreasRef.current[id];
        });

        const title = document.createElement("div");
        title.className = "font-medium leading-none";
        title.textContent = `Audience Area ${
          audienceAreasRef.current
            ? Object.keys(audienceAreasRef.current).length + 1
            : 1
        }`;

        const dims = document.createElement("div");
        dims.setAttribute("data-role", "dims");
        dims.className = "text-muted-foreground";
        const initialMetersW =
          Math.abs(corners[1][0] - corners[0][0]) *
          GEO_CONSTANTS.METERS_PER_DEGREE_LNG *
          Math.cos((lngLat.lat * Math.PI) / 180);
        const initialMetersH =
          Math.abs(corners[3][1] - corners[0][1]) *
          GEO_CONSTANTS.METERS_PER_DEGREE_LAT;
        dims.textContent = `${formatLengthNoSpace(
          initialMetersW,
          measurementUnit
        )} × ${formatLengthNoSpace(initialMetersH, measurementUnit)}`;

        label.appendChild(title);
        label.appendChild(dims);

        // Position label at the top of the rectangle
        const centerLng = (corners[0][0] + corners[2][0]) / 2;
        const topLat = Math.max(
          corners[0][1],
          corners[1][1],
          corners[2][1],
          corners[3][1]
        );
        const labelMarker = new mapboxgl.Marker({
          element: label,
          draggable: true,
        })
          .setLngLat([centerLng, topLat])
          .addTo(mapInstance);

        // Create corner markers
        const cornerMarkers: mapboxgl.Marker[] = corners.map((c) =>
          new mapboxgl.Marker({ draggable: true })
            .setLngLat(c)
            .addTo(mapInstance)
        );

        // Store in context
        const audienceRecord: AudienceRecord = {
          type: "audience",
          number: Object.keys(audienceAreasRef.current).length + 1,
          id,
          sourceId,
          fillLayerId: `${id}-fill`,
          lineLayerId: `${id}-line`,
          labelMarker,
          cornerMarkers,
          corners,
        };

        // Add to store
        addAudienceArea(audienceRecord);

        // Store in ref for local access
        audienceAreasRef.current[id] = audienceRecord;

        // Add drag event handlers
        const updateRectFromLabel = () => {
          const cur = labelMarker.getLngLat();
          const dLng = cur.lng - (corners[0][0] + corners[2][0]) / 2;
          const dLat =
            cur.lat -
            Math.max(
              corners[0][1],
              corners[1][1],
              corners[2][1],
              corners[3][1]
            );
          const moved = corners.map(([lng, lat]) => [
            lng + dLng,
            lat + dLat,
          ]) as [number, number][];

          const src = mapInstance.getSource(sourceId) as mapboxgl.GeoJSONSource;
          src.setData({
            type: "FeatureCollection",
            features: [createRectangleFeature(moved)],
          });

          moved.forEach((c, i) => cornerMarkers[i].setLngLat(c));
          corners.splice(0, corners.length, ...moved);
          // Safely update the ref
          if (audienceAreasRef.current[id]) {
            audienceAreasRef.current[id].corners = moved;
          }

          const centerLatNow = (moved[0][1] + moved[2][1]) / 2;
          const metersWNow =
            Math.abs(moved[1][0] - moved[0][0]) *
            GEO_CONSTANTS.METERS_PER_DEGREE_LNG *
            Math.cos((centerLatNow * Math.PI) / 180);
          const metersHNow =
            Math.abs(moved[3][1] - moved[0][1]) *
            GEO_CONSTANTS.METERS_PER_DEGREE_LAT;
          dims.textContent = `${formatLengthNoSpace(
            metersWNow,
            measurementUnit
          )} × ${formatLengthNoSpace(metersHNow, measurementUnit)}`;
        };

        labelMarker.on("drag", updateRectFromLabel);
        labelMarker.on("dragend", updateRectFromLabel);

        cornerMarkers.forEach((cm, idx) => {
          const updateRect = () => {
            const cur = cm.getLngLat();
            const oppIdx = (idx + 2) % 4;
            const anchorLng = corners[oppIdx][0];
            const anchorLat = corners[oppIdx][1];

            // Minimum size constraint (20ft)
            const minFt = 20;
            const minLngDelta =
              feetToMeters(minFt) /
              (GEO_CONSTANTS.METERS_PER_DEGREE_LNG *
                Math.cos((anchorLat * Math.PI) / 180));
            const minLatDelta =
              feetToMeters(minFt) / GEO_CONSTANTS.METERS_PER_DEGREE_LAT;

            // Calculate new position with proper constraints to prevent inversion
            let newLng = cur.lng;
            let newLat = cur.lat;

            // Ensure minimum width
            const widthLng = Math.abs(cur.lng - anchorLng);
            if (widthLng < minLngDelta) {
              const sLng = cur.lng > anchorLng ? 1 : -1;
              newLng = anchorLng + sLng * minLngDelta;
            }

            // Ensure minimum height
            const heightLat = Math.abs(cur.lat - anchorLat);
            if (heightLat < minLatDelta) {
              const sLat = cur.lat > anchorLat ? 1 : -1;
              newLat = anchorLat + sLat * minLatDelta;
            }

            // Update corners with proper rectangle logic to prevent inversion
            // Use the same logic as the restricted areas for consistency
            const sLng = idx === 0 || idx === 3 ? -1 : 1;
            const sLat = idx === 0 || idx === 1 ? -1 : 1;
            let dragLng = newLng;
            let dragLat = newLat;
            if (sLng > 0) dragLng = Math.max(anchorLng + minLngDelta, dragLng);
            else dragLng = Math.min(anchorLng - minLngDelta, dragLng);
            if (sLat > 0) dragLat = Math.max(anchorLat + minLatDelta, dragLat);
            else dragLat = Math.min(anchorLat - minLatDelta, dragLat);

            const newCorners: [number, number][] = [...corners] as [
              number,
              number
            ][];
            newCorners[oppIdx] = [anchorLng, anchorLat];
            newCorners[idx] = [dragLng, dragLat];
            newCorners[(idx + 1) % 4] = [dragLng, anchorLat];
            newCorners[(idx + 3) % 4] = [anchorLng, dragLat];

            // Update corners array
            corners.splice(0, corners.length, ...newCorners);

            const src = mapInstance.getSource(
              sourceId
            ) as mapboxgl.GeoJSONSource;
            src.setData({
              type: "FeatureCollection",
              features: [createRectangleFeature(corners)],
            });

            const newCenterLng = (corners[0][0] + corners[2][0]) / 2;
            const newTopLat = Math.max(
              corners[0][1],
              corners[1][1],
              corners[2][1],
              corners[3][1]
            );
            labelMarker.setLngLat([newCenterLng, newTopLat]);

            const metersW2 =
              Math.abs(corners[1][0] - corners[0][0]) *
              GEO_CONSTANTS.METERS_PER_DEGREE_LNG *
              Math.cos((newTopLat * Math.PI) / 180);
            const metersH2 =
              Math.abs(corners[3][1] - corners[0][1]) *
              GEO_CONSTANTS.METERS_PER_DEGREE_LAT;
            dims.textContent = `${formatLengthNoSpace(
              metersW2,
              measurementUnit
            )} × ${formatLengthNoSpace(metersH2, measurementUnit)}`;
            // Safely update the ref
            if (audienceAreasRef.current[id]) {
              audienceAreasRef.current[id].corners = corners;
            }
            corners.forEach((p, i) => cornerMarkers[i].setLngLat(p));
          };
          cm.on("drag", updateRect);
          cm.on("dragend", updateRect);
        });

        console.log("Created audience area:", id);
      } else if (item.key === "firework") {
        // Create firework circle
        const radiusMeters = feetToMeters(50); // 50ft radius
        const circleFeature = createCircleFeature(
          lngLat.lng,
          lngLat.lat,
          radiusMeters
        );
        const id = `fire-${Date.now()}-${Math.random().toString(36).slice(2)}`;
        const sourceId = `${id}-src`;

        mapInstance.addSource(sourceId, {
          type: "geojson",
          data: {
            type: "FeatureCollection",
            features: [circleFeature],
          },
        });

        mapInstance.addLayer({
          id: `${id}-fill`,
          type: "fill",
          source: sourceId,
          paint: {
            "fill-color": item.color,
            "fill-opacity": 0.3,
          },
        });

        mapInstance.addLayer({
          id: `${id}-line`,
          type: "line",
          source: sourceId,
          paint: {
            "line-color": item.color,
            "line-width": 2,
          },
        });

        // Create label marker with proper styling
        const label = document.createElement("div");
        label.className =
          "rounded-md px-2 py-1 text-xs shadow bg-background/50 backdrop-blur-sm border border-border text-center";
        label.style.cursor = "move";
        label.style.userSelect = "none";
        label.style.pointerEvents = "auto";

        // Add context menu for removal
        label.addEventListener("contextmenu", (evt) => {
          evt.preventDefault();
          // Remove from store
          removeFireworkAnnotation(id);
          // Remove Mapbox layers and markers
          try {
            if (mapInstance.getLayer(`${id}-fill`))
              mapInstance.removeLayer(`${id}-fill`);
            if (mapInstance.getLayer(`${id}-line`))
              mapInstance.removeLayer(`${id}-line`);
            if (mapInstance.getSource(sourceId))
              mapInstance.removeSource(sourceId);
          } catch {}
          try {
            marker.remove();
          } catch {}
          // Remove from local ref
          delete annotationsRef.current[id];
        });

        const title = document.createElement("div");
        title.className = "font-medium leading-none";
        title.textContent = "🎆";

        const size = document.createElement("div");
        size.className = "text-muted-foreground";
        const radiusFeet = Math.round(50 * 1); // 50ft radius (inches * safety distance)
        const radiusText =
          measurementUnit === "feet"
            ? `${radiusFeet} ft radius`
            : `${Math.round(feetToMeters(radiusFeet))} m radius`;
        size.textContent = radiusText;

        label.appendChild(title);
        label.appendChild(size);

        const marker = new mapboxgl.Marker({
          element: label,
          draggable: true,
        })
          .setLngLat([lngLat.lng, lngLat.lat])
          .addTo(mapInstance);

        // Store in context
        const annotationRecord: AnnotationRecord = {
          type: "firework",
          number: Object.keys(annotationsRef.current).length + 1,
          id,
          inches: 50, // 50ft radius
          label: "Firework",
          color: item.color,
          marker,
          sourceId,
          fillLayerId: `${id}-fill`,
          lineLayerId: `${id}-line`,
        };

        // Add to store
        addFireworkAnnotation(annotationRecord);

        // Store in ref for local access
        annotationsRef.current[id] = annotationRecord;

        // Add drag handler to update circle position
        const updateCircle = () => {
          const pos = marker.getLngLat();
          const currentRadiusMeters = feetToMeters(50); // 50ft radius
          const updated = createCircleFeature(
            pos.lng,
            pos.lat,
            currentRadiusMeters
          );
          const src = mapInstance.getSource(sourceId) as mapboxgl.GeoJSONSource;
          src.setData({
            type: "FeatureCollection",
            features: [updated],
          });

          // Update radius text
          const radiusFeet = Math.round(50 * 1); // 50ft radius
          const radiusText =
            measurementUnit === "feet"
              ? `${radiusFeet} ft radius`
              : `${Math.round(feetToMeters(radiusFeet))} m radius`;
          size.textContent = radiusText;
        };
        marker.on("drag", updateCircle);
        marker.on("dragend", updateCircle);

        console.log("Created firework annotation:", id);
      } else if (
        item.key.startsWith("bore-") ||
        item.key.startsWith("shell-")
      ) {
        // Create firework circle for bore/shell types
        const radiusMeters = feetToMeters(item.inches * 100); // Convert inches to feet, then to meters
        const circleFeature = createCircleFeature(
          lngLat.lng,
          lngLat.lat,
          radiusMeters
        );
        const id = `fire-${Date.now()}-${Math.random().toString(36).slice(2)}`;
        const sourceId = `${id}-src`;

        mapInstance.addSource(sourceId, {
          type: "geojson",
          data: {
            type: "FeatureCollection",
            features: [circleFeature],
          },
        });

        mapInstance.addLayer({
          id: `${id}-fill`,
          type: "fill",
          source: sourceId,
          paint: {
            "fill-color": item.color,
            "fill-opacity": 0.3,
          },
        });

        mapInstance.addLayer({
          id: `${id}-line`,
          type: "line",
          source: sourceId,
          paint: {
            "line-color": item.color,
            "line-width": 2,
          },
        });

        // Create label marker with proper styling
        const label = document.createElement("div");
        label.className =
          "rounded-md px-2 py-1 text-xs shadow bg-background/50 backdrop-blur-sm border border-border text-center";
        label.style.cursor = "move";
        label.style.userSelect = "none";
        label.style.pointerEvents = "auto";

        // Add context menu for removal
        label.addEventListener("contextmenu", (evt) => {
          evt.preventDefault();
          // Remove from store
          removeFireworkAnnotation(id);
          // Remove Mapbox layers and markers
          try {
            if (mapInstance.getLayer(`${id}-fill`))
              mapInstance.removeLayer(`${id}-fill`);
            if (mapInstance.getLayer(`${id}-line`))
              mapInstance.removeLayer(`${id}-line`);
            if (mapInstance.getSource(sourceId))
              mapInstance.removeSource(sourceId);
          } catch {}
          try {
            marker.remove();
          } catch {}
          // Remove from local ref
          delete annotationsRef.current[id];
        });

        const title = document.createElement("div");
        title.className = "font-medium leading-none";
        title.textContent = item.label;

        const size = document.createElement("div");
        size.className = "text-muted-foreground";
        const radiusFeet = Math.round(item.inches * 100); // Convert inches to feet
        const radiusText =
          measurementUnit === "feet"
            ? `${radiusFeet} ft radius`
            : `${Math.round(feetToMeters(radiusFeet))} m radius`;
        size.textContent = radiusText;

        label.appendChild(title);
        label.appendChild(size);

        const marker = new mapboxgl.Marker({
          element: label,
          draggable: true,
        })
          .setLngLat([lngLat.lng, lngLat.lat])
          .addTo(mapInstance);

        // Store in context
        const annotationRecord: AnnotationRecord = {
          type: "firework",
          number: Object.keys(annotationsRef.current).length + 1,
          id,
          inches: item.inches,
          label: item.label,
          color: item.color,
          marker,
          sourceId,
          fillLayerId: `${id}-fill`,
          lineLayerId: `${id}-line`,
        };

        // Add to store
        addFireworkAnnotation(annotationRecord);

        // Store in ref for local access
        annotationsRef.current[id] = annotationRecord;

        // Add drag handler to update circle position
        const updateCircle = () => {
          const pos = marker.getLngLat();
          const currentRadiusMeters = feetToMeters(item.inches * 100);
          const updated = createCircleFeature(
            pos.lng,
            pos.lat,
            currentRadiusMeters
          );
          const src = mapInstance.getSource(sourceId) as mapboxgl.GeoJSONSource;
          src.setData({
            type: "FeatureCollection",
            features: [updated],
          });

          // Update radius text
          const radiusFeet = Math.round(item.inches * 100); // Convert inches to feet
          const radiusText =
            measurementUnit === "feet"
              ? `${radiusFeet} ft radius`
              : `${Math.round(feetToMeters(radiusFeet))} m radius`;
          size.textContent = radiusText;
        };
        marker.on("drag", updateCircle);
        marker.on("dragend", updateCircle);

        console.log("Created firework annotation:", id);
      } else if (item.key === "measurement") {
        // Create measurement with two points 150ft apart, north/south vertical
        const distanceFt = 150;
        const distanceMeters = feetToMeters(distanceFt);
        const metersToLat = (m: number) =>
          m / GEO_CONSTANTS.METERS_PER_DEGREE_LAT;
        const latOffset = metersToLat(distanceMeters);

        const points: [number, number][] = [
          [lngLat.lng, lngLat.lat],
          [lngLat.lng, lngLat.lat + latOffset], // Only lat offset for north/south
        ];

        const id = `meas-${Date.now()}-${Math.random().toString(36).slice(2)}`;
        const sourceId = `${id}-src`;

        // Create line feature
        const lineFeature = {
          type: "Feature" as const,
          geometry: {
            type: "LineString" as const,
            coordinates: points,
          },
          properties: {},
        };

        mapInstance.addSource(sourceId, {
          type: "geojson",
          data: {
            type: "FeatureCollection",
            features: [lineFeature],
          },
        });

        mapInstance.addLayer({
          id: `${id}-line`,
          type: "line",
          source: sourceId,
          paint: {
            "line-color": item.color,
            "line-opacity": 1,
            "line-width": 3,
          },
        });

        // Create label marker at center of line
        const centerLng = (points[0][0] + points[1][0]) / 2;
        const centerLat = (points[0][1] + points[1][1]) / 2;

        const label = document.createElement("div");
        label.className =
          "rounded-md px-2 py-1 text-xs shadow bg-background/50 backdrop-blur-sm border border-border text-center";
        label.style.cursor = "move";
        label.style.userSelect = "none";
        label.style.pointerEvents = "auto";

        // Add context menu for removal
        label.addEventListener("contextmenu", (evt) => {
          evt.preventDefault();
          // Remove from store
          removeMeasurement(id);
          // Remove Mapbox layers and markers
          try {
            if (mapInstance.getLayer(`${id}-line`))
              mapInstance.removeLayer(`${id}-line`);
            if (mapInstance.getSource(sourceId))
              mapInstance.removeSource(sourceId);
          } catch {}
          try {
            labelMarker.remove();
            pointMarkers.forEach((pm) => pm.remove());
          } catch {}
          // Remove from local ref
          delete measurementsRef.current[id];
        });

        const title = document.createElement("div");
        title.className = "font-medium leading-none";
        title.textContent = "Measurement";

        const distance = document.createElement("div");
        distance.className = "text-muted-foreground";
        distance.setAttribute("data-role", "distance");
        distance.textContent = formatDistanceWithSpace(
          distanceMeters,
          measurementUnit
        );

        label.appendChild(title);
        label.appendChild(distance);

        const labelMarker = new mapboxgl.Marker({
          element: label,
          draggable: true,
        })
          .setLngLat([centerLng, centerLat])
          .addTo(mapInstance);

        // Create point markers
        const pointMarkers: mapboxgl.Marker[] = points.map((point, idx) => {
          const pointEl = document.createElement("div");
          pointEl.className =
            "w-3 h-3 rounded-full border-2 border-white shadow-lg";
          pointEl.style.backgroundColor = item.color;
          pointEl.style.cursor = "move";

          const marker = new mapboxgl.Marker({
            element: pointEl,
            draggable: true,
          })
            .setLngLat(point)
            .addTo(mapInstance);

          const updateMeasurement = () => {
            const newPoint = marker.getLngLat();
            const newPoints: [number, number][] = [...points];
            newPoints[idx] = [newPoint.lng, newPoint.lat];

            // Update line
            const lineFeature = {
              type: "Feature" as const,
              geometry: {
                type: "LineString" as const,
                coordinates: newPoints,
              },
              properties: {},
            };

            const src = mapInstance.getSource(
              sourceId
            ) as mapboxgl.GeoJSONSource;
            src.setData({
              type: "FeatureCollection",
              features: [lineFeature],
            });

            // Update label position and distance
            const newCenterLng = (newPoints[0][0] + newPoints[1][0]) / 2;
            const newCenterLat = (newPoints[0][1] + newPoints[1][1]) / 2;
            labelMarker.setLngLat([newCenterLng, newCenterLat]);

            // Calculate distance
            const lat1 = (newPoints[0][1] * Math.PI) / 180;
            const lat2 = (newPoints[1][1] * Math.PI) / 180;
            const deltaLat =
              ((newPoints[1][1] - newPoints[0][1]) * Math.PI) / 180;
            const deltaLng =
              ((newPoints[1][0] - newPoints[0][0]) * Math.PI) / 180;

            const a =
              Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
              Math.cos(lat1) *
                Math.cos(lat2) *
                Math.sin(deltaLng / 2) *
                Math.sin(deltaLng / 2);
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
            const distanceMeters = 6371000 * c; // Earth radius in meters
            distance.textContent = formatDistanceWithSpace(
              distanceMeters,
              measurementUnit
            );

            // Update points reference
            points[0] = newPoints[0];
            points[1] = newPoints[1];
            if (measurementsRef.current[id]) {
              measurementsRef.current[id].points = points;
            }
          };

          marker.on("drag", updateMeasurement);
          marker.on("dragend", updateMeasurement);

          return marker;
        });

        // Store in context
        const measurementRecord: MeasurementRecord = {
          type: "measurement",
          number: Object.keys(measurementsRef.current).length + 1,
          id,
          sourceId,
          lineLayerId: `${id}-line`,
          labelMarker,
          pointMarkers,
          points,
        };

        // Add to store
        addMeasurement(measurementRecord);

        // Store in ref for local access
        measurementsRef.current[id] = measurementRecord;

        // Add label drag handler to move entire measurement
        const onLabelDrag = () => {
          const cur = labelMarker.getLngLat();
          const originalCenterLng = (points[0][0] + points[1][0]) / 2;
          const originalCenterLat = (points[0][1] + points[1][1]) / 2;
          const dLng = cur.lng - originalCenterLng;
          const dLat = cur.lat - originalCenterLat;

          // Move both points by the same offset
          const newPoints: [number, number][] = [
            [points[0][0] + dLng, points[0][1] + dLat],
            [points[1][0] + dLng, points[1][1] + dLat],
          ];

          // Update the line
          const lineFeature = {
            type: "Feature" as const,
            geometry: {
              type: "LineString" as const,
              coordinates: newPoints,
            },
            properties: {},
          };

          const src = mapInstance.getSource(sourceId) as mapboxgl.GeoJSONSource;
          src.setData({
            type: "FeatureCollection",
            features: [lineFeature],
          });

          // Update point markers
          newPoints.forEach((point, i) => pointMarkers[i].setLngLat(point));

          // Update points reference
          points[0] = newPoints[0];
          points[1] = newPoints[1];
          if (measurementsRef.current[id]) {
            measurementsRef.current[id].points = points;
          }
        };

        labelMarker.on("drag", onLabelDrag);
        labelMarker.on("dragend", onLabelDrag);

        console.log("Created measurement annotation:", id);
      } else if (item.key === "restricted") {
        // Create restricted rectangle default ~ 200ft x 90ft
        const widthFt = 200;
        const heightFt = 90;
        const metersW = feetToMeters(widthFt);
        const metersH = feetToMeters(heightFt);

        const metersToLng = (m: number, lat: number) =>
          m /
          (GEO_CONSTANTS.METERS_PER_DEGREE_LNG *
            Math.cos((lat * Math.PI) / 180));
        const metersToLat = (m: number) =>
          m / GEO_CONSTANTS.METERS_PER_DEGREE_LAT;

        const lngW = metersToLng(metersW, lngLat.lat);
        const latH = metersToLat(metersH);

        const corners: [number, number][] = [
          [lngLat.lng - lngW / 2, lngLat.lat - latH / 2],
          [lngLat.lng + lngW / 2, lngLat.lat - latH / 2],
          [lngLat.lng + lngW / 2, lngLat.lat + latH / 2],
          [lngLat.lng - lngW / 2, lngLat.lat + latH / 2],
        ];

        const rectFeature = createRectangleFeature(corners);
        const id = `rest-${Date.now()}-${Math.random().toString(36).slice(2)}`;
        const sourceId = `${id}-src`;

        mapInstance.addSource(sourceId, {
          type: "geojson",
          data: {
            type: "FeatureCollection",
            features: [rectFeature],
          },
        });

        mapInstance.addLayer({
          id: `${id}-fill`,
          type: "fill",
          source: sourceId,
          paint: {
            "fill-color": item.color,
            "fill-opacity": 0.3,
          },
        });

        mapInstance.addLayer({
          id: `${id}-line`,
          type: "line",
          source: sourceId,
          paint: {
            "line-color": item.color,
            "line-width": 2,
          },
        });

        // Create label marker with proper styling
        const label = document.createElement("div");
        label.className =
          "rounded-md px-2 py-1 text-xs shadow bg-background/50 backdrop-blur-sm border border-border text-center";
        label.style.cursor = "move";
        label.style.userSelect = "none";
        label.style.pointerEvents = "auto";

        // Add context menu for removal
        label.addEventListener("contextmenu", (evt) => {
          evt.preventDefault();
          // Remove from store
          removeRestrictedArea(id);
          // Remove Mapbox layers and markers
          try {
            if (mapInstance.getLayer(`${id}-fill`))
              mapInstance.removeLayer(`${id}-fill`);
            if (mapInstance.getLayer(`${id}-line`))
              mapInstance.removeLayer(`${id}-line`);
            if (mapInstance.getSource(sourceId))
              mapInstance.removeSource(sourceId);
          } catch {}
          try {
            labelMarker.remove();
            cornerMarkers.forEach((cm) => cm.remove());
          } catch {}
          // Remove from local ref
          delete restrictedAreasRef.current[id];
        });

        const title = document.createElement("div");
        title.className = "font-medium leading-none";
        title.textContent = "Restricted";

        const dims = document.createElement("div");
        dims.setAttribute("data-role", "dims");
        dims.className = "text-muted-foreground";
        const initialMetersW =
          Math.abs(corners[1][0] - corners[0][0]) *
          GEO_CONSTANTS.METERS_PER_DEGREE_LNG *
          Math.cos((lngLat.lat * Math.PI) / 180);
        const initialMetersH =
          Math.abs(corners[3][1] - corners[0][1]) *
          GEO_CONSTANTS.METERS_PER_DEGREE_LAT;
        dims.textContent = `${formatLengthNoSpace(
          initialMetersW,
          measurementUnit
        )} × ${formatLengthNoSpace(initialMetersH, measurementUnit)}`;

        label.appendChild(title);
        label.appendChild(dims);

        // Position label at the top of the rectangle
        const centerLng = (corners[0][0] + corners[2][0]) / 2;
        const topLat = Math.max(
          corners[0][1],
          corners[1][1],
          corners[2][1],
          corners[3][1]
        );
        const labelMarker = new mapboxgl.Marker({
          element: label,
          draggable: true,
        })
          .setLngLat([centerLng, topLat])
          .addTo(mapInstance);

        // Create corner markers
        const cornerMarkers: mapboxgl.Marker[] = corners.map((c) =>
          new mapboxgl.Marker({ draggable: true })
            .setLngLat(c)
            .addTo(mapInstance)
        );

        // Store in context
        const restrictedRecord: RestrictedRecord = {
          type: "restricted",
          number: Object.keys(restrictedAreasRef.current).length + 1,
          id,
          sourceId,
          fillLayerId: `${id}-fill`,
          lineLayerId: `${id}-line`,
          labelMarker,
          cornerMarkers,
          corners,
        };

        // Add to store
        addRestrictedArea(restrictedRecord);

        // Store in ref for local access
        restrictedAreasRef.current[id] = restrictedRecord;

        // Add drag event handlers (same as audience areas)
        const updateRectFromLabel = () => {
          const cur = labelMarker.getLngLat();
          const dLng = cur.lng - (corners[0][0] + corners[2][0]) / 2;
          const dLat =
            cur.lat -
            Math.max(
              corners[0][1],
              corners[1][1],
              corners[2][1],
              corners[3][1]
            );
          const moved = corners.map(([lng, lat]) => [
            lng + dLng,
            lat + dLat,
          ]) as [number, number][];

          const src = mapInstance.getSource(sourceId) as mapboxgl.GeoJSONSource;
          src.setData({
            type: "FeatureCollection",
            features: [createRectangleFeature(moved)],
          });

          moved.forEach((c, i) => cornerMarkers[i].setLngLat(c));
          corners.splice(0, corners.length, ...moved);
          // Safely update the ref
          if (restrictedAreasRef.current[id]) {
            restrictedAreasRef.current[id].corners = moved;
          }

          const centerLatNow = (moved[0][1] + moved[2][1]) / 2;
          const metersWNow =
            Math.abs(moved[1][0] - moved[0][0]) *
            GEO_CONSTANTS.METERS_PER_DEGREE_LNG *
            Math.cos((centerLatNow * Math.PI) / 180);
          const metersHNow =
            Math.abs(moved[3][1] - moved[0][1]) *
            GEO_CONSTANTS.METERS_PER_DEGREE_LAT;
          dims.textContent = `${formatLengthNoSpace(
            metersWNow,
            measurementUnit
          )} × ${formatLengthNoSpace(metersHNow, measurementUnit)}`;
        };

        labelMarker.on("drag", updateRectFromLabel);
        labelMarker.on("dragend", updateRectFromLabel);

        cornerMarkers.forEach((cm, idx) => {
          const updateRect = () => {
            const cur = cm.getLngLat();
            const oppIdx = (idx + 2) % 4;
            const anchorLng = corners[oppIdx][0];
            const anchorLat = corners[oppIdx][1];

            // Minimum size constraint (20ft)
            const minFt = 20;
            const minLngDelta =
              feetToMeters(minFt) /
              (GEO_CONSTANTS.METERS_PER_DEGREE_LNG *
                Math.cos((anchorLat * Math.PI) / 180));
            const minLatDelta =
              feetToMeters(minFt) / GEO_CONSTANTS.METERS_PER_DEGREE_LAT;

            // Calculate new position with proper constraints to prevent inversion
            let newLng = cur.lng;
            let newLat = cur.lat;

            // Ensure minimum width
            const widthLng = Math.abs(cur.lng - anchorLng);
            if (widthLng < minLngDelta) {
              const sLng = cur.lng > anchorLng ? 1 : -1;
              newLng = anchorLng + sLng * minLngDelta;
            }

            // Ensure minimum height
            const heightLat = Math.abs(cur.lat - anchorLat);
            if (heightLat < minLatDelta) {
              const sLat = cur.lat > anchorLat ? 1 : -1;
              newLat = anchorLat + sLat * minLatDelta;
            }

            // Update corners with proper rectangle logic to prevent inversion
            // Use the same logic as the old file for consistent behavior
            const sLng = idx === 0 || idx === 3 ? -1 : 1;
            const sLat = idx === 0 || idx === 1 ? -1 : 1;
            let dragLng = newLng;
            let dragLat = newLat;
            if (sLng > 0) dragLng = Math.max(anchorLng + minLngDelta, dragLng);
            else dragLng = Math.min(anchorLng - minLngDelta, dragLng);
            if (sLat > 0) dragLat = Math.max(anchorLat + minLatDelta, dragLat);
            else dragLat = Math.min(anchorLat - minLatDelta, dragLat);

            const newCorners: [number, number][] = [...corners] as [
              number,
              number
            ][];
            newCorners[oppIdx] = [anchorLng, anchorLat];
            newCorners[idx] = [dragLng, dragLat];
            newCorners[(idx + 1) % 4] = [dragLng, anchorLat];
            newCorners[(idx + 3) % 4] = [anchorLng, dragLat];

            // Update corners array
            corners.splice(0, corners.length, ...newCorners);

            const src = mapInstance.getSource(
              sourceId
            ) as mapboxgl.GeoJSONSource;
            src.setData({
              type: "FeatureCollection",
              features: [createRectangleFeature(corners)],
            });

            const newCenterLng = (corners[0][0] + corners[2][0]) / 2;
            const newTopLat = Math.max(
              corners[0][1],
              corners[1][1],
              corners[2][1],
              corners[3][1]
            );
            labelMarker.setLngLat([newCenterLng, newTopLat]);

            const metersW2 =
              Math.abs(corners[1][0] - corners[0][0]) *
              GEO_CONSTANTS.METERS_PER_DEGREE_LNG *
              Math.cos((newTopLat * Math.PI) / 180);
            const metersH2 =
              Math.abs(corners[3][1] - corners[0][1]) *
              GEO_CONSTANTS.METERS_PER_DEGREE_LAT;
            dims.textContent = `${formatLengthNoSpace(
              metersW2,
              measurementUnit
            )} × ${formatLengthNoSpace(metersH2, measurementUnit)}`;
            // Safely update the ref
            if (restrictedAreasRef.current[id]) {
              restrictedAreasRef.current[id].corners = corners;
            }
            corners.forEach((p, i) => cornerMarkers[i].setLngLat(p));
          };
          cm.on("drag", updateRect);
          cm.on("dragend", updateRect);
        });

        console.log("Created restricted area:", id);
      } else if (item.key === "custom") {
        // Create custom annotation with default values
        const id = `custom-${Date.now()}-${Math.random()
          .toString(36)
          .slice(2)}`;

        // Create default Mapbox marker with custom color
        const marker = new mapboxgl.Marker({
          color: "#8B5CF6", // Default custom color
          draggable: true,
          clickTolerance: 5, // Allow 5px movement before considering it a drag
        })
          .setLngLat([lngLat.lng, lngLat.lat])
          .addTo(mapInstance);

        // Add right-click handler to remove
        marker.getElement().addEventListener("contextmenu", (evt) => {
          evt.preventDefault();
          // Remove from store
          removeCustomAnnotation(id);
          // Remove Mapbox layers and markers
          try {
            marker.remove();
          } catch {}
          // Remove from local ref
          delete annotationsRef.current[id];
        });

        // Create text element for emoji and label combined
        const textSourceId = `${id}-text-src`;

        // Combined emoji and label text
        const textFeature = {
          type: "Feature" as const,
          geometry: {
            type: "Point" as const,
            coordinates: [lngLat.lng, lngLat.lat],
          },
          properties: {
            text: "Custom",
          },
        };

        // Add text source and layer
        mapInstance.addSource(textSourceId, {
          type: "geojson",
          data: {
            type: "FeatureCollection",
            features: [textFeature],
          },
        });

        mapInstance.addLayer({
          id: `${id}-text`,
          type: "symbol",
          source: textSourceId,
          layout: {
            "text-field": ["get", "text"],
            "text-font": [
              "Noto Color Emoji",
              "Apple Color Emoji",
              "Segoe UI Emoji",
              "Open Sans Bold",
              "Arial Unicode MS Bold",
            ],
            "text-size": 14,
            "text-anchor": "bottom",
            "text-offset": [0, -2.8],
          },
          paint: {
            "text-color": "#ffffff",
            "text-halo-color": "#000000",
            "text-halo-width": 2,
          },
        });

        // Store in context
        const annotationRecord: AnnotationRecord = {
          type: "custom",
          number: Object.keys(annotationsRef.current).length + 1,
          id,
          inches: 0, // Not applicable for custom
          label: "Custom",
          color: "#8B5CF6",
          marker,
          sourceId: textSourceId, // Store text source ID
          fillLayerId: `${id}-text`, // Store text layer ID
          lineLayerId: `${id}-text`, // Store text layer ID (same as fillLayerId)
          textSourceId, // Store text source ID
        };

        // Add to store
        addCustomAnnotation(annotationRecord);

        // Store in ref for local access
        annotationsRef.current[id] = annotationRecord;

        // Add drag handler to update text position
        const updateCustomText = () => {
          const pos = marker.getLngLat();

          // Update text position
          const textSrc = mapInstance.getSource(
            textSourceId
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
                    text: "Custom",
                  },
                },
              ],
            });
          }
        };
        marker.on("drag", updateCustomText);
        marker.on("dragend", updateCustomText);

        console.log("Created custom annotation:", id);
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
  const addExtrusionForAnnotation = (rec: unknown) => {
    // Implementation for adding extrusion
    console.log("Adding extrusion for annotation:", rec);
  };

  const removeExtrusionForAnnotation = (rec: unknown) => {
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
