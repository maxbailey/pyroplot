"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";

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
  const [isResetOpen, setIsResetOpen] = useState(false);
  const annotationPalette = useMemo(
    () => [
      { key: "firework", label: "Firework", glyph: "🎆" },
      { key: "target", label: "Target", glyph: "🎯" },
      { key: "warning", label: "Caution", glyph: "⚠️" },
      { key: "barrier", label: "Barrier", glyph: "🚧" },
      { key: "spark", label: "Spark", glyph: "✨" },
      { key: "boom", label: "Boom", glyph: "💥" },
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
      attributionControl: false,
    });

    mapRef.current = map;

    map.on("load", () => {
      // Night atmosphere
      try {
        map.setFog({
          color: "rgb(11, 11, 25)",
          "horizon-blend": 0.1,
          "star-intensity": 0.6,
          range: [0.8, 8],
        } as any);
        map.setLight({ color: "white", intensity: 0.2 } as any);
      } catch {}

      // 3D buildings layer
      try {
        const layers = map.getStyle().layers ?? [];
        let labelLayerId: string | undefined;
        for (const layer of layers) {
          // @ts-expect-error layout is dynamic
          if (
            layer.type === "symbol" &&
            layer.layout &&
            layer.layout["text-field"]
          ) {
            labelLayerId = layer.id;
            break;
          }
        }
        if (!map.getLayer("add-3d-buildings")) {
          map.addLayer(
            {
              id: "add-3d-buildings",
              source: "composite",
              "source-layer": "building",
              filter: ["==", "extrude", "true"],
              type: "fill-extrusion",
              minzoom: 15,
              paint: {
                "fill-extrusion-color": "#aaa",
                "fill-extrusion-height": [
                  "interpolate",
                  ["linear"],
                  ["zoom"],
                  15,
                  0,
                  15.05,
                  ["get", "height"],
                ],
                "fill-extrusion-base": [
                  "interpolate",
                  ["linear"],
                  ["zoom"],
                  15,
                  0,
                  15.05,
                  ["get", "min_height"],
                ],
                "fill-extrusion-opacity": 0.6,
              },
            } as any,
            labelLayerId
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
          zoom: 12,
          essential: true,
        });
      },
      () => {},
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, [isMapReady]);

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
      mapRef.current.flyTo({ center: lngLat, zoom: 13, essential: true });
      // do not leave a pin for search results
      sessionTokenRef.current = crypto.randomUUID();
      setSuggestions([]);
      setActiveIndex(-1);
    }
  }

  function handleMapDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    if (!mapRef.current) return;
    const data = e.dataTransfer.getData("text/plain");
    if (!data) return;
    let parsed: { key: string; glyph: string } | null = null;
    try {
      parsed = JSON.parse(data);
    } catch {
      return;
    }
    const rect = (e.target as HTMLDivElement).getBoundingClientRect();
    const point = [e.clientX - rect.left, e.clientY - rect.top] as [
      number,
      number
    ];
    const lngLat = mapRef.current.unproject(point);
    const el = document.createElement("div");
    el.className =
      "grid place-items-center rounded-full bg-foreground/90 text-background shadow-lg select-none";
    el.style.width = "28px";
    el.style.height = "28px";
    el.style.fontSize = "16px";
    el.style.lineHeight = "1";
    el.textContent = parsed.glyph;
    const marker = new mapboxgl.Marker({ element: el, draggable: true })
      .setLngLat([lngLat.lng, lngLat.lat])
      .addTo(mapRef.current);
    annotationMarkersRef.current.push(marker);
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
    annotationMarkersRef.current = { current: [] } as any;
  }

  return (
    <div className="h-screen w-screen flex">
      <aside className="w-[300px] shrink-0 border-r border-border p-4 space-y-4">
        <div className="text-xl font-semibold">Pyro Plot</div>
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
          <div className="grid grid-cols-6 gap-2">
            {[
              { key: "firework", label: "Firework", glyph: "🎆" },
              { key: "target", label: "Target", glyph: "🎯" },
              { key: "warning", label: "Caution", glyph: "⚠️" },
              { key: "barrier", label: "Barrier", glyph: "🚧" },
              { key: "spark", label: "Spark", glyph: "✨" },
              { key: "boom", label: "Boom", glyph: "💥" },
            ].map((a) => (
              <button
                key={a.key}
                title={a.label}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.effectAllowed = "copy";
                  e.dataTransfer.setData(
                    "text/plain",
                    JSON.stringify({ key: a.key, glyph: a.glyph })
                  );
                }}
                className="h-9 w-9 grid place-items-center rounded-md border border-border bg-background hover:bg-muted text-lg"
                type="button"
              >
                {a.glyph}
              </button>
            ))}
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
                  Reset
                </button>
              </DialogTrigger>
            </div>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Reset annotations?</DialogTitle>
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
                    onClick={() => {
                      for (const m of annotationMarkersRef.current) {
                        try {
                          m.remove();
                        } catch {}
                      }
                      annotationMarkersRef.current = [] as any;
                    }}
                    className="inline-flex items-center justify-center rounded-md bg-destructive text-destructive-foreground px-3 py-2 text-sm hover:opacity-90"
                  >
                    Confirm reset
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
