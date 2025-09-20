import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import { mapboxgl } from "../mapbox-init";
import type { MapCamera, SearchSuggestion } from "../types";
import { MAP_CONFIG, MAP_INTERACTION, MAPBOX_ENDPOINTS } from "../constants";

// Map state interface
interface MapState {
  // Map instance and readiness
  mapRef: mapboxgl.Map | null;
  isMapReady: boolean;

  // Search functionality
  searchQuery: string;
  suggestions: Array<{ id: string; text: string; center?: [number, number] }>;
  activeIndex: number;
  sessionToken: string | null;

  // Map camera state
  camera: MapCamera;

  // Map interaction state
  isDragging: boolean;
  isZooming: boolean;
}

// Map actions interface
interface MapActions {
  // Map instance management
  setMapRef: (mapRef: mapboxgl.Map | null) => void;
  setMapReady: (ready: boolean) => void;

  // Search functionality
  setSearchQuery: (query: string) => void;
  setSuggestions: (
    suggestions: Array<{ id: string; text: string; center?: [number, number] }>
  ) => void;
  setActiveIndex: (index: number) => void;
  clearSuggestions: () => void;
  setSessionToken: (token: string | null) => void;

  // Camera management
  setCamera: (camera: Partial<MapCamera>) => void;
  resetCamera: () => void;

  // Map interaction
  setDragging: (dragging: boolean) => void;
  setZooming: (zooming: boolean) => void;

  // Search actions
  handleSearch: (query: string) => Promise<void>;
  handleSubmitOrSelect: (idOrQuery?: string) => Promise<void>;
  flyToLocation: (lngLat: [number, number], zoom?: number) => void;
  initializeMap: (container: HTMLDivElement) => mapboxgl.Map;
}

// Combined store type
export type MapStore = MapState & MapActions;

// Initial state
const initialState: MapState = {
  mapRef: null,
  isMapReady: false,
  searchQuery: "",
  suggestions: [],
  activeIndex: -1,
  sessionToken: null,
  camera: {
    center: MAP_CONFIG.DEFAULT_CENTER,
    zoom: MAP_CONFIG.DEFAULT_ZOOM,
    pitch: MAP_CONFIG.DEFAULT_PITCH,
    bearing: MAP_CONFIG.DEFAULT_BEARING,
  },
  isDragging: false,
  isZooming: false,
};

