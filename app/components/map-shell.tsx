"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Feature, FeatureCollection, Polygon } from "geojson";
import mapboxgl from "mapbox-gl";
import { Sidebar, Map } from "@/components/map-shell";
import { usePdfGenerator } from "@/components/pdf-generator";
import { feetToMeters, metersToFeet } from "@/components/pdf-generator/utils";
// Removed slider; we switch whole styles for performance

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";

type AnnotationItem = {
  key: string;
  label: string;
  inches: number;
  color: string;
};

type AnnotationType =
  | "firework"
  | "audience"
  | "measurement"
  | "restricted"
  | "custom";

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

interface AudienceRecord {
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

interface MeasurementRecord {
  type: AnnotationType;
  number: number;
  id: string;
  sourceId: string;
  lineLayerId: string;
  labelMarker: mapboxgl.Marker;
  pointMarkers: mapboxgl.Marker[];
  points: [number, number][];
}

interface RestrictedRecord {
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

export function MapShell() {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const [isMapReady, setIsMapReady] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState<
    Array<{ id: string; text: string; center?: [number, number] }>
  >([]);
  const [activeIndex, setActiveIndex] = useState<number>(-1);
  const sessionTokenRef = useRef<string | null>(null);
  const annotationMarkersRef = useRef<mapboxgl.Marker[]>([]);
  const annotationsRef = useRef<Record<string, AnnotationRecord>>({});
  const audienceAreasRef = useRef<Record<string, AudienceRecord>>({});
  const measurementsRef = useRef<Record<string, MeasurementRecord>>({});
  const restrictedAreasRef = useRef<Record<string, RestrictedRecord>>({});
  const fireworkCounterRef = useRef<number>(0);
  const audienceCounterRef = useRef<number>(0);
  const measurementCounterRef = useRef<number>(0);
  const restrictedCounterRef = useRef<number>(0);
  // Reset dialog is controlled by Radix internally via Dialog primitives
  const [showHeight, setShowHeight] = useState(false);
  // PDF generation is now handled by the usePdfGenerator hook
  const [shareOpen, setShareOpen] = useState(false);
  const [shareUrl, setShareUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const [disclaimerOpen, setDisclaimerOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [customAnnotationOpen, setCustomAnnotationOpen] = useState(false);
  const [editingCustomAnnotation, setEditingCustomAnnotation] = useState<
    string | null
  >(null);
  type MeasurementUnit = "feet" | "meters";
  const [measurementUnit, setMeasurementUnit] =
    useState<MeasurementUnit>("feet");
  const [safetyDistance, setSafetyDistance] = useState<70 | 100>(70);
  const safetyDistanceRef = useRef<70 | 100>(70);

  // Keep ref in sync with state
  useEffect(() => {
    safetyDistanceRef.current = safetyDistance;
  }, [safetyDistance]);

  // Settings form state
  const [projectName, setProjectName] = useState("");
  const [formProjectName, setFormProjectName] = useState("");
  const [formMeasurementUnit, setFormMeasurementUnit] =
    useState<MeasurementUnit>("feet");
  const [formSafetyDistance, setFormSafetyDistance] = useState<70 | 100>(70);
  const [hasFormChanges, setHasFormChanges] = useState(false);

  // Custom annotation form state
  const [customLabel, setCustomLabel] = useState("");
  const [customColor, setCustomColor] = useState("#FF5126");

  // PDF Generator hook
  const { isGenerating, generateSitePlanPdf } = usePdfGenerator({
    mapRef,
    annotationsRef,
    audienceAreasRef,
    measurementsRef,
    restrictedAreasRef,
    projectName,
    measurementUnit,
    safetyDistance,
  });

  // Color presets for custom annotations
  const colorPresets = [
    { color: "#EF4444", name: "Red" },
    { color: "#F97316", name: "Orange" },
    { color: "#EAB308", name: "Yellow" },
    { color: "#22C55E", name: "Green" },
    { color: "#2BB6F6", name: "Blue" },
    { color: "#6366F1", name: "Indigo" },
    { color: "#A855F7", name: "Purple" },
    { color: "#EC4899", name: "Pink" },
    { color: "#1B1C20", name: "Dark Gray" },
    { color: "#BEC2CD", name: "Light Gray" },
  ];

  // Handle form field changes
  const handleFormChange = () => {
    setHasFormChanges(true);
  };

  // Handle form submission
  const handleSaveSettings = () => {
    setProjectName(formProjectName);
    setMeasurementUnit(formMeasurementUnit);
    setSafetyDistance(formSafetyDistance);
    setHasFormChanges(false);
    setSettingsOpen(false);

    // Update existing annotations with new safety distance
    refreshAllMeasurementTexts();
  };

  // Handle form cancellation
  const handleCancelSettings = () => {
    setFormProjectName(projectName);
    setFormMeasurementUnit(measurementUnit);
    setFormSafetyDistance(safetyDistance);
    setHasFormChanges(false);
    setSettingsOpen(false);
  };

  // Helper function to get next available annotation number
  const getNextAnnotationNumber = () => {
    const allAnnotations = Object.values(annotationsRef.current);
    const allNumbers = allAnnotations
      .map((ann) => ann.number)
      .sort((a, b) => a - b);

    // Find the first gap in the sequence
    for (let i = 1; i <= allNumbers.length + 1; i++) {
      if (!allNumbers.includes(i)) {
        return i;
      }
    }
    return allNumbers.length + 1;
  };

  // Helper function to renumber all annotations after deletion
  const renumberAnnotations = () => {
    const allAnnotations = Object.values(annotationsRef.current).sort(
      (a, b) => a.number - b.number
    );
    allAnnotations.forEach((annotation, index) => {
      annotation.number = index + 1;

      // Update visual labels for firework annotations
      if (annotation.type === "firework") {
        const markerEl = annotation.marker.getElement();
        const labelEl = markerEl.querySelector("div") as HTMLDivElement;
        if (labelEl) {
          const firstDiv = labelEl.querySelector(
            "div:first-child"
          ) as HTMLDivElement;
          if (firstDiv) {
            firstDiv.textContent = annotation.label;
          }
        }
      }
    });
  };

  // Custom annotation handlers
  const handleCustomAnnotationClick = (annotationId: string) => {
    const annotation = annotationsRef.current[annotationId];
    if (annotation && annotation.type === "custom") {
      setCustomLabel(annotation.label);
      setCustomColor(annotation.color);
      setEditingCustomAnnotation(annotationId);
      setCustomAnnotationOpen(true);
    }
  };

  const handleSaveCustomAnnotation = () => {
    if (editingCustomAnnotation) {
      const annotation = annotationsRef.current[editingCustomAnnotation];
      if (annotation) {
        // Update existing annotation
        annotation.label = customLabel;
        annotation.color = customColor;

        // Update marker color by recreating the marker
        const oldMarker = annotation.marker;
        const position = oldMarker.getLngLat();
        const map = mapRef.current;

        if (map) {
          // Remove old marker
          oldMarker.remove();

          // Create new marker with updated color
          const newMarker = new mapboxgl.Marker({
            color: customColor,
            draggable: true,
            clickTolerance: 5,
          })
            .setLngLat(position)
            .addTo(map);

          // Use native Mapbox popup open as the click signal for recreated markers
          const recreatedClickProxy = new mapboxgl.Popup({
            closeButton: false,
            closeOnClick: true,
            maxWidth: "0px",
          });
          recreatedClickProxy.on("open", () => {
            handleCustomAnnotationClick(annotation.id);
            recreatedClickProxy.remove();
          });
          newMarker.setPopup(recreatedClickProxy);
          newMarker.getElement().addEventListener("contextmenu", (evt) => {
            evt.preventDefault();
            removeCustomAnnotation(annotation.id);
          });

          // Add drag handler for text
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
                      text: customLabel,
                    },
                  },
                ],
              } as FeatureCollection);
            }
          };
          newMarker.on("drag", updateCustomText);
          newMarker.on("dragend", updateCustomText);

          // Update annotation record
          annotation.marker = newMarker;

          // Update markers array
          const markerIndex = annotationMarkersRef.current.indexOf(oldMarker);
          if (markerIndex !== -1) {
            annotationMarkersRef.current[markerIndex] = newMarker;
          }
        }

