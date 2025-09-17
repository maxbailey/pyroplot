"use client";

import Image from "next/image";
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
// Removed slider; we switch whole styles for performance

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";

interface JsPdfInstance {
  internal: { pageSize: { getWidth(): number; getHeight(): number } };
  setFont(font: string, style?: string): void;
  setFontSize(size: number): void;
  text(text: string, x: number, y: number): void;
  addImage(
    imageData: string,
    format: "PNG" | "JPEG" | "JPG",
    x: number,
    y: number,
    w: number,
    h: number
  ): void;
  addPage(
    format?: string | number[],
    orientation?: "portrait" | "landscape"
  ): void;
  rect(
    x: number,
    y: number,
    w: number,
    h: number,
    style?: "S" | "F" | "FD" | "DF"
  ): void;
  setFillColor(r: number, g: number, b: number): void;
  save(filename: string): void;
}

interface JsPdfConstructor {
  new (options?: {
    orientation?: "portrait" | "landscape";
    unit?: string;
    format?: string | number[];
  }): JsPdfInstance;
}

declare global {
  interface Window {
    jspdf?: { jsPDF: JsPdfConstructor };
  }
}

type AnnotationItem = {
  key: string;
  label: string;
  inches: number;
  color: string;
};

type AnnotationType = "firework" | "audience";

interface AnnotationRecord {
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
  const fireworkCounterRef = useRef<number>(0);
  const audienceCounterRef = useRef<number>(0);
  // Reset dialog is controlled by Radix internally via Dialog primitives
  const [showHeight, setShowHeight] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [shareUrl, setShareUrl] = useState("");
  const [copied, setCopied] = useState(false);

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

  function feetToMeters(feet: number) {
    return feet * 0.3048;
  }

  function metersToFeet(meters: number) {
    return meters / 0.3048;
  }

  // removed unused getMetersPerPixel helper

  async function loadJsPDF(): Promise<JsPdfConstructor> {
    if (window.jspdf?.jsPDF) {
      console.info("[siteplan] jsPDF already available");
      return window.jspdf.jsPDF;
    }
    console.info("[siteplan] injecting jsPDF script...");
    await new Promise<void>((resolve, reject) => {
      const existing = document.querySelector<HTMLScriptElement>(
        'script[data-lib="jspdf"]'
      );
      if (existing) {
        // If script tag exists and jsPDF is already available, resolve immediately
        if (window.jspdf?.jsPDF) {
          console.info("[siteplan] existing jsPDF detected (fast-path)");
          resolve();
          return;
        }
        // If the script is already loaded, resolve; otherwise, attach listeners
        const rs = (existing as unknown as { readyState?: string }).readyState;
        if (rs === "complete") {
          console.info("[siteplan] existing script readyState=complete");
          resolve();
          return;
        }
        existing.addEventListener("load", () => {
          console.info("[siteplan] existing jsPDF script load event");
          resolve();
        });
        existing.addEventListener("error", () => {
          console.error("[siteplan] existing jsPDF script error");
          reject();
        });
        // Fallback in case load already fired before listeners were attached
        setTimeout(() => resolve(), 1000);
        return;
      }
      const script = document.createElement("script");
      script.src =
        "https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js";
      script.async = true;
      script.defer = true;
      script.setAttribute("data-lib", "jspdf");
      script.onload = () => {
        console.info("[siteplan] jsPDF script loaded");
        resolve();
      };
      script.onerror = () => {
        console.error("[siteplan] jsPDF script failed to load");
        reject(new Error("Failed to load jsPDF"));
      };
      document.head.appendChild(script);
    });
    console.info("[siteplan] jsPDF ready");
    return window.jspdf!.jsPDF as JsPdfConstructor;
  }