// Create the map store
export const useMapStore = create<MapStore>()(
  subscribeWithSelector((set, get) => ({
    ...initialState,

    // Map instance management
    setMapRef: (mapRef) => set({ mapRef }),
    setMapReady: (ready) => set({ isMapReady: ready }),

    // Search functionality
    setSearchQuery: (query) => set({ searchQuery: query }),
    setSuggestions: (suggestions) => set({ suggestions }),
    setActiveIndex: (index) => set({ activeIndex: index }),
    clearSuggestions: () => set({ suggestions: [], activeIndex: -1 }),
    setSessionToken: (token) => set({ sessionToken: token }),

    // Camera management
    setCamera: (camera) =>
      set((state) => ({
        camera: { ...state.camera, ...camera },
      })),
    resetCamera: () => set({ camera: initialState.camera }),

    // Map interaction
    setDragging: (dragging) => set({ isDragging: dragging }),
    setZooming: (zooming) => set({ isZooming: zooming }),

    // Search actions
    handleSearch: async (query: string) => {
      const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
      const trimmedQuery = query.trim();

      if (!token || trimmedQuery.length < 2) {
        set({ suggestions: [], activeIndex: -1 });
        return;
      }

      const state = get();
      if (!state.sessionToken) {
        set({ sessionToken: crypto.randomUUID() });
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(
        () => controller.abort(),
        MAP_INTERACTION.SEARCH_DEBOUNCE_MS
      );

      try {
        // Try search suggestions first
        const sbUrl = new URL(MAPBOX_ENDPOINTS.SEARCH_SUGGEST);
        sbUrl.searchParams.set("q", trimmedQuery);
        sbUrl.searchParams.set("language", "en");
        sbUrl.searchParams.set("limit", "5");
        sbUrl.searchParams.set(
          "session_token",
          state.sessionToken || crypto.randomUUID()
        );
        sbUrl.searchParams.set("access_token", token);

        const res = await fetch(sbUrl.toString(), {
          signal: controller.signal,
        });

        if (res.ok) {
          const data = (await res.json()) as {
            suggestions?: Array<{
              mapbox_id: string;
              name: string;
              place_formatted?: string;
            }>;
          };

          const items = (data.suggestions ?? []).map((s) => ({
            id: s.mapbox_id,
            text: s.place_formatted
              ? `${s.name} — ${s.place_formatted}`
              : s.name,
          }));

          set({
            suggestions: items,
            activeIndex: items.length > 0 ? 0 : -1,
          });
          return;
        }
      } catch (error) {
        // Fall through to geocoding
      }

      try {
        // Fallback to geocoding
        const geoUrl = new URL(
          `${MAPBOX_ENDPOINTS.GEOCODING}/${encodeURIComponent(
            trimmedQuery
          )}.json`
        );
        geoUrl.searchParams.set("access_token", token);
        geoUrl.searchParams.set("limit", "5");

        const res = await fetch(geoUrl.toString(), {
          signal: controller.signal,
        });

        if (res.ok) {
          const data = (await res.json()) as {
            features?: Array<{
              id?: string;
              place_name?: string;
              center?: [number, number];
            }>;
          };

          const items = (data.features ?? []).map((f) => ({
            id:
              f.id ||
              `geo-${Date.now()}-${Math.random().toString(36).slice(2)}`,
            text: f.place_name || "Unknown location",
            center: f.center,
          }));

          set({
            suggestions: items,
            activeIndex: items.length > 0 ? 0 : -1,
          });
        }
      } catch (error) {
        console.error("Search failed:", error);
        set({ suggestions: [], activeIndex: -1 });
      } finally {
        clearTimeout(timeoutId);
      }
    },

    handleSubmitOrSelect: async (idOrQuery?: string) => {
      const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
      const state = get();
      const query =
        typeof idOrQuery === "string" ? idOrQuery : state.searchQuery.trim();

      if (!token || !query) return;

      let lngLat: [number, number] | null = null;

      const fromSuggestion = state.suggestions.find((s) => s.id === idOrQuery);
      if (fromSuggestion) {
        if (!fromSuggestion.center && state.sessionToken) {
          try {
            const rUrl = new URL(
              `${MAPBOX_ENDPOINTS.SEARCH_SUGGEST.replace(
                "/suggest",
                ""
              )}/retrieve/${fromSuggestion.id}`
            );
            rUrl.searchParams.set("session_token", state.sessionToken);
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
          } catch (error) {
            console.error("Failed to retrieve suggestion details:", error);
          }
        } else if (fromSuggestion.center) {
          lngLat = fromSuggestion.center;
        }
      } else {
        // Direct geocoding
        try {
          const geoUrl = new URL(
            `${MAPBOX_ENDPOINTS.GEOCODING}/${encodeURIComponent(query)}.json`
          );
          geoUrl.searchParams.set("access_token", token);
          geoUrl.searchParams.set("limit", "1");

          const res = await fetch(geoUrl.toString());
          if (res.ok) {
            const data = (await res.json()) as {
              features?: Array<{
                center?: [number, number];
              }>;
            };
            const coords = data.features?.[0]?.center;
            if (coords) lngLat = coords;
          }
        } catch (error) {
          console.error("Geocoding failed:", error);
        }
      }

      if (lngLat && state.mapRef) {
        state.flyToLocation(lngLat);
        // Reset search state
        set({
          sessionToken: crypto.randomUUID(),
          suggestions: [],
          activeIndex: -1,
          searchQuery: "",
        });
      }
    },

    flyToLocation: (lngLat: [number, number], zoom: number = 12) => {
      const state = get();
      if (!state.mapRef) return;

      state.mapRef.flyTo({
        center: lngLat,
        zoom,
        duration: 1000,
      });
    },

    initializeMap: (container: HTMLDivElement) => {
      const map = new mapboxgl.Map({
        container,
        style: MAP_CONFIG.DEFAULT_STYLE,
        center: MAP_CONFIG.DEFAULT_CENTER,
        zoom: MAP_CONFIG.DEFAULT_ZOOM,
        pitch: MAP_CONFIG.DEFAULT_PITCH,
        bearing: MAP_CONFIG.DEFAULT_BEARING,
        antialias: true,
        preserveDrawingBuffer: true,
        attributionControl: false,
      });

      set({ mapRef: map });

      map.on("load", () => {
        try {
          map.setFog({
            color: "#0b1220",
            "high-color": "#0b1220",
            "space-color": "#000010",
            "horizon-blend": 0.2,
            "star-intensity": 0,
          } as mapboxgl.FogSpecification);
        } catch (error) {
          console.error("Failed to set map fog:", error);
        }
        set({ isMapReady: true });
      });

      return map;
    },
  }))
);

// Selector functions for performance optimization
export const mapSelectors = {
  // Map state selectors
  isMapReady: (state: MapStore) => state.isMapReady,
  mapRef: (state: MapStore) => state.mapRef,
  camera: (state: MapStore) => state.camera,

  // Search selectors
  searchQuery: (state: MapStore) => state.searchQuery,
  suggestions: (state: MapStore) => state.suggestions,
  activeIndex: (state: MapStore) => state.activeIndex,
  hasSuggestions: (state: MapStore) => state.suggestions.length > 0,
  sessionToken: (state: MapStore) => state.sessionToken,

  // Interaction selectors
  isInteracting: (state: MapStore) => state.isDragging || state.isZooming,
  isDragging: (state: MapStore) => state.isDragging,
  isZooming: (state: MapStore) => state.isZooming,

  // Computed selectors
  activeSuggestion: (state: MapStore) =>
    state.activeIndex >= 0 && state.activeIndex < state.suggestions.length
      ? state.suggestions[state.activeIndex]
      : null,

  // Map state summary
  mapState: (state: MapStore) => ({
    isReady: state.isMapReady,
    hasMap: state.mapRef !== null,
    isInteracting: state.isDragging || state.isZooming,
  }),

  // Search state summary
  searchState: (state: MapStore) => ({
    query: state.searchQuery,
    hasSuggestions: state.suggestions.length > 0,
    suggestionCount: state.suggestions.length,
    activeIndex: state.activeIndex,
    hasActiveSuggestion:
      state.activeIndex >= 0 && state.activeIndex < state.suggestions.length,
  }),
};
