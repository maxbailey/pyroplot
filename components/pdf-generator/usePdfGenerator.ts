import { useState } from "react";
import type { Feature, FeatureCollection } from "geojson";
import {
  loadJsPDF,
  feetToMeters,
  metersToFeet,
  createCircleFeature,
} from "./utils";
import type {
  AnnotationRecord,
  AudienceRecord,
  MeasurementRecord,
  RestrictedRecord,
  MeasurementUnit,
  SafetyDistance,
} from "@/lib/types";
import { GEO_CONSTANTS, AUDIENCE_DIMENSIONS } from "@/lib/constants";

interface UsePdfGeneratorProps {
  mapRef: React.RefObject<mapboxgl.Map | null>;
  annotationsRef: React.MutableRefObject<Record<string, AnnotationRecord>>;
  audienceAreasRef: React.MutableRefObject<Record<string, AudienceRecord>>;
  measurementsRef: React.MutableRefObject<Record<string, MeasurementRecord>>;
  restrictedAreasRef: React.MutableRefObject<Record<string, RestrictedRecord>>;
  projectName: string;
  measurementUnit: MeasurementUnit;
  safetyDistance: SafetyDistance;
}

export const usePdfGenerator = ({
  mapRef,
  annotationsRef,
  audienceAreasRef,
  measurementsRef,
  restrictedAreasRef,
  projectName,
  measurementUnit,
  safetyDistance,
}: UsePdfGeneratorProps) => {
  const [isGenerating, setIsGenerating] = useState(false);

  const generateSitePlanPdf = async () => {
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

      // Firework labels from markers (exclude custom annotations)
      for (const key of Object.keys(annotationsRef.current)) {
        const rec = annotationsRef.current[key]!;
        if (rec.type !== "custom") {
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
      }

      // Audience labels centered on rectangle
      for (const key of Object.keys(audienceAreasRef.current)) {
        const rec = audienceAreasRef.current[key]!;
        const c = rec.corners;
        const centerLng = (c[0][0] + c[2][0]) / 2;
        const topLat = c[3][1]; // Use top edge (NW corner latitude)
        // Position label at top edge with small offset down
        const offsetLat =
          feetToMeters(AUDIENCE_DIMENSIONS.LABEL_OFFSET_FT) /
          GEO_CONSTANTS.METERS_PER_DEGREE_LAT; // 20 feet down from top
        const labelLat = topLat - offsetLat;
        features.push({
          type: "Feature",
          geometry: { type: "Point", coordinates: [centerLng, labelLat] },
          properties: {
            id: String(rec.number),
            atype: "audience",
          },
        } as Feature);
      }

      // Measurement labels centered on line
      for (const key of Object.keys(measurementsRef.current)) {
        const rec = measurementsRef.current[key]!;
        const p = rec.points;
        const centerLng = (p[0][0] + p[1][0]) / 2;
        const centerLat = (p[0][1] + p[1][1]) / 2;

        // Calculate distance for display
        const lat1 = (p[0][1] * Math.PI) / 180;
        const lat2 = (p[1][1] * Math.PI) / 180;
        const deltaLat = ((p[1][1] - p[0][1]) * Math.PI) / 180;
        const deltaLng = ((p[1][0] - p[0][0]) * Math.PI) / 180;

        const a =
          Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
          Math.cos(lat1) *
            Math.cos(lat2) *
            Math.sin(deltaLng / 2) *
            Math.sin(deltaLng / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const distanceMeters = GEO_CONSTANTS.EARTH_RADIUS * c; // Earth radius in meters
        const unitSuffix = measurementUnit === "feet" ? "ft" : "m";
        const distanceVal =
          measurementUnit === "feet"
            ? Math.round(metersToFeet(distanceMeters))
            : Math.round(distanceMeters);

        features.push({
          type: "Feature",
          geometry: { type: "Point", coordinates: [centerLng, centerLat] },
          properties: {
            id: String(distanceVal),
            units: unitSuffix,
            atype: "measurement",
          },
        } as Feature);
      }

      // Custom annotation ID labels (only ID numbers, no text)
      for (const key of Object.keys(annotationsRef.current)) {
        const rec = annotationsRef.current[key]!;
        if (rec.type === "custom") {
          const pos = rec.marker.getLngLat();
          features.push({
            type: "Feature",
            geometry: {
              type: "Point",
              coordinates: [pos.lng, pos.lat],
            },
            properties: {
              id: String(rec.number),
              atype: "custom",
            },
          } as Feature);
        }
      }

      // Restricted labels centered on rectangle
      for (const key of Object.keys(restrictedAreasRef.current)) {
        const rec = restrictedAreasRef.current[key]!;
        const c = rec.corners;
        const centerLng = (c[0][0] + c[2][0]) / 2;
        const topLat = c[3][1]; // Use top edge (NW corner latitude)
        // Position label at top edge with small offset down
        const offsetLat =
          feetToMeters(AUDIENCE_DIMENSIONS.LABEL_OFFSET_FT) /
          GEO_CONSTANTS.METERS_PER_DEGREE_LAT; // 20 feet down from top
        const labelLat = topLat - offsetLat;
        features.push({
          type: "Feature",
          geometry: { type: "Point", coordinates: [centerLng, labelLat] },
          properties: {
            id: String(rec.number),
            atype: "restricted",
          },
        } as Feature);
      }

      // Add custom annotation circles for PDF (BEFORE labels)
      const customCircleSourceId = "__siteplan-custom-circles-src";
      const customCircleFeatures: Array<Feature> = [];
      for (const key of Object.keys(annotationsRef.current)) {
        const rec = annotationsRef.current[key]!;
        if (rec.type === "custom") {
          const pos = rec.marker.getLngLat();
          // Create a small circle for the ID background
          const radiusMeters = feetToMeters(12); // 12 feet radius
          const circleFeature = createCircleFeature(
            pos.lng,
            pos.lat,
            radiusMeters
          );
          customCircleFeatures.push({
            ...circleFeature,
            properties: {
              color: rec.color,
              id: rec.id,
            },
          } as Feature);
          console.info(
            `[siteplan] created custom circle for ${rec.id} at ${pos.lng}, ${pos.lat} with color ${rec.color}`
          );
        }
      }
      console.info(
        `[siteplan] created ${customCircleFeatures.length} custom circle features`
      );

      if (customCircleFeatures.length > 0) {
        try {
          if (!map.getSource(customCircleSourceId)) {
            map.addSource(customCircleSourceId, {
              type: "geojson",
              data: {
                type: "FeatureCollection",
                features: customCircleFeatures,
              } as FeatureCollection,
            });
            console.info("[siteplan] added custom circle source");
          } else {
            (
              map.getSource(customCircleSourceId) as mapboxgl.GeoJSONSource
            ).setData({
              type: "FeatureCollection",
              features: customCircleFeatures,
            } as FeatureCollection);
            console.info("[siteplan] updated custom circle source data");
          }
          if (!map.getLayer("__siteplan-custom-circles-fill")) {
            map.addLayer({
              id: "__siteplan-custom-circles-fill",
              type: "fill",
              source: customCircleSourceId,
              paint: {
                "fill-color": ["get", "color"],
                "fill-opacity": 1.0, // Fully opaque
              },
            });
            map.addLayer({
              id: "__siteplan-custom-circles-line",
              type: "line",
              source: customCircleSourceId,
              paint: {
                "line-color": ["get", "color"],
                "line-width": 2,
                "line-opacity": 1.0,
              },
            });
            console.info(
              "[siteplan] added custom circle layers with full opacity"
            );
          } else {
            console.info("[siteplan] custom circle layers already exist");
          }
        } catch (error) {
          console.warn("[siteplan] failed to add custom circles:", error);
        }
      }

      // Temporarily adjust custom annotation text labels for PDF generation
      for (const key of Object.keys(annotationsRef.current)) {
        const rec = annotationsRef.current[key]!;
        if (rec.type === "custom" && rec.textSourceId) {
          const textLayerId = `${rec.id}-text`;
          if (map.getLayer(textLayerId)) {
            // Temporarily update the text-offset for PDF generation
            map.setLayoutProperty(textLayerId, "text-offset", [0, -1.5]);
          }
        }
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
                    ["==", ["get", "atype"], "measurement"],
                    ["concat", ["get", "id"], " ", ["get", "units"]],
                    ["==", ["get", "atype"], "restricted"],
                    ["concat", "Restricted ", ["get", "id"]],
                    ["==", ["get", "atype"], "custom"],
                    ["get", "id"],
                    ["get", "id"],
                  ],
                  "text-size": [
                    "case",
                    ["==", ["get", "atype"], "measurement"],
                    18,
                    ["==", ["get", "atype"], "audience"],
                    18,
                    ["==", ["get", "atype"], "restricted"],
                    18,
                    28,
                  ],
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

      // Clean up temp layers/sources
      try {
        if (map.getLayer(labelLayerId)) map.removeLayer(labelLayerId);
        if (map.getSource(labelSourceId)) map.removeSource(labelSourceId);
        if (map.getLayer("__siteplan-custom-circles-fill"))
          map.removeLayer("__siteplan-custom-circles-fill");
        if (map.getLayer("__siteplan-custom-circles-line"))
          map.removeLayer("__siteplan-custom-circles-line");
        if (map.getSource(customCircleSourceId))
          map.removeSource(customCircleSourceId);

        // Restore original text-offset for custom annotation labels
        for (const key of Object.keys(annotationsRef.current)) {
          const rec = annotationsRef.current[key]!;
          if (rec.type === "custom" && rec.textSourceId) {
            const textLayerId = `${rec.id}-text`;
            if (map.getLayer(textLayerId)) {
              map.setLayoutProperty(textLayerId, "text-offset", [0, -2.8]);
            }
          }
        }

        console.info("[siteplan] cleaned up temp layers/sources");
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

      // Add project name heading to first page if provided
      if (projectName.trim()) {
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(16);
        pdf.text(projectName.trim(), margin, margin);
      }

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
      const unitLabel = measurementUnit === "feet" ? "ft" : "m";

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
      pdf.text(`Fallout Radius (${unitLabel})`, colX[2], headerYMid);
      pdf.text("Lat, Lng", colX[3], headerYMid);
      y += headerH + rowGap;

      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(10);
      const fireworks = Object.values(annotationsRef.current)
        .filter((rec) => rec.type === "firework")
        .sort((a, b) => a.number - b.number);
      for (const rec of fireworks) {
        const pos = rec.marker.getLngLat();
        const id = String(rec.number);
        const label = rec.label;
        const radius = (
          measurementUnit === "feet"
            ? Math.round(rec.inches * safetyDistance)
            : Math.round(feetToMeters(rec.inches * safetyDistance))
        ).toString();
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
          pdf.text(`Fallout Radius (${unitLabel})`, colX[2], hY);
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

      // Custom Annotations table
      const customAnnotations = Object.values(annotationsRef.current)
        .filter((rec) => rec.type === "custom")
        .sort((a, b) => a.number - b.number);

      if (customAnnotations.length > 0) {
        await startNewPage();
        drawHeader("Custom Annotations");
        y = margin + 18;
        const cColX = [margin, margin + 80, margin + 200, margin + 280];

        // header
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(11);
        drawRowBg(margin, y, pageWidth - margin * 2, headerH);
        const cHeaderYMid = y + headerH / 2 + 3;
        pdf.text("ID/#", cColX[0], cHeaderYMid);
        pdf.text("Label", cColX[1], cHeaderYMid);
        pdf.text("Color", cColX[2], cHeaderYMid);
        pdf.text("Position (lat, lng)", cColX[3], cHeaderYMid);
        y += headerH + rowGap;

        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(10);
        for (const rec of customAnnotations) {
          const pos = rec.marker.getLngLat();
          const id = String(rec.number);
          const label = rec.label;
          const latlng = `${pos.lat.toFixed(6)}, ${pos.lng.toFixed(6)}`;

          const rowH = 26;
          if (y + rowH + margin > pageHeight) {
            await startNewPage();
            drawHeader("Custom Annotations (cont.)");
            y = margin + 18;
            drawRowBg(margin, y, pageWidth - margin * 2, headerH);
            const hY = y + headerH / 2 + 3;
            pdf.setFont("helvetica", "bold");
            pdf.setFontSize(11);
            pdf.text("ID/#", cColX[0], hY);
            pdf.text("Label", cColX[1], hY);
            pdf.text("Color", cColX[2], hY);
            pdf.text("Position (lat, lng)", cColX[3], hY);
            y += headerH + rowGap;
            pdf.setFont("helvetica", "normal");
            pdf.setFontSize(10);
          }
          drawRowBg(margin, y, pageWidth - margin * 2, rowH);
          const yMid = y + rowH / 2 + 3;
          pdf.text(id, cColX[0], yMid);
          pdf.text(label, cColX[1], yMid);

          // Draw colored circle (using rectangle as circle approximation)
          const circleX = cColX[2] + 10;
          const circleY = yMid - 4;
          const circleSize = 8;
          // Convert hex color to RGB
          const hex = rec.color.replace("#", "");
          const r = parseInt(hex.substr(0, 2), 16);
          const g = parseInt(hex.substr(2, 2), 16);
          const b = parseInt(hex.substr(4, 2), 16);
          pdf.setFillColor(r, g, b);
          pdf.rect(
            circleX - circleSize / 2,
            circleY - circleSize / 2,
            circleSize,
            circleSize,
            "F"
          );

          pdf.text(latlng, cColX[3], yMid);
          y += rowH + rowGap;
        }
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
      pdf.text(`Dimensions (${unitLabel})`, aColX[2], aHeaderYMid);
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
          GEO_CONSTANTS.METERS_PER_DEGREE_LNG *
          Math.cos((centerLat * Math.PI) / 180);
        const metersH =
          Math.abs(c[3][1] - c[0][1]) * GEO_CONSTANTS.METERS_PER_DEGREE_LAT;
        const widthVal =
          measurementUnit === "feet"
            ? Math.round(metersToFeet(metersW))
            : Math.round(metersW);
        const heightVal =
          measurementUnit === "feet"
            ? Math.round(metersToFeet(metersH))
            : Math.round(metersH);
        const dims = `${widthVal} × ${heightVal}`;
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
          pdf.text(`Dimensions (${unitLabel})`, aColX[2], hY);
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

      // Restricted Annotations table
      await startNewPage();
      drawHeader("Restricted Annotations");
      y = margin + 18;
      const rColX = [margin, margin + 90, margin + 280, margin + 420];
      // column widths for restricted table derived implicitly
      // header
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(11);
      drawRowBg(margin, y, pageWidth - margin * 2, headerH);
      const rHeaderYMid = y + headerH / 2 + 3;
      pdf.text("ID/#", rColX[0], rHeaderYMid);
      pdf.text("Label", rColX[1], rHeaderYMid);
      pdf.text(`Dimensions (${unitLabel})`, rColX[2], rHeaderYMid);
      pdf.text("Corners (lat, lng)", rColX[3], rHeaderYMid);
      y += headerH + rowGap;

      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(10);
      const restricted = Object.values(restrictedAreasRef.current).sort(
        (a, b) => a.number - b.number
      );
      for (const rec of restricted) {
        const id = String(rec.number);
        const label = "Restricted";
        const c = rec.corners;
        const centerLat = (c[0][1] + c[2][1]) / 2;
        const metersW =
          Math.abs(c[1][0] - c[0][0]) *
          GEO_CONSTANTS.METERS_PER_DEGREE_LNG *
          Math.cos((centerLat * Math.PI) / 180);
        const metersH =
          Math.abs(c[3][1] - c[0][1]) * GEO_CONSTANTS.METERS_PER_DEGREE_LAT;
        const widthValR =
          measurementUnit === "feet"
            ? Math.round(metersToFeet(metersW))
            : Math.round(metersW);
        const heightValR =
          measurementUnit === "feet"
            ? Math.round(metersToFeet(metersH))
            : Math.round(metersH);
        const dims = `${widthValR} × ${heightValR}`;
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
          drawHeader("Restricted Annotations (cont.)");
          y = margin + 18;
          drawRowBg(margin, y, pageWidth - margin * 2, headerH);
          const hY = y + headerH / 2 + 3;
          pdf.setFont("helvetica", "bold");
          pdf.setFontSize(11);
          pdf.text("ID/#", rColX[0], hY);
          pdf.text("Label", rColX[1], hY);
          pdf.text(`Dimensions (${unitLabel})`, rColX[2], hY);
          pdf.text("Corners (lat, lng)", rColX[3], hY);
          y += headerH + rowGap;
          pdf.setFont("helvetica", "normal");
          pdf.setFontSize(10);
        }
        drawRowBg(margin, y, pageWidth - margin * 2, rowH);
        // Vertically center simple cells
        const yMid = y + rowH / 2 + 3;
        pdf.text(id, rColX[0], yMid);
        pdf.text(label, rColX[1], yMid);
        pdf.text(dims, rColX[2], yMid);
        // Corner lines stacked
        let lineY = y + (rowH - lines * lineHeight) / 2 + lineHeight - 4;
        for (const ln of cornerLines) {
          pdf.text(ln, rColX[3], lineY);
          lineY += lineHeight;
        }
        y += rowH + rowGap;
      }

      console.info("[siteplan] saving PDF...");
      pdf.save("site-plan.pdf");
      console.info("[siteplan] PDF saved");
    } catch (error) {
      console.error("[siteplan] PDF generation failed:", error);
    } finally {
      setIsGenerating(false);
      console.info("[siteplan] generation finished");
    }
  };

  return {
    isGenerating,
    generateSitePlanPdf,
  };
};
