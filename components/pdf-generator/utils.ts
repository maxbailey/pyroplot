import type { JsPdfConstructor } from "./types";
import type { Feature, Polygon } from "geojson";

export function feetToMeters(feet: number): number {
  return feet * 0.3048;
}

export function metersToFeet(meters: number): number {
  return meters / 0.3048;
}

export function createCircleFeature(
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
      center[0] + (dx * 180) / Math.PI / Math.cos((center[1] * Math.PI) / 180);
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

export async function loadJsPDF(): Promise<JsPdfConstructor> {
  if (window.jspdf?.jsPDF) {
    console.info("[siteplan] jsPDF already available");
    return window.jspdf.jsPDF as JsPdfConstructor;
  }

  console.info("[siteplan] loading jsPDF...");
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src =
      "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
    script.onload = () => {
      console.info("[siteplan] jsPDF loaded");
      resolve(window.jspdf!.jsPDF as JsPdfConstructor);
    };
    script.onerror = () => {
      console.error("[siteplan] failed to load jsPDF");
      reject(new Error("Failed to load jsPDF"));
    };
    document.head.appendChild(script);
  });
}