  async function generateSitePlanPdf() {
    if (!mapRef.current) return;
    if (isGenerating) return;
    setIsGenerating(true);
    try {
      const map = mapRef.current;
      console.info("[siteplan] begin PDF generation");

      // Build temporary symbol layer to capture labels in canvas
      const labelSourceId = "__siteplan-labels-src";
      const labelLayerId = "__siteplan-labels-layer";
      const features: Array<Feature> = [];
      // Firework labels from markers
      for (const key of Object.keys(annotationsRef.current)) {
        const rec = annotationsRef.current[key]!;
        const pos = rec.marker.getLngLat();
        features.push({
          type: "Feature",
          geometry: { type: "Point", coordinates: [pos.lng, pos.lat] },
          properties: {
            id: String(rec.number),
            atype: "firework",
          },
        } as Feature);
      }
      // Audience labels centered on rectangle
      for (const key of Object.keys(audienceAreasRef.current)) {
        const rec = audienceAreasRef.current[key]!;
        const c = rec.corners;
        const centerLng = (c[0][0] + c[2][0]) / 2;
        const centerLat = (c[0][1] + c[2][1]) / 2;
        // dimensions not needed for ID-only overlay label
        features.push({
          type: "Feature",
          geometry: { type: "Point", coordinates: [centerLng, centerLat] },
          properties: {
            id: String(rec.number),
            atype: "audience",
          },
        } as Feature);
      }

      if (features.length > 0) {
        try {
          if (!map.getSource(labelSourceId)) {
            map.addSource(labelSourceId, {
              type: "geojson",
              data: {
                type: "FeatureCollection",
                features,
              } as FeatureCollection,
            });
            console.info("[siteplan] added label source (first time)");
          } else {
            (map.getSource(labelSourceId) as mapboxgl.GeoJSONSource).setData({
              type: "FeatureCollection",
              features,
            } as FeatureCollection);
            console.info("[siteplan] updated label source data");
          }
          if (!map.getLayer(labelLayerId)) {
            // Add at the top to ensure visibility
            map.addLayer(
              {
                id: labelLayerId,
                type: "symbol",
                source: labelSourceId,
                layout: {
                  "text-field": [
                    "case",
                    ["==", ["get", "atype"], "audience"],
                    ["concat", "Audience ", ["get", "id"]],
                    ["get", "id"],
                  ],
                  "text-size": 28,
                  "text-offset": [0, 0],
                  "text-anchor": "center",
                  "text-font": ["DIN Pro Medium", "Arial Unicode MS Regular"],
                  "text-allow-overlap": true,
                  "symbol-placement": "point",
                  "text-pitch-alignment": "viewport",
                },
                paint: {
                  "text-color": "#ffffff",
                  "text-halo-color": "#000000",
                  "text-halo-width": 2,
                },
              },
              undefined
            );
            console.info("[siteplan] added label layer");
          }
          await new Promise<void>((resolve) => {
            const done = () => resolve();
            const anyMap = map as unknown as { isStyleLoaded?: () => boolean };
            if (anyMap.isStyleLoaded && anyMap.isStyleLoaded()) {
              map.once("idle", done);
              setTimeout(done, 800);
            } else {
              setTimeout(done, 800);
            }
          });
          console.info("[siteplan] map idle after label layer");
        } catch {}
      }

      // Capture canvas
      const canvas = map.getCanvas();
      console.info("[siteplan] capturing canvas to data URL...");
      let imgData = "";
      try {
        imgData = canvas.toDataURL("image/png");
      } catch {
        // If toDataURL fails due to tainting, try forcing a quick re-render then retry
        console.warn("[siteplan] toDataURL failed; retrying after short delay");
        await new Promise<void>((r) => setTimeout(r, 50));
        imgData = canvas.toDataURL("image/png");
      }

      // Clean up temp label layer/source
      try {
        if (map.getLayer(labelLayerId)) map.removeLayer(labelLayerId);
        if (map.getSource(labelSourceId)) map.removeSource(labelSourceId);
        console.info("[siteplan] cleaned up temp label layer/source");
      } catch {}

      const jsPDF = await loadJsPDF();
      console.info("[siteplan] creating jsPDF document...");
      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "pt",
        format: "letter",
      });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 36;

      // Fit image to page with margins
      const img = new window.Image();
      // ensure CORS-safe draw for some browsers
      img.crossOrigin = "anonymous";
      img.src = imgData;
      await new Promise<void>((res) => (img.onload = () => res()));
      console.info("[siteplan] image loaded; adding to PDF page 1");
      const imgW = img.width;
      const imgH = img.height;
      const maxW = pageWidth - margin * 2;
      const maxH = pageHeight - margin * 2;
      const scale = Math.min(maxW / imgW, maxH / imgH);
      const drawW = imgW * scale;
      const drawH = imgH * scale;
      const dx = margin + (maxW - drawW) / 2;
      const dy = margin + (maxH - drawH) / 2;
      pdf.addImage(imgData, "PNG", dx, dy, drawW, drawH);
      console.info("[siteplan] added screenshot to PDF");

