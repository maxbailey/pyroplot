"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Feature, FeatureCollection, Polygon } from "geojson";
import mapboxgl from "mapbox-gl";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
// Removed slider; we switch whole styles for performance

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";

type MapWithStandard = mapboxgl.Map & {
  setConfigProperty: (group: string, name: string, value: unknown) => void;
};

type AnnotationItem = {
  key: string;
  label: string;
  inches: number;
  color: string;
};

interface AnnotationRecord {
  id: string;
  inches: number;
  color: string;
  marker: mapboxgl.Marker;
  sourceId: string;
  fillLayerId: string;
  lineLayerId: string;
}

interface AudienceRecord {
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
  // Reset dialog is controlled by Radix internally via Dialog primitives
  const [lightPreset, setLightPreset] = useState<"night" | "dusk" | "day">(
    "dusk"
  );
  const [basemapMode, setBasemapMode] = useState<"standard" | "satellite">(
    "standard"
  );

  const annotationPalette = useMemo<AnnotationItem[]>(
    () => [
      { key: "bore-1", label: '1" Bore', inches: 1, color: "#f97316" },
      { key: "bore-1-2", label: '1.2" Bore', inches: 1.2, color: "#ef4444" },
      { key: "bore-1-5", label: '1.5" Bore', inches: 1.5, color: "#22c55e" },
      {
        key: "shell-1-75",
        label: '1.75" Shells',
        inches: 1.75,
        color: "#06b6d4",
      },
      { key: "shell-2", label: '2" Shells', inches: 2, color: "#ff0000" },
      { key: "shell-2-5", label: '2.5" Shells', inches: 2.5, color: "#ff0000" },
      { key: "shell-3", label: '3" Shells', inches: 3, color: "#ff0000" },
      { key: "shell-4", label: '4" Shells', inches: 4, color: "#ff0000" },
      { key: "shell-5", label: '5" Shells', inches: 5, color: "#ff0000" },
      { key: "shell-6", label: '6" Shells', inches: 6, color: "#ff0000" },
      { key: "shell-7", label: '7" Shells', inches: 7, color: "#ff0000" },
      { key: "shell-8", label: '8" Shells', inches: 8, color: "#ff0000" },
      { key: "shell-10", label: '10" Shells', inches: 10, color: "#ff0000" },
      { key: "shell-12", label: '12" Shells', inches: 12, color: "#ff0000" },
      { key: "shell-16", label: '16" Shells', inches: 16, color: "#ff0000" },
      { key: "audience", label: "Audience", inches: 0, color: "#60a5fa" },
    ],
    []
  );

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: "mapbox://styles/mapbox/standard",
      center: [-98.5795, 39.8283],
      zoom: 3,
      pitch: 20,
      bearing: 0,
      antialias: true,
      attributionControl: false,
    });

    mapRef.current = map as MapWithStandard;

    map.on("load", () => {
      // Configure Mapbox Standard: default dusk preset + 3D objects
      try {
        if (basemapMode === "standard") {
          (mapRef.current as MapWithStandard).setConfigProperty(
            "basemap",
            "lightPreset",
            "dusk"
          );
          (mapRef.current as MapWithStandard).setConfigProperty(
            "basemap",
            "show3dObjects",
            true
          );
          (mapRef.current as MapWithStandard).setConfigProperty(
            "basemap",
            "showTerrain",
            true
          );
        }
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

  // React to preset changes (only in Standard mode)
  useEffect(() => {
    if (!mapRef.current) return;
    if (basemapMode !== "standard") return;
    try {
      (mapRef.current as MapWithStandard).setConfigProperty(
        "basemap",
        "lightPreset",
        lightPreset
      );
    } catch {}
  }, [lightPreset, basemapMode]);

  // Switch between Standard and Satellite styles
  useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;
    const center = map.getCenter();
    const zoom = map.getZoom();
    const pitch = map.getPitch();
    const bearing = map.getBearing();
    const style =
      basemapMode === "standard"
        ? "mapbox://styles/mapbox/standard"
        : "mapbox://styles/mapbox/satellite-streets-v12";
    map.setStyle(style);
    const applyConfig = () => {
      map.jumpTo({ center, zoom, pitch, bearing });
      if (basemapMode === "standard") {
        try {
          (map as MapWithStandard).setConfigProperty(
            "basemap",
            "lightPreset",
            lightPreset
          );
          (map as MapWithStandard).setConfigProperty(
            "basemap",
            "show3dObjects",
            true
          );
          (map as MapWithStandard).setConfigProperty(
            "basemap",
            "showTerrain",
            true
          );
        } catch {}
      } else {
        // Ensure no Standard-specific effects are left on Satellite
        try {
          map.setFog(undefined as unknown as mapboxgl.FogSpecification);
        } catch {}
      }
      // Re-add existing annotation circles after style change
      const existing: Record<string, AnnotationRecord> = {
        ...(annotationsRef.current || {}),
      };
      annotationsRef.current = {} as Record<string, AnnotationRecord>;
      for (const key of Object.keys(existing)) {
        const rec = existing[key];
        const pos = rec.marker.getLngLat();
        const radiusFeet = rec.inches * 70;
        const radiusMeters = feetToMeters(radiusFeet);
        const feature = createCircleFeature(pos.lng, pos.lat, radiusMeters);
        map.addSource(rec.sourceId, {
          type: "geojson",
          data: {
            type: "FeatureCollection",
            features: [feature],
          } as FeatureCollection,
        });
        map.addLayer({
          id: rec.fillLayerId,
          type: "fill",
          source: rec.sourceId,
          paint: { "fill-color": rec.color, "fill-opacity": 0.25 },
        });
        map.addLayer({
          id: rec.lineLayerId,
          type: "line",
          source: rec.sourceId,
          paint: {
            "line-color": rec.color,
            "line-opacity": 1,
            "line-width": 2,
          },
        });
        annotationsRef.current[rec.id] = rec;
      }
    };
    map.once("style.load", applyConfig);
    return () => {
      map.off("style.load", applyConfig);
    };
  }, [basemapMode, lightPreset]);

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

  function feetToMeters(feet: number) {
    return feet * 0.3048;
  }

  function metersToFeet(meters: number) {
    return meters / 0.3048;
  }

  function getMetersPerPixel(lat: number, zoom: number) {
    const R = 6378137;
    return (
      (Math.cos((lat * Math.PI) / 180) * 2 * Math.PI * R) /
      (512 * Math.pow(2, zoom))
    );
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

  function pointInPoly(
    px: { x: number; y: number },
    poly: { x: number; y: number }[]
  ) {
    let inside = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const xi = poly[i].x,
        yi = poly[i].y;
      const xj = poly[j].x,
        yj = poly[j].y;
      const intersect =
        yi > px.y !== yj > px.y &&
        px.x < ((xj - xi) * (px.y - yi)) / (yj - yi) + xi;
      if (intersect) inside = !inside;
    }
    return inside;
  }

  function distPointToSegment(
    px: { x: number; y: number },
    a: { x: number; y: number },
    b: { x: number; y: number }
  ) {
    const vx = b.x - a.x;
    const vy = b.y - a.y;
    const wx = px.x - a.x;
    const wy = px.y - a.y;
    const c1 = vx * wx + vy * wy;
    if (c1 <= 0) return Math.hypot(px.x - a.x, px.y - a.y);
    const c2 = vx * vx + vy * vy;
    if (c2 <= c1) return Math.hypot(px.x - b.x, px.y - b.y);
    const t = c1 / c2;
    const projx = a.x + t * vx;
    const projy = a.y + t * vy;
    return Math.hypot(px.x - projx, px.y - projy);
  }

  function updateAudienceClearanceForCorners(
    labelNode: HTMLDivElement,
    subNode: HTMLDivElement,
    corners: [number, number][]
  ) {
    if (!mapRef.current) return;
    const map = mapRef.current;
    const centerLat = (corners[0][1] + corners[2][1]) / 2;
    const zoom = map.getZoom();
    const mpp = getMetersPerPixel(centerLat, zoom);
    const rectPx = corners.map(([lng, lat]) => map.project({ lng, lat }));

    let minDeltaMeters = Infinity;
    const overlapping: Set<string> = new Set();

    for (const key of Object.keys(annotationsRef.current)) {
      const rec = annotationsRef.current[key];
      const cLL = rec.marker.getLngLat();
      const cPx = map.project(cLL);
      const radiusMeters = feetToMeters(rec.inches * 70);
      const radiusPx = radiusMeters / mpp;
      const centerInRect = pointInPoly(cPx, rectPx);
      let minDistPx = Infinity;
      for (let i = 0; i < rectPx.length; i++) {
        const a = rectPx[i];
        const b = rectPx[(i + 1) % rectPx.length];
        const d = distPointToSegment(cPx, a, b);
        if (d < minDistPx) minDistPx = d;
      }
      const deltaPx = (centerInRect ? 0 : minDistPx) - radiusPx;
      const deltaMeters = deltaPx * mpp;
      if (deltaMeters < minDeltaMeters) minDeltaMeters = deltaMeters;
      if (deltaMeters < 0) overlapping.add(key);
    }

    const deltaFeet = Math.round(minDeltaMeters / 0.3048);
    subNode.textContent = `${deltaFeet} ft from closest fallout zone`;
    if (minDeltaMeters < 0) {
      labelNode.classList.add("bg-destructive", "text-destructive-foreground");
      for (const key of Object.keys(annotationsRef.current)) {
        const rec = annotationsRef.current[key];
        const opacity = overlapping.has(key) ? 1 : 0.1;
        try {
          map.setPaintProperty(rec.fillLayerId, "fill-opacity", 0.25 * opacity);
          map.setPaintProperty(rec.lineLayerId, "line-opacity", opacity);
        } catch {}
      }
    } else {
      labelNode.classList.remove(
        "bg-destructive",
        "text-destructive-foreground"
      );
      for (const key of Object.keys(annotationsRef.current)) {
        const rec = annotationsRef.current[key];
        try {
          map.setPaintProperty(rec.fillLayerId, "fill-opacity", 0.25);
          map.setPaintProperty(rec.lineLayerId, "line-opacity", 1);
        } catch {}
      }
    }
  }

  function removeFireworkAnnotation(id: string) {
    const map = mapRef.current;
    if (!map) return;
    const rec = annotationsRef.current[id];
    if (!rec) return;
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
        paint: { "fill-color": item.color, "fill-opacity": 0.2 },
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
        "rounded-md px-2 py-1 text-xs shadow bg-background/95 border border-border";
      label.addEventListener("contextmenu", (evt) => {
        evt.preventDefault();
        removeAudienceArea(id);
      });
      const title = document.createElement("div");
      title.className = "font-medium leading-none";
      title.textContent = "Audience";
      const dims = document.createElement("div");
      dims.className = "text-[10px] text-muted-foreground";
      const widthFeetText = Math.round(widthFt);
      const heightFeetText = Math.round(heightFt);
      dims.textContent = `${widthFeetText}ft × ${heightFeetText}ft`;
      label.appendChild(title);
      label.appendChild(dims);
      const centerLng = (corners[0][0] + corners[2][0]) / 2;
      const centerLat = (corners[0][1] + corners[2][1]) / 2;
      const labelMarker = new mapboxgl.Marker({
        element: label,
        draggable: true,
      })
        .setLngLat([centerLng, centerLat])
        .addTo(mapRef.current);
      // Dragging the label moves the whole rectangle
      const onLabelDrag = () => {
        const cur = labelMarker.getLngLat();
        const dLng = cur.lng - (corners[0][0] + corners[2][0]) / 2;
        const dLat = cur.lat - (corners[0][1] + corners[2][1]) / 2;
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
        dims.textContent = `${Math.round(
          metersToFeet(metersWNow)
        )}ft × ${Math.round(metersToFeet(metersHNow))}ft`;
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
          // update label position
          const newCenterLng = (corners[0][0] + corners[2][0]) / 2;
          const newCenterLat = (corners[0][1] + corners[2][1]) / 2;
          labelMarker.setLngLat([newCenterLng, newCenterLat]);
          // update dims text
          const metersW =
            Math.abs(corners[1][0] - corners[0][0]) *
            111320 *
            Math.cos((newCenterLat * Math.PI) / 180);
          const metersH = Math.abs(corners[3][1] - corners[0][1]) * 110540;
          dims.textContent = `${Math.round(
            metersToFeet(metersW)
          )}ft × ${Math.round(metersToFeet(metersH))}ft`;
          audienceAreasRef.current[id].corners = corners;
          // move all corner pins in realtime to their new corners
          corners.forEach((p, i) => cornerMarkers[i].setLngLat(p));
        };
        cm.on("drag", updateRect);
        cm.on("dragend", updateRect);
        return cm;
      });
      audienceAreasRef.current[id] = {
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

    // Firework-type marker and label
    const labelEl = document.createElement("div");
    labelEl.className =
      "rounded-md bg-background/95 text-foreground shadow-lg border border-border px-2 py-1 text-xs";
    labelEl.innerHTML = `<div class="font-medium leading-none">${
      item.label
    }</div><div class="text-muted-foreground text-[10px]">${Math.round(
      item.inches * 70
    )} ft radius</div>`;
    const marker = new mapboxgl.Marker({
      element: labelEl,
      color: item.color,
      draggable: true,
    })
      .setLngLat([lngLat.lng, lngLat.lat])
      .addTo(mapRef.current);
    annotationMarkersRef.current.push(marker);

    // Add fallout radius circle as a GeoJSON layer
    const radiusFeet = item.inches * 70;
    const radiusMeters = feetToMeters(radiusFeet);
    const circleId = `circle-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2)}`;
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
      id: circleId,
      inches: item.inches,
      color: item.color,
      marker,
      sourceId,
      fillLayerId: circleId,
      lineLayerId: lineId,
    };
    // Keep circle in sync when marker is dragged
    const updateCircle = () => {
      const pos = marker.getLngLat();
      const updated = createCircleFeature(pos.lng, pos.lat, radiusMeters);
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
  }

  return (
    <div className="h-screen w-screen flex">
      <aside className="w-[300px] shrink-0 border-r border-border p-4 space-y-4">
        <div className="text-xl font-semibold">Pyro Plot</div>
        <div>
          <label className="mb-1 block text-xs uppercase tracking-wide text-muted-foreground">
            Time of day
          </label>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div>
                  <Select
                    value={lightPreset}
                    onValueChange={(v: "night" | "dusk" | "day") =>
                      setLightPreset(v)
                    }
                    disabled={basemapMode === "satellite"}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Dusk" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="dusk">Dusk</SelectItem>
                      <SelectItem value="night">Night</SelectItem>
                      <SelectItem value="day">Day</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </TooltipTrigger>
              {basemapMode === "satellite" && (
                <TooltipContent>Not available in Satellite View</TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
        </div>

        <div>
          <label className="mb-1 block text-xs uppercase tracking-wide text-muted-foreground">
            Map Type
          </label>
          <Select
            value={basemapMode}
            onValueChange={(v: "standard" | "satellite") => setBasemapMode(v)}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="3D View" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="standard">3D View</SelectItem>
              <SelectItem value="satellite">Satellite View</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (activeIndex >= 0 && activeIndex < suggestions.length) {
                void handleSubmitOrSelect(suggestions[activeIndex]?.id);
              } else {
                void handleSubmitOrSelect();
              }
            }}
            className="space-y-2"
          >
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "ArrowDown" && suggestions.length > 0) {
                  e.preventDefault();
                  setActiveIndex((idx) => (idx + 1) % suggestions.length);
                } else if (e.key === "ArrowUp" && suggestions.length > 0) {
                  e.preventDefault();
                  setActiveIndex(
                    (idx) => (idx - 1 + suggestions.length) % suggestions.length
                  );
                } else if (e.key === "Escape") {
                  setSuggestions([]);
                  setActiveIndex(-1);
                }
              }}
              placeholder="Search places"
              role="combobox"
              aria-expanded={suggestions.length > 0}
              aria-controls="search-suggestions"
              aria-activedescendant={
                activeIndex >= 0 && suggestions[activeIndex]
                  ? `sugg-${suggestions[activeIndex]!.id}`
                  : undefined
              }
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </form>
          {suggestions.length > 0 && (
            <ul
              id="search-suggestions"
              role="listbox"
              className="mt-2 max-h-60 overflow-auto rounded-md border border-border bg-popover text-sm"
            >
              {suggestions.map((s, i) => (
                <li
                  id={`sugg-${s.id}`}
                  role="option"
                  aria-selected={i === activeIndex}
                  key={s.id}
                  className={`cursor-pointer px-3 py-2 ${
                    i === activeIndex ? "bg-muted" : "hover:bg-muted"
                  }`}
                  onMouseEnter={() => setActiveIndex(i)}
                  onMouseDown={(e) => {
                    e.preventDefault();
                  }}
                  onClick={() => void handleSubmitOrSelect(s.id)}
                >
                  {s.text}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="pt-4 border-t border-border">
          <div className="text-xs uppercase tracking-wide text-muted-foreground mb-2">
            Annotations
          </div>
          <div className="grid grid-cols-2 gap-2">
            {annotationPalette.map((a) => (
              <button
                key={a.key}
                title={a.label}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.effectAllowed = "copy";
                  e.dataTransfer.setData(
                    "text/plain",
                    JSON.stringify({
                      key: a.key,
                      glyph: a.key === "audience" ? "👥" : "📍",
                    })
                  );
                }}
                className="h-9 w-full grid grid-cols-[20px_1fr] items-center gap-2 rounded-md border border-border bg-background hover:bg-muted px-2 text-xs"
                type="button"
              >
                <span>{a.key === "audience" ? "👥" : "📍"}</span>
                <span className="truncate">{a.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="pt-4 border-t border-border">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                if (!mapRef.current) return;
                mapRef.current.easeTo({
                  center: mapRef.current.getCenter(),
                  zoom: mapRef.current.getZoom(),
                  pitch: 30,
                  bearing: 0,
                  duration: 600,
                });
              }}
              className="inline-flex items-center justify-center rounded-md border border-border bg-background px-3 py-2 text-sm hover:bg-muted"
            >
              Reset Camera
            </button>
          </div>
        </div>

        <div className="pt-4 border-t border-border">
          <Dialog>
            <div className="flex justify-between items-center gap-2">
              <DialogTrigger asChild>
                <button
                  type="button"
                  className="inline-flex items-center justify-center rounded-md border border-border bg-background px-3 py-2 text-sm hover:bg-muted"
                >
                  Clear Annotations
                </button>
              </DialogTrigger>
            </div>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Clear annotations?</DialogTitle>
                <DialogDescription>
                  This will remove all annotations you have added to the map.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <DialogClose asChild>
                  <button
                    type="button"
                    className="inline-flex items-center justify-center rounded-md border border-border bg-background px-3 py-2 text-sm hover:bg-muted"
                  >
                    Cancel
                  </button>
                </DialogClose>
                <DialogClose asChild>
                  <button
                    type="button"
                    onClick={() => clearAllAnnotations()}
                    className="inline-flex items-center justify-center rounded-md bg-destructive text-destructive-foreground px-3 py-2 text-sm hover:opacity-90"
                  >
                    Confirm clear
                  </button>
                </DialogClose>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </aside>

      <div className="flex-1">
        <div
          ref={mapContainerRef}
          className="h-full w-full"
          onDrop={handleMapDrop}
          onDragOver={handleMapDragOver}
        />
      </div>
    </div>
  );
}