        // Update text content
        if (map && annotation.textSourceId) {
          // Update text
          const textSrc = map.getSource(
            annotation.textSourceId
          ) as mapboxgl.GeoJSONSource;
          if (textSrc) {
            const pos = annotation.marker.getLngLat();
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
                    text: customLabel,
                  },
                },
              ],
            } as FeatureCollection);
          }
        }
      }
    }
    setCustomAnnotationOpen(false);
    setEditingCustomAnnotation(null);
    setCustomLabel("");
    setCustomColor("#FF5126");
  };

  const handleCancelCustomAnnotation = () => {
    setCustomAnnotationOpen(false);
    setEditingCustomAnnotation(null);
    setCustomLabel("");
    setCustomColor("#FF5126");
  };

  const unitLabel = measurementUnit === "feet" ? "ft" : "m";

  function formatDistanceWithSpace(meters: number): string {
    if (measurementUnit === "feet") {
      return `${Math.round(metersToFeet(meters))} ft`;
    }
    return `${Math.round(meters)} m`;
  }

  function formatLengthNoSpace(meters: number): string {
    if (measurementUnit === "feet") {
      return `${Math.round(metersToFeet(meters))}ft`;
    }
    return `${Math.round(meters)}m`;
  }

  function refreshAllMeasurementTexts() {
    const map = mapRef.current;
    if (!map) return;
    // Measurements
    for (const key of Object.keys(measurementsRef.current)) {
      const rec = measurementsRef.current[key]!;
      const pts = rec.points;
      const lat1 = (pts[0][1] * Math.PI) / 180;
      const lat2 = (pts[1][1] * Math.PI) / 180;
      const deltaLat = ((pts[1][1] - pts[0][1]) * Math.PI) / 180;
      const deltaLng = ((pts[1][0] - pts[0][0]) * Math.PI) / 180;
      const a =
        Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
        Math.cos(lat1) *
          Math.cos(lat2) *
          Math.sin(deltaLng / 2) *
          Math.sin(deltaLng / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      const distanceMeters = 6371000 * c;
      const el = rec.labelMarker.getElement();
      let distanceDiv = el.querySelector(
        '[data-role="distance"]'
      ) as HTMLDivElement | null;
      if (!distanceDiv) {
        distanceDiv = el.querySelector(
          "div:nth-child(2)"
        ) as HTMLDivElement | null;
        if (distanceDiv) distanceDiv.setAttribute("data-role", "distance");
      }
      if (distanceDiv)
        distanceDiv.textContent = formatDistanceWithSpace(distanceMeters);
    }
    // Audience areas
    for (const key of Object.keys(audienceAreasRef.current)) {
      const rec = audienceAreasRef.current[key]!;
      const c = rec.corners;
      const centerLat = (c[0][1] + c[2][1]) / 2;
      const metersW =
        Math.abs(c[1][0] - c[0][0]) *
        111320 *
        Math.cos((centerLat * Math.PI) / 180);
      const metersH = Math.abs(c[3][1] - c[0][1]) * 110540;
      const root = rec.labelMarker.getElement();
      let div = root.querySelector(
        '[data-role="dims"]'
      ) as HTMLDivElement | null;
      if (!div) {
        div = root.querySelector("div:nth-child(2)") as HTMLDivElement | null;
        if (div) div.setAttribute("data-role", "dims");
      }
      if (div)
        div.textContent = `${formatLengthNoSpace(
          metersW
        )} × ${formatLengthNoSpace(metersH)}`;
    }
    // Restricted areas
    for (const key of Object.keys(restrictedAreasRef.current)) {
      const rec = restrictedAreasRef.current[key]!;
      const c = rec.corners;
      const centerLat = (c[0][1] + c[2][1]) / 2;
      const metersW =
        Math.abs(c[1][0] - c[0][0]) *
        111320 *
        Math.cos((centerLat * Math.PI) / 180);
      const metersH = Math.abs(c[3][1] - c[0][1]) * 110540;
      const root = rec.labelMarker.getElement();
      let div = root.querySelector(
        '[data-role="dims"]'
      ) as HTMLDivElement | null;
      if (!div) {
        div = root.querySelector("div:nth-child(2)") as HTMLDivElement | null;
        if (div) div.setAttribute("data-role", "dims");
      }
      if (div)
        div.textContent = `${formatLengthNoSpace(
          metersW
        )} × ${formatLengthNoSpace(metersH)}`;
    }
    // Firework radius labels and circles
    for (const key of Object.keys(annotationsRef.current)) {
      const rec = annotationsRef.current[key]!;
      if (rec.type !== "firework") continue;
      const el = rec.marker.getElement();
      const second = el.querySelector(
        "div:nth-child(2)"
      ) as HTMLDivElement | null;
      if (!second) continue;
      const radiusFeet = Math.round(rec.inches * safetyDistance);
      const text =
        measurementUnit === "feet"
          ? `${radiusFeet} ft radius`
          : `${Math.round(feetToMeters(radiusFeet))} m radius`;
      second.textContent = text;

      // Update circle geometry with new safety distance
      const pos = rec.marker.getLngLat();
      const radiusMeters = feetToMeters(rec.inches * safetyDistance);
      const updatedCircle = createCircleFeature(pos.lng, pos.lat, radiusMeters);
      const source = map.getSource(rec.sourceId) as mapboxgl.GeoJSONSource;
      if (source) {
        source.setData({
          type: "FeatureCollection",
          features: [updatedCircle],
        } as FeatureCollection);
      }
    }
  }

  useEffect(() => {
    // Recompute and rewrite all visible annotation label texts when unit or safety distance changes
    if (!isMapReady) return;
    try {
      refreshAllMeasurementTexts();
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [measurementUnit, safetyDistance, isMapReady]);

  const annotationPalette = useMemo<AnnotationItem[]>(
    () => [
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
      { key: "audience", label: "Audience", inches: 0, color: "#0077FF" },
      { key: "measurement", label: "Measurement", inches: 0, color: "#00AA00" },
      { key: "restricted", label: "Restricted", inches: 0, color: "#FF0000" },
      { key: "custom", label: "Custom", inches: 0, color: "#FF5126" },
    ],
    []
  );

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: "mapbox://styles/mapbox/satellite-streets-v12",
      center: [-98.5795, 39.8283],
      zoom: 3,
      pitch: 20,
      bearing: 0,
      antialias: true,
      preserveDrawingBuffer: true,
      attributionControl: false,
    });

    mapRef.current = map;

    map.on("load", () => {
      try {
        map.setFog({
          color: "#0b1220",
          "high-color": "#0b1220",
          "space-color": "#000010",
          "horizon-blend": 0.2,
          "star-intensity": 0,
        } as mapboxgl.FogSpecification);
      } catch {}
      setIsMapReady(true);
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!isMapReady || !mapRef.current) return;
    // If a shared state hash is present, skip geolocation to avoid overriding the saved camera
    try {
      const hasShared = new URLSearchParams(
        (window.location.hash || "").replace(/^#?/, "")
      ).has("s");
      if (hasShared) return;
    } catch {}
    if (!("geolocation" in navigator)) return;

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        mapRef.current!.flyTo({
          center: [longitude, latitude],
          zoom: 16,
          pitch: 30,
          bearing: 0,
          essential: true,
        });
      },
      () => {},
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, [isMapReady]);

  // Satellite-only: no style switching; Mapbox default fog/effects are used

  useEffect(() => {
    const controller = new AbortController();
    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    const query = searchQuery.trim();
    if (!token || query.length < 2) {
      setSuggestions([]);
      setActiveIndex(-1);
      return () => controller.abort();
    }

    if (!sessionTokenRef.current) {
      sessionTokenRef.current = crypto.randomUUID();
    }

    const run = async () => {
      const sbUrl = new URL(
        "https://api.mapbox.com/search/searchbox/v1/suggest"
      );
      sbUrl.searchParams.set("q", query);
      sbUrl.searchParams.set("language", "en");
      sbUrl.searchParams.set("limit", "5");
      sbUrl.searchParams.set("session_token", sessionTokenRef.current!);
      sbUrl.searchParams.set("access_token", token);

      try {
        const res = await fetch(sbUrl.toString(), {
          signal: controller.signal,
        });
        if (!res.ok) throw new Error("suggest failed");
        const data = (await res.json()) as {
          suggestions?: Array<{
            mapbox_id: string;
            name: string;
            place_formatted?: string;
          }>;
        };
        const items = (data.suggestions ?? []).map((s) => ({
          id: s.mapbox_id,
          text: s.place_formatted ? `${s.name} — ${s.place_formatted}` : s.name,
        }));
        setSuggestions(items);
        setActiveIndex(items.length > 0 ? 0 : -1);
        return;
      } catch {}

      const geoUrl = new URL(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
          query
        )}.json`
      );
      geoUrl.searchParams.set("autocomplete", "true");
      geoUrl.searchParams.set("language", "en");
      geoUrl.searchParams.set("limit", "5");
      geoUrl.searchParams.set(
        "types",
        "poi,address,place,locality,neighborhood"
      );
      geoUrl.searchParams.set("access_token", token);
      try {
        const res = await fetch(geoUrl.toString(), {
          signal: controller.signal,
        });
        if (!res.ok) return;
        const data = (await res.json()) as {
          features?: Array<{
            id: string;
            place_name: string;
            center: [number, number];
          }>;
        };
        const items = (data.features ?? []).map((f) => ({
          id: f.id,
          text: f.place_name,
          center: f.center,
        }));
        setSuggestions(items);
        setActiveIndex(items.length > 0 ? 0 : -1);
      } catch {}
    };

    const id = setTimeout(() => void run(), 200);
    return () => {
      controller.abort();
      clearTimeout(id);
    };
  }, [searchQuery]);

  async function handleSubmitOrSelect(idOrQuery?: string) {
    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    const query =
      typeof idOrQuery === "string" ? idOrQuery : searchQuery.trim();
    if (!token || !query) return;

    let lngLat: [number, number] | null = null;

    const fromSuggestion = suggestions.find((s) => s.id === idOrQuery);
    if (fromSuggestion) {
      if (!fromSuggestion.center && sessionTokenRef.current) {
        try {
          const rUrl = new URL(
            `https://api.mapbox.com/search/searchbox/v1/retrieve/${fromSuggestion.id}`
          );
          rUrl.searchParams.set("session_token", sessionTokenRef.current);
          rUrl.searchParams.set("access_token", token);
          const res = await fetch(rUrl.toString());
          if (res.ok) {
            const data = (await res.json()) as {
              features?: Array<{
                geometry?: { coordinates?: [number, number] };
              }>;
            };
            const coords = data.features?.[0]?.geometry?.coordinates;
            if (coords) lngLat = coords;
          }
        } catch {}
      }
      if (!lngLat && fromSuggestion.center) {
        lngLat = fromSuggestion.center;
      }
    }

    if (!lngLat) {
      const url = new URL(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
          query
        )}.json`
      );
      url.searchParams.set("access_token", token);
      url.searchParams.set("limit", "1");
      try {
        const res = await fetch(url.toString());
        if (res.ok) {
          const data = (await res.json()) as {
            features?: Array<{ center?: [number, number] }>;
          };
          const center = data.features?.[0]?.center;
          if (center) lngLat = center as [number, number];
        }
      } catch {}
    }

    if (lngLat && mapRef.current) {
      mapRef.current.flyTo({
        center: lngLat,
        zoom: 16,
        pitch: 30,
        bearing: 0,
        essential: true,
      });
      // do not leave a pin for search results
      sessionTokenRef.current = crypto.randomUUID();
      setSuggestions([]);
      setActiveIndex(-1);
      setSearchQuery("");
    }
  }

  // --- Share/Load helpers ---
  interface SerializedFirework {
    id: string;
    number: number;
    inches: number;
    label: string;
    color: string;
    position: [number, number]; // [lng, lat]
  }

  interface SerializedCustom {
    id: string;
    number: number;
    label: string;
    color: string;
    position: [number, number]; // [lng, lat]
    emoji?: string;
    description?: string;
  }

  interface SerializedAudience {
    id: string;
    number: number;
    corners: [number, number][]; // 4 corners [lng, lat]
  }

  interface SerializedMeasurement {
    id: string;
    number: number;
    points: [number, number][]; // 2 points [lng, lat]
  }

  interface SerializedRestricted {
    id: string;
    number: number;
    corners: [number, number][]; // 4 corners [lng, lat]
  }

  interface SerializedState {
    camera: {
      center: [number, number];
      zoom: number;
      bearing: number;
      pitch: number;
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
    v: 1;
  }

  function base64UrlEncode(bytes: Uint8Array) {
    let binary = "";
    for (let i = 0; i < bytes.length; i++)
      binary += String.fromCharCode(bytes[i]!);
    const b64 = btoa(binary);
    return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
  }

  function base64UrlDecode(input: string): Uint8Array {
    const b64 =
      input.replace(/-/g, "+").replace(/_/g, "/") +
      "===".slice((input.length + 3) % 4);
    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  }

  async function gzipCompress(data: Uint8Array): Promise<Uint8Array> {
    if ("CompressionStream" in window) {
      const cs = new CompressionStream("gzip");
      const ab = data.buffer.slice(
        data.byteOffset,
        data.byteOffset + data.byteLength
      ) as ArrayBuffer;
      const stream = new Response(new Blob([ab])).body as ReadableStream;
      const writer = stream.pipeThrough(cs).getReader();
      const chunks: Uint8Array[] = [];
      // Collect all chunks
      while (true) {
        const { value, done } = await writer.read();
        if (done) break;
        if (value) chunks.push(value);
      }
      const total = chunks.reduce((n, c) => n + c.length, 0);
      const out = new Uint8Array(total);
      let off = 0;
      for (const c of chunks) {
        out.set(c, off);
        off += c.length;
      }
      return out;
    }
    return data; // Fallback: no compression
  }

  async function gzipDecompress(data: Uint8Array): Promise<Uint8Array> {
    if ("DecompressionStream" in window) {
      const ds = new DecompressionStream("gzip");
      const ab = data.buffer.slice(
        data.byteOffset,
        data.byteOffset + data.byteLength
      ) as ArrayBuffer;
      const stream = new Response(new Blob([ab])).body as ReadableStream;
      const writer = stream.pipeThrough(ds).getReader();
      const chunks: Uint8Array[] = [];
      while (true) {
        const { value, done } = await writer.read();
        if (done) break;
        if (value) chunks.push(value);
      }
      const total = chunks.reduce((n, c) => n + c.length, 0);
      const out = new Uint8Array(total);
      let off = 0;
      for (const c of chunks) {
        out.set(c, off);
        off += c.length;
      }
      return out;
    }
    return data; // Fallback: already plain
  }

  async function encodeStateToHash(): Promise<string> {
    if (!mapRef.current) return "";
    const map = mapRef.current;
    const camera = {
      center: [map.getCenter().lng, map.getCenter().lat] as [number, number],
      zoom: map.getZoom(),
      bearing: map.getBearing(),
      pitch: map.getPitch(),
    };
    const fireworks: SerializedFirework[] = Object.values(
      annotationsRef.current
    )
      .filter((rec) => rec.type === "firework")
      .map((rec) => {
        const pos = rec.marker.getLngLat();
        return {
          id: rec.id,
          number: rec.number,
          inches: rec.inches,
          label: rec.label,
          color: rec.color,
          position: [pos.lng, pos.lat],
        };
      });

    const custom: SerializedCustom[] = Object.values(annotationsRef.current)
      .filter((rec) => rec.type === "custom")
      .map((rec) => {
        const pos = rec.marker.getLngLat();
        return {
          id: rec.id,
          number: rec.number,
          label: rec.label,
          color: rec.color,
          position: [pos.lng, pos.lat],
          emoji: rec.emoji,
          description: rec.description,
        };
      });
    const audiences: SerializedAudience[] = Object.values(
      audienceAreasRef.current
    ).map((rec) => ({
      id: rec.id,
      number: rec.number,
      corners: rec.corners,
    }));
    const measurements: SerializedMeasurement[] = Object.values(
      measurementsRef.current
    ).map((rec) => ({
      id: rec.id,
      number: rec.number,
      points: rec.points,
    }));
    const restricted: SerializedRestricted[] = Object.values(
      restrictedAreasRef.current
    ).map((rec) => ({
      id: rec.id,
      number: rec.number,
      corners: rec.corners,
    }));
    const state: SerializedState = {
      camera,
      fireworks,
      custom,
      audiences,
      measurements,
      restricted,
      showHeight,
      measurementUnit,
      projectName,
      safetyDistance,
      v: 1,
    };
    const json = JSON.stringify(state);
    const raw = new TextEncoder().encode(json);
    const gz = await gzipCompress(raw);
    const data = base64UrlEncode(gz);
    return `s=${data}`;
  }

  async function decodeStateFromHash(
    hash: string
  ): Promise<SerializedState | null> {
    try {
      const params = new URLSearchParams(hash.replace(/^#?/, ""));
      const enc = params.get("s");
      if (!enc) return null;
      const gz = base64UrlDecode(enc);
      const raw = await gzipDecompress(gz);
      const json = new TextDecoder().decode(raw);
      const parsed = JSON.parse(json) as SerializedState;
      if (!parsed || parsed.v !== 1) return null;
      return parsed;
    } catch {
      return null;
    }
  }

  function restoreFromState(state: SerializedState) {
    const map = mapRef.current;
    if (!map) return;
    // Clear existing
    clearAllAnnotations();
    // Initialize camera early
    map.jumpTo({
      center: state.camera.center,
      zoom: state.camera.zoom,
      bearing: state.camera.bearing,
      pitch: state.camera.pitch,
    });
    if (
      state.measurementUnit === "feet" ||
      state.measurementUnit === "meters"
    ) {
      setMeasurementUnit(state.measurementUnit);
      // defer refresh until elements exist
      setTimeout(() => refreshAllMeasurementTexts(), 0);
    }
    if (state.projectName) {
      setProjectName(state.projectName);
      setFormProjectName(state.projectName);
    }
    if (state.safetyDistance === 70 || state.safetyDistance === 100) {
      setSafetyDistance(state.safetyDistance);
      setFormSafetyDistance(state.safetyDistance);
    }
    // Restore fireworks
    let maxFireworkNum = 0;
    for (const fw of state.fireworks) {
      const item: AnnotationItem | undefined = annotationPalette.find(
        (i) => i.inches === fw.inches && i.key !== "audience"
      );
      const color = fw.color || item?.color || "#FF5126";
      const labelText = fw.label || item?.label || `${fw.inches}\"`;
      const labelEl = document.createElement("div");
      labelEl.className =
        "rounded-md bg-background/95 text-foreground shadow-lg border border-border px-2 py-1 text-xs";
      const radiusFeet = Math.round(fw.inches * safetyDistance);
      const radiusText =
        measurementUnit === "feet"
          ? `${radiusFeet} ft radius`
          : `${Math.round(feetToMeters(radiusFeet))} m radius`;
      labelEl.innerHTML = `<div class="font-medium leading-none">${labelText}</div><div class="text-muted-foreground text-[10px]">${radiusText}</div>`;
      const marker = new mapboxgl.Marker({
        element: labelEl,
        color,
        draggable: true,
      })
        .setLngLat(fw.position)
        .addTo(map);
      annotationMarkersRef.current.push(marker);
      const radiusMeters = feetToMeters(fw.inches * safetyDistance);
      const circleId =
        fw.id || `circle-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      labelEl.addEventListener("contextmenu", (evt) => {
        evt.preventDefault();
        removeFireworkAnnotation(circleId);
      });
      const sourceId = `${circleId}-src`;
      const feature = createCircleFeature(
        fw.position[0],
        fw.position[1],
        radiusMeters
      );
      map.addSource(sourceId, {
        type: "geojson",
        data: {
          type: "FeatureCollection",
          features: [feature],
        } as FeatureCollection,
      });
      map.addLayer({
        id: circleId,
        type: "fill",
        source: sourceId,
        paint: { "fill-color": color, "fill-opacity": 0.25 },
      });
      const lineId = `${circleId}-line`;
      map.addLayer({
        id: lineId,
        type: "line",
        source: sourceId,
        paint: { "line-color": color, "line-opacity": 1, "line-width": 2 },
      });
      annotationsRef.current[circleId] = {
        type: "firework",
        number: fw.number,
        id: circleId,
        inches: fw.inches,
        label: labelText,
        color,
        marker,
        sourceId,
        fillLayerId: circleId,
        lineLayerId: lineId,
      };
      if (state.showHeight)
        addExtrusionForAnnotation(annotationsRef.current[circleId]!);
      const updateCircle = () => {
        const pos = marker.getLngLat();
        // Get the annotation record to access current inches value and use current safetyDistance from state
        const annotation = annotationsRef.current[circleId];
        if (!annotation) return;
        const currentRadiusMeters = feetToMeters(
          annotation.inches * safetyDistanceRef.current
        );
        const updated = createCircleFeature(
          pos.lng,
          pos.lat,
          currentRadiusMeters
        );
        const src = map.getSource(sourceId) as mapboxgl.GeoJSONSource;
        src.setData({
          type: "FeatureCollection",
          features: [updated],
        } as FeatureCollection);
      };
      marker.on("drag", updateCircle);
      marker.on("dragend", updateCircle);
      maxFireworkNum = Math.max(maxFireworkNum, fw.number || 0);
    }
    fireworkCounterRef.current = maxFireworkNum;

    // Restore custom annotations
    let maxCustomNum = 0;
    for (const custom of state.custom || []) {
      const id =
        custom.id ||
        `custom-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const number = custom.number;

      // Create default Mapbox marker with custom color
      const marker = new mapboxgl.Marker({
        color: custom.color,
        draggable: true,
      })
        .setLngLat(custom.position)
        .addTo(map);

      annotationMarkersRef.current.push(marker);

      // Use native Mapbox popup open as the click signal (Mapbox suppresses clicks after drag)
      const clickProxyPopup = new mapboxgl.Popup({
        closeButton: false,
        closeOnClick: true,
        maxWidth: "0px",
      });
      clickProxyPopup.on("open", () => {
        handleCustomAnnotationClick(id);
        clickProxyPopup.remove();
      });
      marker.setPopup(clickProxyPopup);

      // Add right-click handler to remove
      marker.getElement().addEventListener("contextmenu", (evt) => {
        evt.preventDefault();
        removeCustomAnnotation(id);
      });

      // Create text element for emoji and label combined
      const textSourceId = `${id}-text-src`;

      // Combined emoji and label text
      const textFeature = {
        type: "Feature" as const,
        geometry: {
          type: "Point" as const,
          coordinates: custom.position,
        },
        properties: {
          text: custom.label,
        },
      };

      // Add text source and layer
      map.addSource(textSourceId, {
        type: "geojson",
        data: {
          type: "FeatureCollection",
          features: [textFeature],
        } as FeatureCollection,
      });

      map.addLayer({
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

      // Store annotation
      annotationsRef.current[id] = {
        type: "custom",
        number,
        id,
        inches: 0, // Not applicable for custom
        label: custom.label,
        color: custom.color,
        marker,
        sourceId: textSourceId, // Store text source ID
        fillLayerId: `${id}-text`, // Store text layer ID
        lineLayerId: `${id}-text`, // Store text layer ID (same as fillLayerId)
        emoji: custom.emoji,
        description: custom.description,
        textSourceId, // Store text source ID
      };

      // Add drag handler to update text position
      const updateCustomText = () => {
        const pos = marker.getLngLat();

        // Update text position
        const textSrc = map.getSource(textSourceId) as mapboxgl.GeoJSONSource;
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
                  text: custom.label,
                },
              },
            ],
          } as FeatureCollection);
        }
      };
      marker.on("drag", updateCustomText);
      marker.on("dragend", updateCustomText);

      maxCustomNum = Math.max(maxCustomNum, custom.number || 0);
    }
    fireworkCounterRef.current = Math.max(
      fireworkCounterRef.current,
      maxCustomNum
    );

    // Restore audiences
    let maxAudienceNum = 0;
    for (const aud of state.audiences) {
      let corners = normalizeCorners(aud.corners as [number, number][]);
      const id =
        aud.id || `aud-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const number = aud.number;
      const sourceId = `${id}-src`;
      const rectFeature = createRectangleFeature(corners);
      map.addSource(sourceId, {
        type: "geojson",
        data: {
          type: "FeatureCollection",
          features: [rectFeature],
        } as FeatureCollection,
      });
      map.addLayer({
        id: `${id}-fill`,
        type: "fill",
        source: sourceId,
        paint: { "fill-color": "#0077FF", "fill-opacity": 0.2 },
      });
      map.addLayer({
        id: `${id}-line`,
        type: "line",
        source: sourceId,
        paint: { "line-color": "#0077FF", "line-opacity": 1, "line-width": 2 },
      });
      const label = document.createElement("div");
      label.className =
        "rounded-md px-2 py-1 text-xs shadow bg-background/50 backdrop-blur-sm border border-border text-center";
      label.addEventListener("contextmenu", (evt) => {
        evt.preventDefault();
        removeAudienceArea(id);
      });
      const title = document.createElement("div");
      title.className = "font-medium leading-none";
      title.textContent = "Audience";
      const dims = document.createElement("div");
      dims.className = "text-[10px] text-muted-foreground";
      dims.setAttribute("data-role", "dims");
      dims.setAttribute("data-role", "dims");
      const centerLat = (corners[0][1] + corners[2][1]) / 2;
      const metersW =
        Math.abs(corners[1][0] - corners[0][0]) *
        111320 *
        Math.cos((centerLat * Math.PI) / 180);
      const metersH = Math.abs(corners[3][1] - corners[0][1]) * 110540;
      dims.textContent = `${formatLengthNoSpace(
        metersW
      )} × ${formatLengthNoSpace(metersH)}`;
      label.appendChild(title);
      label.appendChild(dims);
      const centerLng = (corners[0][0] + corners[2][0]) / 2;
      const centerLat2 = (corners[0][1] + corners[2][1]) / 2;
      const labelMarker = new mapboxgl.Marker({
        element: label,
        draggable: true,
      })
        .setLngLat([centerLng, centerLat2])
        .addTo(map);
      const cornerMarkers: mapboxgl.Marker[] = corners.map((c) =>
        new mapboxgl.Marker({ draggable: true }).setLngLat(c).addTo(map)
      );
      const updateRectFromLabel = () => {
        const cur = labelMarker.getLngLat();
        const dLng = cur.lng - (corners[0][0] + corners[2][0]) / 2;
        const dLat = cur.lat - (corners[0][1] + corners[2][1]) / 2;
        const moved = corners.map(([lng, lat]) => [lng + dLng, lat + dLat]) as [
          number,
          number
        ][];
        const src = map.getSource(sourceId) as mapboxgl.GeoJSONSource;
        src.setData({
          type: "FeatureCollection",
          features: [createRectangleFeature(moved)],
        } as FeatureCollection);
        moved.forEach((c, i) => cornerMarkers[i].setLngLat(c));
        corners = moved;
        audienceAreasRef.current[id].corners = moved;
        const centerLatNow = (moved[0][1] + moved[2][1]) / 2;
        const metersWNow =
          Math.abs(moved[1][0] - moved[0][0]) *
          111320 *
          Math.cos((centerLatNow * Math.PI) / 180);
        const metersHNow = Math.abs(moved[3][1] - moved[0][1]) * 110540;
        dims.textContent = `${formatLengthNoSpace(
          metersWNow
        )} × ${formatLengthNoSpace(metersHNow)}`;
      };
      labelMarker.on("drag", updateRectFromLabel);
      labelMarker.on("dragend", updateRectFromLabel);
      cornerMarkers.forEach((cm, idx) => {
        const updateRect = () => {
          const cur = cm.getLngLat();
          const oppIdx = (idx + 2) % 4;
          const anchorLng = corners[oppIdx][0];
          const anchorLat = corners[oppIdx][1];
          const minFt = 20;
          const minLngDelta =
            feetToMeters(minFt) /
            (111320 * Math.cos((anchorLat * Math.PI) / 180));
          const minLatDelta = feetToMeters(minFt) / 110540;
          const sLng = idx === 0 || idx === 3 ? -1 : 1;
          const sLat = idx === 0 || idx === 1 ? -1 : 1;
          let dragLng = cur.lng;
          let dragLat = cur.lat;
          if (sLng > 0) dragLng = Math.max(anchorLng + minLngDelta, dragLng);
          else dragLng = Math.min(anchorLng - minLngDelta, dragLng);
          if (sLat > 0) dragLat = Math.max(anchorLat + minLatDelta, dragLat);
          else dragLat = Math.min(anchorLat - minLatDelta, dragLat);
          let newCorners: [number, number][] = [...corners] as [
            number,
            number
          ][];
          newCorners[oppIdx] = [anchorLng, anchorLat];
          newCorners[idx] = [dragLng, dragLat];
          newCorners[(idx + 1) % 4] = [dragLng, anchorLat];
          newCorners[(idx + 3) % 4] = [anchorLng, dragLat];
          newCorners = normalizeCorners(newCorners);
          corners = newCorners;
          const src = map.getSource(sourceId) as mapboxgl.GeoJSONSource;
          src.setData({
            type: "FeatureCollection",
            features: [createRectangleFeature(corners)],
          } as FeatureCollection);
          const newCenterLng = (corners[0][0] + corners[2][0]) / 2;
          const newCenterLat = (corners[0][1] + corners[2][1]) / 2;
          labelMarker.setLngLat([newCenterLng, newCenterLat]);
          const metersW2 =
            Math.abs(corners[1][0] - corners[0][0]) *
            111320 *
            Math.cos((newCenterLat * Math.PI) / 180);
          const metersH2 = Math.abs(corners[3][1] - corners[0][1]) * 110540;
          dims.textContent = `${formatLengthNoSpace(
            metersW2
          )} × ${formatLengthNoSpace(metersH2)}`;
          audienceAreasRef.current[id].corners = corners;
          corners.forEach((p, i) => cornerMarkers[i].setLngLat(p));
        };
        cm.on("drag", updateRect);
        cm.on("dragend", updateRect);
      });
      audienceAreasRef.current[id] = {
        type: "audience",
        number,
        id,
        sourceId,
        fillLayerId: `${id}-fill`,
        lineLayerId: `${id}-line`,
        labelMarker,
        cornerMarkers,
        corners,
      };
      maxAudienceNum = Math.max(maxAudienceNum, number || 0);
    }
    audienceCounterRef.current = maxAudienceNum;
    // Restore measurements
    let maxMeasurementNum = 0;
    for (const meas of state.measurements) {
      const points = meas.points as [number, number][];
      const id =
        meas.id || `meas-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const number = meas.number;
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

      map.addSource(sourceId, {
        type: "geojson",
        data: {
          type: "FeatureCollection",
          features: [lineFeature],
        } as FeatureCollection,
      });

      map.addLayer({
        id: `${id}-line`,
        type: "line",
        source: sourceId,
        paint: {
          "line-color": "#00AA00",
          "line-opacity": 1,
          "line-width": 3,
        },
      });

      // Create label marker at center of line
      const centerLng = (points[0][0] + points[1][0]) / 2;
      const centerLat = (points[0][1] + points[1][1]) / 2;

      const label = document.createElement("div");
      label.className =
        "rounded-md px-2 py-1 text-xs shadow bg-background/50 backdrop-blur-sm backdrop-blur-sm border border-border text-center";
      label.addEventListener("contextmenu", (evt) => {
        evt.preventDefault();
        removeMeasurement(id);
      });

      const title = document.createElement("div");
      title.className = "font-medium leading-none";
      title.textContent = "Measurement";

      const distance = document.createElement("div");
      distance.className = "text-[10px] text-muted-foreground";
      distance.setAttribute("data-role", "distance");

      // Calculate distance
      const lat1 = (points[0][1] * Math.PI) / 180;
      const lat2 = (points[1][1] * Math.PI) / 180;
      const deltaLat = ((points[1][1] - points[0][1]) * Math.PI) / 180;
      const deltaLng = ((points[1][0] - points[0][0]) * Math.PI) / 180;

      const a =
        Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
        Math.cos(lat1) *
          Math.cos(lat2) *
          Math.sin(deltaLng / 2) *
          Math.sin(deltaLng / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      const distanceMeters = 6371000 * c; // Earth radius in meters
      distance.textContent = formatDistanceWithSpace(distanceMeters);

      label.appendChild(title);
      label.appendChild(distance);

      const labelMarker = new mapboxgl.Marker({
        element: label,
        draggable: true,
      })
        .setLngLat([centerLng, centerLat])
        .addTo(map);

      // Create point markers
      const pointMarkers: mapboxgl.Marker[] = points.map((point, idx) => {
        const pointEl = document.createElement("div");
        pointEl.className =
          "w-3 h-3 rounded-full border-2 border-white shadow-lg";
        pointEl.style.backgroundColor = "#00AA00";
        pointEl.style.cursor = "move";

        const marker = new mapboxgl.Marker({
          element: pointEl,
          draggable: true,
        })
          .setLngLat(point)
          .addTo(map);

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

          const src = map.getSource(sourceId) as mapboxgl.GeoJSONSource;
          src.setData({
            type: "FeatureCollection",
            features: [lineFeature],
          } as FeatureCollection);

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
          distance.textContent = formatDistanceWithSpace(distanceMeters);

          // Update points reference
          points[0] = newPoints[0];
          points[1] = newPoints[1];
          measurementsRef.current[id].points = points;
        };

        marker.on("drag", updateMeasurement);
        marker.on("dragend", updateMeasurement);

        return marker;
      });

      measurementsRef.current[id] = {
        type: "measurement",
        number,
        id,
        sourceId,
        lineLayerId: `${id}-line`,
        labelMarker,
        pointMarkers,
        points,
      };

      maxMeasurementNum = Math.max(maxMeasurementNum, number || 0);
    }
    measurementCounterRef.current = maxMeasurementNum;
    // Restore restricted areas
    let maxRestrictedNum = 0;
    for (const rest of state.restricted) {
      let corners = normalizeCorners(rest.corners as [number, number][]);
      const id =
        rest.id || `rest-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const number = rest.number;
      const sourceId = `${id}-src`;
      const rectFeature = createRectangleFeature(corners);
      map.addSource(sourceId, {
        type: "geojson",
        data: {
          type: "FeatureCollection",
          features: [rectFeature],
        } as FeatureCollection,
      });
      map.addLayer({
        id: `${id}-fill`,
        type: "fill",
        source: sourceId,
        paint: { "fill-color": "#FF0000", "fill-opacity": 0.2 },
      });
      map.addLayer({
        id: `${id}-line`,
        type: "line",
        source: sourceId,
        paint: { "line-color": "#FF0000", "line-opacity": 1, "line-width": 2 },
      });
      const label = document.createElement("div");
      label.className =
        "rounded-md px-2 py-1 text-xs shadow bg-background/50 backdrop-blur-sm backdrop-blur-sm border border-border text-center";
      label.addEventListener("contextmenu", (evt) => {
        evt.preventDefault();
        removeRestrictedArea(id);
      });
      const title = document.createElement("div");
      title.className = "font-medium leading-none";
      title.textContent = "Restricted";
      const dims = document.createElement("div");
      dims.className = "text-[10px] text-muted-foreground";
      dims.setAttribute("data-role", "dims");
      dims.setAttribute("data-role", "dims");
      const centerLat = (corners[0][1] + corners[2][1]) / 2;
      const metersW =
        Math.abs(corners[1][0] - corners[0][0]) *
        111320 *
        Math.cos((centerLat * Math.PI) / 180);
      const metersH = Math.abs(corners[3][1] - corners[0][1]) * 110540;
      dims.textContent = `${formatLengthNoSpace(
        metersW
      )} × ${formatLengthNoSpace(metersH)}`;
      label.appendChild(title);
      label.appendChild(dims);
      const centerLng = (corners[0][0] + corners[2][0]) / 2;
      const centerLat2 = (corners[0][1] + corners[2][1]) / 2;
      const labelMarker = new mapboxgl.Marker({
        element: label,
        draggable: true,
      })
        .setLngLat([centerLng, centerLat2])
        .addTo(map);
      const cornerMarkers: mapboxgl.Marker[] = corners.map((c) =>
        new mapboxgl.Marker({ draggable: true }).setLngLat(c).addTo(map)
      );
      const updateRectFromLabel = () => {
        const cur = labelMarker.getLngLat();
        const dLng = cur.lng - (corners[0][0] + corners[2][0]) / 2;
        const dLat = cur.lat - (corners[0][1] + corners[2][1]) / 2;
        const moved = corners.map(([lng, lat]) => [lng + dLng, lat + dLat]) as [
          number,
          number
        ][];
        const src = map.getSource(sourceId) as mapboxgl.GeoJSONSource;
        src.setData({
          type: "FeatureCollection",
          features: [createRectangleFeature(moved)],
        } as FeatureCollection);
        moved.forEach((c, i) => cornerMarkers[i].setLngLat(c));
        corners = moved;
        restrictedAreasRef.current[id].corners = moved;
        const centerLatNow = (moved[0][1] + moved[2][1]) / 2;
        const metersWNow =
          Math.abs(moved[1][0] - moved[0][0]) *
          111320 *
          Math.cos((centerLatNow * Math.PI) / 180);
        const metersHNow = Math.abs(moved[3][1] - moved[0][1]) * 110540;
        dims.textContent = `${formatLengthNoSpace(
          metersWNow
        )} × ${formatLengthNoSpace(metersHNow)}`;
      };
      labelMarker.on("drag", updateRectFromLabel);
      labelMarker.on("dragend", updateRectFromLabel);
      cornerMarkers.forEach((cm, idx) => {
        const updateRect = () => {
          const cur = cm.getLngLat();
          const oppIdx = (idx + 2) % 4;
          const anchorLng = corners[oppIdx][0];
          const anchorLat = corners[oppIdx][1];
          const minFt = 20;
          const minLngDelta =
            feetToMeters(minFt) /
            (111320 * Math.cos((anchorLat * Math.PI) / 180));
          const minLatDelta = feetToMeters(minFt) / 110540;
          const sLng = idx === 0 || idx === 3 ? -1 : 1;
          const sLat = idx === 0 || idx === 1 ? -1 : 1;
          let dragLng = cur.lng;
          let dragLat = cur.lat;
          if (sLng > 0) dragLng = Math.max(anchorLng + minLngDelta, dragLng);
          else dragLng = Math.min(anchorLng - minLngDelta, dragLng);
          if (sLat > 0) dragLat = Math.max(anchorLat + minLatDelta, dragLat);
          else dragLat = Math.min(anchorLat - minLatDelta, dragLat);
          let newCorners: [number, number][] = [...corners] as [
            number,
            number
          ][];
          newCorners[oppIdx] = [anchorLng, anchorLat];
          newCorners[idx] = [dragLng, dragLat];
          newCorners[(idx + 1) % 4] = [dragLng, anchorLat];
          newCorners[(idx + 3) % 4] = [anchorLat, dragLat];
          newCorners = normalizeCorners(newCorners);
          corners = newCorners;
          const src = map.getSource(sourceId) as mapboxgl.GeoJSONSource;
          src.setData({
            type: "FeatureCollection",
            features: [createRectangleFeature(corners)],
          } as FeatureCollection);
          const newCenterLng = (corners[0][0] + corners[2][0]) / 2;
          const newCenterLat = (corners[0][1] + corners[2][1]) / 2;
          labelMarker.setLngLat([newCenterLng, newCenterLat]);
          const metersW2 =
            Math.abs(corners[1][0] - corners[0][0]) *
            111320 *
            Math.cos((newCenterLat * Math.PI) / 180);
          const metersH2 = Math.abs(corners[3][1] - corners[0][1]) * 110540;
          dims.textContent = `${formatLengthNoSpace(
            metersW2
          )} × ${formatLengthNoSpace(metersH2)}`;
          restrictedAreasRef.current[id].corners = corners;
          corners.forEach((p, i) => cornerMarkers[i].setLngLat(p));
        };
        cm.on("drag", updateRect);
        cm.on("dragend", updateRect);
      });
      restrictedAreasRef.current[id] = {
        type: "restricted",
        number,
        id,
        sourceId,
        fillLayerId: `${id}-fill`,
        lineLayerId: `${id}-line`,
        labelMarker,
        cornerMarkers,
        corners,
      };
      maxRestrictedNum = Math.max(maxRestrictedNum, number || 0);
    }
    restrictedCounterRef.current = maxRestrictedNum;
    setShowHeight(state.showHeight);
    // Re-apply camera once more after layers/markers are added to ensure exact alignment
    try {
      map.jumpTo({
        center: state.camera.center,
        zoom: state.camera.zoom,
        bearing: state.camera.bearing,
        pitch: state.camera.pitch,
      });
    } catch {}
  }

  // Load state from URL hash on ready
  useEffect(() => {
    if (!isMapReady) return;
    const run = async () => {
      const state = await decodeStateFromHash(window.location.hash || "");
      if (state) restoreFromState(state);
    };
    void run();
    // optional: handle hashchange
    const onHash = () => void run();
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
    // Intentionally not including decodeStateFromHash/restoreFromState to avoid re-runs.
    // These are stable across the component lifecycle.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMapReady]);

  // Initialize form state when settings dialog opens
  useEffect(() => {
    if (settingsOpen) {
      setFormProjectName(projectName);
      setFormMeasurementUnit(measurementUnit);
      setFormSafetyDistance(safetyDistance);
      setHasFormChanges(false);
    }
  }, [settingsOpen, projectName, measurementUnit, safetyDistance]);

  async function openShareDialog() {
    const q = await encodeStateToHash();
    const url = `${window.location.origin}${window.location.pathname}#${q}`;
    setShareUrl(url);
    setCopied(false);
    setShareOpen(true);
  }

  function normalizeCorners(input: [number, number][]): [number, number][] {
    const lngs = input.map((c) => c[0]);
    const lats = input.map((c) => c[1]);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    return [
      [minLng, minLat], // SW
      [maxLng, minLat], // SE
      [maxLng, maxLat], // NE
      [minLng, maxLat], // NW
    ];
  }

  function createCircleFeature(
    lng: number,
    lat: number,
    radiusMeters: number,
    points = 64
  ): Feature<Polygon> {
    const coords: [number, number][] = [];
    const center = [lng, lat] as [number, number];
    const earthRadius = 6378137; // meters
    for (let i = 0; i < points; i++) {
      const angle = (i / points) * 2 * Math.PI;
      const dx = (radiusMeters / earthRadius) * Math.cos(angle);
      const dy = (radiusMeters / earthRadius) * Math.sin(angle);
      const newLng =
        center[0] +
        (dx * 180) / Math.PI / Math.cos((center[1] * Math.PI) / 180);
      const newLat = center[1] + (dy * 180) / Math.PI;
      coords.push([newLng, newLat]);
    }
    coords.push(coords[0]);
    return {
      type: "Feature",
      geometry: { type: "Polygon", coordinates: [coords] },
      properties: {},
    } as Feature<Polygon>;
  }

  function createRectangleFeature(
    corners: [number, number][]
  ): Feature<Polygon> {
    // corners should be in [lng, lat] order and form a rectangle
    const ring = [...corners, corners[0]] as [number, number][];
    return {
      type: "Feature",
      geometry: { type: "Polygon", coordinates: [ring] },
      properties: {},
    } as Feature<Polygon>;
  }

  // removed unused pointInPoly helper

  // removed unused distPointToSegment helper

  // audience clearance helper removed (was unused)

  function removeFireworkAnnotation(id: string) {
    const map = mapRef.current;
    if (!map) return;
    const rec = annotationsRef.current[id];
    if (!rec) return;
    // remove extrusion if present
    try {
      if (rec.extrusionLayerId && map.getLayer(rec.extrusionLayerId)) {
        map.removeLayer(rec.extrusionLayerId);
      }
    } catch {}
    try {
      rec.marker.remove();
    } catch {}
    try {
      if (map.getLayer(rec.fillLayerId)) map.removeLayer(rec.fillLayerId);
      if (map.getLayer(rec.lineLayerId)) map.removeLayer(rec.lineLayerId);
      if (map.getSource(rec.sourceId)) map.removeSource(rec.sourceId);
    } catch {}
    annotationMarkersRef.current = annotationMarkersRef.current.filter(
      (m) => m !== rec.marker
    );
    delete annotationsRef.current[id];

    // Renumber remaining annotations
    renumberAnnotations();
  }

  function removeCustomAnnotation(id: string) {
    const map = mapRef.current;
    if (!map) return;
    const rec = annotationsRef.current[id];
    if (!rec) return;
    try {
      rec.marker.remove();
    } catch {}
    try {
      // Remove text layer
      if (map.getLayer(rec.fillLayerId)) map.removeLayer(rec.fillLayerId); // text layer
      if (map.getSource(rec.sourceId)) map.removeSource(rec.sourceId); // text source
    } catch {}
    annotationMarkersRef.current = annotationMarkersRef.current.filter(
      (m) => m !== rec.marker
    );
    delete annotationsRef.current[id];

    // Renumber remaining annotations
    renumberAnnotations();
  }

  function removeAudienceArea(id: string) {
    const map = mapRef.current;
    if (!map) return;
    const rec = audienceAreasRef.current[id];
    if (!rec) return;
    try {
      if (map.getLayer(rec.fillLayerId)) map.removeLayer(rec.fillLayerId);
      if (map.getLayer(rec.lineLayerId)) map.removeLayer(rec.lineLayerId);
      if (map.getSource(rec.sourceId)) map.removeSource(rec.sourceId);
    } catch {}
    try {
      rec.labelMarker.remove();
      rec.cornerMarkers.forEach((cm) => cm.remove());
    } catch {}
    delete audienceAreasRef.current[id];
  }

  function removeMeasurement(id: string) {
    const map = mapRef.current;
    if (!map) return;
    const rec = measurementsRef.current[id];
    if (!rec) return;
    try {
      if (map.getLayer(rec.lineLayerId)) map.removeLayer(rec.lineLayerId);
      if (map.getSource(rec.sourceId)) map.removeSource(rec.sourceId);
    } catch {}
    try {
      rec.labelMarker.remove();
      rec.pointMarkers.forEach((pm) => pm.remove());
    } catch {}
    delete measurementsRef.current[id];
  }

  function removeRestrictedArea(id: string) {
    const map = mapRef.current;
    if (!map) return;
    const rec = restrictedAreasRef.current[id];
    if (!rec) return;
    try {
      if (map.getLayer(rec.fillLayerId)) map.removeLayer(rec.fillLayerId);
      if (map.getLayer(rec.lineLayerId)) map.removeLayer(rec.lineLayerId);
      if (map.getSource(rec.sourceId)) map.removeSource(rec.sourceId);
    } catch {}
    try {
      rec.labelMarker.remove();
      rec.cornerMarkers.forEach((cm) => cm.remove());
    } catch {}
    delete restrictedAreasRef.current[id];
  }

  function addExtrusionForAnnotation(rec: AnnotationRecord) {
    const map = mapRef.current;
    if (!map) return;
    const extrudeId = `${rec.id}-extrude`;
    const heightFeet = rec.inches * 100;
    const heightMeters = feetToMeters(heightFeet);
    try {
      if (!map.getLayer(extrudeId)) {
        map.addLayer({
          id: extrudeId,
          type: "fill-extrusion",
          source: rec.sourceId,
          paint: {
            "fill-extrusion-color": rec.color,
            "fill-extrusion-height": heightMeters,
            "fill-extrusion-opacity": 0.4,
          },
        });
      }
      rec.extrusionLayerId = extrudeId;
    } catch {}
  }

  function removeExtrusionForAnnotation(rec: AnnotationRecord) {
    const map = mapRef.current;
    if (!map) return;
    try {
      if (rec.extrusionLayerId && map.getLayer(rec.extrusionLayerId)) {
        map.removeLayer(rec.extrusionLayerId);
      }
    } catch {}
    rec.extrusionLayerId = undefined;
  }

  function handleMapDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    if (!mapRef.current) return;
    const data = e.dataTransfer.getData("text/plain");
    if (!data) return;
    let parsed: { key: string; glyph: string } | null = null;
    try {
      parsed = JSON.parse(data) as { key: string; glyph: string };
    } catch {
      return;
    }
    if (!parsed) return;
    const item = annotationPalette.find((i) => i.key === parsed!.key);
    if (!item) return;
    const rect = (e.target as HTMLDivElement).getBoundingClientRect();
    const point = [e.clientX - rect.left, e.clientY - rect.top] as [
      number,
      number
    ];
    const lngLat = mapRef.current.unproject(point);
    if (item.key === "audience") {
      // Create audience rectangle default ~ 100ft x 60ft
      const widthFt = 200;
      const heightFt = 90;
      const metersW = feetToMeters(widthFt);
      const metersH = feetToMeters(heightFt);
      const metersToLng = (m: number, lat: number) =>
        m / (111320 * Math.cos((lat * Math.PI) / 180));
      const metersToLat = (m: number) => m / 110540;
      const lngW = metersToLng(metersW, lngLat.lat);
      const latH = metersToLat(metersH);
      let corners: [number, number][] = [
        [lngLat.lng - lngW / 2, lngLat.lat - latH / 2],
        [lngLat.lng + lngW / 2, lngLat.lat - latH / 2],
        [lngLat.lng + lngW / 2, lngLat.lat + latH / 2],
        [lngLat.lng - lngW / 2, lngLat.lat + latH / 2],
      ];
      const rectFeature = createRectangleFeature(corners);
      const id = `aud-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const number = ++audienceCounterRef.current;
      const sourceId = `${id}-src`;
      mapRef.current.addSource(sourceId, {
        type: "geojson",
        data: {
          type: "FeatureCollection",
          features: [rectFeature],
        } as FeatureCollection,
      });
      mapRef.current.addLayer({
        id: `${id}-fill`,
        type: "fill",
        source: sourceId,
        paint: { "fill-color": item.color, "fill-opacity": 0.1 },
      });
      mapRef.current.addLayer({
        id: `${id}-line`,
        type: "line",
        source: sourceId,
        paint: { "line-color": item.color, "line-opacity": 1, "line-width": 2 },
      });
      // Label marker centered
      const label = document.createElement("div");
      label.className =
        "rounded-md px-2 py-1 text-xs shadow bg-background/50 backdrop-blur-sm backdrop-blur-sm border border-border text-center";
      label.addEventListener("contextmenu", (evt) => {
        evt.preventDefault();
        removeAudienceArea(id);
      });
      const title = document.createElement("div");
      title.className = "font-medium leading-none";
      title.textContent = "Audience";
      const dims = document.createElement("div");
      dims.className = "text-[10px] text-muted-foreground";
      dims.setAttribute("data-role", "dims");
      dims.setAttribute("data-role", "dims");
      dims.textContent = `${formatLengthNoSpace(
        metersW
      )} × ${formatLengthNoSpace(metersH)}`;
      label.appendChild(title);
      label.appendChild(dims);
      // Position label at top middle, 20ft off the top
      const offsetFt = 20; // 20 feet off the top
      const centerLng = (corners[0][0] + corners[2][0]) / 2; // Center longitude
      const offsetLat = feetToMeters(offsetFt) / 110540;
      const topMiddleLng = centerLng; // Center longitude
      const topMiddleLat = corners[3][1] - offsetLat; // Top edge - 20ft offset
      const labelMarker = new mapboxgl.Marker({
        element: label,
        draggable: true,
      })
        .setLngLat([topMiddleLng, topMiddleLat])
        .addTo(mapRef.current);
      // Dragging the label moves the whole rectangle
      const onLabelDrag = () => {
        const cur = labelMarker.getLngLat();
        const centerLng = (corners[0][0] + corners[2][0]) / 2; // Center longitude
        const offsetLat = feetToMeters(20) / 110540;
        const dLng = cur.lng - centerLng; // Use center longitude as reference
        const dLat = cur.lat - (corners[3][1] - offsetLat); // Use top-middle as reference
        const movedCorners: [number, number][] = corners.map(([lng, lat]) => [
          lng + dLng,
          lat + dLat,
        ]);
        // keep size exact; only translate, then enforce min size to avoid later clamping jumps
        const updated = createRectangleFeature(movedCorners);
        const src = mapRef.current!.getSource(
          sourceId
        ) as mapboxgl.GeoJSONSource;
        src.setData({
          type: "FeatureCollection",
          features: [updated],
        } as FeatureCollection);
        // move corner markers
        movedCorners.forEach((c, i) => cornerMarkers[i].setLngLat(c));
        // update corners reference
        corners = movedCorners;
        audienceAreasRef.current[id].corners = movedCorners;
        // keep label centered (already at cur), and update dims text to current size
        const centerLatNow = (movedCorners[0][1] + movedCorners[2][1]) / 2;
        const metersWNow =
          Math.abs(movedCorners[1][0] - movedCorners[0][0]) *
          111320 *
          Math.cos((centerLatNow * Math.PI) / 180);
        const metersHNow =
          Math.abs(movedCorners[3][1] - movedCorners[0][1]) * 110540;
        dims.textContent = `${formatLengthNoSpace(
          metersWNow
        )} × ${formatLengthNoSpace(metersHNow)}`;
      };
      labelMarker.on("drag", onLabelDrag);
      labelMarker.on("dragend", onLabelDrag);
      const cornerMarkers: mapboxgl.Marker[] = corners.map((c, idx) => {
        const cm = new mapboxgl.Marker({ draggable: true })
          .setLngLat(c)
          .addTo(mapRef.current!);
        const updateRect = () => {
          // axis-aligned rectangle resize with diagonal anchor, clamped min size, no inversion
          const cur = cm.getLngLat();
          const oppIdx = (idx + 2) % 4;
          const anchorLng = corners[oppIdx][0];
          const anchorLat = corners[oppIdx][1];
          const minFt = 20;
          const minLngDelta =
            feetToMeters(minFt) /
            (111320 * Math.cos((anchorLat * Math.PI) / 180));
          const minLatDelta = feetToMeters(minFt) / 110540;
          const sLng = idx === 0 || idx === 3 ? -1 : 1;
          const sLat = idx === 0 || idx === 1 ? -1 : 1;
          let dragLng = cur.lng;
          let dragLat = cur.lat;
          if (sLng > 0) dragLng = Math.max(anchorLng + minLngDelta, dragLng);
          else dragLng = Math.min(anchorLng - minLngDelta, dragLng);
          if (sLat > 0) dragLat = Math.max(anchorLat + minLatDelta, dragLat);
          else dragLat = Math.min(anchorLat - minLatDelta, dragLat);
          let newCorners: [number, number][] = [...corners] as [
            number,
            number
          ][];
          newCorners[oppIdx] = [anchorLng, anchorLat];
          newCorners[idx] = [dragLng, dragLat];
          newCorners[(idx + 1) % 4] = [dragLng, anchorLat];
          newCorners[(idx + 3) % 4] = [anchorLng, dragLat];
          // normalize to SW,SE,NE,NW to prevent index drift and dimension misreads
          newCorners = normalizeCorners(newCorners);
          corners = newCorners;
          const updated = createRectangleFeature(corners);
          const src = mapRef.current!.getSource(
            sourceId
          ) as mapboxgl.GeoJSONSource;
          src.setData({
            type: "FeatureCollection",
            features: [updated],
          } as FeatureCollection);
          // update label position to top middle, 20ft off the top
          const centerLng = (corners[0][0] + corners[2][0]) / 2; // Center longitude
          const offsetLat = feetToMeters(20) / 110540;
          const newTopMiddleLng = centerLng; // Center longitude
          const newTopMiddleLat = corners[3][1] - offsetLat; // Top edge - 20ft offset
          labelMarker.setLngLat([newTopMiddleLng, newTopMiddleLat]);
          // update dims text
          const metersW =
            Math.abs(corners[1][0] - corners[0][0]) *
            111320 *
            Math.cos((newTopMiddleLat * Math.PI) / 180);
          const metersH = Math.abs(corners[3][1] - corners[0][1]) * 110540;
          dims.textContent = `${formatLengthNoSpace(
            metersW
          )} × ${formatLengthNoSpace(metersH)}`;
          audienceAreasRef.current[id].corners = corners;
          // move all corner pins in realtime to their new corners
          corners.forEach((p, i) => cornerMarkers[i].setLngLat(p));
        };
        cm.on("drag", updateRect);
        cm.on("dragend", updateRect);
        return cm;
      });
      audienceAreasRef.current[id] = {
        type: "audience",
        number,
        id,
        sourceId,
        fillLayerId: `${id}-fill`,
        lineLayerId: `${id}-line`,
        labelMarker,
        cornerMarkers,
        corners,
      };
      return;
    }

    if (item.key === "measurement") {
      // Create measurement with two points 150ft apart, north/south vertical
      const distanceFt = 150;
      const distanceMeters = feetToMeters(distanceFt);
      const metersToLat = (m: number) => m / 110540;
      const latOffset = metersToLat(distanceMeters);

      const points: [number, number][] = [
        [lngLat.lng, lngLat.lat],
        [lngLat.lng, lngLat.lat + latOffset], // Only lat offset for north/south
      ];

      const id = `meas-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const number = ++measurementCounterRef.current;
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

      mapRef.current.addSource(sourceId, {
        type: "geojson",
        data: {
          type: "FeatureCollection",
          features: [lineFeature],
        } as FeatureCollection,
      });

      mapRef.current.addLayer({
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
        "rounded-md px-2 py-1 text-xs shadow bg-background/50 backdrop-blur-sm backdrop-blur-sm border border-border text-center";
      label.addEventListener("contextmenu", (evt) => {
        evt.preventDefault();
        removeMeasurement(id);
      });

      const title = document.createElement("div");
      title.className = "font-medium leading-none";
      title.textContent = "Measurement";

      const distance = document.createElement("div");
      distance.className = "text-[10px] text-muted-foreground";
      distance.setAttribute("data-role", "distance");
      distance.textContent = formatDistanceWithSpace(distanceMeters);

      label.appendChild(title);
      label.appendChild(distance);

      const labelMarker = new mapboxgl.Marker({
        element: label,
        draggable: true,
      })
        .setLngLat([centerLng, centerLat])
        .addTo(mapRef.current);

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
          .addTo(mapRef.current!);

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

          const src = mapRef.current!.getSource(
            sourceId
          ) as mapboxgl.GeoJSONSource;
          src.setData({
            type: "FeatureCollection",
            features: [lineFeature],
          } as FeatureCollection);

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
          distance.textContent = formatDistanceWithSpace(distanceMeters);

          // Update points reference
          points[0] = newPoints[0];
          points[1] = newPoints[1];
          measurementsRef.current[id].points = points;
        };

        marker.on("drag", updateMeasurement);
        marker.on("dragend", updateMeasurement);

        return marker;
      });

      measurementsRef.current[id] = {
        type: "measurement",
        number,
        id,
        sourceId,
        lineLayerId: `${id}-line`,
        labelMarker,
        pointMarkers,
        points,
      };

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

        const src = mapRef.current!.getSource(
          sourceId
        ) as mapboxgl.GeoJSONSource;
        src.setData({
          type: "FeatureCollection",
          features: [lineFeature],
        } as FeatureCollection);

        // Update point markers
        newPoints.forEach((point, i) => pointMarkers[i].setLngLat(point));

        // Update points reference
        points[0] = newPoints[0];
        points[1] = newPoints[1];
        measurementsRef.current[id].points = points;
      };

      labelMarker.on("drag", onLabelDrag);
      labelMarker.on("dragend", onLabelDrag);

      return;
    }

    if (item.key === "restricted") {
      // Create restricted rectangle default ~ 100ft x 60ft
      const widthFt = 200;
      const heightFt = 90;
      const metersW = feetToMeters(widthFt);
      const metersH = feetToMeters(heightFt);
      const metersToLng = (m: number, lat: number) =>
        m / (111320 * Math.cos((lat * Math.PI) / 180));
      const metersToLat = (m: number) => m / 110540;
      const lngW = metersToLng(metersW, lngLat.lat);
      const latH = metersToLat(metersH);
      let corners: [number, number][] = [
        [lngLat.lng - lngW / 2, lngLat.lat - latH / 2],
        [lngLat.lng + lngW / 2, lngLat.lat - latH / 2],
        [lngLat.lng + lngW / 2, lngLat.lat + latH / 2],
        [lngLat.lng - lngW / 2, lngLat.lat + latH / 2],
      ];
      const rectFeature = createRectangleFeature(corners);
      const id = `rest-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const number = ++restrictedCounterRef.current;
      const sourceId = `${id}-src`;
      mapRef.current.addSource(sourceId, {
        type: "geojson",
        data: {
          type: "FeatureCollection",
          features: [rectFeature],
        } as FeatureCollection,
      });
      mapRef.current.addLayer({
        id: `${id}-fill`,
        type: "fill",
        source: sourceId,
        paint: { "fill-color": item.color, "fill-opacity": 0.1 },
      });
      mapRef.current.addLayer({
        id: `${id}-line`,
        type: "line",
        source: sourceId,
        paint: { "line-color": item.color, "line-opacity": 1, "line-width": 2 },
      });
      // Label marker centered
      const label = document.createElement("div");
      label.className =
        "rounded-md px-2 py-1 text-xs shadow bg-background/50 backdrop-blur-sm backdrop-blur-sm border border-border text-center";
      label.addEventListener("contextmenu", (evt) => {
        evt.preventDefault();
        removeRestrictedArea(id);
      });
      const title = document.createElement("div");
      title.className = "font-medium leading-none";
      title.textContent = "Restricted";
      const dims = document.createElement("div");
      dims.className = "text-[10px] text-muted-foreground";
      dims.setAttribute("data-role", "dims");
      dims.textContent = `${formatLengthNoSpace(
        metersW
      )} × ${formatLengthNoSpace(metersH)}`;
      label.appendChild(title);
      label.appendChild(dims);
      // Position label at top middle, 20ft off the top
      const offsetFt = 20; // 20 feet off the top
      const centerLng = (corners[0][0] + corners[2][0]) / 2; // Center longitude
      const offsetLat = feetToMeters(offsetFt) / 110540;
      const topMiddleLng = centerLng; // Center longitude
      const topMiddleLat = corners[3][1] - offsetLat; // Top edge - 20ft offset
      const labelMarker = new mapboxgl.Marker({
        element: label,
        draggable: true,
      })
        .setLngLat([topMiddleLng, topMiddleLat])
        .addTo(mapRef.current);
      // Dragging the label moves the whole rectangle
      const onLabelDrag = () => {
        const cur = labelMarker.getLngLat();
        const centerLng = (corners[0][0] + corners[2][0]) / 2; // Center longitude
        const offsetLat = feetToMeters(20) / 110540;
        const dLng = cur.lng - centerLng; // Use center longitude as reference
        const dLat = cur.lat - (corners[3][1] - offsetLat); // Use top-middle as reference
        const movedCorners: [number, number][] = corners.map(([lng, lat]) => [
          lng + dLng,
          lat + dLat,
        ]);
        // keep size exact; only translate, then enforce min size to avoid later clamping jumps
        const updated = createRectangleFeature(movedCorners);
        const src = mapRef.current!.getSource(
          sourceId
        ) as mapboxgl.GeoJSONSource;
        src.setData({
          type: "FeatureCollection",
          features: [updated],
        } as FeatureCollection);
        // move corner markers
        movedCorners.forEach((c, i) => cornerMarkers[i].setLngLat(c));
        // update corners reference
        corners = movedCorners;
        restrictedAreasRef.current[id].corners = movedCorners;
        // keep label centered (already at cur), and update dims text to current size
        const centerLatNow = (movedCorners[0][1] + movedCorners[2][1]) / 2;
        const metersWNow =
          Math.abs(movedCorners[1][0] - movedCorners[0][0]) *
          111320 *
          Math.cos((centerLatNow * Math.PI) / 180);
        const metersHNow =
          Math.abs(movedCorners[3][1] - movedCorners[0][1]) * 110540;
        dims.textContent = `${formatLengthNoSpace(
          metersWNow
        )} × ${formatLengthNoSpace(metersHNow)}`;
      };
      labelMarker.on("drag", onLabelDrag);
      labelMarker.on("dragend", onLabelDrag);
      const cornerMarkers: mapboxgl.Marker[] = corners.map((c, idx) => {
        const cm = new mapboxgl.Marker({ draggable: true })
          .setLngLat(c)
          .addTo(mapRef.current!);
        const updateRect = () => {
          // axis-aligned rectangle resize with diagonal anchor, clamped min size, no inversion
          const cur = cm.getLngLat();
          const oppIdx = (idx + 2) % 4;
          const anchorLng = corners[oppIdx][0];
          const anchorLat = corners[oppIdx][1];
          const minFt = 20;
          const minLngDelta =
            feetToMeters(minFt) /
            (111320 * Math.cos((anchorLat * Math.PI) / 180));
          const minLatDelta = feetToMeters(minFt) / 110540;
          const sLng = idx === 0 || idx === 3 ? -1 : 1;
          const sLat = idx === 0 || idx === 1 ? -1 : 1;
          let dragLng = cur.lng;
          let dragLat = cur.lat;
          if (sLng > 0) dragLng = Math.max(anchorLng + minLngDelta, dragLng);
          else dragLng = Math.min(anchorLng - minLngDelta, dragLng);
          if (sLat > 0) dragLat = Math.max(anchorLat + minLatDelta, dragLat);
          else dragLat = Math.min(anchorLat - minLatDelta, dragLat);
          let newCorners: [number, number][] = [...corners] as [
            number,
            number
          ][];
          newCorners[oppIdx] = [anchorLng, anchorLat];
          newCorners[idx] = [dragLng, dragLat];
          newCorners[(idx + 1) % 4] = [dragLng, anchorLat];
          newCorners[(idx + 3) % 4] = [anchorLng, dragLat];
          // normalize to SW,SE,NE,NW to prevent index drift and dimension misreads
          newCorners = normalizeCorners(newCorners);
          corners = newCorners;
          const updated = createRectangleFeature(corners);
          const src = mapRef.current!.getSource(
            sourceId
          ) as mapboxgl.GeoJSONSource;
          src.setData({
            type: "FeatureCollection",
            features: [updated],
          } as FeatureCollection);
          // update label position to top middle, 20ft off the top
          const centerLng = (corners[0][0] + corners[2][0]) / 2; // Center longitude
          const offsetLat = feetToMeters(20) / 110540;
          const newTopMiddleLng = centerLng; // Center longitude
          const newTopMiddleLat = corners[3][1] - offsetLat; // Top edge - 20ft offset
          labelMarker.setLngLat([newTopMiddleLng, newTopMiddleLat]);
          // update dims text
          const metersW =
            Math.abs(corners[1][0] - corners[0][0]) *
            111320 *
            Math.cos((newTopMiddleLat * Math.PI) / 180);
          const metersH = Math.abs(corners[3][1] - corners[0][1]) * 110540;
          dims.textContent = `${formatLengthNoSpace(
            metersW
          )} × ${formatLengthNoSpace(metersH)}`;
          restrictedAreasRef.current[id].corners = corners;
          // move all corner pins in realtime to their new corners
          corners.forEach((p, i) => cornerMarkers[i].setLngLat(p));
        };
        cm.on("drag", updateRect);
        cm.on("dragend", updateRect);
        return cm;
      });
      restrictedAreasRef.current[id] = {
        type: "restricted",
        number,
        id,
        sourceId,
        fillLayerId: `${id}-fill`,
        lineLayerId: `${id}-line`,
        labelMarker,
        cornerMarkers,
        corners,
      };
      return;
    }

    // Handle custom annotation
    if (item.key === "custom") {
      // Create custom annotation with default values
      const id = `custom-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const number = getNextAnnotationNumber();

      // Create default Mapbox marker with custom color
      const marker = new mapboxgl.Marker({
        color: customColor,
        draggable: true,
        clickTolerance: 5, // Allow 5px movement before considering it a drag
      })
        .setLngLat([lngLat.lng, lngLat.lat])
        .addTo(mapRef.current!);

      annotationMarkersRef.current.push(marker);

      // Use native Mapbox popup open as the click signal (Mapbox suppresses clicks after drag)
      const clickProxyPopup2 = new mapboxgl.Popup({
        closeButton: false,
        closeOnClick: true,
        maxWidth: "0px",
      });
      clickProxyPopup2.on("open", () => {
        handleCustomAnnotationClick(id);
        clickProxyPopup2.remove();
      });
      marker.setPopup(clickProxyPopup2);

      // Add right-click handler to remove
      marker.getElement().addEventListener("contextmenu", (evt) => {
        evt.preventDefault();
        removeCustomAnnotation(id);
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
          text: customLabel || "Custom",
        },
      };

      // Add text source and layer
      mapRef.current!.addSource(textSourceId, {
        type: "geojson",
        data: {
          type: "FeatureCollection",
          features: [textFeature],
        } as FeatureCollection,
      });

      mapRef.current!.addLayer({
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

      // Store annotation
      annotationsRef.current[id] = {
        type: "custom",
        number,
        id,
        inches: 0, // Not applicable for custom
        label: customLabel || "Custom",
        color: customColor,
        marker,
        sourceId: textSourceId, // Store text source ID
        fillLayerId: `${id}-text`, // Store text layer ID
        lineLayerId: `${id}-text`, // Store text layer ID (same as fillLayerId)
        textSourceId, // Store text source ID
      };

      // Add drag handler to update text position
      const updateCustomText = () => {
        const pos = marker.getLngLat();

        // Update text position
        const textSrc = mapRef.current!.getSource(
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
                  text: customLabel || "Custom",
                },
              },
            ],
          } as FeatureCollection);
        }
      };
      marker.on("drag", updateCustomText);
      marker.on("dragend", updateCustomText);

      // Open dialog immediately for configuration
      setEditingCustomAnnotation(id);
      setCustomAnnotationOpen(true);

      return;
    }

    // Firework-type marker and label
    const labelEl = document.createElement("div");
    labelEl.className =
      "rounded-md px-2 py-1 text-xs shadow bg-background/50 backdrop-blur-sm border border-border text-center";
    const fwRadiusFeet = Math.round(item.inches * safetyDistance);
    const fwRadiusText =
      measurementUnit === "feet"
        ? `${fwRadiusFeet} ft radius`
        : `${Math.round(feetToMeters(fwRadiusFeet))} m radius`;
    labelEl.innerHTML = `<div class="font-medium leading-none">${item.label}</div><div class="text-muted-foreground text-[10px]">${fwRadiusText}</div>`;
    const marker = new mapboxgl.Marker({
      element: labelEl,
      color: item.color,
      draggable: true,
    })
      .setLngLat([lngLat.lng, lngLat.lat])
      .addTo(mapRef.current);
    annotationMarkersRef.current.push(marker);

    // Add fallout radius circle as a GeoJSON layer
    const radiusFeet = item.inches * safetyDistance;
    const radiusMeters = feetToMeters(radiusFeet);
    const circleId = `circle-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2)}`;
    const number = getNextAnnotationNumber();
    // right-click on label removes the entire annotation
    labelEl.addEventListener("contextmenu", (evt) => {
      evt.preventDefault();
      removeFireworkAnnotation(circleId);
    });
    const sourceId = `${circleId}-src`;
    const feature = createCircleFeature(lngLat.lng, lngLat.lat, radiusMeters);

    mapRef.current.addSource(sourceId, {
      type: "geojson",
      data: {
        type: "FeatureCollection",
        features: [feature],
      } as FeatureCollection,
    });
    mapRef.current.addLayer({
      id: circleId,
      type: "fill",
      source: sourceId,
      paint: {
        "fill-color": item.color,
        "fill-opacity": 0.25,
      },
    });
    const lineId = `${circleId}-line`;
    mapRef.current.addLayer({
      id: lineId,
      type: "line",
      source: sourceId,
      paint: {
        "line-color": item.color,
        "line-opacity": 1,
        "line-width": 2,
      },
    });
    annotationsRef.current[circleId] = {
      type: "firework",
      number,
      id: circleId,
      inches: item.inches,
      label: item.label,
      color: item.color,
      marker,
      sourceId,
      fillLayerId: circleId,
      lineLayerId: lineId,
    };
    if (showHeight) {
      addExtrusionForAnnotation(annotationsRef.current[circleId]!);
    }
    // Keep circle in sync when marker is dragged
    const updateCircle = () => {
      const pos = marker.getLngLat();
      // Get the annotation record to access current inches value and use current safetyDistance from state
      const annotation = annotationsRef.current[circleId];
      if (!annotation) return;
      const currentRadiusMeters = feetToMeters(
        annotation.inches * safetyDistanceRef.current
      );
      const updated = createCircleFeature(
        pos.lng,
        pos.lat,
        currentRadiusMeters
      );
      const src = mapRef.current!.getSource(sourceId) as mapboxgl.GeoJSONSource;
      src.setData({
        type: "FeatureCollection",
        features: [updated],
      } as FeatureCollection);
    };
    marker.on("drag", updateCircle);
    marker.on("dragend", updateCircle);
  }

  function handleMapDragOver(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  }

  function clearAllAnnotations() {
    for (const m of annotationMarkersRef.current) {
      try {
        m.remove();
      } catch {}
    }
    annotationMarkersRef.current = [];
    const map = mapRef.current;
    if (!map) return;
    // Remove any circle sources/layers
    for (const key of Object.keys(annotationsRef.current)) {
      const rec = annotationsRef.current[key];
      try {
        if (rec.extrusionLayerId && map.getLayer(rec.extrusionLayerId)) {
          map.removeLayer(rec.extrusionLayerId);
        }
        if (map.getLayer(rec.fillLayerId)) map.removeLayer(rec.fillLayerId);
        if (map.getLayer(rec.lineLayerId)) map.removeLayer(rec.lineLayerId);
        if (map.getSource(rec.sourceId)) map.removeSource(rec.sourceId);
      } catch {}
    }
    annotationsRef.current = {};
    // Remove audience rectangles
    for (const key of Object.keys(audienceAreasRef.current)) {
      const rec = audienceAreasRef.current[key];
      try {
        if (map.getLayer(rec.fillLayerId)) map.removeLayer(rec.fillLayerId);
        if (map.getLayer(rec.lineLayerId)) map.removeLayer(rec.lineLayerId);
        if (map.getSource(rec.sourceId)) map.removeSource(rec.sourceId);
        rec.labelMarker.remove();
        rec.cornerMarkers.forEach((cm) => cm.remove());
      } catch {}
    }
    audienceAreasRef.current = {};
    // Remove measurements
    for (const key of Object.keys(measurementsRef.current)) {
      const rec = measurementsRef.current[key];
      try {
        if (map && map.getLayer(rec.lineLayerId))
          map.removeLayer(rec.lineLayerId);
        if (map && map.getSource(rec.sourceId)) map.removeSource(rec.sourceId);
        rec.labelMarker.remove();
        rec.pointMarkers.forEach((pm) => pm.remove());
      } catch {}
    }
    measurementsRef.current = {};
    // Remove restricted areas
    for (const key of Object.keys(restrictedAreasRef.current)) {
      const rec = restrictedAreasRef.current[key];
      try {
        if (map && map.getLayer(rec.fillLayerId))
          map.removeLayer(rec.fillLayerId);
        if (map && map.getLayer(rec.lineLayerId))
          map.removeLayer(rec.lineLayerId);
        if (map && map.getSource(rec.sourceId)) map.removeSource(rec.sourceId);
        rec.labelMarker.remove();
        rec.cornerMarkers.forEach((cm) => cm.remove());
      } catch {}
    }
    restrictedAreasRef.current = {};
  }

  return (
    <div className="h-screen w-screen flex overflow-hidden">
      <Sidebar
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        suggestions={suggestions}
        setSuggestions={setSuggestions}
        activeIndex={activeIndex}
        setActiveIndex={setActiveIndex}
        handleSubmitOrSelect={handleSubmitOrSelect}
        settingsOpen={settingsOpen}
        setSettingsOpen={setSettingsOpen}
        projectName={projectName}
        formProjectName={formProjectName}
        setFormProjectName={setFormProjectName}
        measurementUnit={measurementUnit}
        formMeasurementUnit={formMeasurementUnit}
        setFormMeasurementUnit={setFormMeasurementUnit}
        safetyDistance={safetyDistance}
        formSafetyDistance={formSafetyDistance}
        setFormSafetyDistance={setFormSafetyDistance}
        hasFormChanges={hasFormChanges}
        setHasFormChanges={setHasFormChanges}
        handleFormChange={handleFormChange}
        handleSaveSettings={handleSaveSettings}
        handleCancelSettings={handleCancelSettings}
        customAnnotationOpen={customAnnotationOpen}
        setCustomAnnotationOpen={setCustomAnnotationOpen}
        customLabel={customLabel}
        setCustomLabel={setCustomLabel}
        customColor={customColor}
        setCustomColor={setCustomColor}
        editingCustomAnnotation={editingCustomAnnotation}
        setEditingCustomAnnotation={setEditingCustomAnnotation}
        handleSaveCustomAnnotation={handleSaveCustomAnnotation}
        handleCancelCustomAnnotation={handleCancelCustomAnnotation}
        mapRef={mapRef}
        showHeight={showHeight}
        setShowHeight={setShowHeight}
        isGenerating={isGenerating}
        generateSitePlanPdf={generateSitePlanPdf}
        shareOpen={shareOpen}
        setShareOpen={setShareOpen}
        shareUrl={shareUrl}
        copied={copied}
        setCopied={setCopied}
        openShareDialog={openShareDialog}
        clearAllAnnotations={clearAllAnnotations}
        disclaimerOpen={disclaimerOpen}
        setDisclaimerOpen={setDisclaimerOpen}
        annotationsRef={annotationsRef}
        addExtrusionForAnnotation={addExtrusionForAnnotation}
        removeExtrusionForAnnotation={removeExtrusionForAnnotation}
      />
      <Map
        mapContainerRef={mapContainerRef}
        handleMapDrop={handleMapDrop}
        handleMapDragOver={handleMapDragOver}
        helpOpen={helpOpen}
        setHelpOpen={setHelpOpen}
        safetyDistance={safetyDistance}
      />
    </div>
  );
}