      const addLogoToPage = async () => {
        try {
          console.info("[siteplan] Adding logo to page...");
          const logoResponse = await fetch("/pyroplot-logo-lightmode.svg");
          if (!logoResponse.ok) {
            throw new Error(`Failed to fetch logo: ${logoResponse.status}`);
          }

          const logoText = await logoResponse.text();
          console.info("[siteplan] Logo SVG loaded, length:", logoText.length);

          // Convert SVG to canvas first, then to PNG data URL
          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d");
          if (!ctx) throw new Error("Could not get canvas context");

          const logoHeight = 18;
          const logoWidth = 82;
          // Use higher resolution canvas for crisp rendering
          const scale = 2; // 2x resolution
          canvas.width = logoWidth * scale;
          canvas.height = logoHeight * scale;
          ctx.scale(scale, scale);

          // Create an image from the SVG
          const logoImg = new window.Image();
          logoImg.crossOrigin = "anonymous";

          await new Promise<void>((resolve, reject) => {
            logoImg.onload = () => {
              try {
                ctx.drawImage(logoImg, 0, 0, logoWidth, logoHeight);
                resolve();
              } catch (err) {
                reject(err);
              }
            };
            logoImg.onerror = () =>
              reject(new Error("Failed to load logo image"));
            logoImg.src = `data:image/svg+xml;base64,${btoa(logoText)}`;
          });

          const logoDataUrl = canvas.toDataURL("image/png");
          console.info("[siteplan] Logo converted to PNG data URL");

          const logoX = pageWidth - margin - logoWidth;
          const logoY = margin - 15;

          console.info("[siteplan] Adding logo at position:", {
            logoX,
            logoY,
            logoWidth,
            logoHeight,
          });
          pdf.addImage(logoDataUrl, "PNG", logoX, logoY, logoWidth, logoHeight);
          console.info("[siteplan] Logo added to PDF page");
        } catch (error) {
          console.error("[siteplan] Failed to add logo to page:", error);
        }
      };

      // Add logo to first page
      await addLogoToPage();

      // Build tables on next pages
      const startNewPage = async () => {
        pdf.addPage("letter", "landscape");
        await addLogoToPage();
      };

      const drawHeader = (title: string) => {
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(16);
        pdf.text(title, margin, margin);
      };

      const drawRowBg = (x: number, y: number, w: number, h: number) => {
        pdf.setFillColor(245, 245, 245);
        pdf.rect(x, y, w, h, "F");
      };

      const lineHeight = 16;
      const rowGap = 6;

      // Firework Annotations table
      await startNewPage();
      drawHeader("Firework Annotations");
      let y = margin + 18;
      const colX = [margin, margin + 90, margin + 320, margin + 440];
      // column widths derived implicitly; explicit widths not needed

      // header
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(11);
      const headerH = 26;
      drawRowBg(margin, y, pageWidth - margin * 2, headerH);
      const headerYMid = y + headerH / 2 + 3;
      pdf.text("ID/#", colX[0], headerYMid);
      pdf.text("Label", colX[1], headerYMid);
      pdf.text("Fallout Radius (ft)", colX[2], headerYMid);
      pdf.text("Lat, Lng", colX[3], headerYMid);
      y += headerH + rowGap;

      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(10);
      const fireworks = Object.values(annotationsRef.current).sort(
        (a, b) => a.number - b.number
      );
      for (const rec of fireworks) {
        const pos = rec.marker.getLngLat();
        const id = String(rec.number);
        const label = rec.label;
        const radius = Math.round(rec.inches * 70).toString();
        const latlng = `${pos.lat.toFixed(6)}, ${pos.lng.toFixed(6)}`;

        const rowH = 26;
        if (y + rowH + margin > pageHeight) {
          await startNewPage();
          drawHeader("Firework Annotations (cont.)");
          y = margin + 18;
          drawRowBg(margin, y, pageWidth - margin * 2, headerH);
          const hY = y + headerH / 2 + 3;
          pdf.setFont("helvetica", "bold");
          pdf.setFontSize(11);
          pdf.text("ID/#", colX[0], hY);
          pdf.text("Label", colX[1], hY);
          pdf.text("Fallout Radius (ft)", colX[2], hY);
          pdf.text("Lat, Lng", colX[3], hY);
          y += headerH + rowGap;
          pdf.setFont("helvetica", "normal");
          pdf.setFontSize(10);
        }
        drawRowBg(margin, y, pageWidth - margin * 2, rowH);
        const yMid = y + rowH / 2 + 3;
        pdf.text(id, colX[0], yMid);
        pdf.text(label, colX[1], yMid);
        pdf.text(radius, colX[2], yMid);
        pdf.text(latlng, colX[3], yMid);
        y += rowH + rowGap;
      }

      // Audience Annotations table
      await startNewPage();
      drawHeader("Audience Annotations");
      y = margin + 18;
      const aColX = [margin, margin + 90, margin + 280, margin + 420];
      // column widths for audience table derived implicitly
      // header
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(11);
      drawRowBg(margin, y, pageWidth - margin * 2, headerH);
      const aHeaderYMid = y + headerH / 2 + 3;
      pdf.text("ID/#", aColX[0], aHeaderYMid);
      pdf.text("Label", aColX[1], aHeaderYMid);
      pdf.text("Dimensions (ft)", aColX[2], aHeaderYMid);
      pdf.text("Corners (lat, lng)", aColX[3], aHeaderYMid);
      y += headerH + rowGap;

      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(10);
      const audiences = Object.values(audienceAreasRef.current).sort(
        (a, b) => a.number - b.number
      );
      for (const rec of audiences) {
        const id = String(rec.number);
        const label = "Audience";
        const c = rec.corners;
        const centerLat = (c[0][1] + c[2][1]) / 2;
        const metersW =
          Math.abs(c[1][0] - c[0][0]) *
          111320 *
          Math.cos((centerLat * Math.PI) / 180);
        const metersH = Math.abs(c[3][1] - c[0][1]) * 110540;
        const widthFt = Math.round(metersToFeet(metersW));
        const heightFt = Math.round(metersToFeet(metersH));
        const dims = `${widthFt} × ${heightFt}`;
        const cornerLines = [
          `${c[0][1].toFixed(6)}, ${c[0][0].toFixed(6)}`,
          `${c[1][1].toFixed(6)}, ${c[1][0].toFixed(6)}`,
          `${c[2][1].toFixed(6)}, ${c[2][0].toFixed(6)}`,
          `${c[3][1].toFixed(6)}, ${c[3][0].toFixed(6)}`,
        ];
        const lines = cornerLines.length;
        const rowH = Math.max(26, lines * lineHeight + 10);
        if (y + rowH + margin > pageHeight) {
          await startNewPage();
          drawHeader("Audience Annotations (cont.)");
          y = margin + 18;
          drawRowBg(margin, y, pageWidth - margin * 2, headerH);
          const hY = y + headerH / 2 + 3;
          pdf.setFont("helvetica", "bold");
          pdf.setFontSize(11);
          pdf.text("ID/#", aColX[0], hY);
          pdf.text("Label", aColX[1], hY);
          pdf.text("Dimensions (ft)", aColX[2], hY);
          pdf.text("Corners (lat, lng)", aColX[3], hY);
          y += headerH + rowGap;
          pdf.setFont("helvetica", "normal");
          pdf.setFontSize(10);
        }
        drawRowBg(margin, y, pageWidth - margin * 2, rowH);
        // Vertically center simple cells
        const yMid = y + rowH / 2 + 3;
        pdf.text(id, aColX[0], yMid);
        pdf.text(label, aColX[1], yMid);
        pdf.text(dims, aColX[2], yMid);
        // Corner lines stacked
        let lineY = y + (rowH - lines * lineHeight) / 2 + lineHeight - 4;
        for (const ln of cornerLines) {
          pdf.text(ln, aColX[3], lineY);
          lineY += lineHeight;
        }
        y += rowH + rowGap;
      }

      console.info("[siteplan] saving PDF...");
      pdf.save("site-plan.pdf");
      console.info("[siteplan] PDF saved");
    } catch {
      console.error("[siteplan] PDF generation failed");
    } finally {
      setIsGenerating(false);
      console.info("[siteplan] generation finished");
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

  interface SerializedAudience {
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
    audiences: SerializedAudience[];
    showHeight: boolean;
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
    ).map((rec) => {
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
    const audiences: SerializedAudience[] = Object.values(
      audienceAreasRef.current
    ).map((rec) => ({
      id: rec.id,
      number: rec.number,
      corners: rec.corners,
    }));
    const state: SerializedState = {
      camera,
      fireworks,
      audiences,
      showHeight,
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
      const radiusFeet = Math.round(fw.inches * 70);
      labelEl.innerHTML = `<div class="font-medium leading-none">${labelText}</div><div class="text-muted-foreground text-[10px]">${radiusFeet} ft radius</div>`;
      const marker = new mapboxgl.Marker({
        element: labelEl,
        color,
        draggable: true,
      })
        .setLngLat(fw.position)
        .addTo(map);
      annotationMarkersRef.current.push(marker);
      const radiusMeters = feetToMeters(fw.inches * 70);
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
        const updated = createCircleFeature(pos.lng, pos.lat, radiusMeters);
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
      const centerLat = (corners[0][1] + corners[2][1]) / 2;
      const metersW =
        Math.abs(corners[1][0] - corners[0][0]) *
        111320 *
        Math.cos((centerLat * Math.PI) / 180);
      const metersH = Math.abs(corners[3][1] - corners[0][1]) * 110540;
      dims.textContent = `${Math.round(metersToFeet(metersW))}ft × ${Math.round(
        metersToFeet(metersH)
      )}ft`;
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
        dims.textContent = `${Math.round(
          metersToFeet(metersWNow)
        )}ft × ${Math.round(metersToFeet(metersHNow))}ft`;
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
          dims.textContent = `${Math.round(
            metersToFeet(metersW2)
          )}ft × ${Math.round(metersToFeet(metersH2))}ft`;
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
    const number = ++fireworkCounterRef.current;
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
  }

  return (
    <div className="h-screen w-screen flex overflow-hidden">
      <aside className="w-[300px] shrink-0 border-r border-border p-4 space-y-4 overflow-y-auto">
        <div className="flex items-center justify-center select-none">
          <Image
            src="/pyroplot-logo.svg"
            alt="Pyro Plot"
            width={140}
            height={100}
          />
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
                      glyph: a.key === "audience" ? "👥" : "✨",
                    })
                  );
                }}
                className="h-9 w-full grid grid-cols-[20px_1fr] items-center text-start gap-0.5 rounded-md border border-border bg-background hover:bg-muted px-2 text-xs"
                type="button"
              >
                <span>{a.key === "audience" ? "👥" : "✨"}</span>
                <span className="truncate">{a.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="pt-4 border-t border-border">
          <div className="flex flex-col items-stretch gap-2">
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
            <button
              type="button"
              onClick={() => {
                setShowHeight((prev) => {
                  const next = !prev;
                  const map = mapRef.current;
                  if (!map) return next;
                  // apply or remove on all existing annotations
                  for (const key of Object.keys(annotationsRef.current)) {
                    const rec = annotationsRef.current[key]!;
                    if (next) addExtrusionForAnnotation(rec);
                    else removeExtrusionForAnnotation(rec);
                  }
                  return next;
                });
              }}
              className="inline-flex items-center justify-center rounded-md border border-border bg-background px-3 py-2 text-sm hover:bg-muted"
            >
              {showHeight ? "Hide Height" : "Show Height"}
            </button>
            <button
              type="button"
              onClick={() => void generateSitePlanPdf()}
              disabled={isGenerating}
              className="inline-flex items-center justify-center rounded-md border border-border bg-background px-3 py-2 text-sm hover:bg-muted disabled:opacity-60"
            >
              {isGenerating ? "Generating…" : "Generate Site Plan"}
            </button>
            <Dialog
              open={shareOpen}
              onOpenChange={(open) => {
                setShareOpen(open);
                if (!open) setCopied(false);
              }}
            >
              <div className="flex justify-between items-center gap-2">
                <DialogTrigger asChild>
                  <button
                    type="button"
                    onClick={() => void openShareDialog()}
                    className="inline-flex w-full items-center justify-center rounded-md border border-border bg-background px-3 py-2 text-sm hover:bg-muted"
                  >
                    Share Site Plan
                  </button>
                </DialogTrigger>
              </div>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Share this site plan</DialogTitle>
                  <DialogDescription>
                    Copy this link to share. Opening it restores the current
                    camera and annotations.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-2">
                  <input
                    value={shareUrl}
                    readOnly
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm"
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(shareUrl);
                          setCopied(true);
                        } catch {}
                      }}
                      className="inline-flex items-center justify-center rounded-md border border-border bg-background px-3 py-2 text-sm hover:bg-muted"
                    >
                      {copied ? "✓ Copied Link" : "Copy link"}
                    </button>
                    <DialogClose asChild>
                      <button
                        type="button"
                        className="inline-flex items-center justify-center rounded-md border border-border bg-background px-3 py-2 text-sm hover:bg-muted"
                      >
                        Close
                      </button>
                    </DialogClose>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
            <Dialog>
              <div className="flex justify-between items-center gap-2">
                <DialogTrigger asChild>
                  <button
                    type="button"
                    className="inline-flex w-full items-center justify-center rounded-md border border-border bg-background text-brand px-3 py-2 text-sm hover:bg-muted"
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
                      className="inline-flex items-center justify-center rounded-md bg-brand text-white px-3 py-2 text-sm hover:opacity-90"
                    >
                      Confirm clear
                    </button>
                  </DialogClose>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
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
